/**
 * Push Notification Service
 * Firebase Cloud Messaging integration
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AutoClaimSuggestionCreatedEvent,
  ClaimApprovedEvent,
  ClaimRejectedEvent,
  HospitalPaymentCompletedEvent,
  EventNames,
} from '../../../core/events/event-types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoClaimSuggestion } from '../../insurance/entities/auto-claim-suggestion.entity';

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: {
    type: string;
    [key: string]: any;
  };
}

/**
 * 📱 Push Notification Service
 *
 * Sends push notifications via Firebase Cloud Messaging
 *
 * Event Triggers:
 * - AUTO_CLAIM_SUGGESTION_CREATED → "보험 청구 가능"
 * - CLAIM_APPROVED → "청구 승인됨"
 * - CLAIM_REJECTED → "청구 거부됨"
 * - HOSPITAL_PAYMENT_COMPLETED → "정산 완료"
 */
@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(
    @InjectRepository(AutoClaimSuggestion)
    private readonly suggestionRepository: Repository<AutoClaimSuggestion>,
  ) {}

  /**
   * Send push notification to user
   */
  async sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
    try {
      this.logger.log(`Sending push notification to user: ${payload.userId}`);
      this.logger.debug(`Title: ${payload.title}`);
      this.logger.debug(`Body: ${payload.body}`);

      // TODO: Replace with actual FCM implementation
      /*
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        token: await this.getUserFcmToken(payload.userId),
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Push notification sent successfully: ${response}`);
      return true;
      */

      // Mock implementation
      this.logger.log(`[MOCK] Push notification sent: ${payload.title}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send push notification to ${payload.userId}:`, error);
      return false;
    }
  }

  /**
   * Handle auto-claim suggestion created event
   */
  @OnEvent(EventNames.AUTO_CLAIM_SUGGESTION_CREATED)
  async handleAutoClaimSuggestionCreated(event: AutoClaimSuggestionCreatedEvent) {
    try {
      this.logger.log(
        `Sending auto-claim notification for suggestion: ${event.suggestionId}`,
      );

      const sent = await this.sendPushNotification({
        userId: event.userId,
        title: '보험 청구 가능',
        body: `진료 건으로 ₩${event.estimatedClaimAmount.toLocaleString()} 청구 가능합니다`,
        data: {
          type: 'auto_claim_suggestion',
          suggestionId: event.suggestionId,
          medicalRecordId: event.medicalRecordId,
          estimatedClaimAmount: event.estimatedClaimAmount.toString(),
          confidence: event.confidence.toString(),
        },
      });

      if (sent) {
        // Mark notification as sent
        await this.suggestionRepository.update(event.suggestionId, {
          notificationSent: true,
          notificationSentAt: new Date(),
        });

        this.logger.log(`Auto-claim notification sent: ${event.suggestionId}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send auto-claim notification: ${event.suggestionId}`,
        error,
      );
    }
  }

  /**
   * Handle claim approved event
   */
  @OnEvent(EventNames.CLAIM_APPROVED)
  async handleClaimApproved(event: ClaimApprovedEvent) {
    try {
      this.logger.log(`Sending claim approved notification for: ${event.claimId}`);

      await this.sendPushNotification({
        userId: event.userId,
        title: '청구 승인 완료',
        body: `보험 청구가 승인되었습니다. 지급액: ₩${event.approvedAmount.toLocaleString()}`,
        data: {
          type: 'claim_approved',
          claimId: event.claimId,
          approvedAmount: event.approvedAmount.toString(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send claim approved notification:`, error);
    }
  }

  /**
   * Handle claim rejected event
   */
  @OnEvent(EventNames.CLAIM_REJECTED)
  async handleClaimRejected(event: ClaimRejectedEvent) {
    try {
      this.logger.log(`Sending claim rejected notification for: ${event.claimId}`);

      await this.sendPushNotification({
        userId: event.userId,
        title: '청구 거부됨',
        body: `보험 청구가 거부되었습니다. 사유: ${event.rejectionReason}`,
        data: {
          type: 'claim_rejected',
          claimId: event.claimId,
          reason: event.rejectionReason,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send claim rejected notification:`, error);
    }
  }

  /**
   * Handle hospital payment completed event
   */
  @OnEvent(EventNames.HOSPITAL_PAYMENT_COMPLETED)
  async handleHospitalPaymentCompleted(event: HospitalPaymentCompletedEvent) {
    try {
      this.logger.log(
        `Sending hospital payment completed notification: ${event.paymentId}`,
      );

      // TODO: Send to hospital staff
      this.logger.log(
        `[MOCK] Hospital notification: Payment completed ₩${event.amount.toLocaleString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send hospital payment notification:`,
        error,
      );
    }
  }

  /**
   * Get user FCM token (TODO: Implement)
   */
  private async getUserFcmToken(userId: string): Promise<string> {
    // TODO: Fetch from users table or device_tokens table
    return `fcm-token-${userId}`;
  }
}
