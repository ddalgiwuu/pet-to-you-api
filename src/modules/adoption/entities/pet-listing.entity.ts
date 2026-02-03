import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Shelter } from './shelter.entity';
import { AdoptionApplication } from './adoption-application.entity';
import { PetSpecies, PetGender, PetSize } from '../../pets/entities/pet.entity';

export enum AdoptionStatus {
  AVAILABLE = 'available', // 입양 가능
  PENDING = 'pending', // 입양 심사 중
  ADOPTED = 'adopted', // 입양 완료
  ON_HOLD = 'on_hold', // 보류
  WITHDRAWN = 'withdrawn', // 철회됨
}

export enum HealthStatus {
  EXCELLENT = 'excellent', // 매우 건강
  GOOD = 'good', // 건강
  FAIR = 'fair', // 보통
  NEEDS_TREATMENT = 'needs_treatment', // 치료 필요
  RECOVERING = 'recovering', // 회복 중
  SPECIAL_NEEDS = 'special_needs', // 특별 관리 필요
}

export enum EnergyLevel {
  VERY_LOW = 'very_low', // 매우 낮음
  LOW = 'low', // 낮음
  MODERATE = 'moderate', // 보통
  HIGH = 'high', // 높음
  VERY_HIGH = 'very_high', // 매우 높음
}

