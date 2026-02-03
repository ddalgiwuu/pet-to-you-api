import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, TreeRepository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { CommunityPost } from '../entities/community-post.entity';
import { ModerationStatus } from '../enums/moderation-status.enum';
import { CreateCommentDto, UpdateCommentDto } from '../dto/create-comment.dto';
import { CommentQueryDto } from '../dto/query-params.dto';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: TreeRepository<Comment>,
    @InjectRepository(CommunityPost)
    private readonly postRepository: Repository<CommunityPost>,
  ) {}

  /**
   * Create a new comment
   */
  async create(
    postId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<Comment> {
    // Verify post exists and is accessible
    const post = await this.postRepository.findOne({
      where: { id: postId, isDeleted: false },
      relations: ['author'],
    });

    if (!post || !post.isVisible()) {
      throw new NotFoundException('Post not found or not accessible');
    }

    // Check if replying to a comment
    let parentComment: Comment | undefined | null;
    let depth = 0;

    if (dto.parentCommentId) {
      parentComment = await this.commentRepository.findOne({
        where: { id: dto.parentCommentId, postId, isDeleted: false },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }

      depth = parentComment.depth + 1;

      // Limit nesting depth
      if (depth > 5) {
        throw new BadRequestException('Maximum nesting depth reached');
      }
    }

    const comment = this.commentRepository.create({
      ...dto,
      postId,
      userId,
      depth,
      isAuthorReply: userId === post.userId,
      moderationStatus: this.needsAutoModeration(dto.content)
        ? ModerationStatus.PENDING
        : ModerationStatus.APPROVED,
    });

    if (parentComment) {
      comment.parentComment = parentComment;
      comment.parentCommentId = parentComment.id;
    }

    const savedComment = await this.commentRepository.save(comment);

    // Update post comment count
    await this.postRepository.increment({ id: postId }, 'commentCount', 1);

    // Update parent comment reply count
    if (parentComment) {
      await this.commentRepository.increment(
        { id: parentComment.id },
        'replyCount',
        1,
      );
    }

    return savedComment;
  }

  /**
   * Find all comments with filters
   */
  async findAll(query: CommentQueryDto): Promise<{
    data: Comment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Comment> = {
      isDeleted: false,
      moderationStatus: ModerationStatus.APPROVED,
    };

    if (filters.postId) where.postId = filters.postId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.parentCommentId) {
      where.parentCommentId = filters.parentCommentId;
    } else if (filters.postId) {
      // If postId is provided but no parentCommentId, show only top-level comments
      where.parentCommentId = null as any;
    }

    const total = await this.commentRepository.count({ where });

    const data = await this.commentRepository.find({
      where,
      relations: ['author', 'parentComment'],
      order: {
        isPinned: 'DESC',
        [filters.sortBy || 'createdAt']: filters.sortOrder || 'DESC',
      },
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
   * Get comment tree for a post
   */
  async getCommentTree(postId: string): Promise<Comment[]> {
    const comments = await this.commentRepository.find({
      where: {
        postId,
        isDeleted: false,
        moderationStatus: ModerationStatus.APPROVED,
      },
      relations: ['author', 'replies'],
      order: {
        isPinned: 'DESC',
        createdAt: 'ASC',
      },
    });

    // Build tree structure
    return this.commentRepository.findTrees();
  }

  /**
   * Find one comment by ID
   */
  async findOne(id: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['author', 'post', 'parentComment', 'replies'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (!comment.isVisible()) {
      throw new ForbiddenException('This comment is not accessible');
    }

    return comment;
  }

  /**
   * Update a comment
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateCommentDto,
  ): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id, userId, isDeleted: false },
    });

    if (!comment) {
      throw new NotFoundException(
        'Comment not found or you do not have permission',
      );
    }

    // Check moderation if content changed
    if (dto.content && this.needsAutoModeration(dto.content)) {
      comment.moderationStatus = ModerationStatus.PENDING;
    }

    Object.assign(comment, dto);
    comment.markAsEdited();

    return this.commentRepository.save(comment);
  }

  /**
   * Delete a comment (soft delete)
   */
  async remove(id: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id, userId, isDeleted: false },
      relations: ['post'],
    });

    if (!comment) {
      throw new NotFoundException(
        'Comment not found or you do not have permission',
      );
    }

    comment.isDeleted = true;
    comment.deletedAt = new Date();
    await this.commentRepository.save(comment);

    // Update post comment count
    await this.postRepository.decrement(
      { id: comment.postId },
      'commentCount',
      1,
    );

    // Update parent comment reply count
    if (comment.parentCommentId) {
      await this.commentRepository.decrement(
        { id: comment.parentCommentId },
        'replyCount',
        1,
      );
    }
  }

  /**
   * Pin/unpin a comment (post author or admin)
   */
  async togglePin(id: string, userId: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['post'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only post author can pin comments
    if (comment.post.userId !== userId) {
      throw new ForbiddenException('Only post author can pin comments');
    }

    comment.isPinned = !comment.isPinned;
    return this.commentRepository.save(comment);
  }

  /**
   * Update engagement counts
   */
  async updateEngagementCounts(id: string, likes?: number): Promise<void> {
    if (likes !== undefined) {
      await this.commentRepository.update(id, { likeCount: likes });
    }
  }

  /**
   * Check if comment needs auto-moderation
   */
  private needsAutoModeration(content: string): boolean {
    const suspiciousPatterns = [
      /광고/,
      /홍보/,
      /판매/,
      /욕설/,
      /비방/,
      /연락처/,
      /http[s]?:\/\//gi,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(content));
  }
}
