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
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DaycareServiceType } from '../entities/daycare-center.entity';

export enum SortBy {
  DISTANCE = 'distance',        // 거리순
  RATING = 'rating',             // 평점순
  REVIEWS = 'reviews',           // 리뷰 많은순
  POPULARITY = 'popularity',     // 인기순 (조회수 + 북마크)
  PRICE_LOW = 'price_low',       // 가격 낮은순
  PRICE_HIGH = 'price_high',     // 가격 높은순
  RECENT = 'recent',             // 최근 등록순
}

export class SearchDaycareDto {
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
    description: '검색어 (센터명, 주소)',
    example: '강남 데이케어',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  // ============================================================
  // Filters
  // ============================================================

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
    description: '서비스 타입',
    enum: DaycareServiceType,
    example: DaycareServiceType.DAILY,
  })
  @IsOptional()
  @IsEnum(DaycareServiceType)
  serviceType?: DaycareServiceType;

  @ApiPropertyOptional({
    description: '최소 가격 (1일 기준)',
    example: 10000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({
    description: '최대 가격 (1일 기준)',
    example: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: '수용 가능 동물',
    example: 'dog',
  })
  @IsOptional()
  @IsString()
  species?: string;

  @ApiPropertyOptional({
    description: '현재 영업중만 표시',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  openNow?: boolean;

  @ApiPropertyOptional({
    description: '수용 가능한 센터만 표시',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasAvailableCapacity?: boolean;

  @ApiPropertyOptional({
    description: 'CCTV 설치된 센터만',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasCctv?: boolean;

  @ApiPropertyOptional({
    description: '실시간 캠 제공 센터만',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasLiveCam?: boolean;

  @ApiPropertyOptional({
    description: '픽업 서비스 제공 센터만',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasPickupService?: boolean;

  @ApiPropertyOptional({
    description: '주차 가능 센터만',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasParking?: boolean;

  @ApiPropertyOptional({
    description: '배상책임보험 가입 센터만',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasLiabilityInsurance?: boolean;

  @ApiPropertyOptional({
    description: '일일 보고서 제공 센터만',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  providesDailyReport?: boolean;

  @ApiPropertyOptional({
    description: '수의사 긴급 호출 가능 센터만',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasVetOnCall?: boolean;

  @ApiPropertyOptional({
    description: '검증된 센터만 표시',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  verifiedOnly?: boolean;

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

  @ApiPropertyOptional({
    description: '필요한 시설 (복수 선택)',
    example: ['놀이터', '수영장'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  @ApiPropertyOptional({
    description: '예약 날짜 (수용 가능 여부 확인)',
    example: '2024-01-20',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  reservationDate?: Date;

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

export class SearchDaycareResponseDto {
  @ApiPropertyOptional({ description: '센터 ID' })
  id: string;

  @ApiPropertyOptional({ description: '센터명' })
  name: string;

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

  @ApiPropertyOptional({ description: '수용 가능 여부' })
  hasAvailableCapacity: boolean;

  @ApiPropertyOptional({ description: '서비스 타입' })
  serviceTypes: string[];

  @ApiPropertyOptional({ description: '최저 가격 (1일 기준)' })
  minPricePerDay: number;

  @ApiPropertyOptional({ description: '검증 상태' })
  verificationStatus: string;

  @ApiPropertyOptional({ description: 'CCTV 설치 여부' })
  hasCctv: boolean;

  @ApiPropertyOptional({ description: '실시간 캠 제공 여부' })
  hasLiveCam: boolean;

  @ApiPropertyOptional({ description: '픽업 서비스 제공 여부' })
  hasPickupService: boolean;

  @ApiPropertyOptional({ description: '로고 URL' })
  logoUrl?: string;

  @ApiPropertyOptional({ description: '사진 URLs' })
  photoUrls?: string[];

  @ApiPropertyOptional({ description: '위도' })
  latitude: number;

  @ApiPropertyOptional({ description: '경도' })
  longitude: number;
}
