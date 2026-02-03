import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDate,
  IsUUID,
  IsEmail,
  IsPhoneNumber,
  ValidateNested,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HomeType, ExperienceLevel } from '../entities/adoption-application.entity';

class ReferenceDto {
  @ApiProperty({ example: '김철수' })
  @IsString()
  name: string;

  @ApiProperty({ example: '친구' })
  @IsString()
  relationship: string;

  @ApiProperty({ example: '010-1234-5678' })
  @IsPhoneNumber('KR')
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'friend@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

class CurrentPetDto {
  @ApiProperty({ example: 'dog' })
  @IsString()
  species: string;

  @ApiPropertyOptional({ example: '말티즈' })
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  age: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isNeutered: boolean;
}

export class CreateAdoptionApplicationDto {
  @ApiProperty({ description: 'Pet Listing ID' })
  @IsUUID()
  petListingId: string;

  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: '홍길동', description: '신청자 이름' })
  @IsString()
  @Length(2, 100)
  applicantName: string;

  @ApiProperty({ example: '010-1234-5678', description: '전화번호' })
  @IsPhoneNumber('KR')
  phoneNumber: string;

  @ApiProperty({ example: 'applicant@example.com', description: '이메일' })
  @IsEmail()
  email: string;

  @ApiProperty({ type: Date, description: '생년월일' })
  @Type(() => Date)
  @IsDate()
  dateOfBirth: Date;

  @ApiPropertyOptional({ example: '회사원', description: '직업' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  occupation?: string;

  @ApiProperty({ enum: HomeType, example: HomeType.APARTMENT, description: '주거 형태' })
  @IsEnum(HomeType)
  homeType: HomeType;

  @ApiProperty({ example: '서울특별시 강남구 테헤란로 123', description: '주소' })
  @IsString()
  @Length(5, 500)
  address: string;

  @ApiProperty({ example: true, description: '자가 소유 여부' })
  @IsBoolean()
  ownsHome: boolean;

  @ApiPropertyOptional({ example: false, description: '마당 유무' })
  @IsOptional()
  @IsBoolean()
  hasYard?: boolean;

  @ApiPropertyOptional({ example: 100, description: '마당 크기 (m²)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  yardSizeSquareMeters?: number;

  @ApiPropertyOptional({ example: false, description: '울타리 여부' })
  @IsOptional()
  @IsBoolean()
  isFenced?: boolean;

  @ApiPropertyOptional({ description: '집주인 이름' })
  @IsOptional()
  @IsString()
  landlordName?: string;

  @ApiPropertyOptional({ description: '집주인 전화번호' })
  @IsOptional()
  @IsPhoneNumber('KR')
  landlordPhone?: string;

  @ApiPropertyOptional({ example: true, description: '집주인 허가 여부' })
  @IsOptional()
  @IsBoolean()
  landlordApprovalObtained?: boolean;

  @ApiProperty({ example: 2, description: '성인 수' })
  @IsNumber()
  @Min(1)
  numberOfAdults: number;

  @ApiPropertyOptional({ example: 1, description: '아동 수' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  numberOfChildren?: number;

  @ApiPropertyOptional({
    type: [Number],
    example: [5, 8],
    description: '아동 연령대',
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  childrenAges?: number[];

  @ApiPropertyOptional({ example: false, description: '가족 중 알레르기' })
  @IsOptional()
  @IsBoolean()
  hasAllergiesInHousehold?: boolean;

  @ApiPropertyOptional({ description: '알레르기 상세' })
  @IsOptional()
  @IsString()
  allergyDetails?: string;

  @ApiProperty({
    enum: ExperienceLevel,
    example: ExperienceLevel.INTERMEDIATE,
    description: '반려동물 경험 수준',
  })
  @IsEnum(ExperienceLevel)
  petExperienceLevel: ExperienceLevel;

  @ApiPropertyOptional({ example: false, description: '현재 반려동물 보유 여부' })
  @IsOptional()
  @IsBoolean()
  hasCurrentPets?: boolean;

  @ApiPropertyOptional({
    type: [CurrentPetDto],
    description: '현재 보유 반려동물',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurrentPetDto)
  currentPets?: CurrentPetDto[];

  @ApiPropertyOptional({ example: true, description: '과거 반려동물 경험 여부' })
  @IsOptional()
  @IsBoolean()
  hadPetsInPast?: boolean;

  @ApiPropertyOptional({ description: '과거 반려동물 경험' })
  @IsOptional()
  @IsString()
  pastPetExperience?: string;

  @ApiPropertyOptional({ description: '반려동물 돌봄 계획' })
  @IsOptional()
  @IsString()
  petCarePlan?: string;

  @ApiPropertyOptional({
    type: [ReferenceDto],
    description: '추천인 정보',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReferenceDto)
  references?: ReferenceDto[];

  @ApiPropertyOptional({ description: '단골 수의사 이름' })
  @IsOptional()
  @IsString()
  veterinarianName?: string;

  @ApiPropertyOptional({ description: '수의사 전화번호' })
  @IsOptional()
  @IsPhoneNumber('KR')
  veterinarianPhone?: string;

  @ApiPropertyOptional({ description: '동물병원 이름' })
  @IsOptional()
  @IsString()
  veterinaryClinicName?: string;

  @ApiProperty({ example: true, description: '의료비 감당 가능 여부' })
  @IsBoolean()
  canAffordVetCare: boolean;

  @ApiPropertyOptional({ example: 200000, description: '월 반려동물 예산' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyPetBudget?: number;

  @ApiPropertyOptional({ description: '응급 의료 대처 계획' })
  @IsOptional()
  @IsString()
  emergencyVetPlan?: string;

  @ApiPropertyOptional({ example: true, description: '중성화 수술 의향' })
  @IsOptional()
  @IsBoolean()
  willingToSpayNeuter?: boolean;

  @ApiPropertyOptional({ example: true, description: '칩 등록 의향' })
  @IsOptional()
  @IsBoolean()
  willingToMicrochip?: boolean;

  @ApiProperty({ description: '입양 동기' })
  @IsString()
  @Length(10, 2000)
  adoptionReason: string;

  @ApiPropertyOptional({ description: '일과 설명' })
  @IsOptional()
  @IsString()
  dailyRoutineDescription?: string;

  @ApiPropertyOptional({ example: 8, description: '하루 혼자 있는 시간' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  hoursAlonePerDay?: number;

  @ApiPropertyOptional({ description: '근무 일정' })
  @IsOptional()
  @IsString()
  workSchedule?: string;

  @ApiProperty({ example: true, description: '약관 동의' })
  @IsBoolean()
  agreedToTerms: boolean;

  @ApiPropertyOptional({ example: true, description: '가정 방문 동의' })
  @IsOptional()
  @IsBoolean()
  agreedToHomeVisit?: boolean;

  @ApiPropertyOptional({ example: true, description: '사후 관리 동의' })
  @IsOptional()
  @IsBoolean()
  agreedToFollowUp?: boolean;

  @ApiPropertyOptional({ description: '추가 메모' })
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @ApiPropertyOptional({
    type: [String],
    description: '첨부 파일 URL',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];
}
