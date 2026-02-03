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
import { User } from '../../users/entities/user.entity';

export enum PetSpecies {
  DOG = 'dog',
  CAT = 'cat',
  RABBIT = 'rabbit',
  HAMSTER = 'hamster',
  BIRD = 'bird',
  OTHER = 'other',
}

export enum PetGender {
  MALE = 'male',
  FEMALE = 'female',
  NEUTERED_MALE = 'neutered_male',
  SPAYED_FEMALE = 'spayed_female',
}

export enum PetSize {
  EXTRA_SMALL = 'extra_small', // <3kg
  SMALL = 'small',             // 3-10kg
  MEDIUM = 'medium',           // 10-25kg
  LARGE = 'large',             // 25-45kg
  EXTRA_LARGE = 'extra_large', // >45kg
}

@Entity('pets')
@Index(['ownerId', 'isDeleted'])
@Index(['species', 'breed'])
export class Pet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Owner Relationship
  // ============================================================

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  // Removed duplicate @Index() - already part of class-level @Index(['ownerId', 'isDeleted'])
  @Column({ type: 'uuid' })
  ownerId: string;

  // ============================================================
  // Basic Information
  // ============================================================

  @Column({ type: 'varchar', length: 100 })
  name: string; // 반려동물 이름

  @Column({
    type: 'enum',
    enum: PetSpecies,
  })
  species: PetSpecies; // 종 (개, 고양이 등)

  @Column({ type: 'varchar', length: 100, nullable: true })
  breed?: string; // 품종 (예: 말티즈, 시바견, 페르시안)

  @Column({
    type: 'enum',
    enum: PetGender,
  })
  gender: PetGender; // 성별

  @Column({ type: 'date', nullable: true })
  dateOfBirth?: Date; // 생년월일

  @Column({ type: 'int', nullable: true })
  ageYears?: number; // 나이 (년)

  @Column({ type: 'int', nullable: true })
  ageMonths?: number; // 나이 (월)

  @Column({
    type: 'enum',
    enum: PetSize,
    nullable: true,
  })
  size?: PetSize; // 크기

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight?: number; // 몸무게 (kg)

  @Column({ type: 'varchar', length: 50, nullable: true })
  color?: string; // 색상 (예: 흰색, 갈색, 검은색)

  // ============================================================
  // Identification
  // ============================================================

  @Column({ type: 'varchar', length: 50, nullable: true })
  microchipNumber?: string; // 동물등록번호 (내장형 칩)

  @Column({ type: 'varchar', length: 50, nullable: true })
  registrationNumber?: string; // 정부 등록번호

  @Column({ type: 'boolean', default: false })
  isRegistered: boolean; // 동물등록 완료 여부

  // ============================================================
  // Medical Information
  // ============================================================

  @Column({ type: 'simple-array', nullable: true })
  allergies?: string[]; // 알레르기 목록

  @Column({ type: 'simple-array', nullable: true })
  chronicConditions?: string[]; // 만성 질환

  @Column({ type: 'text', nullable: true })
  specialNeeds?: string; // 특별 관리 사항

  @Column({ type: 'boolean', default: false })
  isNeutered: boolean; // 중성화 여부

  @Column({ type: 'date', nullable: true })
  neuteredDate?: Date; // 중성화 날짜

  @Column({ type: 'varchar', length: 50, nullable: true })
  bloodType?: string; // 혈액형

  // ============================================================
  // Insurance Information
  // ============================================================

  @Column({ type: 'boolean', default: false })
  hasInsurance: boolean; // 보험 가입 여부

  @Column({ type: 'varchar', length: 100, nullable: true })
  insuranceProvider?: string; // 보험사

  @Column({ type: 'varchar', length: 100, nullable: true })
  insurancePolicyNumber?: string; // 증권번호

  @Column({ type: 'date', nullable: true })
  insuranceExpiryDate?: Date; // 보험 만료일

  // ============================================================
  // Behavior & Personality
  // ============================================================

  @Column({ type: 'varchar', length: 50, nullable: true })
  temperament?: string; // 성격 (온순함, 활발함, 겁많음 등)

  @Column({ type: 'text', nullable: true })
  behaviorNotes?: string; // 행동 특성 메모

  @Column({ type: 'boolean', default: true })
  goodWithKids: boolean; // 아이들과 잘 지냄

  @Column({ type: 'boolean', default: true })
  goodWithPets: boolean; // 다른 반려동물과 잘 지냄

  // ============================================================
  // Photos & Media
  // ============================================================

  @Column({ type: 'varchar', length: 500, nullable: true })
  primaryPhotoUrl?: string; // 대표 사진

  @Column({ type: 'simple-array', nullable: true })
  photoUrls?: string[]; // 추가 사진들

  // ============================================================
  // Metadata
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // 추가 정보 (확장 가능)

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
   * Calculate current age in years and months
   */
  calculateAge(): { years: number; months: number } | null {
    if (!this.dateOfBirth) return null;

    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    return { years, months };
  }

  /**
   * Check if pet is a puppy/kitten (< 1 year old)
   */
  isYoung(): boolean {
    const age = this.calculateAge();
    return age ? age.years < 1 : false;
  }

  /**
   * Check if pet is senior (> 7 years for dogs, > 10 years for cats)
   */
  isSenior(): boolean {
    const age = this.calculateAge();
    if (!age) return false;

    if (this.species === PetSpecies.DOG) {
      return age.years >= 7;
    } else if (this.species === PetSpecies.CAT) {
      return age.years >= 10;
    }

    return age.years >= 7;
  }
}
