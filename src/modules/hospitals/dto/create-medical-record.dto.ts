/**
 * DTOs for Hospital Dashboard Medical Record Operations
 */

import {
  IsString,
  IsUUID,
  IsDate,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== Cost Breakdown DTO ====================

export class CostBreakdownDto {
  @ApiProperty({ example: 30000 })
  @IsNumber()
  @Min(0)
  consultation: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  procedures: number;

  @ApiProperty({ example: 20000 })
  @IsNumber()
  @Min(0)
  medication: number;

  @ApiPropertyOptional({ example: 100000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hospitalization?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  diagnosticTests?: number;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  supplies?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  other?: number;
}

// ==================== Service Item DTO ====================

export class ServiceItemDto {
  @ApiProperty({ example: 'item-123' })
  @IsString()
  id: string;

  @ApiProperty({ example: '혈액검사' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  totalPrice: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  insuranceCovered: boolean;
}

// ==================== Document DTO ====================

export class MedicalDocumentDto {
  @ApiProperty({ example: 'doc-123' })
  @IsString()
  id: string;

  @ApiProperty({
    example: 'receipt',
    enum: [
      'receipt',
      'medical_record',
      'diagnosis',
      'prescription',
      'xray',
      'lab_result',
      'photo',
      'other',
    ],
  })
  @IsEnum([
    'receipt',
    'medical_record',
    'diagnosis',
    'prescription',
    'xray',
    'lab_result',
    'photo',
    'other',
  ])
  type: string;

  @ApiProperty({ example: 'receipt_20240129.jpg' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'https://s3.amazonaws.com/...' })
  @IsString()
  uri: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType: string;

  @ApiProperty({ example: 2048000 })
  @IsNumber()
  size: number;

  @ApiProperty({ example: '2024-01-29T10:00:00Z' })
  @IsString()
  uploadedAt: string;
}

// ==================== Payment Info DTO ====================

export class PaymentInfoDto {
  @ApiProperty({ example: 280000 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ example: 207000 })
  @IsNumber()
  @Min(0)
  insuranceCoverage: number;

  @ApiProperty({ example: 73000 })
  @IsNumber()
  @Min(0)
  selfPayment: number;

  @ApiProperty({ example: 'card', enum: ['card', 'cash', 'account', 'insurance'] })
  @IsEnum(['card', 'cash', 'account', 'insurance'])
  paymentMethod: string;

  @ApiProperty({ example: 'completed', enum: ['pending', 'partial', 'completed'] })
  @IsEnum(['pending', 'partial', 'completed'])
  paymentStatus: string;

  @ApiProperty({ example: 280000 })
  @IsNumber()
  @Min(0)
  paidAmount: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  remainingAmount: number;
}

// ==================== Create Medical Record DTO (Hospital) ====================

export class HospitalCreateMedicalRecordDto {
  // ============================================================
  // Connection
  // ============================================================

  @ApiProperty({ example: 'booking-123' })
  @IsUUID()
  bookingId: string;

  @ApiProperty({ example: 'pet-123' })
  @IsUUID()
  petId: string;

  // ============================================================
  // Visit Information
  // ============================================================

  @ApiProperty({ example: '2024-01-29T10:00:00Z' })
  @Type(() => Date)
  @IsDate()
  visitDate: Date;

  @ApiProperty({ example: '응급', enum: ['일반', '수술', '응급', '예방접종'] })
  @IsString()
  visitType: string;

  @ApiProperty({ example: '구토 및 설사 증상' })
  @IsString()
  @MaxLength(500)
  visitReason: string;

  // ============================================================
  // Medical Details
  // ============================================================

  @ApiProperty({ example: '급성 위장염' })
  @IsString()
  diagnosis: string;

  @ApiProperty({ example: '수액치료, 항생제 투여, 입원 1일' })
  @IsString()
  treatment: string;

  @ApiPropertyOptional({ example: '항생제 3일분, 소염제 5일분' })
  @IsOptional()
  @IsString()
  prescription?: string;

  @ApiProperty({ example: '김수의' })
  @IsString()
  @MaxLength(100)
  veterinarianName: string;

  @ApiPropertyOptional({ example: 'VET-2024-12345' })
  @IsOptional()
  @IsString()
  veterinarianLicense?: string;

  // ============================================================
  // Cost Information (Required) ⭐
  // ============================================================

  @ApiProperty({ example: 280000 })
  @IsNumber()
  @Min(0)
  actualCost: number; // 실제 청구액

  @ApiProperty({ type: CostBreakdownDto })
  @ValidateNested()
  @Type(() => CostBreakdownDto)
  costBreakdown: CostBreakdownDto;

  @ApiPropertyOptional({ type: [ServiceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceItemDto)
  serviceItems?: ServiceItemDto[];

  @ApiProperty({ type: PaymentInfoDto })
  @ValidateNested()
  @Type(() => PaymentInfoDto)
  payment: PaymentInfoDto;

  // ============================================================
  // Documents (Required) ⭐
  // ============================================================

  @ApiProperty({ type: [MedicalDocumentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicalDocumentDto)
  documents: MedicalDocumentDto[];

  // ============================================================
  // Optional Fields
  // ============================================================

  @ApiPropertyOptional({ example: '1주일 후 재검진 필요' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'PROC-001' })
  @IsOptional()
  @IsString()
  procedureCode?: string;

  @ApiPropertyOptional({ example: 'K52.9' })
  @IsOptional()
  @IsString()
  diagnosisCode?: string;
}

// ==================== Update Medical Record DTO (Hospital) ====================

export class HospitalUpdateMedicalRecordDto {
  @ApiPropertyOptional({ example: '추가 메모' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 300000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualCost?: number;

  @ApiPropertyOptional({ type: CostBreakdownDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CostBreakdownDto)
  costBreakdown?: CostBreakdownDto;

  @ApiPropertyOptional({ type: [ServiceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceItemDto)
  serviceItems?: ServiceItemDto[];

  @ApiPropertyOptional({ type: PaymentInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentInfoDto)
  payment?: PaymentInfoDto;

  @ApiPropertyOptional({ type: [MedicalDocumentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicalDocumentDto)
  documents?: MedicalDocumentDto[];
}
