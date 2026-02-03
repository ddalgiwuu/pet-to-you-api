import { IsNotEmpty, IsUUID, IsDateString, IsInt, Min, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingType } from '../entities/booking.entity';

export class GetAvailableSlotsDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: '병원 ID' })
  @IsNotEmpty()
  @IsUUID()
  hospitalId: string;

  @ApiProperty({ example: '2024-01-20', description: '조회 날짜 (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ enum: BookingType, example: BookingType.CONSULTATION, description: '예약 유형' })
  @IsOptional()
  @IsEnum(BookingType)
  type?: BookingType;

  @ApiPropertyOptional({ example: 30, description: '예약 시간 (분)', default: 30 })
  @IsOptional()
  @IsInt()
  @Min(15)
  durationMinutes?: number;
}

export class AvailableSlotDto {
  @ApiProperty({ example: '2024-01-20T09:00:00.000Z', description: '슬롯 시작 시간' })
  startTime: string;

  @ApiProperty({ example: '2024-01-20T09:30:00.000Z', description: '슬롯 종료 시간' })
  endTime: string;

  @ApiProperty({ example: true, description: '예약 가능 여부' })
  available: boolean;

  @ApiPropertyOptional({ example: '예약 마감', description: '불가능 사유' })
  reason?: string;
}
