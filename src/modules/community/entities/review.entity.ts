import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Hospital } from '../../hospitals/entities/hospital.entity';
import { DaycareCenter } from '../../daycare/entities/daycare-center.entity';
import { Like } from './like.entity';
import { ModerationStatus } from '../enums/moderation-status.enum';

export enum ReviewType {
  HOSPITAL = 'hospital',
  DAYCARE = 'daycare',
  SHELTER = 'shelter',
}

export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  VERIFIED = 'verified',
  PENDING = 'pending',
}

@Entity('reviews')
@Index(['resourceType', 'resourceId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['rating', 'createdAt'])
@Index(['isDeleted', 'moderationStatus'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Relationships
  // ============================================================

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  reviewer: User;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  // Polymorphic relationship to different resource types
  @Column({
    type: 'enum',
    enum: ReviewType,
  })
  @Index()
  resourceType: ReviewType;

  @Column({ type: 'uuid' })
  @Index()
  resourceId: string;

  @ManyToOne(() => Hospital, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hospital_id' })
  hospital?: Hospital;

  @Column({ type: 'uuid', nullable: true })
  hospitalId?: string;

  @ManyToOne(() => DaycareCenter, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'daycare_id' })
  daycareCenter?: DaycareCenter;

  @Column({ type: 'uuid', nullable: true })
  daycareId?: string;

  @OneToMany(() => Like, (like) => like.review)
  likes: Like[];

  // ============================================================
  // Rating & Content
  // ============================================================

  @Column({ type: 'int' })
  @Index()
  rating: number; // 1-5 stars

  @Column({ type: 'varchar', length: 200, nullable: true })
  title?: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-array', nullable: true })
  photoUrls?: string[];

  // ============================================================
  // Detailed Ratings (Optional)
  // ============================================================

  @Column({ type: 'int', nullable: true })
  serviceRating?: number; // 서비스 품질

  @Column({ type: 'int', nullable: true })
  facilityRating?: number; // 시설 품질

  @Column({ type: 'int', nullable: true })
  priceRating?: number; // 가격 대비 만족도

  @Column({ type: 'int', nullable: true })
  staffRating?: number; // 직원 친절도

  @Column({ type: 'int', nullable: true })
  cleanlinessRating?: number; // 청결도

  // ============================================================
  // Verification
  // ============================================================

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.UNVERIFIED,
  })
  @Index()
  verificationStatus: VerificationStatus;

  @Column({ type: 'boolean', default: false })
  isVerifiedVisit: boolean; // Verified through booking system

  @Column({ type: 'uuid', nullable: true })
  bookingId?: string; // Link to booking if verified

  @Column({ type: 'date', nullable: true })
  visitDate?: Date;

  // ============================================================
  // Engagement Metrics (Denormalized)
  // ============================================================

  @Column({ type: 'int', default: 0 })
  @Index()
  helpfulCount: number; // "도움이 됐어요" votes

  @Column({ type: 'int', default: 0 })
  unhelpfulCount: number;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  // ============================================================
  // Response from Business/Admin
  // ============================================================

  @Column({ type: 'boolean', default: false })
  hasResponse: boolean;

  @Column({ type: 'text', nullable: true })
  responseContent?: string;

  @Column({ type: 'uuid', nullable: true })
  respondedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt?: Date;

  // ============================================================
  // Moderation
  // ============================================================

  @Column({
    type: 'enum',
    enum: ModerationStatus,
    default: ModerationStatus.APPROVED,
  })
  @Index()
  moderationStatus: ModerationStatus;

  @Column({ type: 'int', default: 0 })
  reportCount: number;

  @Column({ type: 'text', nullable: true })
  moderationNotes?: string;

  @Column({ type: 'uuid', nullable: true })
  moderatedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  moderatedAt?: Date;

  // ============================================================
  // Features
  // ============================================================

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean; // Highlighted by admin

  @Column({ type: 'boolean', default: false })
  isRecommended: boolean; // Recommended by system

  // ============================================================
  // Metadata
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  @Index()
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @Column({ type: 'boolean', default: false })
  isEdited: boolean;

  @Column({ type: 'timestamp', nullable: true })
  editedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * Check if review is visible to public
   */
  isVisible(): boolean {
    return (
      !this.isDeleted &&
      this.moderationStatus === ModerationStatus.APPROVED
    );
  }

  /**
   * Check if review needs moderation
   */
  needsModeration(): boolean {
    return (
      this.moderationStatus === ModerationStatus.PENDING ||
      this.moderationStatus === ModerationStatus.FLAGGED ||
      this.reportCount >= 3
    );
  }

  /**
   * Calculate average rating if detailed ratings exist
   */
  calculateAverageDetailedRating(): number | null {
    const ratings = [
      this.serviceRating,
      this.facilityRating,
      this.priceRating,
      this.staffRating,
      this.cleanlinessRating,
    ].filter((r) => r !== null && r !== undefined);

    if (ratings.length === 0) return null;

    return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  }

  /**
   * Check if review is helpful
   */
  isHelpful(): boolean {
    return this.helpfulCount > this.unhelpfulCount * 2;
  }

  /**
   * Mark as edited
   */
  markAsEdited(): void {
    this.isEdited = true;
    this.editedAt = new Date();
  }

  /**
   * Add business response
   */
  addResponse(content: string, responderId: string): void {
    this.hasResponse = true;
    this.responseContent = content;
    this.respondedBy = responderId;
    this.respondedAt = new Date();
  }

  /**
   * Update engagement counts
   */
  updateEngagementCounts(helpful: number, unhelpful: number, views: number): void {
    this.helpfulCount = helpful;
    this.unhelpfulCount = unhelpful;
    this.viewCount = views;
  }
}
