/**
 * Payment Settlement Service
 * Handles hospital payment settlements and patient reimbursements
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { HospitalPayment, HospitalPaymentStatus, PaymentMethod } from '../entities/hospital-payment.entity';
import { InsuranceClaim } from '../../insurance/entities/insurance-claim.entity';
import { Hospital } from '../../hospitals/entities/hospital.entity';
import { HealthNote } from '../../medical-records/entities/health-note.entity';
import {
  ClaimApprovedEvent,
  HospitalPaymentInitiatedEvent,
  HospitalPaymentCompletedEvent,
  EventNames,
} from '../../../core/events/event-types';
import { AuditService } from '../../../core/audit/audit.service';
import { AuditAction } from '../../../core/audit/entities/audit-log.entity';
import { EncryptionService } from '../../../core/encryption/encryption.service';

/**
 * 💰 Payment Settlement Service
 *
 * Handles:
 * 1. Hospital payment settlements (보험사 → 병원)
 * 2. Patient reimbursements (보험사 → 환자)
 * 3. Payment gateway integration (Toss Payments)
 * 4. Retry logic with exponential backoff
 *
 * Flow:
 * CLAIM_APPROVED event
 *   → Create HospitalPayment (status: pending)
 *   → Call Toss Payments API
 *   → Update status: processing → completed
 *   → Emit HOSPITAL_PAYMENT_COMPLETED event
 *   → (Trigger patient reimbursement if needed)
 */
@Injectable()
export class PaymentSettlementService {
  private readonly logger = new Logger(PaymentSettlementService.name);

  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [3600000, 21600000, 86400000]; // 1h, 6h, 24h

