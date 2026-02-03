import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Review, ReviewType, VerificationStatus } from '../entities/review.entity';
import { ModerationStatus } from '../enums/moderation-status.enum';
import { ReviewSearch } from '../schemas/community-search.schema';
import {
  CreateReviewDto,
  UpdateReviewDto,
  AddReviewResponseDto,
} from '../dto/create-review.dto';
import { ReviewQueryDto } from '../dto/query-params.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectModel(ReviewSearch.name)
    private readonly reviewSearchModel: Model<ReviewSearch>,
  ) {}

  /**
   * Create a new review
   */
  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    // Check if user already reviewed this resource
    const existing = await this.reviewRepository.findOne({
      where: {
        userId,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        isDeleted: false,
      },
    });

    if (existing) {
      throw new BadRequestException('You have already reviewed this resource');
    }

    // Prepare review data with proper types
    const reviewData = {
      rating: dto.rating,
      title: dto.title,
      content: dto.content,
      serviceRating: dto.serviceRating,
      facilityRating: dto.facilityRating,
      priceRating: dto.priceRating,
      staffRating: dto.staffRating,
      cleanlinessRating: dto.cleanlinessRating,
      photoUrls: dto.photoUrls,
      bookingId: dto.bookingId,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      userId,
      visitDate: dto.visitDate ? new Date(dto.visitDate) : undefined,
      verificationStatus: dto.bookingId
        ? VerificationStatus.VERIFIED
        : VerificationStatus.UNVERIFIED,
      isVerifiedVisit: !!dto.bookingId,
    };

    const review = this.reviewRepository.create({
      ...reviewData,
      moderationStatus: this.needsAutoModeration(reviewData)
        ? ModerationStatus.PENDING
        : ModerationStatus.APPROVED,
    });

    // Set specific resource ID based on type
    switch (dto.resourceType) {
      case ReviewType.HOSPITAL:
        review.hospitalId = dto.resourceId;
        break;
      case ReviewType.DAYCARE:
        review.daycareId = dto.resourceId;
        break;
    }

    const savedReview = await this.reviewRepository.save(review);

    // Sync to MongoDB for search
    await this.syncToSearchIndex(savedReview);

    // Update resource rating (should be done via event/queue in production)
    await this.updateResourceRating(dto.resourceType, dto.resourceId);

    return savedReview;
  }

  /**
   * Find all reviews with filters
   */
  async findAll(query: ReviewQueryDto): Promise<{
    data: Review[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    averageRating?: number;
    ratingDistribution?: Record<number, number>;
  }> {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Review> = {
      isDeleted: false,
      moderationStatus: ModerationStatus.APPROVED,
    };

    if (filters.resourceType) where.resourceType = filters.resourceType;
    if (filters.resourceId) where.resourceId = filters.resourceId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.verifiedOnly) where.isVerifiedVisit = true;

    // Build query for rating range
    const queryBuilder = this.reviewRepository.createQueryBuilder('review');
    queryBuilder.where(where);

    if (filters.minRating) {
      queryBuilder.andWhere('review.rating >= :minRating', {
        minRating: filters.minRating,
      });
    }
    if (filters.maxRating) {
      queryBuilder.andWhere('review.rating <= :maxRating', {
        maxRating: filters.maxRating,
      });
    }

    // Get total and stats
    const total = await queryBuilder.getCount();

    // Get paginated results
    const data = await queryBuilder
      .leftJoinAndSelect('review.reviewer', 'reviewer')
      .orderBy(`review.${filters.sortBy || 'createdAt'}`, filters.sortOrder || 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    // Calculate statistics if filtering by resource
    let averageRating: number | undefined;
    let ratingDistribution: Record<number, number> | undefined;

    if (filters.resourceId) {
      const stats = await this.getReviewStats(
        filters.resourceType!,
        filters.resourceId,
      );
      averageRating = stats.averageRating;
      ratingDistribution = stats.ratingDistribution;
    }

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      averageRating,
      ratingDistribution,
    };
  }

  /**
   * Get review statistics for a resource
   */
  async getReviewStats(
    resourceType: ReviewType,
    resourceId: string,
  ): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
    averageServiceRating?: number;
    averageFacilityRating?: number;
    averagePriceRating?: number;
    averageStaffRating?: number;
    averageCleanlinessRating?: number;
  }> {
    const reviews = await this.reviewRepository.find({
      where: {
        resourceType,
        resourceId,
        isDeleted: false,
        moderationStatus: ModerationStatus.APPROVED,
      },
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;

    const ratingDistribution = reviews.reduce(
      (dist, r) => {
        dist[r.rating] = (dist[r.rating] || 0) + 1;
        return dist;
      },
      {} as Record<number, number>,
    );

    // Ensure all ratings 1-5 are present
    for (let i = 1; i <= 5; i++) {
      if (!ratingDistribution[i]) ratingDistribution[i] = 0;
    }

    // Calculate detailed ratings averages
    const detailedRatings = {
      averageServiceRating: this.calculateAverage(
        reviews.map((r) => r.serviceRating).filter((r): r is number => r !== null && r !== undefined),
      ),
      averageFacilityRating: this.calculateAverage(
        reviews.map((r) => r.facilityRating).filter((r): r is number => r !== null && r !== undefined),
      ),
      averagePriceRating: this.calculateAverage(
        reviews.map((r) => r.priceRating).filter((r): r is number => r !== null && r !== undefined),
      ),
      averageStaffRating: this.calculateAverage(
        reviews.map((r) => r.staffRating).filter((r): r is number => r !== null && r !== undefined),
      ),
      averageCleanlinessRating: this.calculateAverage(
        reviews.map((r) => r.cleanlinessRating).filter((r): r is number => r !== null && r !== undefined),
      ),
    };

    return {
      averageRating,
      totalReviews: reviews.length,
      ratingDistribution,
      ...detailedRatings,
    };
  }

  /**
   * Find one review by ID
   */
  async findOne(id: string, incrementView: boolean = true): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['reviewer'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (!review.isVisible()) {
      throw new ForbiddenException('This review is not accessible');
    }

    // Increment view count
    if (incrementView) {
      await this.reviewRepository.increment({ id }, 'viewCount', 1);
    }

    return review;
  }

  /**
   * Update a review
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateReviewDto,
  ): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id, userId, isDeleted: false },
    });

    if (!review) {
      throw new NotFoundException(
        'Review not found or you do not have permission',
      );
    }

    // Check moderation if content changed
    if (
      (dto.content && this.needsAutoModeration({ ...review, ...dto })) ||
      (dto.rating && dto.rating !== review.rating)
    ) {
      review.moderationStatus = ModerationStatus.PENDING;
    }

    Object.assign(review, dto);
    review.markAsEdited();

    const updatedReview = await this.reviewRepository.save(review);

    // Sync to MongoDB
    await this.syncToSearchIndex(updatedReview);

    // Update resource rating
    await this.updateResourceRating(review.resourceType, review.resourceId);

    return updatedReview;
  }

  /**
   * Delete a review (soft delete)
   */
  async remove(id: string, userId: string): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id, userId, isDeleted: false },
    });

    if (!review) {
      throw new NotFoundException(
        'Review not found or you do not have permission',
      );
    }

    review.isDeleted = true;
    review.deletedAt = new Date();
    await this.reviewRepository.save(review);

    // Remove from search index
    await this.reviewSearchModel.findOneAndUpdate(
      { reviewId: id },
      { isDeleted: true },
    );

    // Update resource rating
    await this.updateResourceRating(review.resourceType, review.resourceId);
  }

  /**
   * Add business response to review
   */
  async addResponse(
    id: string,
    userId: string,
    dto: AddReviewResponseDto,
  ): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // TODO: Verify user is owner/admin of the resource

    review.addResponse(dto.content, userId);
    return this.reviewRepository.save(review);
  }

  /**
   * Update helpful/unhelpful counts
   */
  async updateEngagementCounts(
    id: string,
    helpful?: number,
    unhelpful?: number,
  ): Promise<void> {
    const updateData: Partial<Review> = {};
    if (helpful !== undefined) updateData.helpfulCount = helpful;
    if (unhelpful !== undefined) updateData.unhelpfulCount = unhelpful;

    await this.reviewRepository.update(id, updateData);
  }

  /**
   * Update resource rating (should be called after review changes)
   */
  private async updateResourceRating(
    resourceType: ReviewType,
    resourceId: string,
  ): Promise<void> {
    const stats = await this.getReviewStats(resourceType, resourceId);

    // TODO: Update the actual resource entity with new rating
    // This would depend on which resource type (hospital, daycare, etc.)
    // Example: await this.hospitalService.updateRating(resourceId, stats.averageRating);
  }

  /**
   * Sync review to MongoDB search index
   */
  private async syncToSearchIndex(review: Review): Promise<void> {
    await this.reviewSearchModel.findOneAndUpdate(
      { reviewId: review.id },
      {
        reviewId: review.id,
        title: review.title,
        content: review.content,
        resourceType: review.resourceType,
        resourceId: review.resourceId,
        userId: review.userId,
        rating: review.rating,
        serviceRating: review.serviceRating,
        facilityRating: review.facilityRating,
        priceRating: review.priceRating,
        staffRating: review.staffRating,
        cleanlinessRating: review.cleanlinessRating,
        helpfulCount: review.helpfulCount,
        unhelpfulCount: review.unhelpfulCount,
        isVerifiedVisit: review.isVerifiedVisit,
        moderationStatus: review.moderationStatus,
        isFeatured: review.isFeatured,
        isDeleted: review.isDeleted,
        visitDate: review.visitDate,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      },
      { upsert: true },
    );
  }

  /**
   * Check if review needs auto-moderation
   */
  private needsAutoModeration(data: Partial<Review>): boolean {
    const suspiciousPatterns = [
      /광고/,
      /홍보/,
      /경쟁업체/,
      /욕설/,
      /비방/,
      /http[s]?:\/\//gi,
    ];

    const content = `${data.title || ''} ${data.content || ''}`;
    return suspiciousPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Calculate average of numbers
   */
  private calculateAverage(numbers: number[]): number | undefined {
    if (numbers.length === 0) return undefined;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
}
