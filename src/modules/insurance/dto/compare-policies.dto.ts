import { IsString, IsInt, IsOptional, Min, IsEnum, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum PetSpeciesForInsurance {
  DOG = 'dog',
  CAT = 'cat',
}

export class ComparePoliciesDto {
  @ApiProperty({
    description: '반려동물 종류',
    enum: PetSpeciesForInsurance,
    example: 'dog',
  })
  @IsEnum(PetSpeciesForInsurance)
  species: PetSpeciesForInsurance;

  @ApiProperty({
    description: '반려동물 연령 (개월)',
    example: 24,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  ageMonths: number;

  @ApiProperty({
    description: '반려동물 품종 (예: 말티즈, 시바견)',
    example: '말티즈',
    required: false,
  })
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiProperty({
    description: '기왕증 유무',
    example: false,
    required: false,
  })
  @IsOptional()
  hasPreexistingConditions?: boolean;

  @ApiProperty({
    description: '원하는 보장 유형 (accident, illness, surgery 등)',
    example: ['accident', 'illness', 'surgery'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  desiredCoverageTypes?: string[];

  @ApiProperty({
    description: '월 예산 (원)',
    example: 50000,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  monthlyBudget?: number;

  @ApiProperty({
    description: '최소 보장 금액 (원)',
    example: 5000000,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minCoverageAmount?: number;
}
