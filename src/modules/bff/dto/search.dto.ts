import { IsOptional, IsString, IsNumber, IsLatitude, IsLongitude, IsArray, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortByEnum {
  RELEVANCE = 'relevance',
  RATING = 'rating',
  DISTANCE = 'distance',
  PRICE_LOW = 'price_low',
  PRICE_HIGH = 'price_high',
}

/**
 * Search query parameters
 */
export class SearchQueryDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsLatitude()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  radius?: number = 20; // km

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minRating?: number;

  @IsOptional()
  @IsEnum(SortByEnum)
  sortBy?: SortByEnum = SortByEnum.RELEVANCE;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}

/**
 * Aggregated search response
 */
export interface SearchResponseDto {
  results: Array<{
    id: string;
    type: 'hospital' | 'daycare' | 'shelter';
    name: string;
    address: string;
    distance: number;

    // Hospital/Daycare specific
    rating?: number;
    reviewCount?: number;
    reviews?: Array<{
      id: string;
      rating: number;
      comment: string;
      userName: string;
      createdAt: Date;
    }>;

    // Availability
    isOpen?: boolean;
    nextAvailableSlot?: Date;
    availabilityToday?: number; // percentage

    // Services & Pricing
    services?: Array<{
      name: string;
      price: number;
      duration: number;
    }>;
    specialties?: string[];

    // Contact
    phone?: string;
    website?: string;

    // Images
    imageUrl?: string;
    photos?: string[];

    // Verification
    verified: boolean;
    verificationDate?: Date;
  }>;

  aggregations: {
    totalResults: number;
    byType: {
      hospitals: number;
      daycares: number;
      shelters: number;
    };
    avgRating: number;
    priceRange: {
      min: number;
      max: number;
      avg: number;
    };
    availableSpecialties: string[];
  };

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
