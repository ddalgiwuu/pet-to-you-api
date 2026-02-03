import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus, PaymentMethod, PaymentProvider, PaymentCurrency } from '../entities/payment.entity';
import { PaymentTransaction, TransactionType, TransactionStatus } from '../entities/payment-transaction.entity';
import { TossPaymentsService } from './toss-payments.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { ConfirmPaymentDto } from '../dto/confirm-payment.dto';
import { RefundPaymentDto } from '../dto/refund-payment.dto';
import { TossPaymentResponse, TossWebhookPayload } from '../interfaces/toss-payments.interface';

/**
 * Payment Service
 *
 * Business logic layer for payment processing
 * - Payment creation and lifecycle management
 * - Integration with Toss Payments
 * - Refund processing with business rules
 * - Payment history and receipt generation
 * - Audit trail maintenance
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
    private readonly tossPaymentsService: TossPaymentsService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create Payment Request
   *
   * Creates a payment record and initiates Toss Payments checkout
   */
  async createPayment(dto: CreatePaymentDto, ipAddress?: string, userAgent?: string): Promise<{ payment: Payment; checkoutUrl: string }> {
    this.logger.log(`Creating payment request for user: ${dto.userId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate unique identifiers
      const paymentNumber = this.generatePaymentNumber();
      const orderId = this.tossPaymentsService.generateOrderId();
      const idempotencyKey = this.tossPaymentsService.generateIdempotencyKey(orderId);

      // Check for duplicate payment (idempotency)
      const existingPayment = await this.paymentRepository.findOne({
        where: {
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          status: PaymentStatus.PENDING,
        },
      });

      if (existingPayment) {
        throw new ConflictException('A pending payment already exists for this resource');
      }

      // Create payment record
      const payment = queryRunner.manager.create(Payment, {
        paymentNumber,
        userId: dto.userId,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        amount: dto.amount,
        currency: PaymentCurrency.KRW,
        paymentMethod: dto.paymentMethod,
        provider: PaymentProvider.TOSS_PAYMENTS,
        orderId,
        idempotencyKey,
        status: PaymentStatus.PENDING,
        description: dto.description,
        ipAddress,
        userAgent,
        requestedAt: new Date(),
      });

      const savedPayment = await queryRunner.manager.save(Payment, payment);

      // Prepare Toss Payments request
      const baseUrl = this.configService.get<string>('APP_BASE_URL', 'http://localhost:3000');
      const successUrl = dto.successUrl || `${baseUrl}/payments/success`;
      const failUrl = dto.failUrl || `${baseUrl}/payments/fail`;

      const tossRequest = {
        amount: dto.amount,
        orderId,
        orderName: dto.description || `${dto.resourceType} 결제`,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerMobilePhone: dto.customerMobilePhone,
        successUrl,
        failUrl,
        method: this.mapPaymentMethodToToss(dto.paymentMethod),
      };

      // Request payment from Toss
      const startTime = Date.now();
      const tossResponse = await this.tossPaymentsService.requestPayment(tossRequest);
      const processingTime = Date.now() - startTime;

      // Update payment with Toss response
      savedPayment.transactionId = tossResponse.paymentKey;
      savedPayment.status = this.mapTossStatusToPaymentStatus(tossResponse.status);

      if (tossResponse.virtualAccount) {
        savedPayment.virtualAccountNumber = tossResponse.virtualAccount.accountNumber;
        savedPayment.virtualAccountBank = tossResponse.virtualAccount.bank;
        savedPayment.virtualAccountExpireAt = new Date(tossResponse.virtualAccount.dueDate);
      }

      await queryRunner.manager.save(Payment, savedPayment);

      // Create transaction log
      await this.createTransactionLog(
        queryRunner,
        savedPayment.id,
        TransactionType.PAYMENT_REQUEST,
        TransactionStatus.SUCCESS,
        this.tossPaymentsService.sanitizePaymentData(tossRequest),
        this.tossPaymentsService.sanitizePaymentData(tossResponse),
        200,
        processingTime,
        tossResponse.paymentKey,
        idempotencyKey,
        ipAddress,
        userAgent,
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Payment created successfully: ${savedPayment.id}`);

      return {
        payment: savedPayment,
        checkoutUrl: tossResponse.checkout?.url || '',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create payment: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Confirm Payment
   *
   * Confirms payment after user completes checkout
   * Called from webhook or success callback
   */
  async confirmPayment(dto: ConfirmPaymentDto, ipAddress?: string, userAgent?: string): Promise<Payment> {
    this.logger.log(`Confirming payment: ${dto.paymentKey}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find payment by order ID
      const payment = await this.paymentRepository.findOne({
        where: { orderId: dto.orderId },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status === PaymentStatus.COMPLETED) {
        this.logger.warn(`Payment already completed: ${payment.id}`);
        return payment;
      }

      // Verify amount matches
      if (payment.amount !== dto.amount) {
        throw new BadRequestException('Payment amount mismatch');
      }

      // Confirm with Toss Payments
      const startTime = Date.now();
      const tossResponse = await this.tossPaymentsService.confirmPayment({
        paymentKey: dto.paymentKey,
        orderId: dto.orderId,
        amount: dto.amount,
      });
      const processingTime = Date.now() - startTime;

      // Update payment record
      payment.transactionId = tossResponse.paymentKey;
      payment.status = PaymentStatus.COMPLETED;
      payment.completedAt = new Date(tossResponse.approvedAt || new Date().toISOString());
      payment.receiptUrl = tossResponse.receipt?.url;

      // Extract card/account information (PCI-DSS compliant)
      if (tossResponse.card) {
        payment.cardCompany = tossResponse.card.company;
        payment.cardLastFourDigits = tossResponse.card.number.slice(-4);
        payment.cardType = tossResponse.card.cardType;
        payment.approvalNumber = tossResponse.card.approveNo;
      }

      if (tossResponse.virtualAccount) {
        payment.virtualAccountNumber = tossResponse.virtualAccount.accountNumber;
        payment.virtualAccountBank = tossResponse.virtualAccount.bank;
      }

      const savedPayment = await queryRunner.manager.save(Payment, payment);

      // Create transaction log
      await this.createTransactionLog(
        queryRunner,
        payment.id,
        TransactionType.PAYMENT_CONFIRMATION,
        TransactionStatus.SUCCESS,
        this.tossPaymentsService.sanitizePaymentData(dto),
        this.tossPaymentsService.sanitizePaymentData(tossResponse),
        200,
        processingTime,
        tossResponse.paymentKey,
        undefined,
        ipAddress,
        userAgent,
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Payment confirmed successfully: ${savedPayment.id}`);
      return savedPayment;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to confirm payment: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Refund Payment
   *
   * Processes full or partial refund with business logic validation
   */
  async refundPayment(paymentId: string, dto: RefundPaymentDto, ipAddress?: string, userAgent?: string): Promise<Payment> {
    this.logger.log(`Processing refund for payment: ${paymentId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (!payment.canBeRefunded()) {
        throw new BadRequestException('Payment cannot be refunded');
      }

      const refundAmount = dto.refundAmount || payment.getRefundableAmount();

      if (refundAmount > payment.getRefundableAmount()) {
        throw new BadRequestException('Refund amount exceeds refundable amount');
      }

      // Cancel payment with Toss
      const startTime = Date.now();

      if (!payment.transactionId) {
        throw new BadRequestException('Payment transaction ID not found');
      }

      const tossResponse = await this.tossPaymentsService.cancelPayment({
        paymentKey: payment.transactionId,
        cancelReason: dto.refundReason,
        cancelAmount: refundAmount,
        refundReceiveAccount: dto.refundReceiveAccount,
      });
      const processingTime = Date.now() - startTime;

      // Update payment record
      payment.refundedAmount += refundAmount;
      payment.refundReason = dto.refundReason;
      payment.refundedAt = new Date();
      payment.refundTransactionId = tossResponse.cancels[0]?.transactionKey;

      if (payment.isFullyRefunded()) {
        payment.status = PaymentStatus.REFUNDED;
      } else {
        payment.status = PaymentStatus.PARTIAL_REFUNDED;
      }

      const savedPayment = await queryRunner.manager.save(Payment, payment);

      // Create transaction log
      await this.createTransactionLog(
        queryRunner,
        payment.id,
        TransactionType.REFUND_APPROVAL,
        TransactionStatus.SUCCESS,
        { refundAmount, refundReason: dto.refundReason },
        this.tossPaymentsService.sanitizePaymentData(tossResponse),
        200,
        processingTime,
        payment.transactionId,
        undefined,
        ipAddress,
        userAgent,
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Refund processed successfully: ${savedPayment.id}`);
      return savedPayment;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to process refund: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Handle Webhook
   *
   * Processes payment webhook from Toss Payments
   */
  async handleWebhook(payload: string, signature: string, ipAddress?: string): Promise<void> {
    this.logger.log('Processing payment webhook');

    // Verify webhook signature
    const isValid = this.tossPaymentsService.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      this.logger.error('Invalid webhook signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    const webhookData = this.tossPaymentsService.parseWebhookPayload(payload);

    const payment = await this.paymentRepository.findOne({
      where: { orderId: webhookData.data.orderId },
    });

    if (!payment) {
      this.logger.error(`Payment not found for webhook: ${webhookData.data.orderId}`);
      return;
    }

    // Update payment status based on webhook
    payment.webhookReceivedAt = new Date();
    payment.webhookSignature = signature;
    payment.status = this.mapTossStatusToPaymentStatus(webhookData.data.status);

    if (webhookData.data.approvedAt) {
      payment.completedAt = new Date(webhookData.data.approvedAt);
    }

    await this.paymentRepository.save(payment);

    // Create transaction log
    await this.createTransactionLog(
      null,
      payment.id,
      TransactionType.WEBHOOK_RECEIVED,
      TransactionStatus.SUCCESS,
      webhookData,
      null,
      200,
      0,
      payment.transactionId,
      undefined,
      ipAddress,
      undefined,
    );

    this.logger.log(`Webhook processed successfully for payment: ${payment.id}`);
  }

  /**
   * Get Payment by ID
   */
  async getPaymentById(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['user'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Get User Payment History
   */
  async getUserPaymentHistory(userId: string, page: number = 1, limit: number = 20): Promise<{ payments: Payment[]; total: number }> {
    const [payments, total] = await this.paymentRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { payments, total };
  }

  /**
   * Get Payment Transactions
   */
  async getPaymentTransactions(paymentId: string): Promise<PaymentTransaction[]> {
    return this.transactionRepository.find({
      where: { paymentId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Generate Payment Number
   */
  private generatePaymentNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    return `PAY-${year}${month}${day}-${random}`;
  }

  /**
   * Map Payment Method to Toss Format
   */
  private mapPaymentMethodToToss(method: PaymentMethod): 'card' | 'transfer' | 'virtual_account' | 'mobile' {
    const mapping = {
      [PaymentMethod.CARD]: 'card' as const,
      [PaymentMethod.TRANSFER]: 'transfer' as const,
      [PaymentMethod.VIRTUAL_ACCOUNT]: 'virtual_account' as const,
      [PaymentMethod.MOBILE]: 'mobile' as const,
    };

    return mapping[method];
  }

  /**
   * Map Toss Status to Payment Status
   */
  private mapTossStatusToPaymentStatus(tossStatus: string): PaymentStatus {
    const mapping: Record<string, PaymentStatus> = {
      'READY': PaymentStatus.READY,
      'IN_PROGRESS': PaymentStatus.IN_PROGRESS,
      'WAITING_FOR_DEPOSIT': PaymentStatus.PENDING,
      'DONE': PaymentStatus.COMPLETED,
      'CANCELED': PaymentStatus.CANCELLED,
      'PARTIAL_CANCELED': PaymentStatus.PARTIAL_REFUNDED,
      'ABORTED': PaymentStatus.FAILED,
      'EXPIRED': PaymentStatus.FAILED,
    };

    return mapping[tossStatus] || PaymentStatus.PENDING;
  }

  /**
   * Create Transaction Log
   */
  private async createTransactionLog(
    queryRunner: any,
    paymentId: string,
    type: TransactionType,
    status: TransactionStatus,
    requestData: any,
    responseData: any,
    httpStatusCode: number,
    processingTimeMs: number,
    transactionId?: string,
    idempotencyKey?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const transaction = (queryRunner?.manager || this.transactionRepository).create(PaymentTransaction, {
      paymentId,
      type,
      status,
      requestData,
      responseData,
      httpStatusCode,
      processingTimeMs,
      transactionId,
      idempotencyKey,
      ipAddress,
      userAgent,
      requestedAt: new Date(),
      respondedAt: new Date(),
    });

    await (queryRunner?.manager || this.transactionRepository).save(PaymentTransaction, transaction);
  }
}
