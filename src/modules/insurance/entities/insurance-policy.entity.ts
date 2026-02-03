import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 보험사 정보
 * 한국 5대 애완동물 보험사
 */
export enum InsuranceCompany {
  SAMSUNG_FIRE = 'samsung_fire',       // 삼성화재
  KB_INSURANCE = 'kb_insurance',       // KB손해보험
  HYUNDAI_MARINE = 'hyundai_marine',   // 현대해상
  DB_INSURANCE = 'db_insurance',       // DB손해보험
  MERITZ_FIRE = 'meritz_fire',         // 메리츠화재
}

/**
 * 보장 유형
 */
export enum CoverageType {
  ACCIDENT = 'accident',                 // 상해 사고
  ILLNESS = 'illness',                   // 질병
  SURGERY = 'surgery',                   // 수술
  HOSPITALIZATION = 'hospitalization',   // 입원
  OUTPATIENT = 'outpatient',            // 통원
  MEDICATION = 'medication',            // 약제비
  LIABILITY = 'liability',              // 배상책임
  FUNERAL = 'funeral',                  // 장례비
}

/**
 * 정책 상태
 */
export enum PolicyStatus {
  ACTIVE = 'active',                    // 판매 중
  SUSPENDED = 'suspended',              // 일시 중단
  DISCONTINUED = 'discontinued',        // 판매 종료
}

/**
 * 애완동물 보험 정책 엔티티
 *
 * 보험업법 준수:
 * - 보험료율 관리
 * - 보장내용 명시
 * - 면책사항 관리
 * - 연령/품종 제한
 */
