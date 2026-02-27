import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsString,
  IsBoolean,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================
// Enums
// ============================================================

export enum StatsPeriod {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export enum RevenuePeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum PetSpecies {
  DOG = 'dog',
  CAT = 'cat',
  RABBIT = 'rabbit',
  HAMSTER = 'hamster',
  BIRD = 'bird',
  OTHER = 'other',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

// ============================================================
// Request DTOs
// ============================================================

/**
 * DTO for getting hospital statistics
 */
export class GetStatsDto {
  @ApiProperty({
    description: 'Time period for statistics',
    enum: StatsPeriod,
    default: StatsPeriod.TODAY,
    required: false,
  })
  @IsOptional()
  @IsEnum(StatsPeriod)
  period?: StatsPeriod = StatsPeriod.TODAY;

  @ApiProperty({
    description: 'Hospital ID (auto-filled from JWT)',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  hospitalId?: string;
}

/**
 * DTO for getting pet list with pagination
 */
export class GetPetsDto {
  @ApiProperty({
    description: 'Page number',
    type: Number,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    type: Number,
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Search by pet name, owner name, or registration number',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by species',
    enum: PetSpecies,
    required: false,
  })
  @IsOptional()
  @IsEnum(PetSpecies)
  species?: PetSpecies;

  @ApiProperty({
    description: 'Filter by active status',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Filter pets with/without insurance',
    type: Boolean,
    required: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasInsurance?: boolean;

  @ApiProperty({
    description: 'Sort field',
    enum: ['name', 'createdAt', 'lastVisit'],
    default: 'createdAt',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
    required: false,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiProperty({
    description: 'Hospital ID (auto-filled from JWT)',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  hospitalId?: string;
}

/**
 * DTO for getting appointments with filters
 */
export class GetAppointmentsDto {
  @ApiProperty({
    description: 'Page number',
    type: Number,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    type: Number,
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Filter by appointment status',
    enum: BookingStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiProperty({
    description: 'Start date (ISO 8601 format)',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date (ISO 8601 format)',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Filter by booking type',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({
    description: 'Filter by pet ID',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  petId?: string;

  @ApiProperty({
    description: 'Sort field',
    enum: ['startDateTime', 'status', 'type'],
    default: 'startDateTime',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'startDateTime';

  @ApiProperty({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
    required: false,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiProperty({
    description: 'Hospital ID (auto-filled from JWT)',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  hospitalId?: string;
}

/**
 * DTO for getting revenue analytics
 */
export class GetRevenueDto {
  @ApiProperty({
    description: 'Aggregation period',
    enum: RevenuePeriod,
    default: RevenuePeriod.MONTHLY,
    required: false,
  })
  @IsOptional()
  @IsEnum(RevenuePeriod)
  period?: RevenuePeriod = RevenuePeriod.MONTHLY;

  @ApiProperty({
    description: 'Start date (ISO 8601 format)',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date (ISO 8601 format)',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Group by service, payment_method, or date',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  groupBy?: string;

  @ApiProperty({
    description: 'Hospital ID (auto-filled from JWT)',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  hospitalId?: string;
}

/**
 * DTO for getting reviews with filters
 */
export class GetReviewsDto {
  @ApiProperty({
    description: 'Page number',
    type: Number,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    type: Number,
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Filter by minimum rating (1-5)',
    type: Number,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiProperty({
    description: 'Sort field',
    enum: ['createdAt', 'rating'],
    default: 'createdAt',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
    required: false,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiProperty({
    description: 'Filter by status',
    enum: ['published', 'pending', 'reported'],
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Hospital ID (auto-filled from JWT)',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  hospitalId?: string;
}

// ============================================================
// Response DTOs
// ============================================================

/**
 * Standard success response wrapper
 */
export class SuccessResponse<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data: T;

  @ApiProperty({
    example: {
      timestamp: '2026-02-07T13:00:00Z',
      cached: false,
    },
  })
  meta?: {
    timestamp: string;
    cached?: boolean;
    cacheTTL?: number;
    [key: string]: any;
  };
}

/**
 * Standard pagination metadata
 */
export class PaginationMeta {
  @ApiProperty({ example: 1 })
  currentPage: number;

  @ApiProperty({ example: 10 })
  totalPages: number;

  @ApiProperty({ example: 200 })
  totalItems: number;

  @ApiProperty({ example: 20 })
  itemsPerPage: number;

  @ApiProperty({ example: true })
  hasNextPage: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage: boolean;
}

/**
 * Error response structure
 */
export class ErrorResponse {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({
    example: {
      code: 'AUTH_003',
      message: 'Access denied: Cannot access other organization data',
      timestamp: '2026-02-07T13:00:00Z',
      requestId: 'req_abc123',
      path: '/api/v1/dashboard/hospital/stats',
    },
  })
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
    path: string;
  };
}
