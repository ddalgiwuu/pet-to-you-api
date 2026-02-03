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
import { Hospital } from '../../hospitals/entities/hospital.entity';

export enum BookingType {
  CONSULTATION = 'consultation',     // 일반 진료
  VACCINATION = 'vaccination',       // 예방접종
  SURGERY = 'surgery',               // 수술
  GROOMING = 'grooming',             // 미용
  DAYCARE = 'daycare',               // 유치원
  HOTEL = 'hotel',                   // 호텔 (숙박)
  EMERGENCY = 'emergency',           // 응급진료
  CHECKUP = 'checkup',               // 건강검진
}

export enum BookingStatus {
  PENDING = 'pending',               // 예약 대기
  CONFIRMED = 'confirmed',           // 예약 확정
  IN_PROGRESS = 'in_progress',       // 진행중
  COMPLETED = 'completed',           // 완료
  CANCELLED = 'cancelled',           // 취소
  NO_SHOW = 'no_show',               // 노쇼
}

export enum PaymentStatus {
  PENDING = 'pending',               // 결제 대기
  PAID = 'paid',                     // 결제 완료
  REFUNDED = 'refunded',             // 환불 완료
  FAILED = 'failed',                 // 결제 실패
}

@Entity('bookings')
@Index(['userId', 'status'])
@Index(['hospitalId', 'startDateTime'])
@Index(['status', 'startDateTime'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Relations
  // ============================================================

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Removed duplicate @Index() - already part of class-level @Index(['userId', 'status'])
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Pet, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pet_id' })
  pet?: Pet;

  @Column({ type: 'uuid', nullable: true })
  petId?: string;

  // ============================================================
  // Polymorphic Resource (Hospital, Daycare, etc.)
  // ============================================================

  // Index defined for querying by resource type
  @Column({ type: 'varchar', length: 50 })
  @Index()
  resourceType: string; // 'hospital', 'daycare', 'grooming_salon'

  // Index defined for querying by resource ID
  @Column({ type: 'uuid' })
  @Index()
  resourceId: string; // ID of the resource

  // Denormalized relation for convenience (can be null for non-hospital bookings)
  @ManyToOne(() => Hospital, (hospital) => hospital.bookings, { nullable: true })
  @JoinColumn({ name: 'hospital_id' })
  hospital?: Hospital;

  @Column({ type: 'uuid', nullable: true })
  hospitalId?: string;

  // ============================================================
  // Booking Details
  // ============================================================

  // Removed duplicate @Index() - unique constraint already creates index
  @Column({ type: 'varchar', length: 30, unique: true })
  bookingNumber: string; // BOK-20240117-1234

  // Index defined for querying by type
  @Column({
    type: 'enum',
    enum: BookingType,
  })
  @Index()
  type: BookingType;

  // Removed duplicate @Index() - already part of class-level indexes
  @Column({ type: 'timestamp' })
  startDateTime: Date; // KST

  @Column({ type: 'timestamp' })
  endDateTime: Date; // KST

  @Column({ type: 'int' })
  durationMinutes: number;

  // ============================================================
  // Status
  // ============================================================

  // Removed duplicate @Index() - already part of class-level @Index(['status', 'startDateTime']) and @Index(['userId', 'status'])
  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ type: 'text', nullable: true })
  cancellationReason?: string;

  // ============================================================
  // Service Details
  // ============================================================

  @Column({ type: 'text', nullable: true })
  notes?: string; // 고객 요청사항

  @Column({ type: 'simple-array', nullable: true })
  services?: string[]; // ['일반진료', '예방접종', 'X-ray']

  // ============================================================
  // Payment (PCI-DSS Compliance)
  // ============================================================

  @Column({ type: 'int', default: 0 })
  estimatedPrice: number; // 예상 금액

  @Column({ type: 'int', default: 0 })
  finalPrice: number; // 최종 금액

  // Index defined for querying by payment status
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  @Index()
  paymentStatus: PaymentStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentId?: string; // Toss Payments transaction ID

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string; // 'card', 'transfer', 'cash'

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  // ============================================================
  // Reminders & Notifications
  // ============================================================

  @Column({ type: 'boolean', default: false })
  reminderSent: boolean; // 알림 발송 여부 (예약 1일 전)

  @Column({ type: 'timestamp', nullable: true })
  reminderSentAt?: Date;

  @Column({ type: 'boolean', default: false })
  confirmationSent: boolean; // 예약 확정 알림

  @Column({ type: 'timestamp', nullable: true })
  confirmationSentAt?: Date;

  // ============================================================
  // Distributed Lock (Prevent Double-booking)
  // ============================================================

  @Column({ type: 'varchar', length: 200, nullable: true })
  lockKey?: string; // Redis lock key: booking:lock:{resourceType}:{resourceId}:{startDateTime}

  @Column({ type: 'timestamp', nullable: true })
  lockExpiresAt?: Date; // Lock expiration timestamp

  // ============================================================
  // Metadata & Audit
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // 추가 정보 (확장 가능)

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
   * Check if booking can be cancelled
   */
  canBeCancelled(): boolean {
    if (this.status === BookingStatus.COMPLETED || this.status === BookingStatus.CANCELLED) {
      return false;
    }

    // Cannot cancel if booking starts in less than 2 hours
    const now = new Date();
    const timeDiff = this.startDateTime.getTime() - now.getTime();
    const hoursUntilBooking = timeDiff / (1000 * 60 * 60);

    return hoursUntilBooking >= 2;
  }

  /**
   * Check if booking is upcoming (within next 24 hours)
   */
  isUpcoming(): boolean {
    const now = new Date();
    const timeDiff = this.startDateTime.getTime() - now.getTime();
    const hoursUntilBooking = timeDiff / (1000 * 60 * 60);

    return hoursUntilBooking > 0 && hoursUntilBooking <= 24;
  }

  /**
   * Check if booking is in the past
   */
  isPast(): boolean {
    const now = new Date();
    return this.endDateTime < now;
  }

  /**
   * Get booking duration in hours
   */
  getDurationHours(): number {
    return this.durationMinutes / 60;
  }

  /**
   * Get refund eligibility (based on cancellation time)
   */
  getRefundPercentage(): number {
    if (!this.canBeCancelled()) return 0;

    const now = new Date();
    const timeDiff = this.startDateTime.getTime() - now.getTime();
    const hoursUntilBooking = timeDiff / (1000 * 60 * 60);

    // 100% refund if cancelled 24+ hours before
    if (hoursUntilBooking >= 24) return 100;

    // 50% refund if cancelled 2-24 hours before
    if (hoursUntilBooking >= 2) return 50;

    // No refund if less than 2 hours
    return 0;
  }
}
