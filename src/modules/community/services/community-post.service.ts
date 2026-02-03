import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommunityPost, PostCategory } from '../entities/community-post.entity';
import { ModerationStatus } from '../enums/moderation-status.enum';
import { CommunityPostSearch } from '../schemas/community-search.schema';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { PostQueryDto } from '../dto/query-params.dto';

@Injectable()
export class CommunityPostService {
  constructor(
    @InjectRepository(CommunityPost)
    private readonly postRepository: Repository<CommunityPost>,
    @InjectModel(CommunityPostSearch.name)
    private readonly postSearchModel: Model<CommunityPostSearch>,
  ) {}

  /**
   * Create a new post
   */
  async create(userId: string, dto: CreatePostDto): Promise<CommunityPost> {
    const post = this.postRepository.create({
      ...dto,
      userId,
      moderationStatus: this.needsAutoModeration(dto)
        ? ModerationStatus.PENDING
        : ModerationStatus.APPROVED,
    });

    const savedPost = await this.postRepository.save(post);

    // Sync to MongoDB for search
    await this.syncToSearchIndex(savedPost);

    return savedPost;
  }

  /**
   * Find all posts with pagination and filters
   */
  async findAll(query: PostQueryDto): Promise<{
    data: CommunityPost[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, search, ...filters } = query;
    const skip = (page - 1) * limit;

    // Build query conditions
    const where: FindOptionsWhere<CommunityPost> = {
      isDeleted: false,
      moderationStatus: ModerationStatus.APPROVED,
    };

    if (filters.category) where.category = filters.category;
    if (filters.userId) where.userId = filters.userId;
    if (filters.petId) where.petId = filters.petId;
    if (filters.pinnedOnly) where.isPinned = true;
    if (filters.featuredOnly) where.isFeatured = true;

    // Handle tag filter
    let postIds: string[] | undefined;
    if (filters.tag) {
      const postsWithTag = await this.postRepository
        .createQueryBuilder('post')
        .where('post.isDeleted = :isDeleted', { isDeleted: false })
        .andWhere(':tag = ANY(post.tags)', { tag: filters.tag })
        .select('post.id')
        .getMany();

      postIds = postsWithTag.map((p) => p.id);
      if (postIds.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
    }

    // Handle full-text search using MongoDB
    if (search) {
      const searchResults = await this.postSearchModel
        .find(
          {
            $text: { $search: search },
            isDeleted: false,
            moderationStatus: ModerationStatus.APPROVED,
          },
          { score: { $meta: 'textScore' } },
        )
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit * 3) // Get more to account for filtering
        .exec();

      const searchPostIds = searchResults.map((r) => r.postId);
      postIds = postIds
        ? postIds.filter((id) => searchPostIds.includes(id))
        : searchPostIds;

      if (postIds.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
    }

    // Apply ID filter if we have search results or tag filter
    if (postIds) {
      where.id = In(postIds);
    }

    // Get total count
    const total = await this.postRepository.count({ where });

    // Get paginated results with relations
    const data = await this.postRepository.find({
      where,
      relations: ['author', 'pet'],
      order: {
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
   * Get trending posts
   */
  async getTrendingPosts(limit: number = 10): Promise<CommunityPost[]> {
    // Update trending scores first (should be done via cron job in production)
    await this.updateTrendingScores();

    return this.postRepository.find({
      where: {
        isDeleted: false,
        moderationStatus: ModerationStatus.APPROVED,
      },
      relations: ['author', 'pet'],
      order: {
        trendingScore: 'DESC',
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * Find one post by ID
   */
  async findOne(id: string, incrementView: boolean = true): Promise<CommunityPost> {
    const post = await this.postRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['author', 'pet'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!post.isVisible()) {
      throw new ForbiddenException('This post is not accessible');
    }

    // Increment view count
    if (incrementView) {
      await this.incrementViewCount(id);
    }

    return post;
  }

  /**
   * Update a post
   */
  async update(
    id: string,
    userId: string,
    dto: UpdatePostDto,
  ): Promise<CommunityPost> {
    const post = await this.postRepository.findOne({
      where: { id, userId, isDeleted: false },
    });

    if (!post) {
      throw new NotFoundException('Post not found or you do not have permission');
    }

    // Update moderation status if content changed significantly
    if (dto.content && this.needsAutoModeration({ ...post, ...dto })) {
      post.moderationStatus = ModerationStatus.PENDING;
    }

    Object.assign(post, dto);
    const updatedPost = await this.postRepository.save(post);

    // Sync to MongoDB
    await this.syncToSearchIndex(updatedPost);

    return updatedPost;
  }

  /**
   * Delete a post (soft delete)
   */
  async remove(id: string, userId: string): Promise<void> {
    const post = await this.postRepository.findOne({
      where: { id, userId, isDeleted: false },
    });

    if (!post) {
      throw new NotFoundException('Post not found or you do not have permission');
    }

    post.isDeleted = true;
    post.deletedAt = new Date();
    await this.postRepository.save(post);

    // Remove from search index
    await this.postSearchModel.findOneAndUpdate(
      { postId: id },
      { isDeleted: true },
    );
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: string): Promise<void> {
    await this.postRepository.increment({ id }, 'viewCount', 1);
  }

  /**
   * Update engagement counts (called when likes/comments change)
   */
  async updateEngagementCounts(
    id: string,
    likes?: number,
    comments?: number,
    shares?: number,
  ): Promise<void> {
    const updateData: Partial<CommunityPost> = {};
    if (likes !== undefined) updateData.likeCount = likes;
    if (comments !== undefined) updateData.commentCount = comments;
    if (shares !== undefined) updateData.shareCount = shares;

    await this.postRepository.update(id, updateData);

    // Update trending score
    const post = await this.postRepository.findOne({ where: { id } });
    if (post) {
      post.trendingScore = post.calculateTrendingScore();
      await this.postRepository.save(post);
    }
  }

  /**
   * Pin/unpin a post (admin only)
   */
  async togglePin(id: string): Promise<CommunityPost> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    post.isPinned = !post.isPinned;
    post.pinnedAt = post.isPinned ? new Date() : undefined;
    return this.postRepository.save(post);
  }

  /**
   * Feature/unfeature a post (admin only)
   */
  async toggleFeature(id: string): Promise<CommunityPost> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    post.isFeatured = !post.isFeatured;
    post.featuredAt = post.isFeatured ? new Date() : undefined;
    return this.postRepository.save(post);
  }

  /**
   * Update trending scores for all recent posts
   */
  private async updateTrendingScores(): Promise<void> {
    // Update scores for posts from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const posts = await this.postRepository.find({
      where: {
        isDeleted: false,
        moderationStatus: ModerationStatus.APPROVED,
      },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    for (const post of posts) {
      post.trendingScore = post.calculateTrendingScore();
      post.lastTrendingUpdate = new Date();
    }

    await this.postRepository.save(posts);
  }

  /**
   * Sync post to MongoDB search index
   */
  private async syncToSearchIndex(post: CommunityPost): Promise<void> {
    await this.postSearchModel.findOneAndUpdate(
      { postId: post.id },
      {
        postId: post.id,
        title: post.title,
        content: post.content,
        tags: post.tags || [],
        category: post.category,
        userId: post.userId,
        petId: post.petId,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        viewCount: post.viewCount,
        trendingScore: post.trendingScore,
        moderationStatus: post.moderationStatus,
        isPinned: post.isPinned,
        isFeatured: post.isFeatured,
        isDeleted: post.isDeleted,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
      { upsert: true },
    );
  }

  /**
   * Check if post needs auto-moderation
   */
  private needsAutoModeration(data: Partial<CommunityPost>): boolean {
    const suspiciousPatterns = [
      /광고/,
      /홍보/,
      /판매/,
      /구매/,
      /연락처/,
      /전화번호/,
      /이메일/,
      /http[s]?:\/\//gi,
    ];

    const content = `${data.title || ''} ${data.content || ''}`;
    return suspiciousPatterns.some((pattern) => pattern.test(content));
  }
}
