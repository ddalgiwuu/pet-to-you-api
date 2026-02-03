import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';

export interface AdoptionApplicationSubmittedEvent {
  applicationId: string;
  userId: string;
  userEmail: string;
  userPhone: string;
  deviceToken?: string;
  petName: string;
  petType: string;
  applicationNumber: string;
}

export interface AdoptionApplicationApprovedEvent
  extends AdoptionApplicationSubmittedEvent {
  approvalDate: string;
  nextSteps: string;
}

export interface AdoptionApplicationRejectedEvent
  extends AdoptionApplicationSubmittedEvent {
  rejectionReason: string;
}

@Injectable()
export class AdoptionListener {
  private readonly logger = new Logger(AdoptionListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Handle adoption application submitted
   */
  @OnEvent('adoption.application.submitted')
  async handleApplicationSubmitted(event: AdoptionApplicationSubmittedEvent) {
    try {
      this.logger.log(
        `Handling adoption.application.submitted event: ${event.applicationId}`,
      );

      await this.notificationService.sendNotification({
        templateId: 'adoption_application_submitted',
        userId: event.userId,
        email: event.userEmail,
        phone: event.userPhone,
        deviceToken: event.deviceToken,
        variables: {
          applicationNumber: event.applicationNumber,
          petName: event.petName,
          petType: event.petType,
        },
        priority: 3,
      });

      this.logger.log(
        `Sent adoption application submitted notification for: ${event.applicationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle adoption.application.submitted event: ${event.applicationId}`,
        error.stack,
      );
    }
  }

  /**
   * Handle adoption application approved
   */
  @OnEvent('adoption.application.approved')
  async handleApplicationApproved(event: AdoptionApplicationApprovedEvent) {
    try {
      this.logger.log(
        `Handling adoption.application.approved event: ${event.applicationId}`,
      );

      await this.notificationService.sendNotification({
        templateId: 'adoption_application_approved',
        userId: event.userId,
        email: event.userEmail,
        phone: event.userPhone,
        deviceToken: event.deviceToken,
        variables: {
          applicationNumber: event.applicationNumber,
          petName: event.petName,
          approvalDate: event.approvalDate,
          nextSteps: event.nextSteps,
        },
        priority: 2, // Very high priority
      });

      this.logger.log(
        `Sent adoption approval notification for: ${event.applicationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle adoption.application.approved event: ${event.applicationId}`,
        error.stack,
      );
    }
  }

  /**
   * Handle adoption application rejected
   */
  @OnEvent('adoption.application.rejected')
  async handleApplicationRejected(event: AdoptionApplicationRejectedEvent) {
    try {
      this.logger.log(
        `Handling adoption.application.rejected event: ${event.applicationId}`,
      );

      await this.notificationService.sendNotification({
        templateId: 'adoption_application_rejected',
        userId: event.userId,
        email: event.userEmail,
        phone: event.userPhone,
        deviceToken: event.deviceToken,
        variables: {
          applicationNumber: event.applicationNumber,
          petName: event.petName,
          rejectionReason: event.rejectionReason,
        },
        priority: 3,
      });

      this.logger.log(
        `Sent adoption rejection notification for: ${event.applicationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle adoption.application.rejected event: ${event.applicationId}`,
        error.stack,
      );
    }
  }
}
