import {
  IsString,
  IsUUID,
  IsDate,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VaccineType } from '../entities/vaccination-record.entity';

export class CreateVaccinationRecordDto {
  // ============================================================
  // Pet Relationship
  // ============================================================

  @ApiProperty({
    description: 'Pet ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  petId: string;

  // ============================================================
  // Vaccine Information
  // ============================================================

  @ApiProperty({
    enum: VaccineType,
    example: VaccineType.DHPPL,
  })
  @IsEnum(VaccineType)
  vaccineType: VaccineType;

  @ApiProperty({ example: '노비백 DHPPL' })
  @IsString()
  @MaxLength(200)
  vaccineName: string;

  @ApiPropertyOptional({ example: 'MSD Animal Health' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  manufacturer?: string;

  @ApiPropertyOptional({ example: 'A123456' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchNumber?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  doseNumber?: number;

  // ============================================================
  // Date Information
  // ============================================================

  @ApiProperty({ example: '2024-01-15' })
  @Type(() => Date)
  @IsDate()
  vaccinationDate: Date;

  @ApiPropertyOptional({ example: '2025-01-15' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expirationDate?: Date;

  @ApiPropertyOptional({ example: '2025-01-15' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextDueDate?: Date;

  // ============================================================
  // Veterinarian Information
  // ============================================================

  @ApiProperty({ example: '서울동물병원' })
  @IsString()
  @MaxLength(200)
  hospitalName: string;

  @ApiPropertyOptional({ example: '서울시 강남구 테헤란로 123' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  hospitalAddress?: string;

  @ApiPropertyOptional({ example: '02-1234-5678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  hospitalPhone?: string;

  @ApiProperty({ example: '김수의' })
  @IsString()
  @MaxLength(100)
  veterinarianName: string;

  @ApiPropertyOptional({ example: 'VET-2023-12345' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  veterinarianLicense?: string;

  // ============================================================
  // Vaccination Details
  // ============================================================

  @ApiPropertyOptional({ example: '왼쪽 어깨' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  injectionSite?: string;

  @ApiPropertyOptional({ example: '접종 후 정상. 특이사항 없음.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  hadReaction?: boolean;

  @ApiPropertyOptional({ example: '경미한 부종, 24시간 내 소실' })
  @IsOptional()
  @IsString()
  reactionDetails?: string;

  // ============================================================
  // Cost Information
  // ============================================================

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ example: '카드' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  // ============================================================
  // Attachments
  // ============================================================

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certificateUrls?: string[];

  // ============================================================
  // Reminder System
  // ============================================================

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @ApiPropertyOptional({ example: 14 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  reminderDaysBefore?: number;

  // ============================================================
  // Metadata
  // ============================================================

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isCore?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isBooster?: boolean;
}
