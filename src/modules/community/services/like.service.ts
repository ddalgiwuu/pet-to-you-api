import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Like, LikeResourceType } from '../entities/like.entity';
import { CommunityPost } from '../entities/community-post.entity';
import { Comment } from '../entities/comment.entity';
import { Review } from '../entities/review.entity';

@Injectable()
export class LikeService {
  constructor(
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(CommunityPost)
    private readonly postRepository: Repository<CommunityPost>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  /**
   * Like a resource (post, comment, or review)
   */
  async likeResource(
    userId: string,
    resourceType: LikeResourceType,
    resourceId: string,
  ): Promise<Like> {
    // Check if already liked
    const existing = await this.likeRepository.findOne({
      where: {
        userId,
        resourceType,
        resourceId,
      },
    });

    if (existing) {
      throw new ConflictException('You have already liked this resource');
    }

    // Verify resource exists
    await this.verifyResourceExists(resourceType, resourceId);

    // Create like
    const like = this.likeRepository.create({
      userId,
      resourceType,
      resourceId,
    });

    // Set specific resource relationship
    like.setResource(resourceType, resourceId);

    const savedLike = await this.likeRepository.save(like);

    // Update like count on resource
    await this.updateLikeCount(resourceType, resourceId, 1);

    return savedLike;
  }

  /**
   * Unlike a resource
   */
  async unlikeResource(
    userId: string,
    resourceType: LikeResourceType,
    resourceId: string,
  ): Promise<void> {
    const like = await this.likeRepository.findOne({
      where: {
        userId,
        resourceType,
        resourceId,
      },
    });

    if (!like) {
      throw new NotFoundException('Like not found');
    }

    await this.likeRepository.remove(like);

    // Update like count on resource
    await this.updateLikeCount(resourceType, resourceId, -1);
  }

  /**
   * Toggle like status
   */
  async toggleLike(
    userId: string,
    resourceType: LikeResourceType,
    resourceId: string,
  ): Promise<{ liked: boolean; likeCount: number }> {
    const existing = await this.likeRepository.findOne({
      where: {
        userId,
        resourceType,
        resourceId,
      },
    });

    if (existing) {
      // Unlike
      await this.unlikeResource(userId, resourceType, resourceId);
      const likeCount = await this.getLikeCount(resourceType, resourceId);
      return { liked: false, likeCount };
    } else {
      // Like
      await this.likeResource(userId, resourceType, resourceId);
      const likeCount = await this.getLikeCount(resourceType, resourceId);
      return { liked: true, likeCount };
    }
  }

  /**
   * Check if user has liked a resource
   */
  async hasUserLiked(
    userId: string,
    resourceType: LikeResourceType,
    resourceId: string,
  ): Promise<boolean> {
    const like = await this.likeRepository.findOne({
      where: {
        userId,
        resourceType,
        resourceId,
      },
    });

    return !!like;
  }

  /**
   * Get like count for a resource
   */
  async getLikeCount(
    resourceType: LikeResourceType,
    resourceId: string,
  ): Promise<number> {
    return this.likeRepository.count({
      where: {
        resourceType,
        resourceId,
      },
    });
  }

  /**
   * Get all likes by a user
   */
  async getUserLikes(
    userId: string,
    resourceType?: LikeResourceType,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Like[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (resourceType) where.resourceType = resourceType;

    const [data, total] = await this.likeRepository.findAndCount({
      where,
      relations: ['post', 'comment', 'review'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get users who liked a resource
   */
  async getResourceLikes(
    resourceType: LikeResourceType,
    resourceId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Like[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.likeRepository.findAndCount({
      where: {
        resourceType,
        resourceId,
      },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Verify that the resource exists
   */
  private async verifyResourceExists(
    resourceType: LikeResourceType,
    resourceId: string,
  ): Promise<void> {
    let exists = false;

    switch (resourceType) {
      case LikeResourceType.POST:
        exists = !!(await this.postRepository.findOne({
          where: { id: resourceId, isDeleted: false },
        }));
        break;
      case LikeResourceType.COMMENT:
        exists = !!(await this.commentRepository.findOne({
          where: { id: resourceId, isDeleted: false },
        }));
        break;
      case LikeResourceType.REVIEW:
        exists = !!(await this.reviewRepository.findOne({
          where: { id: resourceId, isDeleted: false },
        }));
        break;
    }

    if (!exists) {
      throw new NotFoundException('Resource not found');
    }
  }

  /**
   * Update like count on the resource
   */
  private async updateLikeCount(
    resourceType: LikeResourceType,
    resourceId: string,
    delta: number,
  ): Promise<void> {
    switch (resourceType) {
      case LikeResourceType.POST:
        if (delta > 0) {
          await this.postRepository.increment({ id: resourceId }, 'likeCount', delta);
        } else {
          await this.postRepository.decrement(
            { id: resourceId },
            'likeCount',
            Math.abs(delta),
          );
        }
        break;
      case LikeResourceType.COMMENT:
        if (delta > 0) {
          await this.commentRepository.increment(
            { id: resourceId },
            'likeCount',
            delta,
          );
        } else {
          await this.commentRepository.decrement(
            { id: resourceId },
            'likeCount',
            Math.abs(delta),
          );
        }
        break;
      case LikeResourceType.REVIEW:
        if (delta > 0) {
          await this.reviewRepository.increment(
            { id: resourceId },
            'helpfulCount',
            delta,
          );
        } else {
          await this.reviewRepository.decrement(
            { id: resourceId },
            'helpfulCount',
            Math.abs(delta),
          );
        }
        break;
    }
  }
}
