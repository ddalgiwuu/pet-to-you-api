import {
  IsString,
  IsUUID,
  IsDate,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class LabResultDto {
  @ApiProperty({ example: 'Complete Blood Count (CBC)' })
  @IsString()
  testName: string;

  @ApiProperty({ example: '15.2' })
  @IsString()
  result: string;

  @ApiPropertyOptional({ example: 'g/dL' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: '12.0-18.0' })
  @IsOptional()
  @IsString()
  referenceRange?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  abnormal?: boolean;
}

class CostBreakdownDto {
  @ApiProperty({ example: '진찰료' })
  @IsString()
  item: string;

  @ApiProperty({ example: 30000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;
}

// ⭐ New structured cost breakdown
class CostBreakdownStructuredDto {
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

  @ApiPropertyOptional({ example: 0 })
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

// ⭐ Service Item DTO
class ServiceItemDto {
  @ApiProperty({ example: 'item-123' })
  @IsString()
  id: string;

  @ApiProperty({ example: '혈액검사' })
  @IsString()
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

// ⭐ Payment DTO
class PaymentDto {
  @ApiProperty({ example: 150000 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(0)
  insuranceCoverage: number;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  selfPayment: number;

  @ApiProperty({ example: 'card', enum: ['card', 'cash', 'account', 'insurance'] })
  @IsString()
  paymentMethod: string;

  @ApiProperty({ example: 'completed', enum: ['pending', 'partial', 'completed'] })
  @IsString()
  paymentStatus: string;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  @Min(0)
  paidAmount: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  remainingAmount: number;
}

// ⭐ Document DTO
class DocumentDto {
  @ApiProperty({ example: 'doc-123' })
  @IsString()
  id: string;

  @ApiProperty({
    example: 'receipt',
    enum: ['receipt', 'medical_record', 'diagnosis', 'prescription', 'xray', 'lab_result', 'photo', 'other'],
  })
  @IsString()
  type: string;

  @ApiProperty({ example: 'receipt_20240115.jpg' })
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

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @IsString()
  uploadedAt: string;

  @ApiPropertyOptional({ example: 'user-123' })
  @IsOptional()
  @IsString()
  uploadedBy?: string;
}

// ⭐ Follow-up DTO
class FollowUpDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({ example: '2024-01-22T10:00:00Z' })
  @IsOptional()
  @IsString()
  scheduledDate?: string;

  @ApiPropertyOptional({ example: '1주일 후 재검진' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateHealthNoteDto {
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
  // Hospital & Veterinarian Information
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
  // Visit Information
  // ============================================================

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @Type(() => Date)
  @IsDate()
  visitDate: Date;

  @ApiProperty({ example: '정기 건강 검진' })
  @IsString()
  @MaxLength(500)
  visitReason: string;

  @ApiPropertyOptional({ example: '정기' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  visitType?: string;

  // ============================================================
  // Medical Information (WILL BE ENCRYPTED)
  // ============================================================

  @ApiProperty({
    description: 'Diagnosis (will be encrypted)',
    example: '경미한 위염 의심. 식이 관리 필요.',
  })
  @IsString()
  diagnosis: string;

  @ApiProperty({
    description: 'Treatment details (will be encrypted)',
    example: '링거 처치 진행, 위장약 처방',
  })
  @IsString()
  treatment: string;

  @ApiPropertyOptional({
    description: 'Prescription (will be encrypted)',
    example: '위장약 (소염제) 3일분, 식이요법 안내서',
  })
  @IsOptional()
  @IsString()
  prescription?: string;

  // ============================================================
  // Vital Signs
  // ============================================================

  @ApiPropertyOptional({ example: 38.5 })
  @IsOptional()
  @IsNumber()
  @Min(35.0)
  @Max(42.0)
  temperature?: number;

  @ApiPropertyOptional({ example: 12.5 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(200)
  weight?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsNumber()
  @Min(40)
  @Max(250)
  heartRate?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(60)
  respiratoryRate?: number;

  @ApiPropertyOptional({ example: '120/80' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bloodPressure?: string;

  // ============================================================
  // Lab Results & Attachments
  // ============================================================

  @ApiPropertyOptional({ type: [LabResultDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabResultDto)
  labResults?: LabResultDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];

  // ============================================================
  // Follow-up & Next Steps
  // ============================================================

  @ApiPropertyOptional({ example: '1주일 후 재검진 필요. 식이요법 엄수.' })
  @IsOptional()
  @IsString()
  followUpRecommendations?: string;

  @ApiPropertyOptional({ example: '2024-01-22T10:30:00Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextAppointmentDate?: Date;

  @ApiPropertyOptional({ example: '재검진' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  nextAppointmentReason?: string;

  // ============================================================
  // Cost Information (Enhanced) ⭐
  // ============================================================

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number; // AI 추정

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualCost?: number; // 실제 병원 청구액 ⭐

  @ApiPropertyOptional({ type: CostBreakdownStructuredDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CostBreakdownStructuredDto)
  costBreakdown?: CostBreakdownStructuredDto; // New structured format ⭐

  @ApiPropertyOptional({ type: [CostBreakdownDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CostBreakdownDto)
  costBreakdownLegacy?: CostBreakdownDto[]; // Old format (deprecated)

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCost?: number; // Deprecated, use actualCost

  // ⭐ Service Items
  @ApiPropertyOptional({ type: [ServiceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceItemDto)
  serviceItems?: ServiceItemDto[];

  // ⭐ Payment Tracking
  @ApiPropertyOptional({ type: PaymentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDto)
  payment?: PaymentDto;

  @ApiPropertyOptional({ example: '카드' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string; // Deprecated, use payment.paymentMethod

  // ⭐ Document Management
  @ApiPropertyOptional({ type: [DocumentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents?: DocumentDto[];

  // ⭐ Insurance Integration
  @ApiPropertyOptional({ example: 'claim-123' })
  @IsOptional()
  @IsString()
  insuranceClaimId?: string;

  @ApiPropertyOptional({ example: 'emergency' })
  @IsOptional()
  @IsString()
  insuranceCoverageType?: string; // AI classification

  // ⭐ Follow-up
  @ApiPropertyOptional({ type: FollowUpDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FollowUpDto)
  followUp?: FollowUpDto;

  // ⭐ Procedure Codes
  @ApiPropertyOptional({ example: 'PROC-001' })
  @IsOptional()
  @IsString()
  procedureCode?: string;

  @ApiPropertyOptional({ example: 'K52.9' })
  @IsOptional()
  @IsString()
  diagnosisCode?: string;

  // ⭐ Booking Connection
  @ApiPropertyOptional({ example: 'booking-123' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({ example: 'hospital-123' })
  @IsOptional()
  @IsString()
  hospitalId?: string;

  // ============================================================
  // Metadata
  // ============================================================

  @ApiPropertyOptional({ example: '진료' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  recordType?: string;

  @ApiPropertyOptional({ example: '보호자 메모: 식욕이 없어 보임' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;

  // ⭐ Creator Metadata
  @ApiPropertyOptional({ example: 'patient', enum: ['patient', 'hospital_staff', 'system'] })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ example: 'completed', enum: ['draft', 'completed', 'billed', 'settled'] })
  @IsOptional()
  @IsString()
  recordStatus?: string;
}
