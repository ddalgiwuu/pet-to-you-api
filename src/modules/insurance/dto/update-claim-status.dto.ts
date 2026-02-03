import {
  IsEnum,
  IsOptional,
  IsNumber,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ClaimStatus,
  DocumentVerificationStatus,
} from '../entities/insurance-claim.entity';

export class UpdateClaimStatusDto {
  @ApiProperty({
    description: '청구 상태',
    enum: ClaimStatus,
    example: ClaimStatus.APPROVED,
    required: false,
  })
  @IsOptional()
  @IsEnum(ClaimStatus)
  status?: ClaimStatus;

  @ApiProperty({
    description: '승인 금액 (원)',
    example: 1200000,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  approvedAmount?: number;

  @ApiProperty({
    description: '보장 비율 (%)',
    example: 80,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  coveragePercentage?: number;

  @ApiProperty({
    description: '심사자',
    example: 'admin@insurance.com',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reviewedBy?: string;

  @ApiProperty({
    description: '심사 메모',
    example: '모든 서류가 정상적으로 확인되었습니다.',
    maxLength: 2000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNotes?: string;

  @ApiProperty({
    description: '거부 사유',
    example: '보험 대기 기간이 경과하지 않았습니다.',
    maxLength: 2000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rejectionReason?: string;

  @ApiProperty({
    description: '서류 검증 상태',
    enum: DocumentVerificationStatus,
    example: DocumentVerificationStatus.VERIFIED,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentVerificationStatus)
  documentVerificationStatus?: DocumentVerificationStatus;

  @ApiProperty({
    description: '서류 검증 메모',
    example: '진료 기록부와 영수증이 모두 확인되었습니다.',
    maxLength: 2000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  documentVerificationNotes?: string;
}
