/**
 * Auto-Claim Suggestions Service
 * Manages auto-claim suggestions (fetch, update status, etc.)
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoClaimSuggestion, AutoClaimSuggestionStatus } from '../entities/auto-claim-suggestion.entity';
import { EncryptionService } from '../../../core/encryption/encryption.service';
import { AuditService } from '../../../core/audit/audit.service';
import { AuditAction } from '../../../core/audit/entities/audit-log.entity';

@Injectable()
export class AutoClaimSuggestionsService {
  private readonly logger = new Logger(AutoClaimSuggestionsService.name);

  constructor(
    @InjectRepository(AutoClaimSuggestion)
    private readonly suggestionRepository: Repository<AutoClaimSuggestion>,
    private readonly encryptionService: EncryptionService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get all pending suggestions for a user
   */
  async getUserSuggestions(userId: string): Promise<AutoClaimSuggestion[]> {
    const suggestions = await this.suggestionRepository.find({
      where: {
        userId,
        status: AutoClaimSuggestionStatus.PENDING,
      },
      order: {
        createdAt: 'DESC',
      },
      relations: ['medicalRecord', 'policy', 'pet'],
    });

    // Filter out expired suggestions
    const now = new Date();
    const validSuggestions = suggestions.filter(
      (s) => !s.expiresAt || s.expiresAt > now,
    );

    // Mark expired ones
    const expiredIds = suggestions
      .filter((s) => s.expiresAt && s.expiresAt <= now)
      .map((s) => s.id);

    if (expiredIds.length > 0) {
      await this.suggestionRepository.update(expiredIds, {
        status: AutoClaimSuggestionStatus.EXPIRED,
      });
    }

    // 🔓 Decrypt medical data for display ⭐ SECURITY FIX: CRT-002
    for (const suggestion of validSuggestions) {
      if (suggestion.diagnosisEncrypted) {
        suggestion.diagnosisDecrypted = await this.encryptionService.decrypt(
          suggestion.diagnosisEncrypted,
        );
      }
      if (suggestion.treatmentEncrypted) {
        suggestion.treatmentDecrypted = await this.encryptionService.decrypt(
          suggestion.treatmentEncrypted,
        );
      }
    }

    // Audit log - accessing auto-claim suggestions with medical data
    await this.auditService.log({
      userId,
      action: AuditAction.READ_AUTO_CLAIM_SUGGESTIONS,
      resource: 'AutoClaimSuggestion',
      resourceId: `user:${userId}`,
      purpose: 'View pending auto-claim suggestions',
      legalBasis: 'Insurance claim processing - Insurance Business Act',
      ipAddress: '127.0.0.1',
      userAgent: 'Auto Claim System',
      metadata: {
        sensitive: true,
        count: validSuggestions.length,
        decryptedFields: ['diagnosis', 'treatment'],
      },
    });

    return validSuggestions;
  }

  /**
   * Get suggestion by ID
   */
  async getSuggestionById(
    suggestionId: string,
    userId: string,
  ): Promise<AutoClaimSuggestion> {
    const suggestion = await this.suggestionRepository.findOne({
      where: { id: suggestionId, userId },
      relations: ['medicalRecord', 'policy', 'pet'],
    });

    if (!suggestion) {
      throw new NotFoundException('Auto-claim suggestion not found');
    }

    // 🔓 Decrypt medical data for display ⭐ SECURITY FIX: CRT-002
    if (suggestion.diagnosisEncrypted) {
      suggestion.diagnosisDecrypted = await this.encryptionService.decrypt(
        suggestion.diagnosisEncrypted,
      );
    }
    if (suggestion.treatmentEncrypted) {
      suggestion.treatmentDecrypted = await this.encryptionService.decrypt(
        suggestion.treatmentEncrypted,
      );
    }

    // Audit log - accessing sensitive suggestion data
    await this.auditService.log({
      userId,
      action: AuditAction.READ_AUTO_CLAIM_SUGGESTION,
      resource: 'AutoClaimSuggestion',
      resourceId: suggestionId,
      purpose: 'View auto-claim suggestion details',
      legalBasis: 'Insurance claim processing - Insurance Business Act',
      ipAddress: '127.0.0.1',
      userAgent: 'Auto Claim System',
      metadata: {
        sensitive: true,
        decryptedFields: ['diagnosis', 'treatment'],
        estimatedClaimAmount: suggestion.estimatedClaimAmount,
      },
    });

    // Mark as viewed if not already
    if (suggestion.status === AutoClaimSuggestionStatus.PENDING && !suggestion.viewedAt) {
      await this.suggestionRepository.update(suggestionId, {
        status: AutoClaimSuggestionStatus.VIEWED,
        viewedAt: new Date(),
      });
      suggestion.status = AutoClaimSuggestionStatus.VIEWED;
      suggestion.viewedAt = new Date();
    }

    return suggestion;
  }

  /**
   * Mark suggestion as accepted (when user submits claim)
   */
  async markAsAccepted(
    suggestionId: string,
    userId: string,
    createdClaimId: string,
  ): Promise<void> {
    const suggestion = await this.suggestionRepository.findOne({
      where: { id: suggestionId, userId },
    });

    if (!suggestion) {
      throw new NotFoundException('Auto-claim suggestion not found');
    }

    await this.suggestionRepository.update(suggestionId, {
      status: AutoClaimSuggestionStatus.ACCEPTED,
      acceptedAt: new Date(),
      createdClaimId,
    });

    this.logger.log(`Suggestion accepted: ${suggestionId} → Claim: ${createdClaimId}`);
  }

  /**
   * Mark suggestion as rejected
   */
  async markAsRejected(suggestionId: string, userId: string): Promise<void> {
    const suggestion = await this.suggestionRepository.findOne({
      where: { id: suggestionId, userId },
    });

    if (!suggestion) {
      throw new NotFoundException('Auto-claim suggestion not found');
    }

    await this.suggestionRepository.update(suggestionId, {
      status: AutoClaimSuggestionStatus.REJECTED,
      rejectedAt: new Date(),
    });

    this.logger.log(`Suggestion rejected: ${suggestionId}`);
  }

  /**
   * Get suggestion count for user
   */
  async getSuggestionCount(userId: string): Promise<number> {
    return this.suggestionRepository.count({
      where: {
        userId,
        status: AutoClaimSuggestionStatus.PENDING,
      },
    });
  }
}