  constructor(
    @InjectRepository(HospitalPayment)
    private readonly paymentRepository: Repository<HospitalPayment>,
    @InjectRepository(InsuranceClaim)
    private readonly claimRepository: Repository<InsuranceClaim>,
    @InjectRepository(Hospital)
    private readonly hospitalRepository: Repository<Hospital>,
    @InjectRepository(HealthNote)
    private readonly healthNoteRepository: Repository<HealthNote>,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Handle claim approved event
   * Automatically creates hospital payment
   */
  @OnEvent(EventNames.CLAIM_APPROVED)
  async handleClaimApproved(event: ClaimApprovedEvent) {
    try {
      this.logger.log(`Processing claim approved event: ${event.claimId}`);

      // 1. Fetch claim details
      const claim = await this.claimRepository.findOne({
        where: { id: event.claimId },
        relations: ['policy'],
      });

      if (!claim) {
        this.logger.warn(`Claim not found: ${event.claimId}`);
        return;
      }

      // 2. Check if hospital payment already exists
      const existingPayment = await this.paymentRepository.findOne({
        where: { claimId: event.claimId },
      });

      if (existingPayment) {
        this.logger.debug(`Hospital payment already exists: ${existingPayment.id}`);
        return;
      }

      // 3. Get hospital info
      if (!event.hospitalId) {
        this.logger.warn(`No hospital ID for claim: ${event.claimId}`);
        return;
      }

      const hospital = await this.hospitalRepository.findOne({
        where: { id: event.hospitalId },
      });

      if (!hospital) {
        this.logger.warn(`Hospital not found: ${event.hospitalId}`);
        return;
      }

      // 4. Encrypt sensitive bank information ⭐ SECURITY FIX: CRT-001
      let bankAccountNumberEncrypted;
      let accountHolderNameEncrypted;

      if (hospital.bankAccountNumber) {
        bankAccountNumberEncrypted = await this.encryptionService.encrypt(
          hospital.bankAccountNumber,
        );
      }

      if (hospital.accountHolderName) {
        accountHolderNameEncrypted = await this.encryptionService.encrypt(
          hospital.accountHolderName,
        );
      }

      // 5. Create hospital payment with encrypted fields
      const payment = this.paymentRepository.create({
        hospitalId: event.hospitalId,
        claimId: event.claimId,
        medicalRecordId: event.medicalRecordId,
        amount: event.approvedAmount,
        status: HospitalPaymentStatus.PENDING,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        bankName: hospital.bankName || undefined,

        // 🔒 Encrypted sensitive fields
        bankAccountNumberEncrypted: bankAccountNumberEncrypted || undefined,
        accountHolderNameEncrypted: accountHolderNameEncrypted || undefined,

        // Legacy fields (deprecated, for migration compatibility)
        bankAccountNumber: undefined, // Never store plaintext
        accountHolderName: undefined, // Never store plaintext

        metadata: {
          insuranceProvider: claim.policy?.company,
          policyNumber: claim.policy?.policyName,
          claimApprovedAt: new Date().toISOString(),
        },
      });

      const savedPayment = await this.paymentRepository.save(payment);

      // 6. Audit log with sensitive operation flag ⭐
      await this.auditService.log({
        userId: 'system',
        action: AuditAction.CREATE_HOSPITAL_PAYMENT,
        resource: 'HospitalPayment',
        resourceId: savedPayment.id,
        purpose: 'Auto-create payment settlement from approved claim',
        legalBasis: 'Payment processing - Financial Services Act',
        ipAddress: '127.0.0.1',
        userAgent: 'Payment Settlement System',
        metadata: {
          sensitive: true,
          encryptedFields: ['bankAccountNumber', 'accountHolderName'],
          amount: event.approvedAmount,
        },
      });

      // 6. Emit payment initiated event
      this.eventEmitter.emit(
        EventNames.HOSPITAL_PAYMENT_INITIATED,
        new HospitalPaymentInitiatedEvent(
          savedPayment.id,
          event.hospitalId,
          event.claimId,
          event.approvedAmount,
        ),
      );

      this.logger.log(
        `Hospital payment created: ${savedPayment.id} for ₩${event.approvedAmount.toLocaleString()}`,
      );

      // 7. Process payment immediately
      await this.processHospitalPayment(savedPayment.id);
    } catch (error) {
      this.logger.error(`Failed to handle claim approved event: ${event.claimId}`, error);
    }
  }

  /**
   * Process hospital payment via Toss Payments API
   */
  async processHospitalPayment(paymentId: string): Promise<void> {
    try {
      this.logger.log(`Processing hospital payment: ${paymentId}`);

      // 1. Fetch payment
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
        relations: ['hospital', 'claim'],
      });

      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      if (payment.status !== HospitalPaymentStatus.PENDING) {
        this.logger.debug(`Payment already processed: ${paymentId}`);
        return;
      }

      // 2. Update status to processing
      await this.paymentRepository.update(paymentId, {
        status: HospitalPaymentStatus.PROCESSING,
        initiatedAt: new Date(),
      });

      // 3. Call Toss Payments API (sandbox for now)
      const paymentResult = await this.callTossPaymentsAPI(payment);

      if (paymentResult.success) {
        // 4a. Success - update payment
        await this.paymentRepository.update(paymentId, {
          status: HospitalPaymentStatus.COMPLETED,
          completedAt: new Date(),
          transactionId: paymentResult.transactionId,
          settlementId: paymentResult.settlementId,
        });

        // 4b. Update medical record
        if (payment.medicalRecordId) {
          await this.healthNoteRepository.update(payment.medicalRecordId, {
            hospitalPaymentStatus: 'completed',
            hospitalPaidAt: new Date(),
          });
        }

        // 4c. Emit completed event
        this.eventEmitter.emit(
          EventNames.HOSPITAL_PAYMENT_COMPLETED,
          new HospitalPaymentCompletedEvent(
            paymentId,
            payment.hospitalId,
            payment.claimId,
            payment.amount,
            paymentResult.transactionId || 'unknown',
          ),
        );

        this.logger.log(
          `Hospital payment completed: ${paymentId} (txn: ${paymentResult.transactionId})`,
        );
      } else {
        // 4d. Failed - schedule retry
        const retryCount = payment.retryCount + 1;

        if (retryCount <= this.MAX_RETRIES) {
          const nextRetryAt = new Date(Date.now() + this.RETRY_DELAYS[retryCount - 1]);

          await this.paymentRepository.update(paymentId, {
            status: HospitalPaymentStatus.PENDING,
            retryCount,
            nextRetryAt,
            errorMessage: paymentResult.error,
            failedAt: new Date(),
          });

          this.logger.warn(
            `Payment failed (attempt ${retryCount}/${this.MAX_RETRIES}): ${paymentId}. Retry at: ${nextRetryAt}`,
          );

          // Schedule retry
          setTimeout(() => {
            this.processHospitalPayment(paymentId);
          }, this.RETRY_DELAYS[retryCount - 1]);
        } else {
          // Max retries exceeded
          await this.paymentRepository.update(paymentId, {
            status: HospitalPaymentStatus.FAILED,
            errorMessage: `Max retries exceeded. Last error: ${paymentResult.error}`,
            failedAt: new Date(),
          });

          this.logger.error(
            `Hospital payment failed after ${this.MAX_RETRIES} retries: ${paymentId}`,
          );

          // TODO: Send alert to admin
        }
      }
    } catch (error) {
      this.logger.error(`Error processing hospital payment: ${paymentId}`, error);

      await this.paymentRepository.update(paymentId, {
        status: HospitalPaymentStatus.FAILED,
        errorMessage: error.message,
        failedAt: new Date(),
      });
    }
  }

  /**
   * Call Toss Payments API (sandbox) ⭐ SECURITY FIX: CRT-001
   */
  private async callTossPaymentsAPI(payment: HospitalPayment): Promise<{
    success: boolean;
    transactionId?: string;
    settlementId?: string;
    error?: string;
  }> {
    try {
      // 🔓 Decrypt bank account for payment processing
      let bankAccountNumber: string | undefined;
      let accountHolderName: string | undefined;

      if (payment.bankAccountNumberEncrypted) {
        bankAccountNumber = await this.encryptionService.decrypt(
          payment.bankAccountNumberEncrypted,
        );
      }

      if (payment.accountHolderNameEncrypted) {
        accountHolderName = await this.encryptionService.decrypt(
          payment.accountHolderNameEncrypted,
        );
      }

      // Validate decrypted data
      if (!bankAccountNumber || !accountHolderName) {
        this.logger.error(`Missing bank information for payment: ${payment.id}`);
        return {
          success: false,
          error: 'Missing required bank information',
        };
      }

      // Audit log - decryption for payment processing
      await this.auditService.log({
        userId: 'system',
        action: AuditAction.DECRYPT_BANK_INFO,
        resource: 'HospitalPayment',
        resourceId: payment.id,
        purpose: 'Decrypt bank account for Toss Payments API call',
        legalBasis: 'Payment processing - Financial Services Act',
        ipAddress: '127.0.0.1',
        userAgent: 'Payment Settlement System',
        metadata: {
          sensitive: true,
          bankName: payment.bankName,
          // NEVER log decrypted values
          accountMasked: this.maskBankAccount(bankAccountNumber),
        },
      });

      // TODO: Replace with actual Toss Payments API call
      // For now, simulate success
      this.logger.debug(`[MOCK] Calling Toss Payments API for payment: ${payment.id}`);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Clear sensitive data from memory after use
      bankAccountNumber = undefined;
      accountHolderName = undefined;

      // Simulate success (95% success rate)
      const isSuccess = Math.random() < 0.95;

      if (isSuccess) {
        return {
          success: true,
          transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          settlementId: `STL-${Date.now()}`,
        };
      } else {
        return {
          success: false,
          error: 'Bank transfer failed - insufficient funds or invalid account',
        };
      }

      /* Production implementation:
      const response = await axios.post(
        'https://api.tosspayments.com/v1/settlements',
        {
          amount: payment.amount,
          bankCode: getBankCode(payment.bankName),
          accountNumber: payment.bankAccountNumber,
          accountHolderName: payment.accountHolderName,
          description: `Pet insurance settlement - Claim ${payment.claimId}`,
        },
        {
          headers: {
            Authorization: `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64')}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: true,
        transactionId: response.data.transactionId,
        settlementId: response.data.settlementId,
      };
      */
    } catch (error) {
      this.logger.error('Toss Payments API error:', error);
      return {
        success: false,
        error: error.message || 'Payment gateway error',
      };
    }
  }

  /**
   * Get hospital payment by ID with decryption ⭐ SECURITY FIX: CRT-001
   */
  async getPaymentById(paymentId: string): Promise<HospitalPayment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['hospital', 'claim'],
    });

    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    // 🔓 Decrypt sensitive fields for display
    if (payment.bankAccountNumberEncrypted) {
      payment.bankAccountNumberDecrypted = await this.encryptionService.decrypt(
        payment.bankAccountNumberEncrypted,
      );
    }

    if (payment.accountHolderNameEncrypted) {
      payment.accountHolderNameDecrypted = await this.encryptionService.decrypt(
        payment.accountHolderNameEncrypted,
      );
    }

    // Audit log - accessing sensitive payment data
    await this.auditService.log({
      userId: 'system', // Should be actual user ID in production
      action: AuditAction.READ_HOSPITAL_PAYMENT,
      resource: 'HospitalPayment',
      resourceId: paymentId,
      purpose: 'View payment settlement details',
      legalBasis: 'Payment processing - Financial Services Act',
      ipAddress: '127.0.0.1',
      userAgent: 'Payment Settlement System',
      metadata: {
        sensitive: true,
        decryptedFields: ['bankAccountNumber', 'accountHolderName'],
      },
    });

    return payment;
  }

  /**
   * Get payments for hospital
   */
  async getPaymentsForHospital(
    hospitalId: string,
    status?: HospitalPaymentStatus,
  ): Promise<HospitalPayment[]> {
    const where: any = { hospitalId };

    if (status) {
      where.status = status;
    }

    return this.paymentRepository.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['claim'],
      take: 100,
    });
  }

  /**
   * Retry failed payment manually
   */
  async retryPayment(paymentId: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    if (payment.status === HospitalPaymentStatus.COMPLETED) {
      throw new Error('Payment already completed');
    }

    // Reset retry count and process
    await this.paymentRepository.update(paymentId, {
      retryCount: 0,
      status: HospitalPaymentStatus.PENDING,
    });

    await this.processHospitalPayment(paymentId);
  }

  /**
   * Mask bank account number for logging (SECURITY HELPER) ⭐
   * Example: "123-456-7890" → "***-***-7890"
   */
  private maskBankAccount(accountNumber: string): string {
    if (!accountNumber || accountNumber.length < 4) {
      return '****';
    }

    const last4 = accountNumber.slice(-4);
    const masked = '*'.repeat(Math.max(0, accountNumber.length - 4));

    return masked + last4;
  }
}
