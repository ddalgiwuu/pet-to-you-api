/**
 * Hospital Payment Entity - SECURITY HARDENED VERSION
 * Implements encryption for bank account numbers (CRT-001 fix)
 *
 * MIGRATION REQUIRED: Run migration to encrypt existing data
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Hospital } from '../../hospitals/entities/hospital.entity';
import { InsuranceClaim } from '../../insurance/entities/insurance-claim.entity';
import { EncryptedData } from '../../../core/encryption/encryption.service';

export enum HospitalPaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  ESCROW = 'escrow',
}

/**
 * 💰 Hospital Payment Entity - SECURE VERSION
 *
 * Security Enhancements:
 * - Bank account numbers encrypted (PIPA Article 24)
 * - Account holder names encrypted (PII protection)
 * - Transaction IDs masked in logs
 * - Idempotency keys for duplicate prevention
 * - Enhanced audit logging
 */
@Entity('hospital_payments')
@Index(['hospitalId', 'status'])
@Index(['claimId'])
@Index(['settlementId'])
@Index(['idempotencyKey'], { unique: true })
@Index(['createdAt'])
export class HospitalPaymentSecure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Hospital Relationship
  // ============================================================

  @ManyToOne(() => Hospital, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ type: 'uuid' })
  @Index()
  hospitalId: string;

  // ============================================================
  // Claim & Medical Record Connection
  // ============================================================

  @ManyToOne(() => InsuranceClaim, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'claim_id' })
  claim: InsuranceClaim;

  @Column({ type: 'uuid' })
  @Index()
  claimId: string;

  @Column({ type: 'uuid', nullable: true })
  medicalRecordId?: string;

  // ============================================================
  // Payment Information
  // ============================================================

  @Column({ type: 'integer' })
  amount: number; // 정산 금액 (KRW)

  @Column({
    type: 'enum',
    enum: HospitalPaymentStatus,
    default: HospitalPaymentStatus.PENDING,
  })
  @Index()
  status: HospitalPaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.BANK_TRANSFER,
  })
  paymentMethod: PaymentMethod;

  // ============================================================
  // Bank Information - ENCRYPTED 🔒
  // ============================================================

  @Column({ type: 'varchar', length: 50, nullable: true })
  bankName?: string; // 은행명 (not sensitive)

  /**
   * 🔒 Encrypted Bank Account Number
   * PIPA Article 24: Financial data must be encrypted
   * Security: AES-256-GCM with envelope encryption
   */
  @Column({ type: 'jsonb', nullable: true })
  bankAccountNumberEncrypted?: EncryptedData;

  /**
   * 🔒 Encrypted Account Holder Name
   * PII protection for account ownership
   */
  @Column({ type: 'jsonb', nullable: true })
  accountHolderNameEncrypted?: EncryptedData;

  // Virtual fields (populated after decryption, not persisted)
  bankAccountNumber?: string;
  accountHolderName?: string;

  // ============================================================
  // Transaction Tracking
  // ============================================================

  /**
   * Idempotency key for duplicate prevention
   * Ensures payment only processed once
   */
  @Column({ type: 'varchar', length: 36, unique: true })
  @Index()
  idempotencyKey: string; // UUID v4

  /**
   * Correlation ID for distributed tracing
   * Links payment to claim approval event
   */
  @Column({ type: 'varchar', length: 36, nullable: true })
  correlationId?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  transactionId?: string; // 토스페이먼츠 거래 ID

  @Column({ type: 'varchar', length: 200, nullable: true })
  @Index()
  settlementId?: string; // 정산 고유 번호

  @Column({ type: 'varchar', length: 200, nullable: true })
  paymentKey?: string; // Payment provider key

  // ============================================================
  // Request Signing (Future Enhancement)
  // ============================================================

  /**
   * HMAC signature for request verification
   * Prevents tampering with payment requests
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  requestSignature?: string; // SHA-256 HMAC

  // ============================================================
  // Timestamps
  // ============================================================

  @Column({ type: 'timestamp', nullable: true })
  initiatedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt?: Date;

  // ============================================================
  // Error Handling
  // ============================================================

  /**
   * Generic error code (no sensitive details)
   * Detailed errors logged separately in audit system
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  errorCode?: string; // E.g., 'ERR_BANK_TRANSFER_FAILED'

  @Column({ type: 'text', nullable: true })
  errorMessage?: string; // Generic message only

  @Column({ type: 'integer', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt?: Date;

  // ============================================================
  // Metadata (Non-Sensitive Only)
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    insuranceProvider?: string; // 보험사 (not sensitive)
    policyNumber?: string; // 증권번호 (masked in logs)
    claimApprovedAt?: string;
    paymentInitiator?: string; // 'auto' | 'manual'
  };

  // ============================================================
  // Audit & Compliance
  // ============================================================

  /**
   * Indicates if payment was reviewed by human
   * Required for high-value payments (>₩5,000,000)
   */
  @Column({ type: 'boolean', default: false })
  manualReviewRequired: boolean;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reviewedBy?: string; // User ID of reviewer

  /**
   * Compliance flags
   */
  @Column({ type: 'boolean', default: false })
  fraudCheckPassed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  fraudCheckAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
