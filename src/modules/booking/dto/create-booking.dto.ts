import { IsNotEmpty, IsString, IsUUID, IsEnum, IsInt, Min, IsOptional, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingType } from '../entities/booking.entity';

export class CreateBookingDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: '반려동물 ID' })
  @IsNotEmpty()
  @IsUUID()
  petId: string;

  @ApiProperty({ example: 'hospital', description: '리소스 타입 (hospital, daycare, grooming_salon)' })
  @IsNotEmpty()
  @IsString()
  resourceType: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: '리소스 ID' })
  @IsNotEmpty()
  @IsUUID()
  resourceId: string;

  @ApiProperty({ enum: BookingType, example: BookingType.CONSULTATION, description: '예약 유형' })
  @IsNotEmpty()
  @IsEnum(BookingType)
  type: BookingType;

  @ApiProperty({ example: '2024-01-20T14:00:00.000Z', description: '예약 시작 시간 (ISO 8601)' })
  @IsNotEmpty()
  @IsDateString()
  startDateTime: string;

  @ApiProperty({ example: 30, description: '예약 시간 (분)' })
  @IsNotEmpty()
  @IsInt()
  @Min(15)
  durationMinutes: number;

  @ApiPropertyOptional({ example: '강아지가 최근 식욕이 없어요', description: '고객 요청사항' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: ['일반진료', '예방접종'],
    description: '요청 서비스 목록',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];

  @ApiPropertyOptional({ example: 50000, description: '예상 금액 (원)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedPrice?: number;
}
