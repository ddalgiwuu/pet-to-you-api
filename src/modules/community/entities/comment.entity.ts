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
  Tree,
  TreeParent,
  TreeChildren,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CommunityPost } from './community-post.entity';
import { Like } from './like.entity';
import { ModerationStatus } from '../enums/moderation-status.enum';

@Entity('comments')
@Tree('materialized-path')
@Index(['postId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['isDeleted', 'moderationStatus'])
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Relationships
  // ============================================================

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  author: User;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => CommunityPost, (post) => post.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'post_id' })
  post: CommunityPost;

  @Column({ type: 'uuid' })
  @Index()
  postId: string;

  // Tree structure for nested replies
  @TreeParent()
  parentComment?: Comment;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  parentCommentId?: string;

  @TreeChildren()
  replies: Comment[];

  @OneToMany(() => Like, (like) => like.comment)
  likes: Like[];

  // ============================================================
  // Content
  // ============================================================

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-array', nullable: true })
  imageUrls?: string[];

  // ============================================================
  // Engagement Metrics (Denormalized)
  // ============================================================

  @Column({ type: 'int', default: 0 })
  @Index()
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  replyCount: number;

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
  isPinned: boolean; // Author or admin can pin best comments

  @Column({ type: 'boolean', default: false })
  isAuthorReply: boolean; // Mark if comment is from post author

  @Column({ type: 'int', default: 0 })
  depth: number; // Nesting level (0 = top-level, 1 = first reply, etc.)

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
   * Check if comment is visible to public
   */
  isVisible(): boolean {
    return (
      !this.isDeleted &&
      this.moderationStatus === ModerationStatus.APPROVED
    );
  }

  /**
   * Check if comment needs moderation
   */
  needsModeration(): boolean {
    return (
      this.moderationStatus === ModerationStatus.PENDING ||
      this.moderationStatus === ModerationStatus.FLAGGED ||
      this.reportCount >= 3
    );
  }

  /**
   * Check if comment is a top-level comment
   */
  isTopLevel(): boolean {
    return !this.parentCommentId && this.depth === 0;
  }

  /**
   * Mark as edited
   */
  markAsEdited(): void {
    this.isEdited = true;
    this.editedAt = new Date();
  }

  /**
   * Update engagement counts
   */
  updateEngagementCounts(likes: number, replies: number): void {
    this.likeCount = likes;
    this.replyCount = replies;
  }
}
