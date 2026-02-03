import {
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  IsUrl,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  ValidateNested,
  Matches,
  Min,
  Max,
  Length,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DaycareServiceType } from '../entities/daycare-center.entity';

// Define BreakTimeDto first to avoid initialization order issues
class BreakTimeDto {
  @ApiProperty({ example: '12:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime: string;

  @ApiProperty({ example: '13:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime: string;
}

class OperatingHoursDto {
  @ApiProperty()
  @IsBoolean()
  isOpen: boolean;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'openTime must be in HH:MM format (24-hour)',
  })
  openTime: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'closeTime must be in HH:MM format (24-hour)',
  })
  closeTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BreakTimeDto)
  breakTime?: BreakTimeDto;
}

class HourlyPricingDto {
  @ApiProperty({ description: '시간당 가격' })
  @IsNumber()
  @Min(0)
  pricePerHour: number;

  @ApiProperty({ description: '최소 이용 시간' })
  @IsInt()
  @Min(1)
  minimumHours: number;

  @ApiPropertyOptional({ description: '추가 시간당 가격' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalHourPrice?: number;
}

class DailyPricingDto {
  @ApiProperty({ description: '1일 가격' })
  @IsNumber()
  @Min(0)
  pricePerDay: number;

  @ApiPropertyOptional({ description: '평일 할인율 (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountWeekday?: number;
}

class MonthlyPricingDto {
  @ApiProperty({ description: '월 정액 가격' })
  @IsNumber()
  @Min(0)
  pricePerMonth: number;

  @ApiProperty({ description: '주당 이용 일수' })
  @IsInt()
  @Min(1)
  @Max(7)
  daysPerWeek: number;

  @ApiPropertyOptional({ description: '할인율 (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountRate?: number;
}

class OvernightPricingDto {
  @ApiProperty({ description: '1박 가격' })
  @IsNumber()
  @Min(0)
  pricePerNight: number;
}

class PricingStructureDto {
  @ApiPropertyOptional({ description: '시간제 요금' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => HourlyPricingDto)
  hourly?: HourlyPricingDto;

  @ApiPropertyOptional({ description: '종일제 요금' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DailyPricingDto)
  daily?: DailyPricingDto;

  @ApiPropertyOptional({ description: '월정액 요금' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MonthlyPricingDto)
  monthly?: MonthlyPricingDto;

  @ApiPropertyOptional({ description: '1박 요금' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OvernightPricingDto)
  overnight?: OvernightPricingDto;
}

class AdditionalServiceDto {
  @ApiProperty({ description: '서비스명', example: '목욕 서비스' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '가격' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: '설명' })
  @IsOptional()
  @IsString()
  description?: string;
}

class CapacityBySizeCategoryDto {
  @ApiProperty({ description: '소형견 최대 수용' })
  @IsInt()
  @Min(0)
  small: number;

  @ApiProperty({ description: '중형견 최대 수용' })
  @IsInt()
  @Min(0)
  medium: number;

  @ApiProperty({ description: '대형견 최대 수용' })
  @IsInt()
  @Min(0)
  large: number;
}

export class CreateDaycareDto {
  // ============================================================
  // Basic Information
  // ============================================================

  @ApiProperty({ description: '센터명', example: '강남 반려동물 데이케어' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 200)
  name: string;

  @ApiPropertyOptional({ description: '영문 센터명', example: 'Gangnam Pet Daycare' })
  @IsOptional()
  @IsString()
  @Length(2, 200)
  nameEnglish?: string;

  @ApiPropertyOptional({ description: '센터 소개' })
  @IsOptional()
  @IsString()
  description?: string;

  // ============================================================
  // Business Registration
  // ============================================================

  @ApiProperty({ description: '사업자등록번호', example: '123-45-67890' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{3}-\d{2}-\d{5}$/, {
    message: 'businessRegistrationNumber must be in format: XXX-XX-XXXXX',
  })
  businessRegistrationNumber: string;

  @ApiProperty({ description: '대표자명', example: '홍길동' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  representativeName: string;

  @ApiPropertyOptional({ description: '반려동물관리업 등록번호', example: 'PET-12345' })
  @IsOptional()
  @IsString()
  @Length(5, 20)
  certificationNumber?: string;

  // ============================================================
  // Location (Korean Address System)
  // ============================================================

  @ApiProperty({ description: '우편번호', example: '06234' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{5}$/, { message: 'postalCode must be 5 digits' })
  postalCode: string;

  @ApiProperty({ description: '시/도', example: '서울특별시' })
  @IsString()
  @IsNotEmpty()
  sido: string;

  @ApiProperty({ description: '시/군/구', example: '강남구' })
  @IsString()
  @IsNotEmpty()
  sigungu: string;

  @ApiPropertyOptional({ description: '동/읍/면', example: '역삼동' })
  @IsOptional()
  @IsString()
  dong?: string;

  @ApiProperty({ description: '도로명 주소', example: '테헤란로 123' })
  @IsString()
  @IsNotEmpty()
  roadAddress: string;

  @ApiPropertyOptional({ description: '지번 주소', example: '역삼동 123-45' })
  @IsOptional()
  @IsString()
  jibunAddress?: string;

  @ApiPropertyOptional({ description: '상세 주소', example: '123동 456호' })
  @IsOptional()
  @IsString()
  detailAddress?: string;

  @ApiProperty({ description: '위도', example: 37.5012 })
  @IsNumber()
  @IsLatitude()
  latitude: number;

  @ApiProperty({ description: '경도', example: 127.0396 })
  @IsNumber()
  @IsLongitude()
  longitude: number;

  // ============================================================
  // Contact Information
  // ============================================================

  @ApiProperty({ description: '대표 전화번호', example: '02-1234-5678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0\d{1,2}-\d{3,4}-\d{4}$/, {
    message: 'phoneNumber must be in format: 0X(X)-XXXX-XXXX',
  })
  phoneNumber: string;

  @ApiPropertyOptional({ description: '응급 전화번호', example: '010-1234-5678' })
  @IsOptional()
  @IsString()
  @Matches(/^0\d{1,2}-\d{3,4}-\d{4}$/)
  emergencyPhoneNumber?: string;

  @ApiPropertyOptional({ description: '이메일' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '웹사이트 URL' })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional({ description: '카카오톡 채널 URL' })
  @IsOptional()
  @IsUrl()
  kakaoChannelUrl?: string;

  @ApiPropertyOptional({ description: '인스타그램 URL' })
  @IsOptional()
  @IsUrl()
  instagramUrl?: string;

  // ============================================================
  // Operating Hours (KST)
  // ============================================================

  @ApiProperty({
    description: '운영 시간 (요일별)',
    example: {
      monday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
      tuesday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
      wednesday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
      thursday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
      friday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
      saturday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      sunday: { isOpen: false, openTime: '00:00', closeTime: '00:00' },
    },
  })
  @IsObject()
  @ValidateNested()
  @Type(() => OperatingHoursDto)
  operatingHours: {
    monday: OperatingHoursDto;
    tuesday: OperatingHoursDto;
    wednesday: OperatingHoursDto;
    thursday: OperatingHoursDto;
    friday: OperatingHoursDto;
    saturday: OperatingHoursDto;
    sunday: OperatingHoursDto;
  };

  @ApiPropertyOptional({ description: '정기 휴무일', example: ['일요일', '공휴일'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  holidays?: string[];

  // ============================================================
  // Services & Pricing
  // ============================================================

  @ApiProperty({
    description: '제공 서비스 타입',
    example: ['hourly', 'daily', 'monthly'],
    enum: DaycareServiceType,
    isArray: true,
  })
  @IsArray()
  @IsEnum(DaycareServiceType, { each: true })
  serviceTypes: DaycareServiceType[];

  @ApiProperty({ description: '가격 구조' })
  @IsObject()
  @ValidateNested()
  @Type(() => PricingStructureDto)
  pricingStructure: PricingStructureDto;

  @ApiPropertyOptional({ description: '추가 서비스', type: [AdditionalServiceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalServiceDto)
  additionalServices?: AdditionalServiceDto[];

  // ============================================================
  // Capacity & Limits
  // ============================================================

  @ApiProperty({ description: '1일 최대 수용 가능 반려동물 수', example: 20 })
  @IsInt()
  @Min(1)
  maxCapacityPerDay: number;

  @ApiPropertyOptional({ description: '크기별 최대 수용' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CapacityBySizeCategoryDto)
  capacityBySizeCategory?: CapacityBySizeCategoryDto;

  @ApiPropertyOptional({
    description: '수용 가능 동물 종류',
    example: ['dog', 'cat'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedSpecies?: string[];

  @ApiPropertyOptional({
    description: '제한 품종',
    example: ['pit_bull', 'rottweiler'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  restrictedBreeds?: string[];

  // ============================================================
  // Facilities & Equipment
  // ============================================================

  @ApiPropertyOptional({ description: '실내 면적 (제곱미터)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  indoorAreaSqm?: number;

  @ApiPropertyOptional({ description: '실외 면적 (제곱미터)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  outdoorAreaSqm?: number;

  @ApiPropertyOptional({
    description: '시설',
    example: ['놀이터', 'CCTV', '에어컨', '개별 케이지'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @ApiPropertyOptional({
    description: '장비',
    example: ['수영장', '트레드밀', '간식'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];

  @ApiPropertyOptional({ description: 'CCTV 설치 여부' })
  @IsOptional()
  @IsBoolean()
  hasCctv?: boolean;

  @ApiPropertyOptional({ description: '실시간 캠 제공 여부' })
  @IsOptional()
  @IsBoolean()
  hasLiveCam?: boolean;

  @ApiPropertyOptional({ description: '실시간 캠 URL' })
  @IsOptional()
  @IsUrl()
  liveCamUrl?: string;

  @ApiPropertyOptional({ description: '주차 가능 여부' })
  @IsOptional()
  @IsBoolean()
  hasParking?: boolean;

  @ApiPropertyOptional({ description: '픽업/드롭 서비스 제공 여부' })
  @IsOptional()
  @IsBoolean()
  hasPickupService?: boolean;

  // ============================================================
  // Staff Information
  // ============================================================

  @ApiProperty({ description: '총 직원 수', example: 5 })
  @IsInt()
  @Min(1)
  totalStaff: number;

  @ApiPropertyOptional({ description: '자격증 보유 훈련사 수', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  certifiedTrainers?: number;

  @ApiPropertyOptional({
    description: '직원 자격증',
    example: ['반려동물행동교정사', '펫시터'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  staffCertifications?: string[];

  // ============================================================
  // Safety & Insurance
  // ============================================================

  @ApiPropertyOptional({ description: '배상책임보험 가입 여부' })
  @IsOptional()
  @IsBoolean()
  hasLiabilityInsurance?: boolean;

  @ApiPropertyOptional({ description: '보험사' })
  @IsOptional()
  @IsString()
  insuranceProvider?: string;

  @ApiPropertyOptional({ description: '보험 보장액' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceCoverageAmount?: number;

  @ApiPropertyOptional({
    description: '안전 조치',
    example: ['응급처치 교육', '소화기'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  safetyMeasures?: string[];

  @ApiPropertyOptional({ description: '수의사 긴급 호출 가능 여부' })
  @IsOptional()
  @IsBoolean()
  hasVetOnCall?: boolean;

  // ============================================================
  // Daily Activity Report
  // ============================================================

  @ApiPropertyOptional({ description: '일일 활동 보고서 제공 여부' })
  @IsOptional()
  @IsBoolean()
  providesDailyReport?: boolean;

  @ApiPropertyOptional({
    description: '보고서 포함 내용',
    example: ['사진', '활동 로그', '식사 기록'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reportIncludes?: string[];

  // ============================================================
  // Payment & Policy
  // ============================================================

  @ApiPropertyOptional({
    description: '결제 수단',
    example: ['card', 'cash', 'transfer'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedPaymentMethods?: string[];

  @ApiPropertyOptional({ description: '취소 정책' })
  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @ApiPropertyOptional({ description: '환불 정책' })
  @IsOptional()
  @IsString()
  refundPolicy?: string;

  @ApiPropertyOptional({ description: '필요 보증금' })
  @IsOptional()
  @IsInt()
  @Min(0)
  depositRequired?: number;

  // ============================================================
  // Media
  // ============================================================

  @ApiPropertyOptional({ description: '로고 URL' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ description: '센터 사진 URLs' })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photoUrls?: string[];

  @ApiPropertyOptional({ description: '홍보 영상 URLs' })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  videoUrls?: string[];

  @ApiPropertyOptional({ description: '가상 투어 URL' })
  @IsOptional()
  @IsUrl()
  virtualTourUrl?: string;
}
