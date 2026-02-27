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

export enum ServiceCategory {
  DAYCARE = 'daycare',
  GROOMING = 'grooming',
  TRAINING = 'training',
  BOARDING = 'boarding',
}

export enum ServiceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SEASONAL = 'seasonal',
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
 * DTO for getting business statistics
 */
export class GetBusinessStatsDto {
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
    description: 'Business ID (auto-filled from JWT)',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  businessId?: string;
}

/**
 * DTO for getting service offerings
 */
export class GetServicesDto {
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
    description: 'Filter by service category',
    enum: ServiceCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @ApiProperty({
    description: 'Filter by service status',
    enum: ServiceStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;

  @ApiProperty({
    description: 'Sort field',
    enum: ['name', 'createdAt', 'bookingCount'],
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
    description: 'Business ID (auto-filled from JWT)',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  businessId?: string;
}

/**
 * DTO for getting bookings with filters
 */
export class GetBusinessBookingsDto {
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
    description: 'Filter by booking status',
    enum: BookingStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiProperty({
    description: 'Filter by service ID',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiProperty({
    description: 'Sort field',
    enum: ['startDateTime', 'status', 'createdAt'],
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
    description: 'Business ID (auto-filled from JWT)',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  businessId?: string;
}

/**
 * DTO for getting customers with filters
 */
export class GetCustomersDto {
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
    description: 'Search by customer or pet name',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Sort field',
    enum: ['name', 'lastVisit', 'totalSpent'],
    default: 'lastVisit',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'lastVisit';

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
    description: 'Filter customers with active bookings',
    type: Boolean,
    required: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasActiveBookings?: boolean;

  @ApiProperty({
    description: 'Business ID (auto-filled from JWT)',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  businessId?: string;
}

/**
 * DTO for getting revenue analytics
 */
export class GetBusinessRevenueDto {
  @ApiProperty({
    description: 'Aggregation period',
    enum: ['daily', 'weekly', 'monthly'],
    default: 'monthly',
    required: false,
  })
  @IsOptional()
  @IsString()
  period?: string = 'monthly';

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
    description: 'Business ID (auto-filled from JWT)',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  businessId?: string;
}
