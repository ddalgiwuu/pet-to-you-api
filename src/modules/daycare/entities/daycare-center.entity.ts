import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { DaycareReservation } from './daycare-reservation.entity';

export enum DaycareServiceType {
  HOURLY = 'hourly',           // 시간제
  DAILY = 'daily',             // 종일제
  MONTHLY = 'monthly',         // 월정액
  OVERNIGHT = 'overnight',     // 1박 케어
}

export enum DaycareStatus {
  ACTIVE = 'active',
  TEMPORARILY_CLOSED = 'temporarily_closed',
  PERMANENTLY_CLOSED = 'permanently_closed',
  PENDING_VERIFICATION = 'pending_verification',
}

export enum VerificationStatus {
  NOT_VERIFIED = 'not_verified',
  OCR_VERIFIED = 'ocr_verified',           // OCR 인증 완료
  GOVERNMENT_VERIFIED = 'government_verified', // 정부 API 인증 완료
  FULL_VERIFIED = 'full_verified',         // 완전 인증
}

@Entity('daycare_centers')
@Index(['status', 'verificationStatus'])
// Note: businessRegistrationNumber unique constraint creates index automatically (no duplicate @Index needed)
export class DaycareCenter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Basic Information
  // ============================================================

  @Column({ type: 'varchar', length: 200 })
  name: string; // 센터명

  @Column({ type: 'varchar', length: 200, nullable: true })
  nameEnglish?: string; // 영문 센터명

  @Column({
    type: 'enum',
    enum: DaycareStatus,
    default: DaycareStatus.PENDING_VERIFICATION,
  })
  status: DaycareStatus;

  @Column({ type: 'text', nullable: true })
  description?: string; // 센터 소개

  // ============================================================
  // Business Registration & Certification
  // ============================================================

  // Note: unique: true creates index automatically - no need for duplicate @Index() decorator
  @Column({ type: 'varchar', length: 20, unique: true })
  businessRegistrationNumber: string; // 사업자등록번호 (xxx-xx-xxxxx)

  @Column({ type: 'varchar', length: 100 })
  representativeName: string; // 대표자명

  @Column({ type: 'varchar', length: 20, nullable: true })
  certificationNumber?: string; // 반려동물관리업 등록번호

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.NOT_VERIFIED,
  })
  verificationStatus: VerificationStatus;

  @Column({ type: 'boolean', default: false })
  isOcrVerified: boolean; // OCR 인증 여부

  @Column({ type: 'boolean', default: false })
  isGovernmentCertified: boolean; // 정부 인증 여부

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  verificationMetadata?: {
    ocrProvider?: string; // OCR 제공자
    ocrConfidence?: number; // OCR 신뢰도 (0-1)
    governmentApiSource?: string; // 정부 API 출처
    verifiedBy?: string; // 검증자 ID
    verificationNotes?: string; // 검증 메모
  };

  // ============================================================
  // Location (Korean Address System)
  // ============================================================

  @Column({ type: 'varchar', length: 10 })
  postalCode: string; // 우편번호 (xxxxx)

  @Column({ type: 'varchar', length: 100 })
  @Index()
  sido: string; // 시/도 (예: 서울특별시, 경기도)

  @Column({ type: 'varchar', length: 100 })
  @Index()
  sigungu: string; // 시/군/구 (예: 강남구, 수원시)

  @Column({ type: 'varchar', length: 100, nullable: true })
  dong?: string; // 동/읍/면 (예: 역삼동)

  @Column({ type: 'varchar', length: 500 })
  roadAddress: string; // 도로명 주소

  @Column({ type: 'varchar', length: 500, nullable: true })
  jibunAddress?: string; // 지번 주소

  @Column({ type: 'varchar', length: 500, nullable: true })
  detailAddress?: string; // 상세 주소 (동/호수)

  // Coordinates for geospatial search (stored here, indexed in MongoDB)
  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number; // 위도

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number; // 경도

  // ============================================================
  // Contact Information
  // ============================================================

  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string; // 대표 전화번호 (02-xxxx-xxxx)

  @Column({ type: 'varchar', length: 20, nullable: true })
  emergencyPhoneNumber?: string; // 응급 전화번호

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  websiteUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  kakaoChannelUrl?: string; // 카카오톡 채널

  @Column({ type: 'varchar', length: 255, nullable: true })
  instagramUrl?: string; // 인스타그램

  // ============================================================
  // Operating Hours (Korean Time - KST/UTC+9)
  // ============================================================

  @Column({ type: 'jsonb' })
  operatingHours: {
    [key: string]: {
      // monday, tuesday, ..., sunday
      isOpen: boolean;
      openTime: string; // HH:MM (24-hour format)
      closeTime: string; // HH:MM
      breakTime?: {
        // 점심시간
        startTime: string;
        endTime: string;
      };
    };
  };

  @Column({ type: 'simple-array', nullable: true })
  holidays?: string[]; // 정기 휴무일 (예: ['월', '화'])

  // ============================================================
  // Services & Pricing
  // ============================================================

  @Column({ type: 'simple-array' })
  serviceTypes: DaycareServiceType[]; // 제공 서비스 타입

  @Column({ type: 'jsonb' })
  pricingStructure: {
    hourly?: {
      pricePerHour: number; // 시간당 가격
      minimumHours: number; // 최소 시간
      additionalHourPrice?: number; // 추가 시간당 가격
    };
    daily?: {
      pricePerDay: number; // 1일 가격
      discountWeekday?: number; // 평일 할인 (%)
    };
    monthly?: {
      pricePerMonth: number; // 월 정액 가격
      daysPerWeek: number; // 주당 이용 일수
      discountRate?: number; // 할인율 (%)
    };
    overnight?: {
      pricePerNight: number; // 1박 가격
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  additionalServices?: {
    name: string;
    price: number;
    description?: string;
  }[]; // 추가 서비스 (목욕, 산책 등)

  // ============================================================
  // Capacity & Limits
  // ============================================================

  @Column({ type: 'int' })
  maxCapacityPerDay: number; // 1일 최대 수용 가능 반려동물 수

  @Column({ type: 'int', default: 0 })
  currentOccupancy: number; // 현재 수용 중인 반려동물 수

  @Column({ type: 'jsonb', nullable: true })
  capacityBySizeCategory?: {
    small: number; // 소형견 최대 수용
    medium: number; // 중형견 최대 수용
    large: number; // 대형견 최대 수용
  };

  @Column({ type: 'simple-array', nullable: true })
  acceptedSpecies?: string[]; // 수용 가능 동물 종류 (예: 'dog', 'cat')

  @Column({ type: 'simple-array', nullable: true })
  restrictedBreeds?: string[]; // 제한 품종

  // ============================================================
  // Facilities & Equipment
  // ============================================================

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  indoorAreaSqm?: number; // 실내 면적 (제곱미터)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  outdoorAreaSqm?: number; // 실외 면적 (제곱미터)

  @Column({ type: 'simple-array', nullable: true })
  facilities?: string[]; // 시설 (예: '놀이터', 'CCTV', '에어컨', '개별 케이지')

  @Column({ type: 'simple-array', nullable: true })
  equipment?: string[]; // 장비 (예: '수영장', '트레드밀', '간식')

  @Column({ type: 'boolean', default: false })
  hasCctv: boolean; // CCTV 설치 여부

  @Column({ type: 'boolean', default: false })
  hasLiveCam: boolean; // 실시간 캠 제공 여부

  @Column({ type: 'varchar', length: 255, nullable: true })
  liveCamUrl?: string; // 실시간 캠 URL

  @Column({ type: 'boolean', default: false })
  hasParking: boolean; // 주차 가능 여부

  @Column({ type: 'boolean', default: false })
  hasPickupService: boolean; // 픽업/드롭 서비스 제공 여부

  // ============================================================
  // Staff Information
  // ============================================================

  @Column({ type: 'int', default: 1 })
  totalStaff: number; // 총 직원 수

  @Column({ type: 'int', default: 0 })
  certifiedTrainers: number; // 자격증 보유 훈련사 수

  @Column({ type: 'simple-array', nullable: true })
  staffCertifications?: string[]; // 직원 자격증 (예: '반려동물행동교정사', '펫시터')

  // ============================================================
  // Safety & Insurance
  // ============================================================

  @Column({ type: 'boolean', default: false })
  hasLiabilityInsurance: boolean; // 배상책임보험 가입 여부

  @Column({ type: 'varchar', length: 255, nullable: true })
  insuranceProvider?: string; // 보험사

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  insuranceCoverageAmount?: number; // 보험 보장액

  @Column({ type: 'simple-array', nullable: true })
  safetyMeasures?: string[]; // 안전 조치 (예: '응급처치 교육', '소화기')

  @Column({ type: 'boolean', default: false })
  hasVetOnCall: boolean; // 수의사 긴급 호출 가능 여부

  // ============================================================
  // Daily Activity Report
  // ============================================================

  @Column({ type: 'boolean', default: false })
  providesDailyReport: boolean; // 일일 활동 보고서 제공 여부

  @Column({ type: 'simple-array', nullable: true })
  reportIncludes?: string[]; // 보고서 포함 내용 (예: '사진', '활동 로그', '식사 기록')

  // ============================================================
  // Payment & Policy
  // ============================================================

  @Column({ type: 'simple-array', nullable: true })
  acceptedPaymentMethods?: string[]; // ['card', 'cash', 'transfer']

  @Column({ type: 'text', nullable: true })
  cancellationPolicy?: string; // 취소 정책

  @Column({ type: 'text', nullable: true })
  refundPolicy?: string; // 환불 정책

  @Column({ type: 'int', nullable: true })
  depositRequired?: number; // 필요 보증금

  // ============================================================
  // Media & Photos
  // ============================================================

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl?: string;

  @Column({ type: 'simple-array', nullable: true })
  photoUrls?: string[]; // 센터 사진들

  @Column({ type: 'simple-array', nullable: true })
  videoUrls?: string[]; // 홍보 영상

  @Column({ type: 'varchar', length: 500, nullable: true })
  virtualTourUrl?: string; // 가상 투어 URL

  // ============================================================
  // Ratings & Reviews
  // ============================================================

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number; // 평균 평점 (0.00 ~ 5.00)

  @Column({ type: 'int', default: 0 })
  totalReviews: number; // 총 리뷰 수

  @Column({ type: 'int', default: 0 })
  totalReservations: number; // 총 예약 수

  // ============================================================
  // Statistics
  // ============================================================

  @Column({ type: 'int', default: 0 })
  viewCount: number; // 조회수

  @Column({ type: 'int', default: 0 })
  bookmarkCount: number; // 찜 수

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt?: Date; // 마지막 활동 시간

  // ============================================================
  // Metadata
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // 추가 정보

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ============================================================
  // Relations
  // ============================================================

  @OneToMany(() => DaycareReservation, (reservation) => reservation.daycareCenter)
  reservations: DaycareReservation[];

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * Check if daycare center is currently open (KST)
   */
  isCurrentlyOpen(): boolean {
    if (this.status !== DaycareStatus.ACTIVE) return false;

    const now = new Date();
    const kstTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const dayOfWeek = kstTime.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Seoul' }).toLowerCase();
    const currentTime = kstTime.toTimeString().slice(0, 5); // HH:MM

    const todayHours = this.operatingHours[dayOfWeek];
    if (!todayHours || !todayHours.isOpen) return false;

    // Check if within operating hours
    if (currentTime < todayHours.openTime || currentTime >= todayHours.closeTime) {
      return false;
    }

    // Check if in break time
    if (todayHours.breakTime) {
      if (currentTime >= todayHours.breakTime.startTime && currentTime < todayHours.breakTime.endTime) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get full Korean address
   */
  getFullAddress(): string {
    const parts = [this.sido, this.sigungu, this.dong, this.roadAddress, this.detailAddress];
    return parts.filter(Boolean).join(' ');
  }

  /**
   * Check if daycare center accepts specific animal species
   */
  acceptsSpecies(species: string): boolean {
    if (!this.acceptedSpecies || this.acceptedSpecies.length === 0) return true;
    return this.acceptedSpecies.includes(species);
  }

  /**
   * Check if daycare center has available capacity
   */
  hasAvailableCapacity(requiredSlots: number = 1): boolean {
    return this.currentOccupancy + requiredSlots <= this.maxCapacityPerDay;
  }

  /**
   * Calculate price for service type and duration
   */
  calculatePrice(serviceType: DaycareServiceType, hours?: number, days?: number): number {
    const pricing = this.pricingStructure;

    switch (serviceType) {
      case DaycareServiceType.HOURLY:
        if (!pricing.hourly || !hours) return 0;
        const baseHours = Math.max(hours, pricing.hourly.minimumHours);
        return baseHours * pricing.hourly.pricePerHour;

      case DaycareServiceType.DAILY:
        if (!pricing.daily) return 0;
        return pricing.daily.pricePerDay;

      case DaycareServiceType.MONTHLY:
        if (!pricing.monthly) return 0;
        return pricing.monthly.pricePerMonth;

      case DaycareServiceType.OVERNIGHT:
        if (!pricing.overnight) return 0;
        return pricing.overnight.pricePerNight;

      default:
        return 0;
    }
  }

  /**
   * Check if center is fully verified
   */
  isFullyVerified(): boolean {
    return this.verificationStatus === VerificationStatus.FULL_VERIFIED;
  }
}