@Entity('pet_listings')
@Index(['shelterId', 'adoptionStatus'])
@Index(['species', 'adoptionStatus'])
@Index(['adoptionStatus', 'createdAt'])
export class PetListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Shelter Relationship
  // ============================================================

  @ManyToOne(() => Shelter, (shelter) => shelter.listings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shelter_id' })
  shelter: Shelter;

  // Removed duplicate @Index() - already part of class-level @Index(['shelterId', 'adoptionStatus'])
  @Column({ type: 'uuid' })
  shelterId: string;

  // ============================================================
  // Basic Information
  // ============================================================

  @Column({ type: 'varchar', length: 100 })
  name: string; // 동물 이름

  // Removed duplicate @Index() - already part of class-level @Index(['species', 'adoptionStatus'])
  @Column({
    type: 'enum',
    enum: PetSpecies,
  })
  species: PetSpecies;

  @Column({ type: 'varchar', length: 100, nullable: true })
  breed?: string; // 품종

  @Column({ type: 'varchar', length: 100, nullable: true })
  mixedBreed?: string; // 믹스견인 경우 혼합 품종

  @Column({
    type: 'enum',
    enum: PetGender,
  })
  gender: PetGender;

  @Column({ type: 'date', nullable: true })
  dateOfBirth?: Date;

  @Column({ type: 'int', nullable: true })
  estimatedAgeYears?: number; // 추정 나이 (년)

  @Column({ type: 'int', nullable: true })
  estimatedAgeMonths?: number; // 추정 나이 (월)

  @Column({
    type: 'enum',
    enum: PetSize,
    nullable: true,
  })
  size?: PetSize;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight?: number; // kg

  @Column({ type: 'varchar', length: 50, nullable: true })
  color?: string;

  // ============================================================
  // Health Information
  // ============================================================

  @Column({
    type: 'enum',
    enum: HealthStatus,
    default: HealthStatus.GOOD,
  })
  healthStatus: HealthStatus;

  @Column({ type: 'boolean', default: false })
  isNeutered: boolean;

  @Column({ type: 'boolean', default: false })
  isVaccinated: boolean;

  @Column({ type: 'simple-array', nullable: true })
  vaccines?: string[]; // 접종 완료 백신 목록

  @Column({ type: 'date', nullable: true })
  lastVaccinationDate?: Date;

  @Column({ type: 'simple-array', nullable: true })
  allergies?: string[];

  @Column({ type: 'simple-array', nullable: true })
  chronicConditions?: string[];

  @Column({ type: 'text', nullable: true })
  medicalHistory?: string; // 병력 상세

  @Column({ type: 'boolean', default: false })
  hasSpecialNeeds: boolean;

  @Column({ type: 'text', nullable: true })
  specialNeedsDescription?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  microchipNumber?: string;

  // ============================================================
  // Personality & Behavior
  // ============================================================

  @Column({
    type: 'enum',
    enum: EnergyLevel,
    default: EnergyLevel.MODERATE,
  })
  energyLevel: EnergyLevel;

  @Column({ type: 'simple-array', nullable: true })
  temperamentTraits?: string[]; // 성격 특성 (온순함, 활발함, 수줍음 등)

  @Column({ type: 'text', nullable: true })
  personalityDescription?: string;

  @Column({ type: 'boolean', default: true })
  goodWithKids: boolean;

  @Column({ type: 'boolean', default: true })
  goodWithDogs: boolean;

  @Column({ type: 'boolean', default: true })
  goodWithCats: boolean;

  @Column({ type: 'boolean', default: true })
  goodWithOtherPets: boolean;

  @Column({ type: 'boolean', default: false })
  needsExperiencedOwner: boolean; // 경험 있는 주인 필요

  @Column({ type: 'boolean', default: false })
  mustBeOnlyPet: boolean; // 단독 가정 필요

  @Column({ type: 'text', nullable: true })
  behaviorNotes?: string;

  // ============================================================
  // Rescue Story
  // ============================================================

  @Column({ type: 'date' })
  rescueDate: Date; // 구조일

  @Column({ type: 'varchar', length: 200, nullable: true })
  rescueLocation?: string; // 구조 장소

  @Column({ type: 'text', nullable: true })
  rescueStory?: string; // 구조 스토리

  @Column({ type: 'varchar', length: 100, nullable: true })
  previousOwnershipStatus?: string; // 이전 소유 상태 (유기, 학대, 자진 포기 등)

  // ============================================================
  // Media
  // ============================================================

  @Column({ type: 'varchar', length: 500, nullable: true })
  primaryPhotoUrl?: string;

  @Column({ type: 'simple-array', nullable: true })
  photoUrls?: string[];

  @Column({ type: 'simple-array', nullable: true })
  videoUrls?: string[];

  // ============================================================
  // Adoption Information
  // ============================================================

  // Removed duplicate @Index() - already part of class-level @Index(['adoptionStatus', 'createdAt'])
  @Column({
    type: 'enum',
    enum: AdoptionStatus,
    default: AdoptionStatus.AVAILABLE,
  })
  adoptionStatus: AdoptionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  adoptionFee?: number; // 입양 비용 (0 = 무료)

  @Column({ type: 'text', nullable: true })
  adoptionFeeDescription?: string; // 비용 설명 (예: 의료비 포함)

  @Column({ type: 'simple-array', nullable: true })
  adoptionRequirements?: string[]; // 입양 조건

  @Column({ type: 'text', nullable: true })
  idealHomeDescription?: string; // 이상적인 가정 환경

  @Column({ type: 'boolean', default: true })
  requiresHomeVisit: boolean; // 가정 방문 필수 여부

  @Column({ type: 'boolean', default: false })
  requiresFollowUp: boolean; // 사후 관리 필요 여부

  @Column({ type: 'int', default: 30 })
  trialPeriodDays?: number; // 적응 기간 (일)

  // ============================================================
  // Adoption History
  // ============================================================

  @Column({ type: 'timestamp', nullable: true })
  adoptedAt?: Date; // 입양 완료 시간

  @Column({ type: 'uuid', nullable: true })
  adoptedByUserId?: string; // 입양자 User ID

  @Column({ type: 'int', default: 0 })
  applicationCount: number; // 신청 접수 건수

  @Column({ type: 'int', default: 0 })
  viewCount: number; // 조회수

  @Column({ type: 'int', default: 0 })
  favoriteCount: number; // 관심 등록 수

  // ============================================================
  // Relationships
  // ============================================================

  @OneToMany(() => AdoptionApplication, (application) => application.petListing)
  applications: AdoptionApplication[];

  // ============================================================
  // Metadata & Tracking
  // ============================================================

  @Column({ type: 'boolean', default: false })
  isUrgent: boolean; // 긴급 입양 필요 (건강 문제, 보호소 포화 등)

  @Column({ type: 'text', nullable: true })
  urgentReason?: string;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean; // 추천 리스팅

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
   * Calculate approximate age in years
   */
  getApproximateAge(): number | null {
    if (this.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(this.dateOfBirth);
      return today.getFullYear() - birthDate.getFullYear();
    }
    return this.estimatedAgeYears || null;
  }

  /**
   * Check if pet is young (< 1 year)
   */
  isYoung(): boolean {
    const age = this.getApproximateAge();
    return age !== null && age < 1;
  }

  /**
   * Check if pet is senior
   */
  isSenior(): boolean {
    const age = this.getApproximateAge();
    if (age === null) return false;

    if (this.species === PetSpecies.DOG) {
      return age >= 7;
    } else if (this.species === PetSpecies.CAT) {
      return age >= 10;
    }
    return age >= 7;
  }

  /**
   * Get days since rescue
   */
  getDaysSinceRescue(): number {
    const today = new Date();
    const rescue = new Date(this.rescueDate);
    const diffTime = Math.abs(today.getTime() - rescue.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if listing is available for adoption
   */
  isAvailableForAdoption(): boolean {
    return (
      this.isActive &&
      !this.isDeleted &&
      this.adoptionStatus === AdoptionStatus.AVAILABLE
    );
  }

  /**
   * Calculate match score for potential adopter
   * (Basic scoring - can be enhanced with ML)
   */
  calculateMatchScore(userPreferences: {
    hasKids?: boolean;
    hasPets?: boolean;
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
    homeType?: 'apartment' | 'house' | 'farm';
    hasYard?: boolean;
  }): number {
    let score = 50; // Base score

    if (userPreferences.hasKids && !this.goodWithKids) {
      score -= 30;
    }

    if (userPreferences.hasPets) {
      if (!this.goodWithDogs || !this.goodWithCats) {
        score -= 20;
      }
    }

    if (this.needsExperiencedOwner && userPreferences.experienceLevel === 'beginner') {
      score -= 40;
    }

    if (this.size === PetSize.EXTRA_LARGE && userPreferences.homeType === 'apartment') {
      score -= 25;
    }

    if (this.energyLevel === EnergyLevel.VERY_HIGH && !userPreferences.hasYard) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }
}
