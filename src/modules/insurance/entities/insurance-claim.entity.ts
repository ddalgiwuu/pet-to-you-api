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
import { Pet } from '../../pets/entities/pet.entity';
import { InsurancePolicy } from './insurance-policy.entity';
import { EncryptedData } from '../../../core/encryption/encryption.service';

/**
 * 보험 청구 상태
 *
 * 처리 프로세스: submitted → review → approved/rejected → paid
 */
export enum ClaimStatus {
  SUBMITTED = 'submitted',     // 접수 완료
  REVIEW = 'review',           // 심사 중
  APPROVED = 'approved',       // 승인
  REJECTED = 'rejected',       // 거부
  PAID = 'paid',               // 지급 완료
  CANCELLED = 'cancelled',     // 취소
}

/**
 * 청구 유형
 */
export enum ClaimType {
  ACCIDENT = 'accident',       // 상해
  ILLNESS = 'illness',         // 질병
  SURGERY = 'surgery',         // 수술
  HOSPITALIZATION = 'hospitalization', // 입원
  OUTPATIENT = 'outpatient',   // 통원
  MEDICATION = 'medication',   // 약제비
  LIABILITY = 'liability',     // 배상책임
  FUNERAL = 'funeral',         // 장례비
}

/**
 * 서류 검증 상태
 */
export enum DocumentVerificationStatus {
  PENDING = 'pending',         // 검증 대기
  VERIFIED = 'verified',       // 검증 완료
  REJECTED = 'rejected',       // 검증 실패
  INCOMPLETE = 'incomplete',   // 서류 불충분
}

/**
 * 보험 청구 엔티티
 *
 * 보안 요구사항:
 * - 청구 상세 정보 암호화 (EncryptionService 사용)
 * - 민감한 의료 기록 보호
 * - 모든 청구 작업 감사 로그 기록
 * - 보험업법 준수
 *
 * 성능 최적화:
 * - (policyId, status, submittedAt) 복합 인덱스
 * - 비동기 청구 처리 큐
 */
