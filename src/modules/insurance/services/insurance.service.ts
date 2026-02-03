import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { InsurancePolicy, PolicyStatus } from '../entities/insurance-policy.entity';
import {
  InsuranceClaim,
  ClaimStatus,
  DocumentVerificationStatus,
} from '../entities/insurance-claim.entity';
import {
  UserInsurance,
  SubscriptionStatus,
  PaymentStatus,
  PaymentCycle,
} from '../entities/user-insurance.entity';
import { AuditAction } from '../../../core/audit/entities/audit-log.entity';
import { Pet } from '../../pets/entities/pet.entity';
import { EncryptionService } from '../../../core/encryption/encryption.service';
import { CacheService } from '../../../core/cache/cache.service';
import { AuditService } from '../../../core/audit/audit.service';
import { ComparePoliciesDto } from '../dto/compare-policies.dto';
import { SubmitClaimDto } from '../dto/submit-claim.dto';
import { SubscribePolicyDto } from '../dto/subscribe-policy.dto';
import { UpdateClaimStatusDto } from '../dto/update-claim-status.dto';

/**
 * 보험 서비스
 *
 * 주요 기능:
 * 1. 정책 비교 및 AI 추천
 * 2. 보험 가입 관리
 * 3. 청구 제출 및 처리
 * 4. 청구 상태 추적
 * 5. 지급액 계산
 *
 * 성능 최적화:
 * - 정책 비교 결과 24시간 캐싱
 * - (policyId, status, submittedAt) 복합 인덱스
 * - 비동기 청구 처리 큐
 *
 * 보안:
 * - 청구 상세 정보 암호화 (EncryptionService)
 * - 모든 청구 작업 감사 로그 기록
 * - 보험업법 준수
 */
@Injectable()
export class InsuranceService {
  private readonly logger = new Logger(InsuranceService.name);
  private readonly POLICY_CACHE_TTL = 24 * 60 * 60; // 24시간 (초 단위)
  private readonly TARGET_PROCESSING_TIME_MINUTES = 3; // 목표 처리 시간

  constructor(
    @InjectRepository(InsurancePolicy)
    private policyRepository: Repository<InsurancePolicy>,
    @InjectRepository(InsuranceClaim)
    private claimRepository: Repository<InsuranceClaim>,
    @InjectRepository(UserInsurance)
    private userInsuranceRepository: Repository<UserInsurance>,
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,
    private encryptionService: EncryptionService,
    private cacheService: CacheService,
    private auditService: AuditService,
  ) {}

  // ============================================================
  // 정책 비교 및 추천
  // ============================================================

  /**
   * 보험 정책 비교 (5대 보험사)
   *
   * 캐싱 전략:
   * - 키: `policy_comparison:${species}:${ageMonths}:${breed}`
   * - TTL: 24시간
   */
  async comparePolicies(dto: ComparePoliciesDto) {
    const cacheKey = `policy_comparison:${dto.species}:${dto.ageMonths}:${dto.breed || 'all'}`;

    // 캐시 확인
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.log(`Policy comparison cache hit: ${cacheKey}`);
      return cached;
    }

    // 활성 정책 조회
    const queryBuilder = this.policyRepository
      .createQueryBuilder('policy')
      .where('policy.status = :status', { status: PolicyStatus.ACTIVE })
      .andWhere('policy.species = :species', { species: dto.species })
      .andWhere('policy.minAgeMonths <= :ageMonths', { ageMonths: dto.ageMonths })
      .andWhere('policy.maxAgeMonths >= :ageMonths', { ageMonths: dto.ageMonths });

    const policies = await queryBuilder.getMany();

    // 품종 필터링
    const eligiblePolicies = policies.filter((policy) =>
      dto.breed ? policy.isBreedEligible(dto.breed) : true,
    );

    // 예산 필터링
    let filteredPolicies = eligiblePolicies;
    if (dto.monthlyBudget !== undefined) {
      filteredPolicies = filteredPolicies.filter(
        (p) => p.monthlyPremium <= dto.monthlyBudget!,
      );
    }

    // 최소 보장 금액 필터링
    if (dto.minCoverageAmount !== undefined) {
      filteredPolicies = filteredPolicies.filter(
        (p) => p.maxCoveragePerYear >= dto.minCoverageAmount!,
      );
    }

    // 보장 유형 필터링
    if (dto.desiredCoverageTypes !== undefined && dto.desiredCoverageTypes.length > 0) {
      filteredPolicies = filteredPolicies.filter((p) =>
        dto.desiredCoverageTypes!.every((type) => p.coverageTypes.includes(type as any)),
      );
    }

