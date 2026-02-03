import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CommunityPost } from './community-post.entity';
import { Comment } from './comment.entity';
import { Review } from './review.entity';

export enum LikeResourceType {
  POST = 'post',
  COMMENT = 'comment',
  REVIEW = 'review',
}

@Entity('likes')
@Index(['resourceType', 'resourceId', 'userId'])
@Unique(['resourceType', 'resourceId', 'userId']) // Prevent duplicate likes
export class Like {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // User Relationship
  // ============================================================

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  // ============================================================
  // Polymorphic Relationship
  // ============================================================

  @Column({
    type: 'enum',
    enum: LikeResourceType,
  })
  @Index()
  resourceType: LikeResourceType;

  @Column({ type: 'uuid' })
  @Index()
  resourceId: string;

  // Specific relationships (nullable - only one will be populated)
  @ManyToOne(() => CommunityPost, (post) => post.likes, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'post_id' })
  post?: CommunityPost;

  @Column({ type: 'uuid', nullable: true })
  postId?: string;

  @ManyToOne(() => Comment, (comment) => comment.likes, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'comment_id' })
  comment?: Comment;

  @Column({ type: 'uuid', nullable: true })
  commentId?: string;

  @ManyToOne(() => Review, (review) => review.likes, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'review_id' })
  review?: Review;

  @Column({ type: 'uuid', nullable: true })
  reviewId?: string;

  // ============================================================
  // Metadata
  // ============================================================

  @CreateDateColumn()
  createdAt: Date;

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * Set the appropriate resource relationship
   */
  setResource(
    resourceType: LikeResourceType,
    resourceId: string,
    resource?: CommunityPost | Comment | Review,
  ): void {
    this.resourceType = resourceType;
    this.resourceId = resourceId;

    switch (resourceType) {
      case LikeResourceType.POST:
        this.postId = resourceId;
        if (resource) this.post = resource as CommunityPost;
        break;
      case LikeResourceType.COMMENT:
        this.commentId = resourceId;
        if (resource) this.comment = resource as Comment;
        break;
      case LikeResourceType.REVIEW:
        this.reviewId = resourceId;
        if (resource) this.review = resource as Review;
        break;
    }
  }
}
