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
import { Pet } from '../../pets/entities/pet.entity';

export enum VaccineType {
  // Core Vaccines (필수 백신)
  RABIES = 'rabies', // 광견병
  DHPPL = 'dhppl', // 종합백신 (디스템퍼, 파보, 파라인플루엔자, 렙토스피라)
  DHPP = 'dhpp', // 종합백신 (디스템퍼, 파보, 파라인플루엔자)
  CORONAVIRUS = 'coronavirus', // 코로나 장염

  // Cat Vaccines
  FVRCP = 'fvrcp', // 고양이 종합백신 (범백혈구감소증, 칼리시, 비기관지염)
  FELV = 'felv', // 고양이 백혈병

  // Optional Vaccines (선택 백신)
  BORDETELLA = 'bordetella', // 켄넬코프
  LYME = 'lyme', // 라임병
  LEPTOSPIROSIS = 'leptospirosis', // 렙토스피라증

  // Others
  OTHER = 'other', // 기타
}

/**
 * 💉 Vaccination Record Entity - Vaccine History
 *
 * Purpose:
 * - Track vaccination history for each pet
 * - Reminder system for upcoming vaccinations
 * - Compliance with veterinary requirements
 * - Integration with hospital records
 */
@Entity('vaccination_records')
@Index(['petId', 'vaccinationDate'])
@Index(['petId', 'nextDueDate'])
@Index(['vaccineType', 'petId'])
export class VaccinationRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Pet Relationship
  // ============================================================

  @ManyToOne(() => Pet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pet_id' })
  pet: Pet;

  @Column({ type: 'uuid' })
  @Index()
  petId: string;

  // ============================================================
  // Vaccine Information
  // ============================================================

  @Column({
    type: 'enum',
    enum: VaccineType,
  })
  @Index()
  vaccineType: VaccineType;

  @Column({ type: 'varchar', length: 200 })
  vaccineName: string; // 백신 상품명 (e.g., "노비백 DHPPL", "퓨어백스 RCP")

  @Column({ type: 'varchar', length: 200, nullable: true })
  manufacturer?: string; // 제조사 (e.g., "MSD", "Zoetis")

  @Column({ type: 'varchar', length: 100, nullable: true })
  batchNumber?: string; // 제조번호 (Lot number)

  @Column({ type: 'integer', nullable: true })
  doseNumber?: number; // 접종 차수 (1차, 2차, 3차 등)

  // ============================================================
  // Date Information
  // ============================================================

  @Column({ type: 'date' })
  @Index()
  vaccinationDate: Date; // 접종 일자

  @Column({ type: 'date', nullable: true })
  expirationDate?: Date; // 백신 유효기간

  @Column({ type: 'date', nullable: true })
  @Index()
  nextDueDate?: Date; // 다음 접종 예정일

  // ============================================================
  // Veterinarian Information
  // ============================================================

  @Column({ type: 'varchar', length: 200 })
  hospitalName: string; // 접종 병원

  @Column({ type: 'varchar', length: 200, nullable: true })
  hospitalAddress?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  hospitalPhone?: string;

  @Column({ type: 'varchar', length: 100 })
  veterinarianName: string; // 접종 수의사

  @Column({ type: 'varchar', length: 50, nullable: true })
  veterinarianLicense?: string; // 수의사 면허번호

  // ============================================================
  // Vaccination Details
  // ============================================================

  @Column({ type: 'varchar', length: 20, nullable: true })
  injectionSite?: string; // 접종 부위 (e.g., "왼쪽 어깨", "오른쪽 뒷다리")

  @Column({ type: 'text', nullable: true })
  notes?: string; // 특이사항 (e.g., "접종 후 졸림 증상", "경미한 부종")

  @Column({ type: 'boolean', default: false })
  hadReaction: boolean; // 이상반응 발생 여부

  @Column({ type: 'text', nullable: true })
  reactionDetails?: string; // 이상반응 상세 (if hadReaction = true)

  // ============================================================
  // Cost Information
  // ============================================================

  @Column({ type: 'integer', nullable: true })
  cost?: number; // 접종 비용 (KRW)

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string;

  // ============================================================
  // Attachments
  // ============================================================

  @Column({ type: 'simple-array', nullable: true })
  certificateUrls?: string[]; // 접종 증명서 URL

  // ============================================================
  // Reminder System
  // ============================================================

  @Column({ type: 'boolean', default: true })
  reminderEnabled: boolean; // 알림 활성화 여부

  @Column({ type: 'integer', default: 14 })
  reminderDaysBefore: number; // 며칠 전에 알림 (default: 14일)

  @Column({ type: 'boolean', default: false })
  reminderSent: boolean; // 알림 발송 여부

  @Column({ type: 'timestamp', nullable: true })
  reminderSentAt?: Date; // 알림 발송 시각

  // ============================================================
  // Metadata
  // ============================================================

  @Column({ type: 'boolean', default: false })
  isCore: boolean; // 필수 백신 여부

  @Column({ type: 'boolean', default: false })
  isBooster: boolean; // 추가 접종 (booster) 여부

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean; // Soft delete

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
