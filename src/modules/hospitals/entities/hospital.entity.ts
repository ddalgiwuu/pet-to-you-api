import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Booking } from '../../booking/entities/booking.entity';

export enum HospitalType {
  GENERAL = 'general',           // 일반 동물병원
  SPECIALTY = 'specialty',       // 전문병원 (피부과, 치과 등)
  EMERGENCY = 'emergency',       // 응급 동물병원
  MOBILE = 'mobile',             // 이동 진료
}

export enum HospitalStatus {
  ACTIVE = 'active',
  TEMPORARILY_CLOSED = 'temporarily_closed',
  PERMANENTLY_CLOSED = 'permanently_closed',
  PENDING_VERIFICATION = 'pending_verification',
}

@Entity('hospitals')
@Index(['status', 'type'])
// Note: businessRegistrationNumber unique constraint creates index automatically (no duplicate @Index needed)
export class Hospital {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Basic Information
  // ============================================================

  @Column({ type: 'varchar', length: 200 })
  name: string; // 병원명

  @Column({ type: 'varchar', length: 200, nullable: true })
  nameEnglish?: string; // 영문 병원명

  @Column({
    type: 'enum',
    enum: HospitalType,
    default: HospitalType.GENERAL,
  })
  type: HospitalType;

  @Column({
    type: 'enum',
    enum: HospitalStatus,
    default: HospitalStatus.PENDING_VERIFICATION,
  })
  status: HospitalStatus;

  @Column({ type: 'text', nullable: true })
  description?: string; // 병원 소개

  // ============================================================
  // Business Registration (사업자 등록)
  // ============================================================

  // Note: unique: true creates index automatically - no need for duplicate @Index() decorator
  @Column({ type: 'varchar', length: 20, unique: true })
  businessRegistrationNumber: string; // 사업자등록번호 (xxx-xx-xxxxx)

  @Column({ type: 'varchar', length: 100 })
  representativeName: string; // 대표자명

  @Column({ type: 'varchar', length: 20 })
  veterinaryLicenseNumber: string; // 수의사 면허번호

  @Column({ type: 'boolean', default: false })
  isVerified: boolean; // 인증 완료 여부

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

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
  naverPlaceUrl?: string; // 네이버 플레이스

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

  @Column({ type: 'boolean', default: false })
  is24Hours: boolean; // 24시간 운영 여부

  @Column({ type: 'simple-array', nullable: true })
  holidays?: string[]; // 정기 휴무일 (예: ['월', '화'])

  // ============================================================
  // Services & Specialties
  // ============================================================

  @Column({ type: 'simple-array' })
  services: string[]; // 진료 과목 (예: '일반진료', '예방접종', '중성화수술')

  @Column({ type: 'simple-array', nullable: true })
  specialties?: string[]; // 전문 분야 (예: '피부과', '치과', '정형외과')

  @Column({ type: 'simple-array', nullable: true })
  supportedSpecies?: string[]; // 진료 가능 동물 (예: 'dog', 'cat', 'rabbit')

  @Column({ type: 'boolean', default: false })
  hasParking: boolean; // 주차 가능 여부

  @Column({ type: 'boolean', default: false })
  hasEmergency: boolean; // 응급진료 가능 여부

  @Column({ type: 'boolean', default: false })
  hasGrooming: boolean; // 미용 서비스

  @Column({ type: 'boolean', default: false })
  hasHotel: boolean; // 호텔 서비스

  // ============================================================
  // Pricing & Payment
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  pricingInfo?: {
    consultation: number; // 진료비 (기본)
    vaccination: number; // 예방접종
    emergency: number; // 응급 진료비
    [key: string]: number;
  };

  @Column({ type: 'simple-array', nullable: true })
  acceptedPaymentMethods?: string[]; // ['card', 'cash', 'transfer', 'insurance']

  @Column({ type: 'boolean', default: false })
  acceptsInsurance: boolean; // 보험 청구 가능 여부

  // ============================================================
  // Banking Information (for payment settlement)
  // ============================================================

  @Column({ type: 'varchar', length: 100, nullable: true })
  bankName?: string; // 은행명

  @Column({ type: 'varchar', length: 50, nullable: true })
  bankAccountNumber?: string; // 계좌번호

  @Column({ type: 'varchar', length: 100, nullable: true })
  accountHolderName?: string; // 예금주명

  // ============================================================
  // Media & Photos
  // ============================================================

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl?: string;

  @Column({ type: 'simple-array', nullable: true })
  photoUrls?: string[]; // 병원 사진들

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
  totalBookings: number; // 총 예약 수

  // ============================================================
  // Statistics
  // ============================================================

  @Column({ type: 'int', default: 0 })
  viewCount: number; // 조회수

  @Column({ type: 'int', default: 0 })
  bookmarkCount: number; // 찜 수

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt?: Date; // 마지막 활동 시간 (예약, 리뷰 등)

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

  @OneToMany(() => Booking, (booking) => booking.hospital)
  bookings: Booking[];

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * Check if hospital is currently open (KST)
   */
  isCurrentlyOpen(): boolean {
    if (this.status !== HospitalStatus.ACTIVE) return false;
    if (this.is24Hours) return true;

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
   * Check if hospital accepts specific animal species
   */
  acceptsSpecies(species: string): boolean {
    if (!this.supportedSpecies || this.supportedSpecies.length === 0) return true;
    return this.supportedSpecies.includes(species);
  }
}
