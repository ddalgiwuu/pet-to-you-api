import {
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  IsPhoneNumber,
  IsUrl,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsObject,
  Min,
  Max,
  Length,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ShelterType } from '../entities/shelter.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class OperatingHoursDto {
  @ApiPropertyOptional({ example: { open: '09:00', close: '18:00' } })
  @IsOptional()
  @IsObject()
  monday?: { open: string; close: string };

  @ApiPropertyOptional({ example: { open: '09:00', close: '18:00' } })
  @IsOptional()
  @IsObject()
  tuesday?: { open: string; close: string };

  @ApiPropertyOptional({ example: { open: '09:00', close: '18:00' } })
  @IsOptional()
  @IsObject()
  wednesday?: { open: string; close: string };

  @ApiPropertyOptional({ example: { open: '09:00', close: '18:00' } })
  @IsOptional()
  @IsObject()
  thursday?: { open: string; close: string };

  @ApiPropertyOptional({ example: { open: '09:00', close: '18:00' } })
  @IsOptional()
  @IsObject()
  friday?: { open: string; close: string };

  @ApiPropertyOptional({ example: { open: '09:00', close: '18:00' } })
  @IsOptional()
  @IsObject()
  saturday?: { open: string; close: string };

  @ApiPropertyOptional({ example: { open: '09:00', close: '18:00' } })
  @IsOptional()
  @IsObject()
  sunday?: { open: string; close: string };
}

export class CreateShelterDto {
  @ApiProperty({ example: '행복한 보호소', description: '보호소 이름' })
  @IsString()
  @Length(2, 200)
  name: string;

  @ApiProperty({
    enum: ShelterType,
    example: ShelterType.PRIVATE,
    description: '보호소 유형',
  })
  @IsEnum(ShelterType)
  type: ShelterType;

  @ApiPropertyOptional({ description: '보호소 소개' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '1234567890',
    description: '사업자등록번호 (10자리)',
  })
  @IsString()
  @Length(10, 10)
  @Matches(/^\d{10}$/, { message: '사업자등록번호는 10자리 숫자여야 합니다' })
  businessRegistrationNumber: string;

  @ApiPropertyOptional({ description: '법인명/상호명' })
  @IsOptional()
  @IsString()
  @Length(2, 200)
  businessName?: string;

  @ApiPropertyOptional({ description: '대표자 이름' })
  @IsOptional()
  @IsString()
  @Length(2, 200)
  representativeName?: string;

  @ApiProperty({ example: '010-1234-5678', description: '전화번호' })
  @IsPhoneNumber('KR')
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'contact@shelter.com', description: '이메일' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'https://shelter.com', description: '웹사이트' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({ example: '서울특별시 강남구 테헤란로 123', description: '주소' })
  @IsString()
  @Length(5, 500)
  address: string;

  @ApiProperty({ example: '서울특별시', description: '시/도' })
  @IsString()
  @Length(2, 100)
  city: string;

  @ApiProperty({ example: '강남구', description: '구/군' })
  @IsString()
  @Length(2, 100)
  district: string;

  @ApiPropertyOptional({ example: 37.5665, description: '위도' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 126.978, description: '경도' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ type: OperatingHoursDto, description: '운영 시간' })
  @IsOptional()
  @ValidateNested()
  @Type(() => OperatingHoursDto)
  operatingHours?: OperatingHoursDto;

  @ApiProperty({ example: 100, description: '최대 수용 동물 수' })
  @IsNumber()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['대형견', '노령견'],
    description: '특화 분야',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @ApiPropertyOptional({ example: false, description: '보증금 필요 여부' })
  @IsOptional()
  @IsBoolean()
  requiresDeposit?: boolean;

  @ApiPropertyOptional({ example: 100000, description: '보증금 금액' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional({ description: '은행명' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: '계좌번호' })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional({ description: '예금주' })
  @IsOptional()
  @IsString()
  accountHolder?: string;

  @ApiPropertyOptional({ description: '로고 URL' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({
    type: [String],
    description: '사진 URL 목록',
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photoUrls?: string[];
}
