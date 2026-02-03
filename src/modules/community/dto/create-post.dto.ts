import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
  MaxLength,
  MinLength,
  ArrayMaxSize,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostCategory } from '../entities/community-post.entity';

export class CreatePostDto {
  @ApiProperty({
    description: 'Post title',
    example: '강아지 분리불안 해결 팁',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Post content',
    example: '우리 강아지 분리불안이 심했는데 이렇게 해결했어요...',
    minLength: 10,
  })
  @IsString()
  @MinLength(10)
  content: string;

  @ApiProperty({
    description: 'Post category',
    enum: PostCategory,
    example: PostCategory.TIP_INFO,
  })
  @IsEnum(PostCategory)
  category: PostCategory;

  @ApiPropertyOptional({
    description: 'Tags for the post',
    example: ['분리불안', '훈련', '강아지'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Pet ID if post is about a specific pet',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  petId?: string;

  @ApiPropertyOptional({
    description: 'Image URLs',
    example: ['https://example.com/image1.jpg'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayMaxSize(10)
  imageUrls?: string[];

  @ApiPropertyOptional({
    description: 'Video URLs',
    example: ['https://example.com/video1.mp4'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayMaxSize(3)
  videoUrls?: string[];
}
