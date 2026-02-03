import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDate,
  IsUUID,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PetSpecies, PetGender, PetSize } from '../../pets/entities/pet.entity';
import { HealthStatus, EnergyLevel } from '../entities/pet-listing.entity';

export class CreatePetListingDto {
  @ApiProperty({ description: 'Shelter ID' })
  @IsUUID()
  shelterId: string;

  @ApiProperty({ example: '뭉치', description: '동물 이름' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ enum: PetSpecies, example: PetSpecies.DOG })
  @IsEnum(PetSpecies)
  species: PetSpecies;

  @ApiPropertyOptional({ example: '진돗개', description: '품종' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  breed?: string;

  @ApiPropertyOptional({ example: '진돗개 + 시바견', description: '믹스견 품종' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  mixedBreed?: string;

  @ApiProperty({ enum: PetGender, example: PetGender.MALE })
  @IsEnum(PetGender)
  gender: PetGender;

  @ApiPropertyOptional({ type: Date, description: '생년월일' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;

  @ApiPropertyOptional({ example: 3, description: '추정 나이 (년)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  estimatedAgeYears?: number;

  @ApiPropertyOptional({ example: 6, description: '추정 나이 (월)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(11)
  estimatedAgeMonths?: number;

  @ApiPropertyOptional({ enum: PetSize, example: PetSize.MEDIUM })
  @IsOptional()
  @IsEnum(PetSize)
  size?: PetSize;

  @ApiPropertyOptional({ example: 12.5, description: '몸무게 (kg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  weight?: number;

  @ApiPropertyOptional({ example: '갈색', description: '색상' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  color?: string;

  @ApiProperty({
    enum: HealthStatus,
    example: HealthStatus.GOOD,
    description: '건강 상태',
  })
  @IsEnum(HealthStatus)
  healthStatus: HealthStatus;

  @ApiPropertyOptional({ example: true, description: '중성화 여부' })
  @IsOptional()
  @IsBoolean()
  isNeutered?: boolean;

  @ApiPropertyOptional({ example: true, description: '예방접종 완료 여부' })
  @IsOptional()
  @IsBoolean()
  isVaccinated?: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['광견병', 'DHPPL'],
    description: '접종 완료 백신 목록',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vaccines?: string[];

  @ApiPropertyOptional({ type: Date, description: '마지막 예방접종일' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastVaccinationDate?: Date;

  @ApiPropertyOptional({
    type: [String],
    example: ['닭고기'],
    description: '알레르기',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['슬개골 탈구'],
    description: '만성 질환',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chronicConditions?: string[];

  @ApiPropertyOptional({ description: '병력 상세' })
  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @ApiPropertyOptional({ example: false, description: '특별 관리 필요 여부' })
  @IsOptional()
  @IsBoolean()
  hasSpecialNeeds?: boolean;

  @ApiPropertyOptional({ description: '특별 관리 필요 사항 설명' })
  @IsOptional()
  @IsString()
  specialNeedsDescription?: string;

  @ApiPropertyOptional({ description: '마이크로칩 번호' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  microchipNumber?: string;

  @ApiProperty({
    enum: EnergyLevel,
    example: EnergyLevel.MODERATE,
    description: '활동량',
  })
  @IsEnum(EnergyLevel)
  energyLevel: EnergyLevel;

  @ApiPropertyOptional({
    type: [String],
    example: ['온순함', '활발함'],
    description: '성격 특성',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  temperamentTraits?: string[];

  @ApiPropertyOptional({ description: '성격 상세 설명' })
  @IsOptional()
  @IsString()
  personalityDescription?: string;

  @ApiPropertyOptional({ example: true, description: '아이들과 잘 지냄' })
  @IsOptional()
  @IsBoolean()
  goodWithKids?: boolean;

  @ApiPropertyOptional({ example: true, description: '개들과 잘 지냄' })
  @IsOptional()
  @IsBoolean()
  goodWithDogs?: boolean;

  @ApiPropertyOptional({ example: true, description: '고양이와 잘 지냄' })
  @IsOptional()
  @IsBoolean()
  goodWithCats?: boolean;

  @ApiPropertyOptional({ example: true, description: '다른 반려동물과 잘 지냄' })
  @IsOptional()
  @IsBoolean()
  goodWithOtherPets?: boolean;

  @ApiPropertyOptional({ example: false, description: '경험 있는 주인 필요' })
  @IsOptional()
  @IsBoolean()
  needsExperiencedOwner?: boolean;

  @ApiPropertyOptional({ example: false, description: '단독 가정 필요' })
  @IsOptional()
  @IsBoolean()
  mustBeOnlyPet?: boolean;

  @ApiPropertyOptional({ description: '행동 특성 메모' })
  @IsOptional()
  @IsString()
  behaviorNotes?: string;

  @ApiProperty({ type: Date, description: '구조일' })
  @Type(() => Date)
  @IsDate()
  rescueDate: Date;

  @ApiPropertyOptional({ description: '구조 장소' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  rescueLocation?: string;

  @ApiPropertyOptional({ description: '구조 스토리' })
  @IsOptional()
  @IsString()
  rescueStory?: string;

  @ApiPropertyOptional({ example: '유기', description: '이전 소유 상태' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  previousOwnershipStatus?: string;

  @ApiPropertyOptional({ description: '대표 사진 URL' })
  @IsOptional()
  @IsString()
  primaryPhotoUrl?: string;

  @ApiPropertyOptional({ type: [String], description: '사진 URL 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @ApiPropertyOptional({ type: [String], description: '동영상 URL 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videoUrls?: string[];

  @ApiPropertyOptional({ example: 50000, description: '입양 비용' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  adoptionFee?: number;

  @ApiPropertyOptional({ description: '입양 비용 설명' })
  @IsOptional()
  @IsString()
  adoptionFeeDescription?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['성인 가정', '마당 필수'],
    description: '입양 조건',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adoptionRequirements?: string[];

  @ApiPropertyOptional({ description: '이상적인 가정 환경 설명' })
  @IsOptional()
  @IsString()
  idealHomeDescription?: string;

  @ApiPropertyOptional({ example: true, description: '가정 방문 필수 여부' })
  @IsOptional()
  @IsBoolean()
  requiresHomeVisit?: boolean;

  @ApiPropertyOptional({ example: false, description: '사후 관리 필요 여부' })
  @IsOptional()
  @IsBoolean()
  requiresFollowUp?: boolean;

  @ApiPropertyOptional({ example: 30, description: '적응 기간 (일)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  trialPeriodDays?: number;

  @ApiPropertyOptional({ example: false, description: '긴급 입양 필요 여부' })
  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @ApiPropertyOptional({ description: '긴급 사유' })
  @IsOptional()
  @IsString()
  urgentReason?: string;

  @ApiPropertyOptional({ example: false, description: '추천 리스팅 여부' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
