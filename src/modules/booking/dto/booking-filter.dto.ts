import { IsOptional, IsEnum, IsDateString, IsUUID, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus, BookingType, PaymentStatus } from '../entities/booking.entity';
import { Type } from 'class-transformer';

export class BookingFilterDto {
  @ApiPropertyOptional({ enum: BookingStatus, description: '예약 상태 필터' })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ enum: BookingType, description: '예약 유형 필터' })
  @IsOptional()
  @IsEnum(BookingType)
  type?: BookingType;

  @ApiPropertyOptional({ enum: PaymentStatus, description: '결제 상태 필터' })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', description: '병원 ID 필터' })
  @IsOptional()
  @IsUUID()
  hospitalId?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', description: '반려동물 ID 필터' })
  @IsOptional()
  @IsUUID()
  petId?: string;

  @ApiPropertyOptional({ example: '2024-01-01', description: '시작 날짜 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-01-31', description: '종료 날짜 (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 1, description: '페이지 번호', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: '페이지 크기', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
