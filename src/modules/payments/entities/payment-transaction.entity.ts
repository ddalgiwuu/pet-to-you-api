import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Payment } from './payment.entity';

export enum TransactionType {
  PAYMENT_REQUEST = 'payment_request',
  PAYMENT_APPROVAL = 'payment_approval',
  PAYMENT_CONFIRMATION = 'payment_confirmation',
  PAYMENT_CANCELLATION = 'payment_cancellation',
  REFUND_REQUEST = 'refund_request',
  REFUND_APPROVAL = 'refund_approval',
  WEBHOOK_RECEIVED = 'webhook_received',
}

export enum TransactionStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
}

/**
 * Payment Transaction Entity
 *
 * Audit trail for all payment-related operations.
 * Stores request/response data for compliance and debugging.
 *
 * PCI-DSS Compliance: Never store sensitive payment data (card numbers, CVV, etc.)
 */
@Entity('payment_transactions')
@Index(['paymentId', 'createdAt'])
@Index(['type', 'status', 'createdAt'])
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Relations
  // ============================================================

  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ type: 'uuid' })
  @Index()
  paymentId: string;

  // ============================================================
  // Transaction Details
  // ============================================================

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  @Index()
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
  })
  @Index()
  status: TransactionStatus;

  // ============================================================
  // Request & Response Data (PCI-DSS: No sensitive data)
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  requestData?: Record<string, any>; // Sanitized request payload

  @Column({ type: 'jsonb', nullable: true })
  responseData?: Record<string, any>; // Sanitized response payload

  @Column({ type: 'int', nullable: true })
  httpStatusCode?: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  httpMethod?: string; // GET, POST, etc.

  @Column({ type: 'varchar', length: 500, nullable: true })
  endpoint?: string; // Toss Payments API endpoint

  // ============================================================
  // Error Tracking
  // ============================================================

  @Column({ type: 'varchar', length: 100, nullable: true })
  errorCode?: string; // Toss Payments error code

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'jsonb', nullable: true })
  errorDetails?: Record<string, any>;

  // ============================================================
  // Timing & Performance
  // ============================================================

  @Column({ type: 'int', nullable: true })
  processingTimeMs?: number; // Processing time in milliseconds

  @Column({ type: 'timestamp', nullable: true })
  requestedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt?: Date;

  // ============================================================
  // Audit Trail
  // ============================================================

  @Column({ type: 'varchar', length: 100, nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  transactionId?: string; // External transaction ID (Toss Payments)

  @Column({ type: 'varchar', length: 200, nullable: true })
  idempotencyKey?: string; // Request idempotency key

  // ============================================================
  // Retry Tracking
  // ============================================================

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'uuid', nullable: true })
  originalTransactionId?: string; // Link to original transaction if this is a retry

  // ============================================================
  // Metadata
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // Additional tracking information

  @Column({ type: 'text', nullable: true })
  notes?: string; // Admin notes

  // ============================================================
  // Timestamps
  // ============================================================

  @CreateDateColumn()
  createdAt: Date;

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * Check if transaction succeeded
   */
  isSuccess(): boolean {
    return this.status === TransactionStatus.SUCCESS;
  }

  /**
   * Check if transaction failed
   */
  isFailed(): boolean {
    return this.status === TransactionStatus.FAILED;
  }

  /**
   * Check if transaction is pending
   */
  isPending(): boolean {
    return this.status === TransactionStatus.PENDING;
  }

  /**
   * Get processing time in seconds
   */
  getProcessingTimeSeconds(): number | null {
    return this.processingTimeMs ? this.processingTimeMs / 1000 : null;
  }

  /**
   * Check if this is a retry transaction
   */
  isRetry(): boolean {
    return this.retryCount > 0 || !!this.originalTransactionId;
  }

  /**
   * Check if transaction took too long (> 5 seconds)
   */
  isSlowTransaction(): boolean {
    return this.processingTimeMs ? this.processingTimeMs > 5000 : false;
  }
}
