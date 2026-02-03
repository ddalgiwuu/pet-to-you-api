import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PetListing } from './pet-listing.entity';
import { User } from '../../users/entities/user.entity';

export enum ApplicationStatus {
  SUBMITTED = 'submitted', // 제출됨
  UNDER_REVIEW = 'under_review', // 검토 중
  INTERVIEW_SCHEDULED = 'interview_scheduled', // 면담 예정
  HOME_VISIT_SCHEDULED = 'home_visit_scheduled', // 가정 방문 예정
  APPROVED = 'approved', // 승인됨
  REJECTED = 'rejected', // 거절됨
  WITHDRAWN = 'withdrawn', // 신청자 철회
  COMPLETED = 'completed', // 입양 완료
}

export enum HomeType {
  APARTMENT = 'apartment', // 아파트
  HOUSE = 'house', // 단독주택
  TOWNHOUSE = 'townhouse', // 타운하우스
  CONDO = 'condo', // 콘도
  FARM = 'farm', // 농장
  OTHER = 'other',
}

export enum ExperienceLevel {
  NONE = 'none', // 경험 없음
  BEGINNER = 'beginner', // 초보
  INTERMEDIATE = 'intermediate', // 중급
  ADVANCED = 'advanced', // 상급
  EXPERT = 'expert', // 전문가
}

