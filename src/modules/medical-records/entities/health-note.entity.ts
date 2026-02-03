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
import { EncryptedData } from '../../../core/encryption/encryption.service';

/**
 * 🏥 Health Note Entity - Medical Record with Field-Level Encryption
 *
 * Compliance:
 * - 의료법 (Medical Act) Article 19: 10-year retention, purpose logging
 * - 개인정보보호법 (PIPA): Encryption of sensitive medical data
 *
 * Encrypted Fields:
 * - diagnosis: 진단 내용
 * - treatment: 치료 내용
 * - prescription: 처방 내용
 *
 * Security:
 * - Envelope encryption with KMS (EncryptionService)
 * - Audit logging for every access (AuditService)
 * - Purpose and legal basis required for access
 */
@Entity('health_notes')
@Index(['petId', 'visitDate'])
@Index(['petId', 'isDeleted'])
@Index(['hospitalName', 'visitDate'])
export class HealthNote {
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
  // Booking Connection (Category 1)
  // ============================================================

  @Column({ type: 'uuid', nullable: true })
  @Index()
  bookingId?: string; // Link to booking record

  @Column({ type: 'uuid', nullable: true })
  @Index()
  hospitalId?: string; // Hospital ID for queries

  // ============================================================
  // Hospital & Veterinarian Information
  // ============================================================

  @Column({ type: 'varchar', length: 200 })
  hospitalName: string; // 병원명

  @Column({ type: 'varchar', length: 200, nullable: true })
  hospitalAddress?: string; // 병원 주소

  @Column({ type: 'varchar', length: 20, nullable: true })
  hospitalPhone?: string; // 병원 연락처

  @Column({ type: 'varchar', length: 100 })
  veterinarianName: string; // 수의사 이름

  @Column({ type: 'varchar', length: 50, nullable: true })
  veterinarianLicense?: string; // 수의사 면허번호

  // ============================================================
  // Visit Information
  // ============================================================

  @Column({ type: 'timestamp' })
  @Index()
  visitDate: Date; // 내원 일자

  @Column({ type: 'varchar', length: 500 })
  visitReason: string; // 내원 사유 (e.g., "정기 검진", "구토 증상", "피부 발진")

  @Column({ type: 'varchar', length: 100, nullable: true })
  visitType?: string; // 진료 유형 (e.g., "응급", "정기", "예방접종")

  // ============================================================
  // Medical Information (ENCRYPTED)
  // ============================================================

  /**
   * 🔒 Encrypted Diagnosis
   * 진단 내용 (예: "위염 의심", "피부 알레르기", "슬개골 탈구 2단계")
   *
   * Encryption: AES-256-GCM with envelope encryption
   * Access: Requires audit logging with purpose
   */
  @Column({ type: 'jsonb' })
  diagnosisEncrypted: EncryptedData;

  /**
   * 🔒 Encrypted Treatment Details
   * 치료 내용 (예: "링거 처치", "피부 소독", "물리치료 진행")
   *
   * Encryption: AES-256-GCM with envelope encryption
   * Access: Requires audit logging with purpose
   */
  @Column({ type: 'jsonb' })
  treatmentEncrypted: EncryptedData;

  /**
   * 🔒 Encrypted Prescription
   * 처방 내용 (예: "항생제 3일분, 소염제 5일분")
   *
   * Encryption: AES-256-GCM with envelope encryption
   * Access: Requires audit logging with purpose
   */
  @Column({ type: 'jsonb', nullable: true })
  prescriptionEncrypted?: EncryptedData;

  // ============================================================
  // Vital Signs (Non-Encrypted - Medical Metadata)
  // ============================================================

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  temperature?: number; // 체온 (°C)

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight?: number; // 체중 (kg)

  @Column({ type: 'integer', nullable: true })
  heartRate?: number; // 심박수 (bpm)

  @Column({ type: 'integer', nullable: true })
  respiratoryRate?: number; // 호흡수 (breaths/min)

  @Column({ type: 'varchar', length: 20, nullable: true })
  bloodPressure?: string; // 혈압 (e.g., "120/80")

  // ============================================================
  // Lab Results & Attachments
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  labResults?: {
    testName: string;
    result: string;
    unit?: string;
    referenceRange?: string;
    abnormal?: boolean;
  }[];

  @Column({ type: 'simple-array', nullable: true })
  attachmentUrls?: string[]; // URLs to X-rays, lab reports, etc.

  // ============================================================
  // Follow-up & Next Steps
  // ============================================================

  @Column({ type: 'text', nullable: true })
  followUpRecommendations?: string; // 추후 관리 사항

  @Column({ type: 'timestamp', nullable: true })
  nextAppointmentDate?: Date; // 다음 예약 일자

  @Column({ type: 'varchar', length: 500, nullable: true })
  nextAppointmentReason?: string; // 다음 진료 사유