    // AI 점수 계산 및 정렬
    const rankedPolicies = filteredPolicies
      .map((policy) => ({
        ...policy,
        aiScore: this.calculateAIRecommendationScore(policy, dto),
      }))
      .sort((a, b) => b.aiScore - a.aiScore);

    const result = {
      totalPolicies: rankedPolicies.length,
      recommendations: rankedPolicies.slice(0, 5), // 상위 5개
      searchCriteria: dto,
      generatedAt: new Date(),
    };

    // 결과 캐싱
    await this.cacheService.set(cacheKey, result, this.POLICY_CACHE_TTL);

    return result;
  }

  /**
   * AI 추천 점수 계산
   *
   * 가중치:
   * - 보장 금액: 30%
   * - 보험료: 25%
   * - 보장 범위: 20%
   * - 인기도: 15%
   * - 평점: 10%
   */
  private calculateAIRecommendationScore(
    policy: InsurancePolicy,
    dto: ComparePoliciesDto,
  ): number {
    let score = 0;

    // 보장 금액 점수 (0-30)
    const coverageScore = Math.min(
      30,
      (policy.maxCoveragePerYear / 10000000) * 30,
    );
    score += coverageScore;

    // 보험료 점수 (0-25) - 저렴할수록 높은 점수
    const premiumScore = dto.monthlyBudget
      ? Math.max(0, 25 - (policy.monthlyPremium / dto.monthlyBudget) * 25)
      : 25 - (policy.monthlyPremium / 100000) * 25;
    score += Math.max(0, premiumScore);

    // 보장 범위 점수 (0-20)
    const coverageTypeScore = (policy.coverageTypes.length / 8) * 20;
    score += coverageTypeScore;

    // 인기도 점수 (0-15)
    const popularityScore = Math.min(15, (policy.popularityScore / 100) * 15);
    score += popularityScore;

    // 평점 점수 (0-10)
    const ratingScore = (policy.averageRating / 5) * 10;
    score += ratingScore;

    return Math.round(score * 100) / 100;
  }

  /**
   * 반려동물 정보 기반 추천
   */
  async recommendPolicyForPet(petId: string) {
    const pet = await this.petRepository.findOne({
      where: { id: petId, isDeleted: false },
    });

    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    const age = pet.calculateAge();
    if (!age) {
      throw new BadRequestException('Pet age cannot be determined');
    }

    const ageMonths = age.years * 12 + age.months;

    const dto: ComparePoliciesDto = {
      species: pet.species as any,
      ageMonths,
      breed: pet.breed,
      hasPreexistingConditions: pet.chronicConditions && pet.chronicConditions.length > 0,
    };

    return this.comparePolicies(dto);
  }

  // ============================================================
  // 보험 가입 관리
  // ============================================================

  /**
   * 보험 가입
   */
  async subscribePolicy(userId: string, dto: SubscribePolicyDto) {
    const policy = await this.policyRepository.findOne({
      where: { id: dto.policyId, status: PolicyStatus.ACTIVE },
    });

    if (!policy) {
      throw new NotFoundException('Policy not found or inactive');
    }

    const pet = await this.petRepository.findOne({
      where: { id: dto.petId, ownerId: userId, isDeleted: false },
    });

    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // 연령 확인
    const age = pet.calculateAge();
    if (!age) {
      throw new BadRequestException('Pet age cannot be determined');
    }

    const ageMonths = age.years * 12 + age.months;
    if (!policy.isAgeEligible(ageMonths)) {
      throw new BadRequestException('Pet age not eligible for this policy');
    }

    // 품종 확인
    if (pet.breed && !policy.isBreedEligible(pet.breed)) {
      throw new BadRequestException('Pet breed not eligible for this policy');
    }

    // 증권 번호 생성
    const subscriptionNumber = await this.generateSubscriptionNumber();

    // 특약 보험료 계산
    let specialClausePremium = 0;
    if (dto.selectedSpecialClauses && policy.specialClauses) {
      for (const clause of policy.specialClauses) {
        if (dto.selectedSpecialClauses.includes(clause.name)) {
          specialClausePremium += clause.premium;
        }
      }
    }

    // 총 보험료 계산
    const totalPremium = policy.monthlyPremium + specialClausePremium;

    // 보장 종료일 계산
    const startDate = new Date(dto.startDate);
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    // 다음 납부일 계산
    const nextPaymentDate = this.calculateNextPaymentDate(startDate, dto.paymentCycle);

    const userInsurance = this.userInsuranceRepository.create({
      subscriptionNumber,
      userId,
      petId: dto.petId,
      policyId: dto.policyId,
      status: SubscriptionStatus.PENDING,
      startDate,
      endDate,
      paymentCycle: dto.paymentCycle,
      premiumAmount: policy.monthlyPremium,
      specialClausePremium,
      totalPremium,
      nextPaymentDate,
      paymentStatus: PaymentStatus.PENDING,
      selectedSpecialClauses: dto.selectedSpecialClauses,
      autoRenewal: dto.autoRenewal ?? true,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
      coverageSnapshot: {
        maxCoveragePerYear: policy.maxCoveragePerYear,
        maxCoveragePerAccident: policy.maxCoveragePerAccident,
        coveragePercentage: policy.coveragePercentage,
        deductible: policy.deductible,
        deductiblePercentage: policy.deductiblePercentage,
        coverageTypes: policy.coverageTypes,
        waitingPeriodDays: policy.waitingPeriodDays,
        surgeryWaitingPeriodDays: policy.surgeryWaitingPeriodDays,
      },
    });

    const saved = await this.userInsuranceRepository.save(userInsurance);

    // 감사 로그
    await this.auditService.log({
      action: AuditAction.INSURANCE_SUBSCRIBED,
      userId,
      resource: 'user_insurance',
      resourceId: saved.id,
      purpose: 'Insurance subscription created',
      legalBasis: 'User consent and contract agreement',
      ipAddress: '0.0.0.0',
      userAgent: 'system',
      metadata: {
        policyId: dto.policyId,
        petId: dto.petId,
        subscriptionNumber,
        totalPremium,
      },
    });

    return saved;
  }

  /**
   * 다음 납부일 계산
   */
  private calculateNextPaymentDate(startDate: Date, cycle: PaymentCycle): Date {
    const nextDate = new Date(startDate);

    switch (cycle) {
      case PaymentCycle.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case PaymentCycle.QUARTERLY:
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case PaymentCycle.SEMI_ANNUAL:
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case PaymentCycle.ANNUAL:
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    return nextDate;
  }

  /**
   * 증권 번호 생성
   */
  private async generateSubscriptionNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.userInsuranceRepository.count();
    return `SUB-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  // ============================================================
  // 청구 제출 및 처리
  // ============================================================

  /**
   * 보험 청구 제출 (암호화된 청구 상세 정보)
   *
   * 보안:
   * - 진단명, 치료 내용, 의료 기록 등 민감 정보 암호화
   * - EncryptionService.encrypt() 사용
   */
  async submitClaim(userId: string, dto: SubmitClaimDto) {
    const userInsurance = await this.userInsuranceRepository.findOne({
      where: {
        id: dto.userInsuranceId,
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['policy', 'pet'],
    });

    if (!userInsurance) {
      throw new NotFoundException('Active insurance subscription not found');
    }

    // 대기 기간 확인
    if (!userInsurance.hasWaitingPeriodPassed()) {
      throw new BadRequestException('Waiting period has not passed');
    }

    // 청구 번호 생성
    const claimNumber = await this.generateClaimNumber();

    // 🔒 민감 정보 암호화
    const claimDetails = {
      diagnosis: dto.diagnosis,
      treatment: dto.treatment,
      hospitalName: dto.hospitalName,
      veterinarianName: dto.veterinarianName || '',
      medicalRecordDetails: dto.medicalRecordDetails || '',
    };

    const encryptedClaimDetails = await this.encryptionService.encrypt(
      JSON.stringify(claimDetails),
    );

    // 청구 생성
    const claim = this.claimRepository.create({
      claimNumber,
      userId,
      petId: userInsurance.petId,
      policyId: userInsurance.policyId,
      claimType: dto.claimType,
      encryptedClaimDetails,
      totalClaimAmount: dto.totalClaimAmount,
      incidentDate: new Date(dto.incidentDate),
      treatmentStartDate: dto.treatmentStartDate ? new Date(dto.treatmentStartDate) : undefined,
      treatmentEndDate: dto.treatmentEndDate ? new Date(dto.treatmentEndDate) : undefined,
      attachedDocuments: dto.attachedDocuments,
      userComments: dto.userComments,
      status: ClaimStatus.SUBMITTED,
      submittedAt: new Date(),
      documentVerificationStatus: DocumentVerificationStatus.PENDING,
      coveragePercentage: userInsurance.coverageSnapshot.coveragePercentage,
      deductibleAmount: userInsurance.coverageSnapshot.deductible,
    });

    const saved = await this.claimRepository.save(claim) as unknown as InsuranceClaim;

    // 감사 로그
    await this.auditService.log({
      action: AuditAction.CLAIM_SUBMITTED,
      userId,
      resource: 'insurance_claim',
      resourceId: saved.id,
      purpose: 'Insurance claim submission',
      legalBasis: 'Insurance contract and user consent',
      ipAddress: '0.0.0.0',
      userAgent: 'system',
      metadata: {
        claimNumber,
        claimType: dto.claimType,
        totalClaimAmount: dto.totalClaimAmount,
        userInsuranceId: dto.userInsuranceId,
      },
    });

    // TODO: 비동기 청구 처리 큐에 추가 (Bull, SQS 등)
    // await this.queueService.add('process-claim', { claimId: saved.id });

    return saved;
  }

  /**
   * 청구 번호 생성
   */
  private async generateClaimNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.claimRepository.count();
    return `CLM-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * 청구 상태 업데이트
   */
  async updateClaimStatus(
    claimId: string,
    dto: UpdateClaimStatusDto,
    performedBy: string,
  ) {
    const claim = await this.claimRepository.findOne({
      where: { id: claimId },
      relations: ['user', 'policy'],
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    // 상태 업데이트
    if (dto.status) {
      claim.updateStatus(dto.status, performedBy, {
        approvedAmount: dto.approvedAmount,
        reviewNotes: dto.reviewNotes,
        rejectionReason: dto.rejectionReason,
      });
    }

    // 승인 금액 설정
    if (dto.approvedAmount !== undefined) {
      claim.approvedAmount = dto.approvedAmount;
      claim.payoutAmount = claim.calculatePayoutAmount();
    }

    // 보장 비율 설정
    if (dto.coveragePercentage !== undefined) {
      claim.coveragePercentage = dto.coveragePercentage;
      claim.payoutAmount = claim.calculatePayoutAmount();
    }

    // 심사자 및 메모
    if (dto.reviewedBy) claim.reviewedBy = dto.reviewedBy;
    if (dto.reviewNotes) claim.reviewNotes = dto.reviewNotes;
    if (dto.rejectionReason) claim.rejectionReason = dto.rejectionReason;

    // 서류 검증 상태
    if (dto.documentVerificationStatus) {
      claim.documentVerificationStatus = dto.documentVerificationStatus;
    }
    if (dto.documentVerificationNotes) {
      claim.documentVerificationNotes = dto.documentVerificationNotes;
    }

    const updated = await this.claimRepository.save(claim);

    // 감사 로그
    await this.auditService.log({
      action: AuditAction.CLAIM_STATUS_UPDATED,
      userId: performedBy,
      resource: 'insurance_claim',
      resourceId: claimId,
      purpose: 'Insurance claim status update',
      legalBasis: 'Insurance claim processing and administration',
      ipAddress: '0.0.0.0',
      userAgent: 'system',
      metadata: {
        claimNumber: claim.claimNumber,
        newStatus: dto.status,
        approvedAmount: dto.approvedAmount,
      },
    });

    return updated;
  }

  /**
   * 사용자 청구 목록 조회
   */
  async getUserClaims(userId: string, status?: ClaimStatus) {
    const where: any = { userId, isDeleted: false };
    if (status) {
      where.status = status;
    }

    return this.claimRepository.find({
      where,
      relations: ['policy', 'pet'],
      order: { submittedAt: 'DESC' },
    });
  }

  /**
   * 청구 상세 조회 (복호화)
   */
  async getClaimDetails(claimId: string, userId: string) {
    const claim = await this.claimRepository.findOne({
      where: { id: claimId, userId },
      relations: ['policy', 'pet', 'user'],
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    // 🔓 민감 정보 복호화
    const decryptedDetails = await this.encryptionService.decrypt(
      claim.encryptedClaimDetails,
    );

    return {
      ...claim,
      claimDetails: JSON.parse(decryptedDetails),
    };
  }

  /**
   * 청구 처리 성능 통계
   */
  async getProcessingStats(startDate?: Date, endDate?: Date) {
    const where: any = { status: ClaimStatus.PAID };

    if (startDate && endDate) {
      where.paidAt = Between(startDate, endDate);
    }

    const claims = await this.claimRepository.find({ where });

    const totalClaims = claims.length;
    const fastProcessed = claims.filter((c) => c.isFastProcessed()).length;
    const avgProcessingTime =
      claims.reduce((sum, c) => sum + (c.processingTimeMinutes || 0), 0) / totalClaims;

    return {
      totalClaims,
      fastProcessed,
      fastProcessingRate: (fastProcessed / totalClaims) * 100,
      avgProcessingTime,
      targetProcessingTime: this.TARGET_PROCESSING_TIME_MINUTES,
      improvement: ((30 - avgProcessingTime) / 30) * 100, // 30분 → 현재 시간
    };
  }
}