@Entity('adoption_applications')
@Index(['userId', 'status'])
@Index(['petListingId', 'status'])
@Index(['status', 'createdAt'])
export class AdoptionApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Relationships
  // ============================================================

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Removed duplicate @Index() - already part of class-level @Index(['userId', 'status'])
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => PetListing, (listing) => listing.applications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pet_listing_id' })
  petListing: PetListing;

  // Removed duplicate @Index() - already part of class-level @Index(['petListingId', 'status'])
  @Column({ type: 'uuid' })
  petListingId: string;

  // ============================================================
  // Application Status
  // ============================================================

  // Removed duplicate @Index() - already part of class-level @Index(['status', 'createdAt'])
  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.SUBMITTED,
  })
  status: ApplicationStatus;

  @Column({ type: 'text', nullable: true })
  statusNotes?: string; // 상태 변경 사유

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy?: string; // 검토자 (보호소 관리자)

  // ============================================================
  // Personal Information
  // ============================================================

  @Column({ type: 'varchar', length: 100 })
  applicantName: string;

  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 100 })
  email: string;

  @Column({ type: 'date' })
  dateOfBirth: Date;

  @Column({ type: 'varchar', length: 200, nullable: true })
  occupation?: string;

  // ============================================================
  // Living Situation
  // ============================================================

  @Column({
    type: 'enum',
    enum: HomeType,
  })
  homeType: HomeType;

  @Column({ type: 'varchar', length: 500 })
  address: string;

  @Column({ type: 'boolean', default: false })
  ownsHome: boolean; // 자가 소유 여부

  @Column({ type: 'boolean', default: false })
  hasYard: boolean; // 마당 유무

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  yardSizeSquareMeters?: number; // 마당 크기 (m²)

  @Column({ type: 'boolean', default: false })
  isFenced: boolean; // 울타리 여부

  @Column({ type: 'varchar', length: 100, nullable: true })
  landlordName?: string; // 집주인 이름 (임차인인 경우)

  @Column({ type: 'varchar', length: 20, nullable: true })
  landlordPhone?: string;

  @Column({ type: 'boolean', default: true })
  landlordApprovalObtained: boolean; // 집주인 허가 여부

  // ============================================================
  // Household Information
  // ============================================================

  @Column({ type: 'int', default: 1 })
  numberOfAdults: number; // 성인 수

  @Column({ type: 'int', default: 0 })
  numberOfChildren: number; // 아동 수

  @Column({ type: 'simple-array', nullable: true })
  childrenAges?: number[]; // 아동 연령대

  @Column({ type: 'boolean', default: false })
  hasAllergiesInHousehold: boolean; // 가족 중 알레르기

  @Column({ type: 'text', nullable: true })
  allergyDetails?: string;

  // ============================================================
  // Pet Experience
  // ============================================================

  @Column({
    type: 'enum',
    enum: ExperienceLevel,
    default: ExperienceLevel.NONE,
  })
  petExperienceLevel: ExperienceLevel;

  @Column({ type: 'boolean', default: false })
  hasCurrentPets: boolean;

  @Column({ type: 'jsonb', nullable: true })
  currentPets?: Array<{
    species: string;
    breed?: string;
    age: number;
    isNeutered: boolean;
  }>;

  @Column({ type: 'boolean', default: false })
  hadPetsInPast: boolean;

  @Column({ type: 'text', nullable: true })
  pastPetExperience?: string;

  @Column({ type: 'text', nullable: true })
  petCarePlan?: string; // 반려동물 돌봄 계획

  // ============================================================
  // References
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  references?: Array<{
    name: string;
    relationship: string; // 관계 (친구, 가족, 동료 등)
    phoneNumber: string;
    email?: string;
  }>;

  @Column({ type: 'varchar', length: 200, nullable: true })
  veterinarianName?: string; // 단골 수의사

  @Column({ type: 'varchar', length: 20, nullable: true })
  veterinarianPhone?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  veterinaryClinicName?: string;

  // ============================================================
  // Financial & Commitment
  // ============================================================

  @Column({ type: 'boolean', default: true })
  canAffordVetCare: boolean; // 의료비 감당 가능 여부

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyPetBudget?: number; // 월 반려동물 예산

  @Column({ type: 'text', nullable: true })
  emergencyVetPlan?: string; // 응급 의료 대처 계획

  @Column({ type: 'boolean', default: true })
  willingToSpayNeuter: boolean; // 중성화 수술 의향

  @Column({ type: 'boolean', default: true })
  willingToMicrochip: boolean; // 칩 등록 의향

  @Column({ type: 'text' })
  adoptionReason: string; // 입양 동기

  @Column({ type: 'text', nullable: true })
  dailyRoutineDescription?: string; // 일과 설명

  @Column({ type: 'int', default: 8 })
  hoursAlonePerDay: number; // 하루 혼자 있는 시간

  @Column({ type: 'text', nullable: true })
  workSchedule?: string; // 근무 일정

  // ============================================================
  // Interview & Home Visit
  // ============================================================

  @Column({ type: 'timestamp', nullable: true })
  interviewScheduledAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  interviewCompletedAt?: Date;

  @Column({ type: 'text', nullable: true })
  interviewNotes?: string;

  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  interviewScore?: number; // 0.0 - 5.0

  @Column({ type: 'timestamp', nullable: true })
  homeVisitScheduledAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  homeVisitCompletedAt?: Date;

  @Column({ type: 'text', nullable: true })
  homeVisitNotes?: string;

  @Column({ type: 'boolean', nullable: true })
  homeVisitPassed?: boolean;

  // ============================================================
  // Post-Adoption Follow-up
  // ============================================================

  @Column({ type: 'timestamp', nullable: true })
  adoptionCompletedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  followUpSchedule?: Array<{
    scheduledAt: Date;
    completedAt?: Date;
    notes?: string;
    status: 'pending' | 'completed' | 'skipped';
  }>;

  @Column({ type: 'boolean', nullable: true })
  adoptionSuccessful?: boolean; // 최종 입양 성공 여부

  @Column({ type: 'timestamp', nullable: true })
  returnedAt?: Date; // 반환 날짜

  @Column({ type: 'text', nullable: true })
  returnReason?: string; // 반환 사유

  // ============================================================
  // Agreement & Legal
  // ============================================================

  @Column({ type: 'boolean', default: false })
  agreedToTerms: boolean;

  @Column({ type: 'timestamp', nullable: true })
  agreedToTermsAt?: Date;

  @Column({ type: 'boolean', default: false })
  agreedToHomeVisit: boolean;

  @Column({ type: 'boolean', default: false })
  agreedToFollowUp: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  signatureUrl?: string; // 전자 서명 이미지

  @Column({ type: 'varchar', length: 500, nullable: true })
  contractUrl?: string; // 입양 계약서 URL

  // ============================================================
  // Additional Information
  // ============================================================

  @Column({ type: 'text', nullable: true })
  additionalNotes?: string; // 추가 메모

  @Column({ type: 'simple-array', nullable: true })
  attachmentUrls?: string[]; // 첨부 파일 (신분증, 주거 증빙 등)

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // ============================================================
  // Status Tracking
  // ============================================================

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * Calculate application completeness score (0-100)
   */
  calculateCompletenessScore(): number {
    let score = 0;
    const fields = [
      'applicantName',
      'phoneNumber',
      'email',
      'dateOfBirth',
      'homeType',
      'address',
      'petExperienceLevel',
      'adoptionReason',
    ];

    fields.forEach((field) => {
      if (this[field as keyof AdoptionApplication]) score += 12.5;
    });

    if (this.references && this.references.length > 0) score += 12.5;
    if (this.veterinarianName) score += 12.5;

    return Math.min(100, score);
  }

  /**
   * Check if application can be approved
   */
  canBeApproved(): boolean {
    return (
      this.status === ApplicationStatus.HOME_VISIT_SCHEDULED &&
      this.homeVisitPassed === true &&
      this.agreedToTerms === true &&
      this.calculateCompletenessScore() >= 80
    );
  }

  /**
   * Calculate match score with pet listing
   */
  calculateMatchScore(): number {
    // This would typically call petListing.calculateMatchScore()
    // with this application's information
    return 50; // Placeholder
  }

  /**
   * Get application age in days
   */
  getApplicationAgeDays(): number {
    const today = new Date();
    const created = new Date(this.createdAt);
    const diffTime = Math.abs(today.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if application is stale (>30 days without update)
   */
  isStale(): boolean {
    const daysSinceUpdate = this.getApplicationAgeDays();
    return daysSinceUpdate > 30 && this.status === ApplicationStatus.SUBMITTED;
  }
}
