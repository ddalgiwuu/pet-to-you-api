/**
 * Auto-Claim Generator Service
 * Generates insurance claims automatically from medical records
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Equal } from 'typeorm';
import { HealthNote } from '../../medical-records/entities/health-note.entity';
import { InsurancePolicy, CoverageType } from '../entities/insurance-policy.entity';
import { InsuranceClaim } from '../entities/insurance-claim.entity';
import { UserInsurance, SubscriptionStatus } from '../entities/user-insurance.entity';
import { AutoClaimSuggestion as AutoClaimSuggestionEntity, AutoClaimSuggestionStatus } from '../entities/auto-claim-suggestion.entity';
import { Pet } from '../../pets/entities/pet.entity';
import { EncryptionService } from '../../../core/encryption/encryption.service';

export interface AutoClaimSuggestionDto {
  id: string;
  medicalRecordId: string;
  policyId: string;
  petId: string;
  incidentDate: string;
  diagnosis: string;
  treatment: string;
  hospitalName: string;
  estimatedCost: number;
  estimatedClaimAmount: number;
  coverageType: string;
  coveragePercent: number;
  confidence: number;
  isEligible: boolean;
  reason?: string;
  prefilledDocuments?: any[];
  serviceItems?: any[];
  createdAt: string;
}

@Injectable()
export class AutoClaimGeneratorService {
  private readonly logger = new Logger(AutoClaimGeneratorService.name);

  constructor(
    @InjectRepository(HealthNote)
    private readonly healthNoteRepository: Repository<HealthNote>,
    @InjectRepository(UserInsurance)
    private readonly userInsuranceRepository: Repository<UserInsurance>,
    @InjectRepository(InsurancePolicy)
    private readonly insurancePolicyRepository: Repository<InsurancePolicy>,
    @InjectRepository(AutoClaimSuggestionEntity)
    private readonly suggestionRepository: Repository<AutoClaimSuggestionEntity>,
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Generate auto-claim suggestion from medical record
   */
  async generateClaimFromMedicalRecord(
    medicalRecordId: string,
  ): Promise<AutoClaimSuggestionDto | null> {
    try {
      // 1. Fetch medical record
      const medicalRecord = await this.healthNoteRepository.findOne({
        where: { id: medicalRecordId },
        relations: ['pet'],
      });

      if (!medicalRecord) {
        this.logger.warn(`Medical record not found: ${medicalRecordId}`);
        return null;
      }

      // 2. Check if already generated
      if (medicalRecord.autoClaimGenerated) {
        this.logger.debug(`Auto-claim already generated for: ${medicalRecordId}`);
        return null;
      }

      // 3. Find active insurance policies
      const userInsurance = await this.userInsuranceRepository.findOne({
        where: {
          petId: medicalRecord.petId,
          status: Equal(SubscriptionStatus.ACTIVE),
        },
        relations: ['policy'],
      });

      if (!userInsurance) {
        this.logger.debug(`No active insurance for pet: ${medicalRecord.petId}`);
        return null;
      }

      // 4. Check waiting period
      const now = new Date();
      const waitingPeriodDays = userInsurance.coverageSnapshot?.waitingPeriodDays || 0;
      const activatedAt = userInsurance.activatedAt ? new Date(userInsurance.activatedAt) : new Date();
      const waitingPeriodEnd = new Date(activatedAt.getTime() + waitingPeriodDays * 24 * 60 * 60 * 1000);
      if (now < waitingPeriodEnd) {
        this.logger.debug(`Waiting period not over for policy: ${userInsurance.id}`);
        return null;
      }

      // 5. Match coverage type
      const coverageType = this.inferCoverageType(
        medicalRecord.visitType,
        medicalRecord.diagnosis,
        medicalRecord.treatment,
      );

      const coverage = userInsurance.policy.coverageDetails?.[coverageType as keyof typeof userInsurance.policy.coverageDetails];

      if (!coverage) {
        this.logger.debug(`No coverage match for type: ${coverageType}`);
        return null;
      }

      // 6. Calculate claim amount
      const actualCost = medicalRecord.actualCost || medicalRecord.estimatedCost || 0;

      if (actualCost <= 0) {
        this.logger.debug(`No cost information for: ${medicalRecordId}`);
        return null;
      }

      const deductible = userInsurance.policy.deductible || 50000;
      const afterDeductible = Math.max(0, actualCost - deductible);
      const claimAmount = Math.round(
        afterDeductible * (coverage.percentage / 100),
      );

      // 7. Check coverage limits
      const withinAnnualLimit =
        claimAmount <= (userInsurance.policy as any).remainingCoverage;
      const withinItemLimit =
        !coverage.maxAmount || claimAmount <= coverage.maxAmount;

      if (!withinAnnualLimit || !withinItemLimit) {
        this.logger.debug(`Claim exceeds coverage limits for: ${medicalRecordId}`);
        return null;
      }

      // 8. Calculate days since visit
      const daysSinceVisit = Math.floor(
        (Date.now() - new Date(medicalRecord.visitDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      // 9. Calculate confidence score
      const confidence = this.calculateConfidence(
        medicalRecord,
        coverage,
        actualCost,
        coverageType,
      );

      // 10. Get pet owner userId
      const pet = await this.petRepository.findOne({
        where: { id: medicalRecord.petId },
      });

      if (!pet) {
        this.logger.warn(`Pet not found: ${medicalRecord.petId}`);
        return null;
      }

      // 10. Re-encrypt diagnosis and treatment for suggestion snapshot ⭐ SECURITY FIX: CRT-002
      // Decrypt from medical record, then re-encrypt for suggestion
      const diagnosisPlain = medicalRecord.diagnosisEncrypted
        ? await this.encryptionService.decrypt(medicalRecord.diagnosisEncrypted)
        : '';
      const treatmentPlain = medicalRecord.treatmentEncrypted
        ? await this.encryptionService.decrypt(medicalRecord.treatmentEncrypted)
        : '';

      // Re-encrypt with new key for suggestion (defense in depth)
      const diagnosisEncrypted = await this.encryptionService.encrypt(diagnosisPlain);
      const treatmentEncrypted = await this.encryptionService.encrypt(treatmentPlain);

      // 11. Create and save suggestion entity with encrypted fields ⭐
      const suggestionEntity = this.suggestionRepository.create({
        medicalRecordId: medicalRecord.id,
        policyId: userInsurance.policyId,
        petId: medicalRecord.petId,
        userId: (pet as any).ownerId || (pet as any).owner?.id || 'unknown',
        incidentDate: medicalRecord.visitDate,

        // 🔒 Encrypted medical snapshots (never plaintext)
        diagnosisEncrypted,
        treatmentEncrypted,

        // Legacy fields (deprecated, null for security)
        diagnosis: null,
        treatment: null,
        hospitalName: medicalRecord.hospitalName,
        hospitalId: medicalRecord.hospitalId,
        estimatedCost: actualCost,
        estimatedClaimAmount: claimAmount,
        coverageType,
        coveragePercent: coverage.percentage,
        deductible: userInsurance.policy.deductible || 50000,
        confidence,
        isEligible: claimAmount > 0,
        prefilledDocuments: medicalRecord.documents || [],
        serviceItems: medicalRecord.serviceItems || [],
        costBreakdown: medicalRecord.costBreakdown,
        analysisDetails: {
          hasActualCost: !!(medicalRecord.actualCost && medicalRecord.actualCost > 0),
          hasDocuments: !!(medicalRecord.documents && medicalRecord.documents.length > 0),
          hasReceipt: !!(medicalRecord.documents?.some((doc: any) => doc.type === 'receipt')),
          hasCostBreakdown: !!medicalRecord.costBreakdown,
          hasServiceItems: !!(medicalRecord.serviceItems && medicalRecord.serviceItems.length > 0),
          costIsReasonable: true,
          hasHospitalId: !!medicalRecord.hospitalId,
          isRecentVisit: daysSinceVisit <= 30,
          confidenceFactors: {
            base: 0.5,
            actualCost: medicalRecord.actualCost ? 0.15 : 0,
            documents: (medicalRecord.documents?.length || 0) > 0 ? 0.2 : 0,
            receipt: medicalRecord.documents?.some((d: any) => d.type === 'receipt') ? 0.1 : 0,
            breakdown: medicalRecord.costBreakdown ? 0.1 : 0,
            serviceItems: (medicalRecord.serviceItems?.length || 0) > 0 ? 0.05 : 0,
            reasonable: 0.1,
            hospitalId: medicalRecord.hospitalId ? 0.05 : 0,
            recent: daysSinceVisit <= 30 ? 0.05 : 0,
          },
        },
        status: AutoClaimSuggestionStatus.PENDING,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      } as any);

      const savedResult = await this.suggestionRepository.save(suggestionEntity);
      const savedSuggestion = Array.isArray(savedResult) ? savedResult[0] : savedResult;

      // 12. Mark medical record as generated
      await this.healthNoteRepository.update(medicalRecordId, {
        autoClaimGenerated: true,
        insuranceCoverageType: coverageType,
      });

      this.logger.log(
        `Generated and saved auto-claim suggestion: ${savedSuggestion.id} for ₩${claimAmount.toLocaleString()}`,
      );

      // 13. Convert to interface format for event (use decrypted data)
      const suggestion = {
        id: savedSuggestion.id,
        medicalRecordId: savedSuggestion.medicalRecordId,
        policyId: savedSuggestion.policyId,
        petId: savedSuggestion.petId,
        incidentDate: savedSuggestion.incidentDate.toISOString(),

        // Use plaintext for event (event data is not persisted)
        diagnosis: diagnosisPlain,
        treatment: treatmentPlain,
        hospitalName: savedSuggestion.hospitalName,
        estimatedCost: savedSuggestion.estimatedCost,
        estimatedClaimAmount: savedSuggestion.estimatedClaimAmount,
        coverageType: savedSuggestion.coverageType,
        coveragePercent: savedSuggestion.coveragePercent,
        confidence: Number(savedSuggestion.confidence),
        isEligible: savedSuggestion.isEligible,
        prefilledDocuments: savedSuggestion.prefilledDocuments,
        serviceItems: savedSuggestion.serviceItems,
        createdAt: savedSuggestion.createdAt.toISOString(),
      };

      return suggestion;
    } catch (error) {
      this.logger.error(
        `Failed to generate auto-claim for ${medicalRecordId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Infer coverage type from medical record
   */
  private inferCoverageType(
    visitType?: string,
    diagnosis?: string,
    treatment?: string,
  ): CoverageType {
    const text = `${visitType} ${diagnosis} ${treatment}`.toLowerCase();

    // Emergency keywords -> ACCIDENT
    if (
      text.includes('응급') ||
      text.includes('emergency') ||
      text.includes('급성') ||
      text.includes('위급')
    ) {
      return CoverageType.ACCIDENT;
    }

    // Surgery keywords
    if (
      text.includes('수술') ||
      text.includes('surgery') ||
      text.includes('절제') ||
      text.includes('봉합')
    ) {
      return CoverageType.SURGERY;
    }

    // Hospitalization keywords
    if (
      text.includes('입원') ||
      text.includes('hospitalization') ||
      text.includes('병동')
    ) {
      return CoverageType.HOSPITALIZATION;
    }

    // Medication keywords
    if (
      text.includes('약') ||
      text.includes('medication') ||
      text.includes('처방')
    ) {
      return CoverageType.MEDICATION;
    }

    // Diagnostic keywords -> OUTPATIENT
    if (
      text.includes('검사') ||
      text.includes('진단') ||
      text.includes('혈액') ||
      text.includes('엑스레이') ||
      text.includes('x-ray') ||
      text.includes('초음파')
    ) {
      return CoverageType.OUTPATIENT;
    }

    // Chronic -> ILLNESS
    if (
      text.includes('만성') ||
      text.includes('chronic') ||
      text.includes('지속') ||
      text.includes('재발')
    ) {
      return CoverageType.ILLNESS;
    }

    // Default to OUTPATIENT
    return CoverageType.OUTPATIENT;
  }

  /**
   * Calculate confidence score (0-1)
   */
  private calculateConfidence(
    medicalRecord: HealthNote,
    coverage: any,
    actualCost: number,
    coverageType: CoverageType,
  ): number {
    let score = 0.5; // Base score

    // Has actual cost from hospital (+0.15)
    if (medicalRecord.actualCost && medicalRecord.actualCost > 0) {
      score += 0.15;
    }

    // Has documents (+0.2)
    if (medicalRecord.documents && medicalRecord.documents.length > 0) {
      score += 0.2;
    }

    // Has receipt specifically (+0.1)
    if (
      medicalRecord.documents?.some((doc: any) => doc.type === 'receipt')
    ) {
      score += 0.1;
    }

    // Has detailed cost breakdown (+0.1)
    if (medicalRecord.costBreakdown) {
      score += 0.1;
    }

    // Has service items (+0.05)
    if (
      medicalRecord.serviceItems &&
      medicalRecord.serviceItems.length > 0
    ) {
      score += 0.05;
    }

    // Cost is reasonable for type (+0.1)
    const expectedRanges: Record<CoverageType, { min: number; max: number }> = {
      [CoverageType.ACCIDENT]: { min: 100000, max: 5000000 },
      [CoverageType.SURGERY]: { min: 500000, max: 10000000 },
      [CoverageType.HOSPITALIZATION]: { min: 200000, max: 3000000 },
      [CoverageType.OUTPATIENT]: { min: 20000, max: 500000 },
      [CoverageType.ILLNESS]: { min: 50000, max: 1000000 },
      [CoverageType.MEDICATION]: { min: 10000, max: 500000 },
      [CoverageType.LIABILITY]: { min: 0, max: 10000000 },
      [CoverageType.FUNERAL]: { min: 0, max: 3000000 },
    };

    const range = expectedRanges[coverageType] || expectedRanges[CoverageType.OUTPATIENT];
    if (actualCost >= range.min && actualCost <= range.max) {
      score += 0.1;
    }

    // Has hospital ID (+0.05)
    if (medicalRecord.hospitalId) {
      score += 0.05;
    }

    // Recent visit (<30 days) (+0.05)
    const daysSinceVisit = Math.floor(
      (Date.now() - new Date(medicalRecord.visitDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysSinceVisit <= 30) {
      score += 0.05;
    }

    return Math.min(1, score);
  }

  /**
   * Extract cost details from medical record
   */
  extractCostDetails(medicalRecord: HealthNote): {
    totalCost: number;
    breakdown: any;
    serviceItems: any[];
  } {
    const totalCost = medicalRecord.actualCost || medicalRecord.estimatedCost || 0;

    return {
      totalCost,
      breakdown: medicalRecord.costBreakdown || null,
      serviceItems: medicalRecord.serviceItems || [],
    };
  }

  /**
   * Attach documents from medical record to claim
   */
  attachDocumentsFromRecord(medicalRecord: HealthNote): any[] {
    if (!medicalRecord.documents || medicalRecord.documents.length === 0) {
      return [];
    }

    return medicalRecord.documents.map((doc: any) => ({
      id: doc.id,
      type: doc.type,
      name: doc.name,
      uri: doc.uri,
      mimeType: doc.mimeType,
      size: doc.size,
      uploadedAt: doc.uploadedAt,
      source: 'hospital', // Documents from hospital
    }));
  }
}
