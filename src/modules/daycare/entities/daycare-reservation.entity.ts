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
import { DaycareCenter, DaycareServiceType } from './daycare-center.entity';
import { User } from '../../users/entities/user.entity';
import { Pet } from '../../pets/entities/pet.entity';

export enum ReservationStatus {
  PENDING = 'pending',             // 예약 대기
  CONFIRMED = 'confirmed',         // 확인 완료
  CHECKED_IN = 'checked_in',       // 입실 완료
  IN_CARE = 'in_care',            // 케어 중
  CHECKED_OUT = 'checked_out',     // 퇴실 완료
  CANCELLED = 'cancelled',         // 취소됨
  NO_SHOW = 'no_show',            // 노쇼
  COMPLETED = 'completed',         // 완료
}

export enum PaymentStatus {
  PENDING = 'pending',             // 결제 대기
  PAID = 'paid',                  // 결제 완료
  PARTIAL = 'partial',            // 부분 결제
  REFUNDED = 'refunded',          // 환불 완료
  FAILED = 'failed',              // 결제 실패
}

@Entity('daycare_reservations')
@Index(['userId', 'status'])
@Index(['daycareId', 'reservationDate'])
@Index(['status', 'reservationDate'])
export class DaycareReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Relations
  // ============================================================

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  petId: string;

  @ManyToOne(() => Pet)
  @JoinColumn({ name: 'petId' })
  pet: Pet;

  @Column({ type: 'uuid' })
  daycareId: string;

  @ManyToOne(() => DaycareCenter, (center) => center.reservations)
  @JoinColumn({ name: 'daycareId' })
  daycareCenter: DaycareCenter;

  // ============================================================
  // Reservation Information
  // ============================================================

  // Removed duplicate @Index() - already part of class-level @Index(['daycareId', 'reservationDate']) and @Index(['status', 'reservationDate'])
  @Column({ type: 'date' })
  reservationDate: Date; // 예약 날짜

  @Column({ type: 'time', nullable: true })
  checkInTime?: string; // 입실 시간 (HH:MM)

  @Column({ type: 'time', nullable: true })
  checkOutTime?: string; // 퇴실 시간 (HH:MM)

  @Column({ type: 'timestamp', nullable: true })
  actualCheckInTime?: Date; // 실제 입실 시간

  @Column({ type: 'timestamp', nullable: true })
  actualCheckOutTime?: Date; // 실제 퇴실 시간

  @Column({
    type: 'enum',
    enum: DaycareServiceType,
  })
  serviceType: DaycareServiceType; // 서비스 타입

  @Column({ type: 'int', nullable: true })
  durationHours?: number; // 시간제인 경우 시간 수

  // ============================================================
  // Pricing & Payment
  // ============================================================

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number; // 기본 요금

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  additionalServicesPrice: number; // 추가 서비스 요금

  @Column({ type: 'jsonb', nullable: true })
  additionalServices?: {
    name: string;
    price: number;
    quantity?: number;
  }[]; // 선택한 추가 서비스

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number; // 할인 금액

  @Column({ type: 'varchar', length: 50, nullable: true })
  discountReason?: string; // 할인 사유 (쿠폰, 프로모션 등)

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number; // 총 금액

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentMethod?: string; // 결제 수단

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentTransactionId?: string; // 결제 트랜잭션 ID

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date; // 결제 완료 시간

  // ============================================================
  // Status & Workflow
  // ============================================================

  // Removed duplicate @Index() - already part of class-level @Index(['userId', 'status']) and @Index(['status', 'reservationDate'])
  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @Column({ type: 'jsonb', nullable: true })
  statusHistory?: {
    status: ReservationStatus;
    timestamp: Date;
    note?: string;
    changedBy?: string; // User ID who changed status
  }[];

  // ============================================================
  // Special Requirements & Notes
  // ============================================================

  @Column({ type: 'text', nullable: true })
  specialRequirements?: string; // 특별 요청사항

  @Column({ type: 'simple-array', nullable: true })
  dietaryRestrictions?: string[]; // 식이 제한사항

  @Column({ type: 'simple-array', nullable: true })
  medicalConditions?: string[]; // 의료 상태

  @Column({ type: 'simple-array', nullable: true })
  behavioralNotes?: string[]; // 행동 특성

  @Column({ type: 'text', nullable: true })
  emergencyContactInfo?: string; // 긴급 연락처 정보

  // ============================================================
  // Daily Activity Report
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  dailyReport?: {
    mealTimes?: {
      time: string;
      foodType: string;
      amountEaten: string; // 'all', 'most', 'half', 'little', 'none'
      notes?: string;
    }[];
    activities?: {
      time: string;
      type: string; // 'play', 'walk', 'rest', 'socialization'
      duration: number; // minutes
      notes?: string;
      photoUrls?: string[];
    }[];
    bathroomBreaks?: {
      time: string;
      type: string; // 'pee', 'poo', 'both'
      notes?: string;
    }[];
    behaviorObservations?: {
      time: string;
      observation: string;
      severity?: string; // 'normal', 'concerning', 'urgent'
    }[];
    healthCheck?: {
      temperature?: number;
      appetite: string; // 'good', 'normal', 'poor'
      energy: string; // 'high', 'normal', 'low'
      stressLevel: string; // 'calm', 'normal', 'anxious', 'stressed'
      notes?: string;
    };
    mediaUrls?: string[]; // 사진/영상 URLs
    overallNotes?: string;
    staffName?: string; // 작성자
    reportGeneratedAt?: Date;
  };

  // ============================================================
  // Pickup/Drop-off
  // ============================================================

  @Column({ type: 'boolean', default: false })
  needsPickup: boolean; // 픽업 서비스 필요 여부

  @Column({ type: 'boolean', default: false })
  needsDropOff: boolean; // 드롭 서비스 필요 여부

  @Column({ type: 'varchar', length: 500, nullable: true })
  pickupAddress?: string; // 픽업 주소

  @Column({ type: 'varchar', length: 500, nullable: true })
  dropOffAddress?: string; // 드롭 주소

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  transportationFee?: number; // 교통비

  // ============================================================
  // Cancellation
  // ============================================================

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cancelledBy?: string; // User ID who cancelled

  @Column({ type: 'text', nullable: true })
  cancellationReason?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cancellationFee?: number;

  @Column({ type: 'boolean', default: false })
  isRefunded: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundAmount?: number;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt?: Date;

  // ============================================================
  // Reviews & Ratings
  // ============================================================

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating?: number; // 평점 (0.00 ~ 5.00)

  @Column({ type: 'text', nullable: true })
  review?: string; // 리뷰 내용

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  // ============================================================
  // Metadata
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // 추가 정보

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
   * Check if reservation can be cancelled
   */
  canBeCancelled(): boolean {
    const cancellableStatuses = [
      ReservationStatus.PENDING,
      ReservationStatus.CONFIRMED,
    ];
    return cancellableStatuses.includes(this.status);
  }

  /**
   * Check if reservation is active (checked in)
   */
  isActive(): boolean {
    return [
      ReservationStatus.CHECKED_IN,
      ReservationStatus.IN_CARE,
    ].includes(this.status);
  }

  /**
   * Check if reservation is completed
   */
  isCompleted(): boolean {
    return this.status === ReservationStatus.COMPLETED;
  }

  /**
   * Calculate actual duration in hours
   */
  getActualDurationHours(): number | null {
    if (!this.actualCheckInTime || !this.actualCheckOutTime) return null;
    const diff = this.actualCheckOutTime.getTime() - this.actualCheckInTime.getTime();
    return Math.round(diff / (1000 * 60 * 60) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Add activity to daily report
   */
  addActivity(activity: {
    time: string;
    type: string;
    duration: number;
    notes?: string;
    photoUrls?: string[];
  }): void {
    if (!this.dailyReport) {
      this.dailyReport = { activities: [] };
    }
    if (!this.dailyReport.activities) {
      this.dailyReport.activities = [];
    }
    this.dailyReport.activities.push(activity);
  }

  /**
   * Update status with history tracking
   */
  updateStatus(
    newStatus: ReservationStatus,
    note?: string,
    changedBy?: string,
  ): void {
    if (!this.statusHistory) {
      this.statusHistory = [];
    }

    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      note,
      changedBy,
    });

    this.status = newStatus;

    // Update timestamps based on status
    if (newStatus === ReservationStatus.CHECKED_IN && !this.actualCheckInTime) {
      this.actualCheckInTime = new Date();
    }
    if (newStatus === ReservationStatus.CHECKED_OUT && !this.actualCheckOutTime) {
      this.actualCheckOutTime = new Date();
    }
    if (newStatus === ReservationStatus.CANCELLED && !this.cancelledAt) {
      this.cancelledAt = new Date();
    }
  }

  /**
   * Calculate days until reservation
   */
  getDaysUntilReservation(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reservationDate = new Date(this.reservationDate);
    reservationDate.setHours(0, 0, 0, 0);
    const diff = reservationDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
