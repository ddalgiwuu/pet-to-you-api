/**
 * Auto-Claim Suggestion Entity
 * Stores AI-generated insurance claim suggestions
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Pet } from '../../pets/entities/pet.entity';
import { InsurancePolicy } from './insurance-policy.entity';
import { HealthNote } from '../../medical-records/entities/health-note.entity';
import { EncryptedData } from '../../../core/encryption/encryption.service';

export enum AutoClaimSuggestionStatus {
  PENDING = 'pending',       // 검토 대기
  VIEWED = 'viewed',         // 사용자가 확인함
  ACCEPTED = 'accepted',     // 사용자가 청구 제출함
  REJECTED = 'rejected',     // 사용자가 거부함
  EXPIRED = 'expired',       // 만료됨 (30일 경과)
}

/**
 * 🤖 Auto-Claim Suggestion Entity
 *
 * AI가 분석한 자동 보험 청구 제안
 *
 * Lifecycle:
 * 1. Medical record created
 * 2. AI analyzes eligibility
 * 3. Suggestion created (status: pending)
 * 4. Push notification sent
 * 5. User views (status: viewed)
 * 6. User accepts → Creates InsuranceClaim (status: accepted)
 * 7. OR user rejects (status: rejected)
 * 8. OR 30 days pass (status: expired)
 */
@Entity('auto_claim_suggestions')
@Index(['medicalRecordId'])
@Index(['policyId'])
@Index(['petId', 'status'])
@Index(['createdAt'])
export class AutoClaimSuggestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Relationships
  // ============================================================

  @ManyToOne(() => HealthNote, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medical_record_id' })
  medicalRecord: HealthNote;

  @Column({ type: 'uuid' })
  medicalRecordId: string;

  @ManyToOne(() => InsurancePolicy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policy_id' })
  policy: InsurancePolicy;

  @Column({ type: 'uuid' })
  policyId: string;

  @ManyToOne(() => Pet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pet_id' })
  pet: Pet;

  @Column({ type: 'uuid' })
  @Index()
  petId: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string; // Pet owner user ID

  // ============================================================
  // Medical Record Information (Snapshot) ⭐ SECURITY FIX: CRT-002
  // ============================================================

  @Column({ type: 'timestamp' })
  incidentDate: Date; // 진료일

  /**
   * 🔒 Encrypted Diagnosis Snapshot
   * 진단명 스냅샷 (암호화됨)
   *
   * Security: AES-256-GCM with envelope encryption
   * Compliance: 의료법 Article 19 (10-year retention)
   * Access: Requires audit logging with purpose
   * Auto-deletion: Deleted after 30 days (expires_at)
   *
   * CRITICAL: This is a snapshot for display purposes only
   * Original encrypted data remains in HealthNote
   */
  @Column({ type: 'jsonb' })
  diagnosisEncrypted: EncryptedData;

  /**
   * 🔒 Encrypted Treatment Snapshot
   * 치료 내역 스냅샷 (암호화됨)
   *
   * Security: AES-256-GCM with envelope encryption
   * Compliance: 의료법 Article 19
   * Auto-deletion: Deleted after 30 days (expires_at)
   */
  @Column({ type: 'jsonb' })
  treatmentEncrypted: EncryptedData;

  @Column({ type: 'varchar', length: 200 })
  hospitalName: string; // Non-sensitive

  @Column({ type: 'uuid', nullable: true })
  hospitalId?: string;

  // ============================================================
  // DEPRECATED: Legacy plaintext fields (for migration)
  // ============================================================

  /**
   * @deprecated Use diagnosisEncrypted instead
   * SECURITY RISK: Plaintext medical data
   * Will be removed after migration
   */
  @Column({ type: 'text', nullable: true })
  diagnosis?: string;

  /**
   * @deprecated Use treatmentEncrypted instead
   * SECURITY RISK: Plaintext medical data
   * Will be removed after migration
   */
  @Column({ type: 'text', nullable: true })
  treatment?: string;

  // ============================================================
  // Virtual Fields (Decrypted, not persisted)
  // ============================================================

  diagnosisDecrypted?: string;
  treatmentDecrypted?: string;

  // ============================================================
  // Cost & Claim Calculation
  // ============================================================

  @Column({ type: 'integer' })
  estimatedCost: number; // 예상 진료비 (KRW)

  @Column({ type: 'integer' })
  estimatedClaimAmount: number; // 예상 청구액 (KRW)

  @Column({ type: 'varchar', length: 50 })
  coverageType: string; // AI가 분류한 보장 유형

  @Column({ type: 'integer' })
  coveragePercent: number; // 적용 보장률 (60-100%)

  @Column({ type: 'integer' })
  deductible: number; // 자기부담금

  // ============================================================
  // AI Analysis
  // ============================================================

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  confidence: number; // AI 신뢰도 (0.00-1.00)

  @Column({ type: 'boolean', default: true })
  isEligible: boolean; // 청구 가능 여부

  @Column({ type: 'text', nullable: true })
  ineligibilityReason?: string; // 불가능한 경우 사유

  @Column({ type: 'jsonb', nullable: true })
  analysisDetails?: {
    hasActualCost: boolean;
    hasDocuments: boolean;
    hasReceipt: boolean;
    hasCostBreakdown: boolean;
    hasServiceItems: boolean;
    costIsReasonable: boolean;
    hasHospitalId: boolean;
    isRecentVisit: boolean;
    confidenceFactors: { [key: string]: number };
  };

  // ============================================================
  // Pre-filled Information
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  prefilledDocuments?: any[]; // Documents from medical record

  @Column({ type: 'jsonb', nullable: true })
  serviceItems?: any[]; // Service items from medical record

  @Column({ type: 'jsonb', nullable: true })
  costBreakdown?: any; // Cost breakdown from medical record

  // ============================================================
  // Status & Lifecycle
  // ============================================================

  @Column({
    type: 'enum',
    enum: AutoClaimSuggestionStatus,
    default: AutoClaimSuggestionStatus.PENDING,
  })
  @Index()
  status: AutoClaimSuggestionStatus;

  @Column({ type: 'timestamp', nullable: true })
  viewedAt?: Date; // 사용자가 확인한 시간

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt?: Date; // 사용자가 수락한 시간

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt?: Date; // 사용자가 거부한 시간

  @Column({ type: 'uuid', nullable: true })
  createdClaimId?: string; // 생성된 청구 ID (accepted인 경우)

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date; // 만료 시간 (생성 후 30일)

  // ============================================================
  // Notification
  // ============================================================

  @Column({ type: 'boolean', default: false })
  notificationSent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  notificationSentAt?: Date;

  // ============================================================
  // Metadata
  // ============================================================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ============================================================
  // Auto-Deletion Hook ⭐ SECURITY FIX: CRT-002
  // ============================================================

  /**
   * Lifecycle hook: Set expiration date on creation
   * Ensures PIPA compliance (minimum retention principle)
   */
  @BeforeInsert()
  setExpirationDate() {
    if (!this.expiresAt) {
      // Auto-delete after 30 days
      this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }
}