  // ============================================================
  // Cost Tracking (Category 2) - Enhanced
  // ============================================================

  @Column({ type: 'integer', nullable: true })
  estimatedCost?: number; // AI 추정 비용 (KRW)

  @Column({ type: 'integer', nullable: true })
  actualCost?: number; // 실제 병원 청구액 (KRW) ⭐

  @Column({ type: 'jsonb', nullable: true })
  costBreakdown?: {
    consultation: number; // 진찰료 ⭐
    procedures: number; // 시술비 ⭐
    medication: number; // 약제비 ⭐
    hospitalization?: number; // 입원비
    diagnosticTests?: number; // 검사비
    supplies?: number; // 재료비
    other?: number; // 기타
  };

  @Column({ type: 'integer', nullable: true })
  totalCost?: number; // 총 진료비 (KRW) - Deprecated, use actualCost

  // ============================================================
  // Service Items (Category 3)
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  serviceItems?: {
    id: string;
    name: string; // 예: "혈액검사"
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    insuranceCovered: boolean; // 보험 적용 여부 ⭐
  }[];

  // ============================================================
  // Payment Tracking (Category 4)
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  payment?: {
    totalAmount: number; // 총액 ⭐
    insuranceCoverage: number; // 보험 적용액 ⭐
    selfPayment: number; // 본인 부담 ⭐
    paymentMethod: 'card' | 'cash' | 'account' | 'insurance';
    paymentStatus: 'pending' | 'partial' | 'completed';
    paidAmount: number;
    remainingAmount: number;
  };

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string; // Deprecated, use payment.paymentMethod

  // ============================================================
  // Document Management (Category 5)
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  documents?: {
    id: string;
    type: 'receipt' | 'medical_record' | 'diagnosis' | 'prescription' | 'xray' | 'lab_result' | 'photo' | 'other';
    name: string;
    uri: string; // S3 URL ⭐
    mimeType: string;
    size: number;
    uploadedAt: string;
    uploadedBy?: string;
  }[];

  // ============================================================
  // Insurance Matching (Category 6)
  // ============================================================

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  insuranceClaimId?: string; // 연동된 보험 청구 ID

  @Column({ type: 'boolean', default: false })
  isInsuranceCovered: boolean; // 보험 적용 가능 여부

  @Column({ type: 'varchar', length: 100, nullable: true })
  insuranceProvider?: string; // 보험사

  @Column({ type: 'varchar', length: 50, nullable: true })
  claimStatus?: string; // 청구 상태

  @Column({ type: 'varchar', length: 50, nullable: true })
  insuranceCoverageType?: string; // AI 자동 분류 ⭐

  @Column({ type: 'boolean', default: false })
  insuranceEligibilityVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verificationDate?: Date;

  // ============================================================
  // Claim History (Category 7)
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  claimHistory?: {
    claimId: string;
    status: string;
    submittedAt: string;
    amount: number;
    isPrimary: boolean; // 주보험 여부
  }[];

  // ============================================================
  // Follow-up (Category 8) - Enhanced
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  followUp?: {
    required: boolean;
    scheduledDate?: string;
    notes?: string;
  };

  // ============================================================
  // Procedure Codes (Category 9)
  // ============================================================

  @Column({ type: 'varchar', length: 50, nullable: true })
  procedureCode?: string; // 한국 진료 코드

  @Column({ type: 'varchar', length: 50, nullable: true })
  diagnosisCode?: string; // KCD 코드

  // ============================================================
  // Metadata (Category 10)
  // ============================================================

  @Column({ type: 'varchar', length: 50, default: 'patient' })
  createdBy: 'patient' | 'hospital_staff' | 'system';

  @Column({ type: 'varchar', length: 50, default: 'completed' })
  recordStatus: 'draft' | 'completed' | 'billed' | 'settled';

  // Hospital payment tracking
  @Column({ type: 'varchar', length: 50, nullable: true })
  hospitalPaymentStatus?: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'timestamp', nullable: true })
  hospitalPaidAt?: Date;

  // Auto-claim flag
  @Column({ type: 'boolean', default: false })
  autoClaimGenerated: boolean; // 자동 청구 생성 여부

  // ============================================================
  // Metadata
  // ============================================================

  @Column({ type: 'varchar', length: 100, nullable: true })
  recordType?: string; // 기록 유형 (e.g., "진료", "수술", "입원")

  @Column({ type: 'text', nullable: true })
  notes?: string; // 추가 메모 (보호자 메모 등)

  @Column({ type: 'boolean', default: false })
  isEmergency: boolean; // 응급 진료 여부

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean; // Soft delete (10-year retention required)

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ============================================================
  // Virtual Fields (Not Persisted)
  // ============================================================

  // These fields are populated after decryption
  diagnosis?: string;
  treatment?: string;
  prescription?: string;
}
