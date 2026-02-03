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
import { Pet } from '../../pets/entities/pet.entity';
import { InsurancePolicy } from './insurance-policy.entity';

/**
 * 가입 상태
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',           // 활성
  PENDING = 'pending',         // 승인 대기
  EXPIRED = 'expired',         // 만료
  CANCELLED = 'cancelled',     // 취소
  SUSPENDED = 'suspended',     // 일시 중단
}

/**
 * 결제 상태
 */
export enum PaymentStatus {
  PAID = 'paid',               // 납부 완료
  PENDING = 'pending',         // 납부 대기
  OVERDUE = 'overdue',         // 연체
  FAILED = 'failed',           // 결제 실패
}

/**
 * 결제 주기
 */
export enum PaymentCycle {
  MONTHLY = 'monthly',         // 월납
  QUARTERLY = 'quarterly',     // 분기납
  SEMI_ANNUAL = 'semi_annual', // 반기납
  ANNUAL = 'annual',           // 연납
}

/**
 * 사용자 보험 가입 정보 엔티티
 *
 * 사용자가 특정 반려동물에 대해 보험 정책을 구독하는 관계
 */
@Entity('user_insurance')
@Index(['userId', 'status'])
@Index(['petId', 'status'])
@Index(['policyId', 'status'])
// Note: subscriptionNumber unique constraint creates index automatically
export class UserInsurance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // 가입 기본 정보
  // ============================================================

  // Note: unique: true creates index automatically - no duplicate @Index() needed
  @Column({ type: 'varchar', length: 50, unique: true })
  subscriptionNumber: string; // 증권 번호 (예: SUB-2024-001234)

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING,
  })
  @Index()
  status: SubscriptionStatus;

  // ============================================================
  // 관계 (User, Pet, Policy)
  // ============================================================

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => Pet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pet_id' })
  pet: Pet;

  @Column({ type: 'uuid' })
  @Index()
  petId: string;

  @ManyToOne(() => InsurancePolicy)
  @JoinColumn({ name: 'policy_id' })
  policy: InsurancePolicy;

  @Column({ type: 'uuid' })
  @Index()
  policyId: string;

  // ============================================================
  // 가입 기간
  // ============================================================

  @Column({ type: 'date' })
  @Index()
  startDate: Date; // 보장 시작일

  @Column({ type: 'date' })
  @Index()
  endDate: Date; // 보장 종료일

  @Column({ type: 'timestamp', nullable: true })
  activatedAt?: Date; // 활성화 시간

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date; // 취소 시간

  @Column({ type: 'text', nullable: true })
  cancellationReason?: string; // 취소 사유

  // ============================================================
  // 보험료 정보
  // ============================================================

  @Column({
    type: 'enum',
    enum: PaymentCycle,
    default: PaymentCycle.MONTHLY,
  })
  paymentCycle: PaymentCycle; // 납부 주기

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  premiumAmount: number; // 보험료 (원)

  @Column({ type: 'date', nullable: true })
  @Index()
  nextPaymentDate?: Date; // 다음 납부일

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  // ============================================================
  // 특약 정보
  // ============================================================

  @Column({ type: 'simple-array', nullable: true })
  selectedSpecialClauses?: string[]; // 선택한 특약 목록

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  specialClausePremium?: number; // 특약 보험료

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPremium: number; // 총 보험료 (기본 + 특약)

  // ============================================================
  // 보장 내용 (스냅샷)
  // ============================================================

  /**
   * 가입 시점의 보장 내용 스냅샷
   * (정책이 변경되어도 기존 가입자는 원래 조건 유지)
   */
  @Column({ type: 'jsonb' })
  coverageSnapshot: {
    maxCoveragePerYear: number;
    maxCoveragePerAccident: number;
    coveragePercentage: number;
    deductible: number;
    deductiblePercentage: number;
    coverageTypes: string[];
    waitingPeriodDays: number;
    surgeryWaitingPeriodDays: number;
  };

  // ============================================================
  // 청구 이력 통계
  // ============================================================

  @Column({ type: 'int', default: 0 })
  totalClaims: number; // 총 청구 건수

  @Column({ type: 'int', default: 0 })
  approvedClaims: number; // 승인된 청구 건수

  @Column({ type: 'int', default: 0 })
  rejectedClaims: number; // 거부된 청구 건수

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalClaimedAmount: number; // 총 청구 금액

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalPaidAmount: number; // 총 지급 금액

  @Column({ type: 'date', nullable: true })
  lastClaimDate?: Date; // 마지막 청구 날짜

  // ============================================================
  // 갱신 정보
  // ============================================================

  @Column({ type: 'boolean', default: true })
  autoRenewal: boolean; // 자동 갱신 여부

  @Column({ type: 'int', default: 0 })
  renewalCount: number; // 갱신 횟수

  @Column({ type: 'timestamp', nullable: true })
  lastRenewalDate?: Date; // 마지막 갱신일

  @Column({ type: 'timestamp', nullable: true })
  renewalNotificationSentAt?: Date; // 갱신 알림 발송 시간

  // ============================================================
  // 결제 정보
  // ============================================================

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string; // 결제 수단

  @Column({ type: 'varchar', length: 100, nullable: true })
  billingKey?: string; // 자동 결제 키 (암호화 필요)

  @Column({ type: 'jsonb', nullable: true })
  paymentHistory?: Array<{
    date: Date;
    amount: number;
    status: PaymentStatus;
    method: string;
    transactionId?: string;
  }>;

  // ============================================================
  // 추가 정보
  // ============================================================

  @Column({ type: 'text', nullable: true })
  notes?: string; // 메모

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // 확장 가능 메타데이터

  // ============================================================
  // Timestamps
  // ============================================================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * 활성 상태 확인
   */
  isActive(): boolean {
    if (this.status !== SubscriptionStatus.ACTIVE) {
      return false;
    }

    const today = new Date();
    return today >= this.startDate && today <= this.endDate;
  }

  /**
   * 만료 여부 확인
   */
  isExpired(): boolean {
    const today = new Date();
    return today > this.endDate;
  }

  /**
   * 갱신 필요 여부 (30일 이내 만료)
   */
  needsRenewal(): boolean {
    if (!this.isActive()) return false;

    const today = new Date();
    const daysUntilExpiry = Math.floor(
      (this.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysUntilExpiry <= 30;
  }

  /**
   * 대기 기간 경과 여부
   */
  hasWaitingPeriodPassed(): boolean {
    if (!this.activatedAt) return false;

    const today = new Date();
    const activationDate = new Date(this.activatedAt);
    const waitingPeriodDays = this.coverageSnapshot.waitingPeriodDays || 0;

    const daysSinceActivation = Math.floor(
      (today.getTime() - activationDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysSinceActivation >= waitingPeriodDays;
  }

  /**
   * 연간 최대 보장액 잔여 금액
   */
  getRemainingCoverage(): number {
    const maxCoverage = this.coverageSnapshot.maxCoveragePerYear;
    return Math.max(0, maxCoverage - this.totalPaidAmount);
  }

  /**
   * 청구 승인율
   */
  getApprovalRate(): number {
    if (this.totalClaims === 0) return 0;
    return (this.approvedClaims / this.totalClaims) * 100;
  }

  /**
   * 월 평균 보험료 계산
   */
  getMonthlyPremium(): number {
    switch (this.paymentCycle) {
      case PaymentCycle.MONTHLY:
        return this.totalPremium;
      case PaymentCycle.QUARTERLY:
        return this.totalPremium / 3;
      case PaymentCycle.SEMI_ANNUAL:
        return this.totalPremium / 6;
      case PaymentCycle.ANNUAL:
        return this.totalPremium / 12;
      default:
        return this.totalPremium;
    }
  }

  /**
   * 갱신 처리
   */
  renew(newEndDate: Date): void {
    this.startDate = this.endDate;
    this.endDate = newEndDate;
    this.renewalCount += 1;
    this.lastRenewalDate = new Date();
    this.status = SubscriptionStatus.ACTIVE;
  }

  /**
   * 취소 처리
   */
  cancel(reason?: string): void {
    this.status = SubscriptionStatus.CANCELLED;
    this.cancelledAt = new Date();
    if (reason) {
      this.cancellationReason = reason;
    }
  }

  /**
   * 청구 이력 업데이트
   */
  updateClaimStats(
    claimAmount: number,
    paidAmount: number,
    approved: boolean,
  ): void {
    this.totalClaims += 1;

    if (approved) {
      this.approvedClaims += 1;
      this.totalPaidAmount += paidAmount;
    } else {
      this.rejectedClaims += 1;
    }

    this.totalClaimedAmount += claimAmount;
    this.lastClaimDate = new Date();
  }
}
