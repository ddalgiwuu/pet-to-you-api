import {
  IsOptional,
  IsNumber,
  IsEnum,
  IsString,
  IsBoolean,
  IsArray,
  Min,
  Max,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { HospitalType } from '../entities/hospital.entity';

export enum SortBy {
  DISTANCE = 'distance',        // 거리순
  RATING = 'rating',             // 평점순
  REVIEWS = 'reviews',           // 리뷰 많은순
  POPULARITY = 'popularity',     // 인기순 (조회수 + 북마크)
  RECENT = 'recent',             // 최근 등록순
}

export class SearchHospitalDto {
  // ============================================================
  // Geospatial Search
  // ============================================================

  @ApiPropertyOptional({
    description: '현재 위치 위도',
    example: 37.5012,
  })
  @IsOptional()
  @IsNumber()
  @IsLatitude()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({
    description: '현재 위치 경도',
    example: 127.0396,
  })
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({
    description: '검색 반경 (km)',
    example: 5,
    minimum: 0.1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(50)
  @Type(() => Number)
  radiusKm?: number = 5;

  // ============================================================
  // Text Search
  // ============================================================

  @ApiPropertyOptional({
    description: '검색어 (병원명, 주소)',
    example: '강남동물병원',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  // ============================================================
  // Filters
  // ============================================================

  @ApiPropertyOptional({
    description: '병원 타입',
    enum: HospitalType,
    example: HospitalType.GENERAL,
  })
  @IsOptional()
  @IsEnum(HospitalType)
  type?: HospitalType;

  @ApiPropertyOptional({
    description: '시/도',
    example: '서울특별시',
  })
  @IsOptional()
  @IsString()
  sido?: string;

  @ApiPropertyOptional({
    description: '시/군/구',
    example: '강남구',
  })
  @IsOptional()
  @IsString()
  sigungu?: string;

  @ApiPropertyOptional({
    description: '24시간 운영',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is24Hours?: boolean;

  @ApiPropertyOptional({
    description: '응급진료 가능',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasEmergency?: boolean;

  @ApiPropertyOptional({
    description: '주차 가능',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasParking?: boolean;

  @ApiPropertyOptional({
    description: '보험 청구 가능',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  acceptsInsurance?: boolean;

  @ApiPropertyOptional({
    description: '현재 영업중만 표시',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  openNow?: boolean;

  @ApiPropertyOptional({
    description: '진료 가능 동물',
    example: 'dog',
  })
  @IsOptional()
  @IsString()
  species?: string;

  @ApiPropertyOptional({
    description: '진료 과목 (복수 선택)',
    example: ['일반진료', '예방접종'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];

  @ApiPropertyOptional({
    description: '전문 분야 (복수 선택)',
    example: ['피부과', '치과'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({
    description: '최소 평점',
    example: 4.0,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  minRating?: number;

  // ============================================================
  // Sorting & Pagination
  // ============================================================

  @ApiPropertyOptional({
    description: '정렬 기준',
    enum: SortBy,
    default: SortBy.DISTANCE,
  })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.DISTANCE;

  @ApiPropertyOptional({
    description: '페이지 번호 (1부터 시작)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '페이지당 결과 수',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export class SearchHospitalResponseDto {
  @ApiPropertyOptional({ description: '병원 ID' })
  id: string;

  @ApiPropertyOptional({ description: '병원명' })
  name: string;

  @ApiPropertyOptional({ description: '병원 타입' })
  type: string;

  @ApiPropertyOptional({ description: '주소' })
  fullAddress: string;

  @ApiPropertyOptional({ description: '전화번호' })
  phoneNumber: string;

  @ApiPropertyOptional({ description: '평균 평점' })
  averageRating: number;

  @ApiPropertyOptional({ description: '총 리뷰 수' })
  totalReviews: number;

  @ApiPropertyOptional({ description: '거리 (km)' })
  distanceKm?: number;

  @ApiPropertyOptional({ description: '현재 영업중 여부' })
  isCurrentlyOpen: boolean;

  @ApiPropertyOptional({ description: '응급진료 가능' })
  hasEmergency: boolean;

  @ApiPropertyOptional({ description: '로고 URL' })
  logoUrl?: string;

  @ApiPropertyOptional({ description: '사진 URLs' })
  photoUrls?: string[];

  @ApiPropertyOptional({ description: '위도' })
  latitude: number;

  @ApiPropertyOptional({ description: '경도' })
  longitude: number;
}
