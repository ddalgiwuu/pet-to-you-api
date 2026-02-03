/**
 * Auto-Claim Suggestion Entity - SECURITY HARDENED VERSION
 * Implements re-encryption for medical snapshots (CRT-002 fix)
 *
 * MIGRATION REQUIRED: Run migration to encrypt existing data
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
} from 'typeorm';
import { Pet } from '../../pets/entities/pet.entity';
import { InsurancePolicy } from './insurance-policy.entity';
import { HealthNote } from '../../medical-records/entities/health-note.entity';
import { EncryptedData } from '../../../core/encryption/encryption.service';

export enum AutoClaimSuggestionStatus {
  PENDING = 'pending',
  VIEWED = 'viewed',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * 🤖 Auto-Claim Suggestion Entity - SECURE VERSION
 *
 * Security Enhancements:
 * - Medical snapshots re-encrypted (CRT-002 fix)
 * - Automatic expiration after 30 days (PIPA Article 21)
 * - Enhanced audit logging for PHI access
 * - Cost validation before creation
 *
 * Compliance:
 * - PIPA Article 24: Encryption of medical data
 * - PIPA Article 21: Data minimization and retention
 * - 의료법 Article 19: Medical data protection
 */
@Entity('auto_claim_suggestions')
@Index(['medicalRecordId'])
@Index(['policyId'])
@Index(['petId', 'status'])
@Index(['expiresAt'])
@Index(['createdAt'])
export class AutoClaimSuggestionSecure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Relationships
  // ============================================================

  @ManyToOne(() => HealthNote, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medical_record_id' })
  medicalRecord: HealthNote;

  @Column({ type: 'uuid' })
  @Index()
  medicalRecordId: string;

  @ManyToOne(() => InsurancePolicy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policy_id' })
  policy: InsurancePolicy;

  @Column({ type: 'uuid' })
  @Index()
  policyId: string;

  @ManyToOne(() => Pet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pet_id' })
  pet: Pet;

  @Column({ type: 'uuid' })
  @Index()
  petId: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  // ============================================================
  // Medical Record Information - ENCRYPTED 🔒
  // ============================================================

  @Column({ type: 'timestamp' })
  incidentDate: Date;

  /**
   * 🔒 Encrypted Diagnosis Snapshot
   * Re-encrypted copy from medical record
   * Purpose: Allow claim review without accessing original medical record
   * Retention: 30 days maximum (auto-deleted)
   */
  @Column({ type: 'jsonb' })
  diagnosisEncrypted: EncryptedData;

  /**
   * 🔒 Encrypted Treatment Snapshot
   * Re-encrypted copy from medical record
   */
  @Column({ type: 'jsonb' })
  treatmentEncrypted: EncryptedData;

  // Virtual fields (populated after decryption, not persisted)
  diagnosis?: string;
  treatment?: string;

  @Column({ type: 'varchar', length: 200 })
  hospitalName: string; // Not sensitive

  @Column({ type: 'uuid', nullable: true })
  hospitalId?: string;

  // ============================================================
  // Cost & Claim Calculation
  // ============================================================

  @Column({ type: 'integer' })
  estimatedCost: number;

  @Column({ type: 'integer' })
  estimatedClaimAmount: number;

  @Column({ type: 'varchar', length: 50 })
  coverageType: string;

  @Column({ type: 'integer' })
  coveragePercent: number;

  @Column({ type: 'integer' })
  deductible: number;

  // ============================================================
  // Fraud Detection 🚨
  // ============================================================

  /**
   * Cost reasonability check result
   */
  @Column({ type: 'boolean', default: true })
  costCheckPassed: boolean;

  @Column({ type: 'text', nullable: true })
  costCheckWarning?: string;

  /**
   * Fraud risk score (0.0 - 1.0)
   * Higher = more suspicious
   */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.0 })
  fraudRiskScore: number;

  /**
   * Flags for manual review
   */
  @Column({ type: 'boolean', default: false })
  requiresManualReview: boolean;

  @Column({ type: 'text', nullable: true })
  manualReviewReason?: string;

  // ============================================================
  // AI Analysis
  // ============================================================

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  confidence: number;

  @Column({ type: 'boolean', default: true })
  isEligible: boolean;

  @Column({ type: 'text', nullable: true })
  ineligibilityReason?: string;

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
    fraudIndicators?: string[]; // New: List of fraud red flags
  };

  // ============================================================
  // Pre-filled Information (Non-Sensitive)
  // ============================================================

  /**
   * Document references only (URLs), not content
   * Actual documents stored in S3 with separate access control
   */
  @Column({ type: 'jsonb', nullable: true })
  prefilledDocuments?: {
    id: string;
    type: string;
    name: string;
    uri: string; // S3 URL
  }[];

  @Column({ type: 'jsonb', nullable: true })
  serviceItems?: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    insuranceCovered: boolean;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  costBreakdown?: {
    consultation: number;
    procedures: number;
    medication: number;
    hospitalization?: number;
    diagnosticTests?: number;
    supplies?: number;
    other?: number;
  };

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
  viewedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  createdClaimId?: string;

  /**
   * Expiration date (30 days from creation)
   * Automatic cleanup enforced by cron job
   */
  @Column({ type: 'timestamp' })
  @Index()
  expiresAt: Date; // MANDATORY: 30 days from creation

  /**
   * Indicates if data was auto-deleted
   */
  @Column({ type: 'boolean', default: false })
  isExpiredAndDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  // ============================================================
  // Notification
  // ============================================================

  @Column({ type: 'boolean', default: false })
  notificationSent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  notificationSentAt?: Date;

  // ============================================================
  // Audit Trail Enhancement
  // ============================================================

  /**
   * IP address of user who created (for fraud detection)
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  createdFromIp?: string;

  /**
   * User agent (device fingerprinting)
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  createdFromUserAgent?: string;

  /**
   * Count of times suggestion was viewed
   * Unusual patterns may indicate fraud
   */
  @Column({ type: 'integer', default: 0 })
  viewCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastViewedAt?: Date;

  // ============================================================
  // Metadata
  // ============================================================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
