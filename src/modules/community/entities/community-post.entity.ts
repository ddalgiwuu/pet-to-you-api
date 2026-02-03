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
import { Pet } from '../../pets/entities/pet.entity';
import { Comment } from './comment.entity';
import { Like } from './like.entity';
import { ModerationStatus } from '../enums/moderation-status.enum';

export enum PostCategory {
  TIP_INFO = 'tip_info',           // 팁/정보
  QUESTION = 'question',            // 질문
  SHOW_OFF = 'show_off',            // 자랑
  HOSPITAL_REVIEW = 'hospital_review', // 병원후기
  DAYCARE_REVIEW = 'daycare_review',   // 유치원후기
  ADOPTION_REVIEW = 'adoption_review', // 입양후기
}

@Entity('community_posts')
@Index(['category', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['isDeleted', 'moderationStatus', 'createdAt'])
@Index(['isPinned', 'createdAt'])
export class CommunityPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Relationships
  // ============================================================

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  author: User;

  // Removed duplicate @Index() - already part of class-level @Index(['userId', 'createdAt'])
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Pet, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pet_id' })
  pet?: Pet;

  // Index defined for querying posts by pet
  @Column({ type: 'uuid', nullable: true })
  @Index()
  petId?: string;

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @OneToMany(() => Like, (like) => like.post)
  likes: Like[];

  // ============================================================
  // Content
  // ============================================================

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  // Removed duplicate @Index() - already part of class-level @Index(['category', 'createdAt'])
  @Column({
    type: 'enum',
    enum: PostCategory,
  })
  category: PostCategory;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ type: 'simple-array', nullable: true })
  imageUrls?: string[];

  @Column({ type: 'simple-array', nullable: true })
  videoUrls?: string[];

  // ============================================================
  // Engagement Metrics (Denormalized)
  // ============================================================

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  // Index defined for sorting posts by popularity
  @Column({ type: 'int', default: 0 })
  @Index()
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  commentCount: number;

  @Column({ type: 'int', default: 0 })
  shareCount: number;

  // ============================================================
  // Features
  // ============================================================

  // Removed duplicate @Index() - already part of class-level @Index(['isPinned', 'createdAt'])
  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'timestamp', nullable: true })
  pinnedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  featuredAt?: Date;

  // ============================================================
  // Moderation
  // ============================================================

  // Removed duplicate @Index() - already part of class-level @Index(['isDeleted', 'moderationStatus', 'createdAt'])
  @Column({
    type: 'enum',
    enum: ModerationStatus,
    default: ModerationStatus.APPROVED,
  })
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
  // SEO & Search
  // ============================================================

  // Index defined for SEO-friendly URL lookups
  @Column({ type: 'varchar', length: 200, nullable: true })
  @Index()
  slug?: string;

  @Column({ type: 'text', nullable: true })
  metaDescription?: string;

  // For trending calculation: score = (likes * 2 + comments * 3 + views * 0.1) / ageInHours
  // Index defined for trending posts queries
  @Column({ type: 'float', default: 0 })
  @Index()
  trendingScore: number;

  @Column({ type: 'timestamp', nullable: true })
  lastTrendingUpdate?: Date;

  // ============================================================
  // Metadata
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Removed duplicate @Index() - already part of class-level @Index(['isDeleted', 'moderationStatus', 'createdAt'])
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
   * Calculate trending score
   * Formula: (likes * 2 + comments * 3 + views * 0.1) / ageInHours^1.5
   */
  calculateTrendingScore(): number {
    const now = new Date();
    const ageInHours =
      (now.getTime() - this.createdAt.getTime()) / (1000 * 60 * 60);

    if (ageInHours < 1) {
      // Boost very new posts
      return (this.likeCount * 2 + this.commentCount * 3 + this.viewCount * 0.1) * 10;
    }

    const agePenalty = Math.pow(ageInHours, 1.5);
    return (
      (this.likeCount * 2 + this.commentCount * 3 + this.viewCount * 0.1) /
      agePenalty
    );
  }

  /**
   * Check if post needs moderation
   */
  needsModeration(): boolean {
    return (
      this.moderationStatus === ModerationStatus.PENDING ||
      this.moderationStatus === ModerationStatus.FLAGGED ||
      this.reportCount >= 5
    );
  }

  /**
   * Check if post is visible to public
   */
  isVisible(): boolean {
    return (
      !this.isDeleted &&
      this.moderationStatus === ModerationStatus.APPROVED
    );
  }

  /**
   * Increment view count
   */
  incrementViewCount(): void {
    this.viewCount++;
  }

  /**
   * Update engagement counts
   */
  updateEngagementCounts(
    likes: number,
    comments: number,
    shares: number,
  ): void {
    this.likeCount = likes;
    this.commentCount = comments;
    this.shareCount = shares;
  }
}
