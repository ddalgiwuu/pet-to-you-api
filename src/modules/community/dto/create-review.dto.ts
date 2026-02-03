import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinLength,
  ArrayMaxSize,
  IsUrl,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewType } from '../entities/review.entity';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Type of resource being reviewed',
    enum: ReviewType,
    example: ReviewType.HOSPITAL,
  })
  @IsEnum(ReviewType)
  resourceType: ReviewType;

  @ApiProperty({
    description: 'ID of the resource being reviewed',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  resourceId: string;

  @ApiProperty({
    description: 'Overall rating (1-5 stars)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    description: 'Review title',
    example: '정말 친절하고 꼼꼼한 병원이에요',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({
    description: 'Review content',
    example: '우리 강아지를 정말 세심하게 봐주셨어요. 시설도 깨끗하고...',
    minLength: 10,
  })
  @IsString()
  @MinLength(10)
  content: string;

  @ApiPropertyOptional({
    description: 'Service quality rating (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  serviceRating?: number;

  @ApiPropertyOptional({
    description: 'Facility quality rating (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  facilityRating?: number;

  @ApiPropertyOptional({
    description: 'Price value rating (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priceRating?: number;

  @ApiPropertyOptional({
    description: 'Staff friendliness rating (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  staffRating?: number;

  @ApiPropertyOptional({
    description: 'Cleanliness rating (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  cleanlinessRating?: number;

  @ApiPropertyOptional({
    description: 'Photo URLs',
    example: ['https://example.com/photo1.jpg'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayMaxSize(5)
  photoUrls?: string[];

  @ApiPropertyOptional({
    description: 'Visit date',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  visitDate?: string;

  @ApiPropertyOptional({
    description: 'Booking ID if review is verified through booking',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  bookingId?: string;
}

export class UpdateReviewDto {
  @ApiPropertyOptional({
    description: 'Updated overall rating (1-5 stars)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description: 'Updated review title',
    example: '수정된 제목',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated review content',
    example: '수정된 리뷰 내용',
    minLength: 10,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  content?: string;

  @ApiPropertyOptional({
    description: 'Updated service rating',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  serviceRating?: number;

  @ApiPropertyOptional({
    description: 'Updated facility rating',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  facilityRating?: number;

  @ApiPropertyOptional({
    description: 'Updated price rating',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priceRating?: number;

  @ApiPropertyOptional({
    description: 'Updated staff rating',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  staffRating?: number;

  @ApiPropertyOptional({
    description: 'Updated cleanliness rating',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  cleanlinessRating?: number;

  @ApiPropertyOptional({
    description: 'Updated photo URLs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayMaxSize(5)
  photoUrls?: string[];
}

export class AddReviewResponseDto {
  @ApiProperty({
    description: 'Response content from business/admin',
    example: '소중한 리뷰 감사드립니다. 앞으로도 최선을 다하겠습니다.',
    minLength: 10,
  })
  @IsString()
  @MinLength(10)
  content: string;
}
