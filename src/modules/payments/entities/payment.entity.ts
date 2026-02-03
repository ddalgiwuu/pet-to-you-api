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
import { User } from '../../users/entities/user.entity';

export enum PaymentMethod {
  CARD = 'card',
  TRANSFER = 'transfer',
  VIRTUAL_ACCOUNT = 'virtual_account',
  MOBILE = 'mobile',
}

export enum PaymentProvider {
  TOSS_PAYMENTS = 'toss_payments',
}

export enum PaymentStatus {
  PENDING = 'pending',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIAL_REFUNDED = 'partial_refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentCurrency {
  KRW = 'KRW',
}

@Entity('payments')
@Index(['userId', 'status', 'createdAt'])
@Index(['resourceType', 'resourceId'])
@Index(['transactionId'])
@Index(['status', 'createdAt'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Relations
  // ============================================================

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Removed duplicate @Index() - already part of class-level @Index(['userId', 'status', 'createdAt'])
  @Column({ type: 'uuid' })
  userId: string;

  // ============================================================
  // Polymorphic Resource (Booking, DaycareReservation, Insurance, etc.)
  // ============================================================

  // Removed duplicate @Index() - already part of class-level @Index(['resourceType', 'resourceId'])
  @Column({ type: 'varchar', length: 50 })
  resourceType: string; // 'booking', 'daycare_reservation', 'insurance_subscription'

  // Removed duplicate @Index() - already part of class-level @Index(['resourceType', 'resourceId'])
  @Column({ type: 'uuid' })
  resourceId: string; // ID of the resource

  // ============================================================
  // Payment Details
  // ============================================================

  // Removed duplicate @Index() - unique constraint already creates index
  @Column({ type: 'varchar', length: 30, unique: true })
  paymentNumber: string; // PAY-20240117-1234

  @Column({ type: 'int' })
  amount: number; // 결제 금액 (원)

  @Column({
    type: 'enum',
    enum: PaymentCurrency,
    default: PaymentCurrency.KRW,
  })
  currency: PaymentCurrency;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentProvider,
    default: PaymentProvider.TOSS_PAYMENTS,
  })
  provider: PaymentProvider;

  // ============================================================
  // Toss Payments Integration
  // ============================================================

  // Note: unique constraint already creates index, but class-level @Index(['transactionId']) provides additional access pattern
  @Column({ type: 'varchar', length: 200, nullable: true, unique: true })
  transactionId?: string; // Toss Payments transaction ID (paymentKey)

  // Removed duplicate @Index() - unique constraint already creates index
  @Column({ type: 'varchar', length: 200, nullable: true, unique: true })
  orderId?: string; // 주문 ID (merchant order ID)

  @Column({ type: 'varchar', length: 200, nullable: true })
  customerKey?: string; // 고객 키 (for recurring payments)

  // PCI-DSS Compliance: Never store card numbers, CVV, or full card details
  @Column({ type: 'varchar', length: 50, nullable: true })
  cardCompany?: string; // 카드사 (현대, 신한, etc.)

  @Column({ type: 'varchar', length: 10, nullable: true })
  cardLastFourDigits?: string; // 마지막 4자리만 저장

  @Column({ type: 'varchar', length: 20, nullable: true })
  cardType?: string; // 'credit', 'debit', 'gift'

  @Column({ type: 'varchar', length: 200, nullable: true })
  virtualAccountNumber?: string; // 가상계좌 번호 (for virtual account payment)

  @Column({ type: 'varchar', length: 50, nullable: true })
  virtualAccountBank?: string; // 가상계좌 은행

  @Column({ type: 'timestamp', nullable: true })
  virtualAccountExpireAt?: Date; // 가상계좌 입금 만료일

  // ============================================================
  // Status
  // ============================================================

  // Removed duplicate @Index() - already part of class-level @Index(['userId', 'status', 'createdAt']) and @Index(['status', 'createdAt'])
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'timestamp', nullable: true })
  requestedAt?: Date; // 결제 요청 시간

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date; // 결제 완료 시간

  @Column({ type: 'timestamp', nullable: true })
  failedAt?: Date; // 결제 실패 시간

  @Column({ type: 'text', nullable: true })
  failureReason?: string; // 실패 사유

  // ============================================================
  // Refund Information
  // ============================================================

  @Column({ type: 'int', default: 0 })
  refundedAmount: number; // 환불된 금액

  @Column({ type: 'timestamp', nullable: true })
  refundedAt?: Date;

  @Column({ type: 'text', nullable: true })
  refundReason?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  refundTransactionId?: string; // Toss Payments 환불 transaction ID

  // ============================================================
  // Receipt & Invoice
  // ============================================================

  @Column({ type: 'varchar', length: 500, nullable: true })
  receiptUrl?: string; // 영수증 URL (Toss Payments provides this)

  @Column({ type: 'varchar', length: 200, nullable: true })
  approvalNumber?: string; // 승인번호

  // ============================================================
  // Webhook & Security
  // ============================================================

  @Column({ type: 'varchar', length: 500, nullable: true })
  webhookSignature?: string; // Webhook signature for verification

  @Column({ type: 'timestamp', nullable: true })
  webhookReceivedAt?: Date; // Webhook 수신 시간

  @Column({ type: 'int', default: 0 })
  webhookRetryCount: number; // Webhook 재시도 횟수

  // ============================================================
  // Metadata & Audit (PCI-DSS: Encrypted storage)
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // 암호화된 추가 정보

  @Column({ type: 'text', nullable: true })
  description?: string; // 결제 설명

  @Column({ type: 'varchar', length: 100, nullable: true })
  ipAddress?: string; // 결제 요청 IP (audit trail)

  @Column({ type: 'text', nullable: true })
  userAgent?: string; // 결제 요청 User Agent

  // ============================================================
  // Idempotency
  // ============================================================

  // Removed duplicate @Index() - unique constraint already creates index
  @Column({ type: 'varchar', length: 200, nullable: true, unique: true })
  idempotencyKey?: string; // 중복 결제 방지 키

  // ============================================================
  // Soft Delete & Timestamps
  // ============================================================

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * Check if payment can be refunded
   */
  canBeRefunded(): boolean {
    return (
      this.status === PaymentStatus.COMPLETED &&
      this.refundedAmount < this.amount
    );
  }

  /**
   * Get refundable amount
   */
  getRefundableAmount(): number {
    return this.amount - this.refundedAmount;
  }

  /**
   * Check if payment is fully refunded
   */
  isFullyRefunded(): boolean {
    return this.refundedAmount >= this.amount;
  }

  /**
   * Check if payment is pending
   */
  isPending(): boolean {
    return (
      this.status === PaymentStatus.PENDING ||
      this.status === PaymentStatus.READY ||
      this.status === PaymentStatus.IN_PROGRESS
    );
  }

  /**
   * Check if payment is completed
   */
  isCompleted(): boolean {
    return this.status === PaymentStatus.COMPLETED;
  }

  /**
   * Check if payment failed
   */
  isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }

  /**
   * Get payment age in hours
   */
  getPaymentAgeHours(): number {
    const now = new Date();
    const createdTime = this.createdAt.getTime();
    return (now.getTime() - createdTime) / (1000 * 60 * 60);
  }

  /**
   * Mask sensitive card information
   */
  getMaskedCardInfo(): string | null {
    if (!this.cardLastFourDigits || !this.cardCompany) {
      return null;
    }
    return `${this.cardCompany} **** **** **** ${this.cardLastFourDigits}`;
  }
}
