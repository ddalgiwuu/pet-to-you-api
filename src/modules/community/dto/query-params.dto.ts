import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PostCategory } from '../entities/community-post.entity';
import { ModerationStatus } from '../enums/moderation-status.enum';
import { ReviewType } from '../entities/review.entity';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class PostQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: PostCategory,
  })
  @IsOptional()
  @IsEnum(PostCategory)
  category?: PostCategory;

  @ApiPropertyOptional({
    description: 'Filter by tag',
    example: '분리불안',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description: 'Filter by author user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by pet ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  petId?: string;

  @ApiPropertyOptional({
    description: 'Search query (full-text search)',
    example: '강아지 훈련',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'createdAt',
    enum: ['createdAt', 'likeCount', 'commentCount', 'viewCount', 'trendingScore'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description: 'Include only pinned posts',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  pinnedOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Include only featured posts',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  featuredOnly?: boolean;
}

export class CommentQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by post ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  postId?: string;

  @ApiPropertyOptional({
    description: 'Filter by author user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by parent comment ID (for nested replies)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  parentCommentId?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'createdAt',
    enum: ['createdAt', 'likeCount'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class ReviewQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by resource type',
    enum: ReviewType,
  })
  @IsOptional()
  @IsEnum(ReviewType)
  resourceType?: ReviewType;

  @ApiPropertyOptional({
    description: 'Filter by resource ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  resourceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by author user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Minimum rating filter',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({
    description: 'Maximum rating filter',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  maxRating?: number;

  @ApiPropertyOptional({
    description: 'Include only verified reviews',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  verifiedOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'createdAt',
    enum: ['createdAt', 'rating', 'helpfulCount'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class ModerationQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by moderation status',
    enum: ModerationStatus,
  })
  @IsOptional()
  @IsEnum(ModerationStatus)
  status?: ModerationStatus;

  @ApiPropertyOptional({
    description: 'Filter by resource type',
    example: 'post',
    enum: ['post', 'comment', 'review'],
  })
  @IsOptional()
  @IsString()
  resourceType?: string;
}
