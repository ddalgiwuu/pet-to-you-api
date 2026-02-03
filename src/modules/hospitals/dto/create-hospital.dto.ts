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
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HospitalType, HospitalStatus } from '../entities/hospital.entity';

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

class PricingInfoDto {
  @ApiPropertyOptional({ description: '진료비 (기본)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  consultation?: number;

  @ApiPropertyOptional({ description: '예방접종' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vaccination?: number;

  @ApiPropertyOptional({ description: '응급 진료비' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  emergency?: number;
}

export class CreateHospitalDto {
  // ============================================================
  // Basic Information
  // ============================================================

  @ApiProperty({ description: '병원명', example: '강남동물병원' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 200)
  name: string;

  @ApiPropertyOptional({ description: '영문 병원명', example: 'Gangnam Animal Hospital' })
  @IsOptional()
  @IsString()
  @Length(2, 200)
  nameEnglish?: string;

  @ApiProperty({ enum: HospitalType, description: '병원 타입' })
  @IsEnum(HospitalType)
  type: HospitalType;

  @ApiPropertyOptional({ description: '병원 소개' })
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

  @ApiProperty({ description: '수의사 면허번호', example: 'VET-12345' })
  @IsString()
  @IsNotEmpty()
  @Length(5, 20)
  veterinaryLicenseNumber: string;

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

  @ApiPropertyOptional({ description: '네이버 플레이스 URL' })
  @IsOptional()
  @IsUrl()
  naverPlaceUrl?: string;

  // ============================================================
  // Operating Hours (KST)
  // ============================================================

  @ApiProperty({
    description: '운영 시간 (요일별)',
    example: {
      monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      saturday: { isOpen: true, openTime: '09:00', closeTime: '15:00' },
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

  @ApiPropertyOptional({ description: '24시간 운영 여부' })
  @IsOptional()
  @IsBoolean()
  is24Hours?: boolean;

  @ApiPropertyOptional({ description: '정기 휴무일', example: ['월', '공휴일'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  holidays?: string[];

  // ============================================================
  // Services & Features
  // ============================================================

  @ApiProperty({
    description: '진료 과목',
    example: ['일반진료', '예방접종', '중성화수술'],
  })
  @IsArray()
  @IsString({ each: true })
  services: string[];

  @ApiPropertyOptional({
    description: '전문 분야',
    example: ['피부과', '치과', '정형외과'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({
    description: '진료 가능 동물',
    example: ['dog', 'cat', 'rabbit'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedSpecies?: string[];

  @ApiPropertyOptional({ description: '주차 가능 여부' })
  @IsOptional()
  @IsBoolean()
  hasParking?: boolean;

  @ApiPropertyOptional({ description: '응급진료 가능 여부' })
  @IsOptional()
  @IsBoolean()
  hasEmergency?: boolean;

  @ApiPropertyOptional({ description: '미용 서비스 제공 여부' })
  @IsOptional()
  @IsBoolean()
  hasGrooming?: boolean;

  @ApiPropertyOptional({ description: '호텔 서비스 제공 여부' })
  @IsOptional()
  @IsBoolean()
  hasHotel?: boolean;

  // ============================================================
  // Pricing & Payment
  // ============================================================

  @ApiPropertyOptional({ description: '가격 정보' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PricingInfoDto)
  pricingInfo?: PricingInfoDto;

  @ApiPropertyOptional({
    description: '결제 수단',
    example: ['card', 'cash', 'transfer'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedPaymentMethods?: string[];

  @ApiPropertyOptional({ description: '보험 청구 가능 여부' })
  @IsOptional()
  @IsBoolean()
  acceptsInsurance?: boolean;

  // ============================================================
  // Media
  // ============================================================

  @ApiPropertyOptional({ description: '로고 URL' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ description: '병원 사진 URLs' })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photoUrls?: string[];

  @ApiPropertyOptional({ description: '가상 투어 URL' })
  @IsOptional()
  @IsUrl()
  virtualTourUrl?: string;
}
