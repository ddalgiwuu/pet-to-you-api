import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  IsUUID,
  IsDate,
  ValidateNested,
  Min,
  Max,
  Matches,
  IsNotEmpty,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DaycareServiceType } from '../entities/daycare-center.entity';

class AdditionalServiceSelectionDto {
  @ApiProperty({ description: '서비스명' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '가격' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: '수량' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;
}

export class CreateReservationDto {
  // ============================================================
  // Basic Information
  // ============================================================

  @ApiProperty({ description: '반려동물 ID' })
  @IsUUID()
  petId: string;

  @ApiProperty({ description: '데이케어 센터 ID' })
  @IsUUID()
  daycareId: string;

  @ApiProperty({ description: '예약 날짜', example: '2024-01-20' })
  @Type(() => Date)
  @IsDate()
  reservationDate: Date;

  @ApiPropertyOptional({ description: '입실 시간 (HH:MM)', example: '08:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'checkInTime must be in HH:MM format (24-hour)',
  })
  checkInTime?: string;

  @ApiPropertyOptional({ description: '퇴실 시간 (HH:MM)', example: '18:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'checkOutTime must be in HH:MM format (24-hour)',
  })
  checkOutTime?: string;

  @ApiProperty({
    description: '서비스 타입',
    enum: DaycareServiceType,
    example: DaycareServiceType.DAILY,
  })
  @IsEnum(DaycareServiceType)
  serviceType: DaycareServiceType;

  @ApiPropertyOptional({
    description: '시간제인 경우 시간 수',
    example: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationHours?: number;

  // ============================================================
  // Additional Services
  // ============================================================

  @ApiPropertyOptional({
    description: '추가 서비스',
    type: [AdditionalServiceSelectionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalServiceSelectionDto)
  additionalServices?: AdditionalServiceSelectionDto[];

  // ============================================================
  // Special Requirements
  // ============================================================

  @ApiPropertyOptional({ description: '특별 요청사항' })
  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @ApiPropertyOptional({
    description: '식이 제한사항',
    example: ['알레르기: 닭고기'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryRestrictions?: string[];

  @ApiPropertyOptional({
    description: '의료 상태',
    example: ['심장병 약 복용 중'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicalConditions?: string[];

  @ApiPropertyOptional({
    description: '행동 특성',
    example: ['다른 개와 잘 놀지 못함'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  behavioralNotes?: string[];

  @ApiPropertyOptional({ description: '긴급 연락처 정보' })
  @IsOptional()
  @IsString()
  emergencyContactInfo?: string;

  // ============================================================
  // Pickup/Drop-off
  // ============================================================

  @ApiPropertyOptional({ description: '픽업 서비스 필요 여부' })
  @IsOptional()
  @IsBoolean()
  needsPickup?: boolean;

  @ApiPropertyOptional({ description: '드롭 서비스 필요 여부' })
  @IsOptional()
  @IsBoolean()
  needsDropOff?: boolean;

  @ApiPropertyOptional({ description: '픽업 주소' })
  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @ApiPropertyOptional({ description: '드롭 주소' })
  @IsOptional()
  @IsString()
  dropOffAddress?: string;

  // ============================================================
  // Payment
  // ============================================================

  @ApiPropertyOptional({
    description: '할인 쿠폰 코드',
    example: 'NEWUSER20',
  })
  @IsOptional()
  @IsString()
  discountCode?: string;

  @ApiProperty({
    description: '결제 수단',
    example: 'card',
  })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}

export class UpdateReservationDto {
  @ApiPropertyOptional({ description: '입실 시간 (HH:MM)', example: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  checkInTime?: string;

  @ApiPropertyOptional({ description: '퇴실 시간 (HH:MM)', example: '17:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  checkOutTime?: string;

  @ApiPropertyOptional({ description: '특별 요청사항' })
  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @ApiPropertyOptional({
    description: '추가 서비스',
    type: [AdditionalServiceSelectionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalServiceSelectionDto)
  additionalServices?: AdditionalServiceSelectionDto[];
}

export class CancelReservationDto {
  @ApiProperty({ description: '취소 사유' })
  @IsString()
  @IsNotEmpty()
  cancellationReason: string;
}

export class CheckInDto {
  @ApiPropertyOptional({ description: '실제 입실 시간 (자동으로 현재 시간 사용)' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  actualCheckInTime?: Date;

  @ApiPropertyOptional({ description: '체크인 메모' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CheckOutDto {
  @ApiPropertyOptional({ description: '실제 퇴실 시간 (자동으로 현재 시간 사용)' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  actualCheckOutTime?: Date;

  @ApiPropertyOptional({ description: '체크아웃 메모' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AddActivityDto {
  @ApiProperty({ description: '활동 시간 (HH:MM)', example: '10:30' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  time: string;

  @ApiProperty({
    description: '활동 타입',
    example: 'play',
    enum: ['play', 'walk', 'rest', 'socialization'],
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: '활동 시간 (분)', example: 30 })
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: '사진 URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
}

export class AddReviewDto {
  @ApiProperty({ description: '평점 (0.00 ~ 5.00)', example: 4.5 })
  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number;

  @ApiProperty({ description: '리뷰 내용' })
  @IsString()
  @IsNotEmpty()
  review: string;
}