@Entity('insurance_claims')
@Index(['userId', 'status'])
@Index(['petId', 'status'])
@Index(['policyId', 'status', 'submittedAt'])
// @Index(['claimNumber']) // Removed: unique: true already creates index
export class InsuranceClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============================================================
  // 청구 기본 정보
  // ============================================================

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  claimNumber: string; // 청구 번호 (예: CLM-2024-001234)

  @Column({
    type: 'enum',
    enum: ClaimStatus,
    default: ClaimStatus.SUBMITTED,
  })
  @Index()
  status: ClaimStatus;

  @Column({
    type: 'enum',
    enum: ClaimType,
  })
  claimType: ClaimType; // 청구 유형

  // ============================================================
  // 관계 (User, Pet, Policy)
  // ============================================================

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => Pet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pet_id' })
  pet: Pet;

  @Column({ type: 'uuid' })
  @Index()
  petId: string;

  @ManyToOne(() => InsurancePolicy)
  @JoinColumn({ name: 'policy_id' })
  policy: InsurancePolicy;

  @Column({ type: 'uuid' })
  @Index()
  policyId: string;

  // ============================================================
  // 암호화된 청구 상세 정보 (ENCRYPTED)
  // ============================================================

  /**
   * 🔒 암호화된 청구 상세 정보
   *
   * 포함 내용:
   * - 진단명 (diagnosis)
   * - 치료 내용 (treatment)
   * - 의료 기록 상세 (medicalRecordDetails)
   * - 병원명 (hospitalName)
   * - 담당 수의사 (veterinarianName)
   *
   * EncryptionService.encrypt() 사용
   */
  @Column({ type: 'jsonb' })
  encryptedClaimDetails: EncryptedData;

  // ============================================================
  // 금액 정보
  // ============================================================

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalClaimAmount: number; // 총 청구 금액 (원)

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  approvedAmount?: number; // 승인 금액 (원)

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  deductibleAmount?: number; // 자기부담금 (원)

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  payoutAmount?: number; // 실제 지급액 (원)

  @Column({ type: 'int', nullable: true })
  coveragePercentage?: number; // 보장 비율 (%)

  // ============================================================
  // 의료 기록 및 서류
  // ============================================================

  @Column({ type: 'date' })
  incidentDate: Date; // 사고/발병 날짜

  @Column({ type: 'date', nullable: true })
  treatmentStartDate?: Date; // 치료 시작 날짜

  @Column({ type: 'date', nullable: true })
  treatmentEndDate?: Date; // 치료 종료 날짜

  @Column({ type: 'simple-array' })
  attachedDocuments: string[]; // 첨부 서류 URL 목록

  @Column({
    type: 'enum',
    enum: DocumentVerificationStatus,
    default: DocumentVerificationStatus.PENDING,
  })
  documentVerificationStatus: DocumentVerificationStatus;

  @Column({ type: 'text', nullable: true })
  documentVerificationNotes?: string; // 서류 검증 메모

  // ============================================================
  // 청구 처리 정보
  // ============================================================

  @Column({ type: 'timestamp' })
  submittedAt: Date; // 청구 접수 시간

  @Column({ type: 'timestamp', nullable: true })
  reviewStartedAt?: Date; // 심사 시작 시간

  @Column({ type: 'timestamp', nullable: true })
  reviewCompletedAt?: Date; // 심사 완료 시간

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date; // 지급 완료 시간

  @Column({ type: 'int', nullable: true })
  processingTimeMinutes?: number; // 처리 시간 (분) - 목표: 30분 → 3분

  @Column({ type: 'varchar', length: 100, nullable: true })
  reviewedBy?: string; // 심사자

  @Column({ type: 'text', nullable: true })
  reviewNotes?: string; // 심사 메모

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string; // 거부 사유

  // ============================================================
  // 자동 처리 정보 (AI)
  // ============================================================

  @Column({ type: 'boolean', default: false })
  autoProcessed: boolean; // 자동 처리 여부

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  autoProcessingConfidence?: number; // AI 신뢰도 점수 (0-100)

  @Column({ type: 'jsonb', nullable: true })
  aiAnalysisResults?: {
    fraudProbability: number;     // 사기 가능성
    amountReasonability: number;  // 금액 타당성
    documentCompleteness: number; // 서류 완전성
    recommendations: string[];     // 권장사항
  };

  // ============================================================
  // 지급 정보
  // ============================================================

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string; // 지급 방법 (계좌이체, 카드)

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentReference?: string; // 지급 참조 번호

  @Column({ type: 'jsonb', nullable: true })
  paymentDetails?: {
    bankName?: string;
    accountNumber?: string; // 암호화 필요
    accountHolder?: string;
  };

  // ============================================================
  // 추가 정보
  // ============================================================

  @Column({ type: 'text', nullable: true })
  userComments?: string; // 사용자 코멘트

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // 확장 가능 메타데이터

  // ============================================================
  // 감사 로그 (보험업법 준수)
  // ============================================================

  @Column({ type: 'jsonb', nullable: true })
  auditLog?: Array<{
    timestamp: Date;
    action: string;
    performedBy: string;
    details: Record<string, any>;
  }>;

  // ============================================================
  // Timestamps
  // ============================================================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  // ============================================================
  // Helper Methods
  // ============================================================

  /**
   * 처리 시간 계산 (분)
   */
  calculateProcessingTime(): number | undefined {
    if (!this.reviewCompletedAt) return undefined;

    const startTime = this.reviewStartedAt || this.submittedAt;
    const endTime = this.reviewCompletedAt;

    const diffMs = endTime.getTime() - startTime.getTime();
    return Math.round(diffMs / 60000); // 밀리초 → 분
  }

  /**
   * 상태 업데이트 및 감사 로그 추가
   */
  updateStatus(
    newStatus: ClaimStatus,
    performedBy: string,
    details?: Record<string, any>,
  ): void {
    const oldStatus = this.status;
    this.status = newStatus;

    // 감사 로그 추가
    if (!this.auditLog) {
      this.auditLog = [];
    }

    this.auditLog.push({
      timestamp: new Date(),
      action: `status_change_${oldStatus}_to_${newStatus}`,
      performedBy,
      details: details || {},
    });

    // 타임스탬프 업데이트
    if (newStatus === ClaimStatus.REVIEW && !this.reviewStartedAt) {
      this.reviewStartedAt = new Date();
    } else if (
      (newStatus === ClaimStatus.APPROVED || newStatus === ClaimStatus.REJECTED) &&
      !this.reviewCompletedAt
    ) {
      this.reviewCompletedAt = new Date();
      this.processingTimeMinutes = this.calculateProcessingTime();
    } else if (newStatus === ClaimStatus.PAID && !this.paidAt) {
      this.paidAt = new Date();
    }
  }

  /**
   * 지급 금액 계산
   */
  calculatePayoutAmount(): number {
    if (!this.approvedAmount || !this.coveragePercentage) {
      return 0;
    }

    const coveredAmount = (this.approvedAmount * this.coveragePercentage) / 100;
    const deductible = this.deductibleAmount || 0;

    return Math.max(0, coveredAmount - deductible);
  }

  /**
   * 승인 여부
   */
  isApproved(): boolean {
    return this.status === ClaimStatus.APPROVED || this.status === ClaimStatus.PAID;
  }

  /**
   * 처리 완료 여부
   */
  isProcessed(): boolean {
    return [
      ClaimStatus.APPROVED,
      ClaimStatus.REJECTED,
      ClaimStatus.PAID,
      ClaimStatus.CANCELLED,
    ].includes(this.status);
  }

  /**
   * 서류 완전성 확인
   */
  hasCompleteDocuments(): boolean {
    return (
      this.documentVerificationStatus === DocumentVerificationStatus.VERIFIED &&
      this.attachedDocuments &&
      this.attachedDocuments.length > 0
    );
  }

  /**
   * 빠른 처리 달성 여부 (목표: 3분 이내)
   */
  isFastProcessed(): boolean {
    return this.processingTimeMinutes !== undefined && this.processingTimeMinutes !== null && this.processingTimeMinutes <= 3;
  }
}
