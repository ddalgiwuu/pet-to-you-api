/**
 * Hospital Payment Entity
 * Tracks payments from insurance companies to hospitals
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
import { Hospital } from '../../hospitals/entities/hospital.entity';
import { InsuranceClaim } from '../../insurance/entities/insurance-claim.entity';
import { EncryptedData } from '../../../core/encryption/encryption.service';

export enum HospitalPaymentStatus {
  PENDING = 'pending',         // 정산 대기
  PROCESSING = 'processing',   // 처리 중
  COMPLETED = 'completed',     // 정산 완료
  FAILED = 'failed',           // 실패
  CANCELLED = 'cancelled',     // 취소됨
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',  // 계좌 이체
  ESCROW = 'escrow',                // 에스크로
}

/**
 * 💰 Hospital Payment Entity
 *
 * 보험사 → 병원 정산 관리
 *
 * Flow:
 * 1. 보험 청구 승인 (CLAIM_APPROVED event)
 * 2. 병원 정산 생성 (status: pending)
 * 3. 결제 API 호출 (토스페이먼츠)
 * 4. 정산 완료 (status: completed)
 * 5. 병원 알림
 */
@Entity('hospital_payments')
@Index(['hospitalId', 'status'])
@Index(['claimId'])
@Index(['settlementId'])
@Index(['createdAt'])
export class HospitalPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // Hospital Relationship
  // ============================================================

  @ManyToOne(() => Hospital, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hospital_id' })
  hospital: Hospital;

  @Column({ type: 'uuid' })
  @Index()
  hospitalId: string;

  // ============================================================
  // Claim & Medical Record Connection
  // ============================================================

  @ManyToOne(() => InsuranceClaim, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'claim_id' })
  claim: InsuranceClaim;

  @Column({ type: 'uuid' })
  claimId: string;

  @Column({ type: 'uuid', nullable: true })
  medicalRecordId?: string;

  // ============================================================
  // Payment Information
  // ============================================================

  @Column({ type: 'integer' })
  amount: number; // 정산 금액 (KRW)

  @Column({
    type: 'enum',
    enum: HospitalPaymentStatus,
    default: HospitalPaymentStatus.PENDING,
  })
  @Index()
  status: HospitalPaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.BANK_TRANSFER,
  })
  paymentMethod: PaymentMethod;

  // ============================================================
  // Bank Information (🔒 ENCRYPTED) ⭐ SECURITY FIX: CRT-001
  // ============================================================

  /**
   * 🔒 Encrypted Bank Account Number
   * 은행 계좌번호 (암호화됨)
   *
   * Security: AES-256-GCM with envelope encryption
   * Compliance: PIPA Article 24 (안전조치의무)
   * Access: Requires audit logging with purpose
   *
   * CRITICAL: Never log or expose in plaintext
   */
  @Column({ type: 'jsonb', nullable: true })
  bankAccountNumberEncrypted?: EncryptedData;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bankName?: string; // 은행명 (non-sensitive)

  /**
   * 🔒 Encrypted Account Holder Name
   * 예금주명 (암호화됨)
   *
   * Security: AES-256-GCM with envelope encryption
   * Compliance: PIPA Article 24
   */
  @Column({ type: 'jsonb', nullable: true })
  accountHolderNameEncrypted?: EncryptedData;

  // ============================================================
  // DEPRECATED: Legacy plaintext fields (for migration)
  // ============================================================

  /**
   * @deprecated Use bankAccountNumberEncrypted instead
   * Will be removed after migration
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  bankAccountNumber?: string;

  /**
   * @deprecated Use accountHolderNameEncrypted instead
   * Will be removed after migration
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  accountHolderName?: string;

  // ============================================================
  // Virtual Fields (Decrypted, not persisted)
  // ============================================================

  bankAccountNumberDecrypted?: string;
  accountHolderNameDecrypted?: string;

  // ============================================================
  // Transaction Tracking
  // ============================================================

  @Column({ type: 'varchar', length: 200, nullable: true })
  transactionId?: string; // 토스페이먼츠 거래 ID

  @Column({ type: 'varchar', length: 200, nullable: true })
  settlementId?: string; // 정산 고유 번호

  @Column({ type: 'varchar', length: 200, nullable: true })
  paymentKey?: string; // Payment provider key

  // ============================================================
  // Timestamps
  // ============================================================

  @Column({ type: 'timestamp', nullable: true })
  initiatedAt?: Date; // 정산 시작 시간

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date; // 정산 완료 시간

  @Column({ type: 'timestamp', nullable: true })
  failedAt?: Date; // 실패 시간

  // ============================================================
  // Error Handling
  // ============================================================

  @Column({ type: 'text', nullable: true })
  errorMessage?: string; // 실패 사유

  @Column({ type: 'integer', default: 0 })
  retryCount: number; // 재시도 횟수

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt?: Date; // 다음 재시도 시간

  // ============================================================
  // Metadata
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    insuranceProvider?: string; // 보험사
    policyNumber?: string; // 증권번호
    patientName?: string; // 환자명
    petName?: string; // 반려동물명
    claimApprovedAt?: string; // 청구 승인 시간
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
