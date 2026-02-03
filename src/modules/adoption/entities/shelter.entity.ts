import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { PetListing } from './pet-listing.entity';

export enum ShelterVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

export enum ShelterType {
  GOVERNMENT = 'government', // 공공 보호소
  PRIVATE = 'private', // 사설 보호소
  RESCUE_GROUP = 'rescue_group', // 구조 단체
}

@Entity('shelters')
@Index(['verificationStatus', 'isActive'])
// Note: trustScore index defined at field level (line ~132)
// Note: businessRegistrationNumber unique constraint creates index automatically
export class Shelter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Basic Information
  // ============================================================

  @Column({ type: 'varchar', length: 200 })
  name: string; // 보호소 이름

  @Column({
    type: 'enum',
    enum: ShelterType,
    default: ShelterType.PRIVATE,
  })
  type: ShelterType;

  @Column({ type: 'text', nullable: true })
  description?: string; // 보호소 소개

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl?: string;

  @Column({ type: 'simple-array', nullable: true })
  photoUrls?: string[];

  // ============================================================
  // Business Verification (사업자 정보)
  // ============================================================

  // Note: unique: true creates index automatically - no need for duplicate @Index() decorator
  @Column({ type: 'varchar', length: 20, unique: true })
  businessRegistrationNumber: string; // 사업자등록번호 (10자리)

  @Column({ type: 'varchar', length: 200, nullable: true })
  businessName?: string; // 법인명/상호명

  @Column({ type: 'varchar', length: 200, nullable: true })
  representativeName?: string; // 대표자 이름

  // Removed duplicate @Index() - already part of class-level @Index(['verificationStatus', 'isActive'])
  @Column({
    type: 'enum',
    enum: ShelterVerificationStatus,
    default: ShelterVerificationStatus.PENDING,
  })
  verificationStatus: ShelterVerificationStatus;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date; // 검증 완료 시간

  @Column({ type: 'varchar', length: 100, nullable: true })
  verifiedBy?: string; // 검증자 (관리자 ID)

  @Column({ type: 'text', nullable: true })
  verificationNotes?: string; // 검증 메모

  // Government API verification data
  @Column({ type: 'jsonb', nullable: true })
  governmentVerificationData?: {
    apiResponse: any;
    verifiedAt: Date;
    isValid: boolean;
  };

  // ============================================================
  // Contact Information
  // ============================================================

  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website?: string;

  // ============================================================
  // Location
  // ============================================================

  @Column({ type: 'varchar', length: 500 })
  address: string; // 전체 주소

  @Column({ type: 'varchar', length: 100 })
  city: string; // 시/도

  @Column({ type: 'varchar', length: 100 })
  district: string; // 구/군

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

  // ============================================================
  // Trust & Performance Metrics
  // ============================================================

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  @Index()
  trustScore: number; // 0.00 - 1.00 신뢰도 점수

  @Column({ type: 'int', default: 0 })
  totalAdoptions: number; // 총 입양 성사 건수

  @Column({ type: 'int', default: 0 })
  successfulAdoptions: number; // 성공적인 입양 (반환 없음)

  @Column({ type: 'int', default: 0 })
  returnedAdoptions: number; // 반환된 입양

  @Column({ type: 'int', default: 0 })
  complaintCount: number; // 민원 접수 건수

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  averageAdoptionDays?: number; // 평균 입양 소요 일수

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  adoptionSuccessRate?: number; // 입양 성공률 (0.00 - 1.00)

  // ============================================================
  // Complaint & Violation History
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  complaintHistory?: Array<{
    id: string;
    date: Date;
    type: string;
    description: string;
    status: 'pending' | 'resolved' | 'dismissed';
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;

  @Column({ type: 'jsonb', nullable: true })
  violationHistory?: Array<{
    date: Date;
    type: string;
    description: string;
    penalty?: string;
  }>;

  @Column({ type: 'int', default: 0 })
  suspensionCount: number; // 정지 횟수

  @Column({ type: 'timestamp', nullable: true })
  lastSuspensionDate?: Date;

  // ============================================================
  // Operating Information
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  operatingHours?: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };

  @Column({ type: 'int', default: 0 })
  capacity: number; // 최대 수용 동물 수

  @Column({ type: 'int', default: 0 })
  currentOccupancy: number; // 현재 보호 중인 동물 수

  @Column({ type: 'simple-array', nullable: true })
  specializations?: string[]; // 특화 분야 (예: 대형견, 노령견, 장애동물)

  // ============================================================
  // Financial & Anti-Fraud
  // ============================================================

  @Column({ type: 'boolean', default: false })
  requiresDeposit: boolean; // 보증금 필요 여부

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  depositAmount?: number; // 보증금 금액

  @Column({ type: 'varchar', length: 100, nullable: true })
  bankAccount?: string; // 계좌번호 (암호화 저장 권장)

  @Column({ type: 'varchar', length: 100, nullable: true })
  bankName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  accountHolder?: string;

  // Fraud detection flags
  @Column({ type: 'jsonb', nullable: true })
  fraudFlags?: {
    highReturnRate?: boolean; // 높은 반환율
    suspiciousPattern?: boolean; // 의심스러운 패턴
    multipleComplaints?: boolean; // 다수 민원
    verificationIssues?: boolean; // 검증 문제
    flaggedAt?: Date;
    details?: string;
  };

  // ============================================================
  // Relationships
  // ============================================================

  @OneToMany(() => PetListing, (listing) => listing.shelter)
  listings: PetListing[];

  // ============================================================
  // Status & Metadata
  // ============================================================

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * Calculate trust score based on multiple factors
   * Returns value between 0.00 and 1.00
   */
  calculateTrustScore(): number {
    let score = 0.5; // Start with neutral score

    // Verification status (40% weight)
    if (this.verificationStatus === ShelterVerificationStatus.VERIFIED) {
      score += 0.4;
    } else if (this.verificationStatus === ShelterVerificationStatus.PENDING) {
      score += 0.1;
    }

    // Adoption success rate (30% weight)
    if (this.adoptionSuccessRate !== null && this.adoptionSuccessRate !== undefined) {
      score += this.adoptionSuccessRate * 0.3;
    }

    // Complaint history (20% weight - negative factor)
    if (this.complaintCount === 0) {
      score += 0.2;
    } else if (this.complaintCount < 3) {
      score += 0.1;
    } else if (this.complaintCount >= 10) {
      score -= 0.2;
    }

    // Violation and suspension history (10% weight - negative factor)
    if (this.suspensionCount === 0) {
      score += 0.1;
    } else if (this.suspensionCount >= 3) {
      score -= 0.2;
    }

    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Update trust score
   */
  updateTrustScore(): void {
    this.trustScore = this.calculateTrustScore();
  }

  /**
   * Calculate adoption success rate
   */
  updateAdoptionSuccessRate(): void {
    if (this.totalAdoptions > 0) {
      this.adoptionSuccessRate = this.successfulAdoptions / this.totalAdoptions;
    } else {
      this.adoptionSuccessRate = undefined;
    }
  }

  /**
   * Check if shelter has suspicious patterns
   */
  hasSuspiciousPattern(): boolean {
    // High return rate (>30%)
    if (this.adoptionSuccessRate !== undefined && this.adoptionSuccessRate !== null && this.adoptionSuccessRate < 0.7) {
      return true;
    }

    // Multiple complaints in short time
    if (this.complaintCount >= 5) {
      return true;
    }

    // Multiple suspensions
    if (this.suspensionCount >= 2) {
      return true;
    }

    // Check fraud flags
    if (this.fraudFlags) {
      return Object.values(this.fraudFlags).some((flag) => flag === true);
    }

    return false;
  }

  /**
   * Check if shelter can accept new listings
   */
  canAcceptNewListings(): boolean {
    return (
      this.isActive &&
      !this.isDeleted &&
      this.verificationStatus === ShelterVerificationStatus.VERIFIED &&
      !this.hasSuspiciousPattern() &&
      this.currentOccupancy < this.capacity
    );
  }

  /**
   * Get occupancy rate
   */
  getOccupancyRate(): number {
    if (this.capacity === 0) return 0;
    return this.currentOccupancy / this.capacity;
  }
}
