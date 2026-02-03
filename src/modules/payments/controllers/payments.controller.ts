import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
import { PaymentsService } from '../services/payments.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { ConfirmPaymentDto } from '../dto/confirm-payment.dto';
import { RefundPaymentDto } from '../dto/refund-payment.dto';
import { Payment } from '../entities/payment.entity';

/**
 * Payments Controller
 *
 * Handles payment-related HTTP requests
 * - Payment creation and checkout
 * - Payment confirmation (webhook)
 * - Refund processing
 * - Payment history
 */
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /payments/request
   *
   * Create payment request and get checkout URL
   */
  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async requestPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() req: Request,
  ): Promise<{ payment: Payment; checkoutUrl: string }> {
    const ipAddress = ((req.headers as any)['x-forwarded-for'] || (req.headers as any)['x-real-ip'] || (req as any).socket?.remoteAddress) as string;
    const userAgent = (req.headers as any)['user-agent'] as string;

    return this.paymentsService.createPayment(
      createPaymentDto,
      ipAddress as string,
      userAgent as string,
    );
  }

  /**
   * POST /payments/confirm
   *
   * Confirm payment (called after successful checkout)
   * Can be triggered by webhook or success callback
   */
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPayment(
    @Body() confirmPaymentDto: ConfirmPaymentDto,
    @Req() req: Request,
  ): Promise<Payment> {
    const ipAddress = ((req.headers as any)['x-forwarded-for'] || (req.headers as any)['x-real-ip'] || (req as any).socket?.remoteAddress) as string;
    const userAgent = (req.headers as any)['user-agent'] as string;

    return this.paymentsService.confirmPayment(
      confirmPaymentDto,
      ipAddress as string,
      userAgent as string,
    );
  }

  /**
   * POST /payments/webhook
   *
   * Handle Toss Payments webhook
   * Requires signature verification for security
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('toss-signature') signature: string,
  ): Promise<{ success: boolean }> {
    const ipAddress = ((req.headers as any)['x-forwarded-for'] || (req.headers as any)['x-real-ip'] || (req as any).socket?.remoteAddress) as string;

    // Get raw body for signature verification
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);

    await this.paymentsService.handleWebhook(
      rawBody,
      signature,
      ipAddress as string,
    );

    return { success: true };
  }

  /**
   * POST /payments/:id/refund
   *
   * Process payment refund (full or partial)
   */
  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  async refundPayment(
    @Param('id') paymentId: string,
    @Body() refundPaymentDto: RefundPaymentDto,
    @Req() req: Request,
  ): Promise<Payment> {
    const ipAddress = ((req.headers as any)['x-forwarded-for'] || (req.headers as any)['x-real-ip'] || (req as any).socket?.remoteAddress) as string;
    const userAgent = (req.headers as any)['user-agent'] as string;

    return this.paymentsService.refundPayment(
      paymentId,
      refundPaymentDto,
      ipAddress as string,
      userAgent as string,
    );
  }

  /**
   * GET /payments/:id
   *
   * Get payment details by ID
   */
  @Get(':id')
  async getPayment(@Param('id') paymentId: string): Promise<Payment> {
    return this.paymentsService.getPaymentById(paymentId);
  }

  /**
   * GET /payments
   *
   * Get user's payment history
   */
  @Get()
  async getUserPayments(
    @Query('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<{ payments: Payment[]; total: number; page: number; limit: number }> {
    const { payments, total } = await this.paymentsService.getUserPaymentHistory(
      userId,
      Number(page),
      Number(limit),
    );

    return {
      payments,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  /**
   * GET /payments/:id/transactions
   *
   * Get payment transaction history (audit trail)
   */
  @Get(':id/transactions')
  async getPaymentTransactions(@Param('id') paymentId: string) {
    return this.paymentsService.getPaymentTransactions(paymentId);
  }

  /**
   * GET /payments/:id/receipt
   *
   * Get payment receipt URL
   */
  @Get(':id/receipt')
  async getPaymentReceipt(@Param('id') paymentId: string): Promise<{ receiptUrl: string }> {
    const payment = await this.paymentsService.getPaymentById(paymentId);

    return {
      receiptUrl: payment.receiptUrl || '',
    };
  }
}
