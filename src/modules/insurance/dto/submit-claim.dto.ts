import {
  IsString,
  IsUUID,
  IsEnum,
  IsDateString,
  IsArray,
  IsOptional,
  IsNumber,
  Min,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ClaimType } from '../entities/insurance-claim.entity';

export class SubmitClaimDto {
  @ApiProperty({
    description: '사용자 보험 가입 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  userInsuranceId: string;

  @ApiProperty({
    description: '청구 유형',
    enum: ClaimType,
    example: ClaimType.SURGERY,
  })
  @IsEnum(ClaimType)
  claimType: ClaimType;

  // ============================================================
  // 암호화될 민감 정보
  // ============================================================

  @ApiProperty({
    description: '진단명',
    example: '슬개골 탈구 (Patellar Luxation)',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  diagnosis: string;

  @ApiProperty({
    description: '치료 내용',
    example: '슬개골 정복술 및 재활 치료',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  treatment: string;

  @ApiProperty({
    description: '병원명',
    example: '서울동물병원',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  hospitalName: string;

  @ApiProperty({
    description: '담당 수의사',
    example: '김동물 수의사',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  veterinarianName?: string;

  @ApiProperty({
    description: '의료 기록 상세 정보',
    example: '수술 후 2주간 재활 치료 진행',
    maxLength: 5000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  medicalRecordDetails?: string;

  // ============================================================
  // 공개 정보
  // ============================================================

  @ApiProperty({
    description: '사고/발병 날짜',
    example: '2024-01-15',
  })
  @IsDateString()
  incidentDate: string;

  @ApiProperty({
    description: '치료 시작 날짜',
    example: '2024-01-16',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  treatmentStartDate?: string;

  @ApiProperty({
    description: '치료 종료 날짜',
    example: '2024-01-30',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  treatmentEndDate?: string;

  @ApiProperty({
    description: '총 청구 금액 (원)',
    example: 1500000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalClaimAmount: number;

  @ApiProperty({
    description: '첨부 서류 URL 목록',
    example: [
      'https://s3.amazonaws.com/docs/receipt-001.pdf',
      'https://s3.amazonaws.com/docs/medical-record-001.pdf',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  attachedDocuments: string[];

  @ApiProperty({
    description: '사용자 코멘트',
    example: '수술 후 회복이 양호합니다.',
    maxLength: 1000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  userComments?: string;
}
