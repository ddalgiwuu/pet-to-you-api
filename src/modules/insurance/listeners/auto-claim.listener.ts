/**
 * Auto-Claim Event Listener
 * Listens for medical record events and triggers auto-claim generation
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MedicalRecordCreatedEvent,
  MedicalRecordUpdatedEvent,
  AutoClaimSuggestionCreatedEvent,
  EventNames,
} from '../../../core/events/event-types';
import { AutoClaimGeneratorService } from '../services/auto-claim-generator.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Equal } from 'typeorm';
import { UserInsurance, SubscriptionStatus } from '../entities/user-insurance.entity';

@Injectable()
export class AutoClaimListener {
  private readonly logger = new Logger(AutoClaimListener.name);

  constructor(
    private readonly autoClaimGenerator: AutoClaimGeneratorService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(UserInsurance)
    private readonly userInsuranceRepository: Repository<UserInsurance>,
  ) {}

  /**
   * Handle medical record created event
   * Triggers auto-claim generation if eligible
   */
  @OnEvent(EventNames.MEDICAL_RECORD_CREATED)
  async handleMedicalRecordCreated(event: MedicalRecordCreatedEvent) {
    try {
      this.logger.log(
        `Processing medical record created event: ${event.medicalRecordId}`,
      );

      // 1. Quick eligibility check
      if (!event.actualCost || event.actualCost <= 0) {
        this.logger.debug(
          `No cost information for record: ${event.medicalRecordId}`,
        );
        return;
      }

      // 2. Check if pet has active insurance
      const hasInsurance = await this.userInsuranceRepository.findOne({
        where: {
          petId: event.petId,
          status: Equal(SubscriptionStatus.ACTIVE),
        },
      });

      if (!hasInsurance) {
        this.logger.debug(`No active insurance for pet: ${event.petId}`);
        return;
      }

      // 3. Generate auto-claim suggestion
      const suggestion = await this.autoClaimGenerator.generateClaimFromMedicalRecord(
        event.medicalRecordId,
      );

      if (!suggestion) {
        this.logger.debug(
          `Could not generate auto-claim for: ${event.medicalRecordId}`,
        );
        return;
      }

      // 4. Emit suggestion created event (triggers push notification)
      this.eventEmitter.emit(
        EventNames.AUTO_CLAIM_SUGGESTION_CREATED,
        new AutoClaimSuggestionCreatedEvent(
          suggestion.id,
          event.userId,
          event.petId,
          event.medicalRecordId,
          suggestion.estimatedClaimAmount,
          suggestion.confidence,
        ),
      );

      this.logger.log(
        `Auto-claim suggestion created: ${suggestion.id} for ₩${suggestion.estimatedClaimAmount.toLocaleString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process medical record created event: ${event.medicalRecordId}`,
        error,
      );
    }
  }

  /**
   * Handle medical record updated event
   * Re-evaluates auto-claim eligibility if cost changed
   */
  @OnEvent(EventNames.MEDICAL_RECORD_UPDATED)
  async handleMedicalRecordUpdated(event: MedicalRecordUpdatedEvent) {
    try {
      this.logger.log(
        `Processing medical record updated event: ${event.medicalRecordId}`,
      );

      // Only re-generate if cost or documents changed
      if (!event.costChanged && !event.documentsAdded) {
        this.logger.debug('No cost or document changes, skipping re-generation');
        return;
      }

      // Check if pet has active insurance
      const hasInsurance = await this.userInsuranceRepository.findOne({
        where: {
          petId: event.petId,
          status: Equal(SubscriptionStatus.ACTIVE),
        },
      });

      if (!hasInsurance) {
        return;
      }

      // Re-generate suggestion
      const suggestion = await this.autoClaimGenerator.generateClaimFromMedicalRecord(
        event.medicalRecordId,
      );

      if (suggestion) {
        this.eventEmitter.emit(
          EventNames.AUTO_CLAIM_SUGGESTION_CREATED,
          new AutoClaimSuggestionCreatedEvent(
            suggestion.id,
            event.userId,
            event.petId,
            event.medicalRecordId,
            suggestion.estimatedClaimAmount,
            suggestion.confidence,
          ),
        );

        this.logger.log(
          `Updated auto-claim suggestion: ${suggestion.id} for record: ${event.medicalRecordId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process medical record updated event: ${event.medicalRecordId}`,
        error,
      );
    }
  }

  /**
   * Handle auto-claim suggestion created event
   * Sends push notification to patient
   */
  @OnEvent(EventNames.AUTO_CLAIM_SUGGESTION_CREATED)
  async handleAutoClaimSuggestionCreated(
    event: AutoClaimSuggestionCreatedEvent,
  ) {
    try {
      this.logger.log(
        `Processing auto-claim suggestion created: ${event.suggestionId}`,
      );

      // TODO: Send push notification
      // await this.notificationService.sendPushNotification(event.userId, {
      //   title: '보험 청구 가능',
      //   body: `진료 건으로 ₩${event.estimatedClaimAmount.toLocaleString()} 청구 가능합니다`,
      //   data: {
      //     type: 'auto_claim_suggestion',
      //     suggestionId: event.suggestionId,
      //     medicalRecordId: event.medicalRecordId,
      //   },
      // });

      this.logger.log(
        `Push notification sent for suggestion: ${event.suggestionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send notification for suggestion: ${event.suggestionId}`,
        error,
      );
    }
  }
}