@Entity('insurance_policies')
@Index(['company', 'status'])
@Index(['species', 'status'])
export class InsurancePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // 보험사 정보
  // ============================================================

  // Removed duplicate @Index() - already part of class-level @Index(['company', 'status'])
  @Column({
    type: 'enum',
    enum: InsuranceCompany,
  })
  company: InsuranceCompany; // 보험사

  @Column({ type: 'varchar', length: 200 })
  companyName: string; // 보험사명 (예: 삼성화재)

  @Column({ type: 'varchar', length: 100 })
  policyName: string; // 상품명 (예: 펫보험 프리미엄)

  @Column({ type: 'varchar', length: 50, unique: true })
  policyCode: string; // 상품 코드 (예: SF-PET-001)

  @Column({
    type: 'enum',
    enum: PolicyStatus,
    default: PolicyStatus.ACTIVE,
  })
  status: PolicyStatus;

  // ============================================================
  // 보험료 정보
  // ============================================================

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthlyPremium: number; // 월 보험료 (원)

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  annualPremium: number; // 연 보험료 (원)

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  deductible: number; // 자기부담금 (원)

  @Column({ type: 'int' })
  deductiblePercentage: number; // 자기부담률 (%)

  // ============================================================
  // 보장 내용
  // ============================================================

  @Column({ type: 'simple-array' })
  coverageTypes: CoverageType[]; // 보장 유형 목록

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  maxCoveragePerYear: number; // 연간 최대 보장액 (원)

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  maxCoveragePerAccident: number; // 사고당 최대 보장액 (원)

  @Column({ type: 'int' })
  coveragePercentage: number; // 보장 비율 (%)

  @Column({ type: 'jsonb' })
  coverageDetails: {
    [key in CoverageType]?: {
      maxAmount: number;          // 최대 보장액
      percentage: number;         // 보장 비율
      deductible: number;         // 자기부담금
      description: string;        // 설명
    };
  };

  // ============================================================
  // 대상 동물 정보
  // ============================================================

  @Column({ type: 'varchar', length: 20 })
  species: string; // 대상 종 (dog, cat)

  @Column({ type: 'simple-array', nullable: true })
  allowedBreeds?: string[]; // 가입 가능 품종

  @Column({ type: 'simple-array', nullable: true })
  excludedBreeds?: string[]; // 가입 불가 품종

  @Column({ type: 'int' })
  minAgeMonths: number; // 최소 가입 연령 (개월)

  @Column({ type: 'int' })
  maxAgeMonths: number; // 최대 가입 연령 (개월)

  @Column({ type: 'int' })
  maxCoverageAgeYears: number; // 최대 보장 연령 (년)

  // ============================================================
  // 대기 기간
  // ============================================================

  @Column({ type: 'int', default: 0 })
  waitingPeriodDays: number; // 일반 질병 대기 기간 (일)

  @Column({ type: 'int', default: 0 })
  surgeryWaitingPeriodDays: number; // 수술 대기 기간 (일)

  @Column({ type: 'jsonb', nullable: true })
  waitingPeriodsByType?: {
    [key in CoverageType]?: number; // 보장 유형별 대기 기간
  };

  // ============================================================
  // 보장 한도 및 제한
  // ============================================================

  @Column({ type: 'int', nullable: true })
  maxClaimsPerYear?: number; // 연간 최대 청구 횟수

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minClaimAmount?: number; // 최소 청구 금액

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  liabilityCoverage?: number; // 배상책임 보장액

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  funeralExpenseCoverage?: number; // 장례비 보장액

  // ============================================================
  // 면책 사항
  // ============================================================

  @Column({ type: 'text', array: true })
  exclusions: string[]; // 면책 사항 목록

  @Column({ type: 'text', array: true })
  preexistingConditionPolicy: string[]; // 기왕증 정책

  @Column({ type: 'boolean', default: false })
  coversPreexistingConditions: boolean; // 기왕증 보장 여부

  // ============================================================
  // 혜택 및 특약
  // ============================================================

  @Column({ type: 'text', array: true })
  benefits: string[]; // 추가 혜택

  @Column({ type: 'jsonb', nullable: true })
  specialClauses?: Array<{
    name: string;
    description: string;
    premium: number;
  }>;

  // ============================================================
  // 약관 정보
  // ============================================================

  @Column({ type: 'varchar', length: 500, nullable: true })
  termsUrl?: string; // 약관 URL

  @Column({ type: 'varchar', length: 500, nullable: true })
  brochureUrl?: string; // 상품 안내 자료 URL

  @Column({ type: 'text', nullable: true })
  description?: string; // 상품 설명

  // ============================================================
  // 추가 정보
  // ============================================================

  @Column({ type: 'int', default: 0 })
  popularityScore: number; // 인기도 점수 (추천 알고리즘용)

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number; // 평균 평점

  @Column({ type: 'int', default: 0 })
  totalReviews: number; // 리뷰 수

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // 확장 가능 메타데이터

  // ============================================================
  // Timestamps
  // ============================================================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  discontinuedAt?: Date; // 판매 종료일

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * 월간 보험료 계산 (특약 포함)
   */
  calculateMonthlyPremium(specialClauses?: string[]): number {
    let total = this.monthlyPremium;

    if (specialClauses && this.specialClauses) {
      for (const clause of this.specialClauses) {
        if (specialClauses.includes(clause.name)) {
          total += clause.premium;
        }
      }
    }

    return total;
  }

  /**
   * 연령 제한 확인
   */
  isAgeEligible(ageMonths: number): boolean {
    return ageMonths >= this.minAgeMonths && ageMonths <= this.maxAgeMonths;
  }

  /**
   * 품종 제한 확인
   */
  isBreedEligible(breed: string): boolean {
    // 허용 품종이 설정되어 있으면 해당 품종만 가입 가능
    if (this.allowedBreeds && this.allowedBreeds.length > 0) {
      return this.allowedBreeds.includes(breed);
    }

    // 제외 품종이 설정되어 있으면 해당 품종은 가입 불가
    if (this.excludedBreeds && this.excludedBreeds.length > 0) {
      return !this.excludedBreeds.includes(breed);
    }

    return true;
  }

  /**
   * 보장 유형별 최대 금액
   */
  getMaxCoverageForType(type: CoverageType): number | null {
    if (this.coverageDetails[type]) {
      return this.coverageDetails[type].maxAmount;
    }
    return null;
  }

  /**
   * 활성 정책 여부
   */
  isActive(): boolean {
    return this.status === PolicyStatus.ACTIVE;
  }
}
