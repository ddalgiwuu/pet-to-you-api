import {
  IsUUID,
  IsEnum,
  IsDateString,
  IsArray,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentCycle } from '../entities/user-insurance.entity';

export class SubscribePolicyDto {
  @ApiProperty({
    description: '보험 정책 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  policyId: string;

  @ApiProperty({
    description: '반려동물 ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  petId: string;

  @ApiProperty({
    description: '보장 시작일',
    example: '2024-02-01',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: '납부 주기',
    enum: PaymentCycle,
    example: PaymentCycle.MONTHLY,
  })
  @IsEnum(PaymentCycle)
  paymentCycle: PaymentCycle;

  @ApiProperty({
    description: '선택한 특약 목록',
    example: ['배상책임보장', '장례비보장'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedSpecialClauses?: string[];

  @ApiProperty({
    description: '자동 갱신 여부',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  autoRenewal?: boolean;

  @ApiProperty({
    description: '결제 수단',
    example: 'credit_card',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({
    description: '메모',
    example: '가족 반려동물 보험',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
