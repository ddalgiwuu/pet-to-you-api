import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as admin from 'firebase-admin';
import {
  NotificationTemplate,
  NotificationType,
} from '../entities/notification-template.entity';
import {
  NotificationLog,
  NotificationStatus,
} from '../schemas/notification-log.schema';

export interface PushOptions {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  icon?: string;
  sound?: string;
  clickAction?: string;
  badge?: number;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(NotificationTemplate.name)
    private templateModel: Model<NotificationTemplate>,
    @InjectModel(NotificationLog.name)
    private logModel: Model<NotificationLog>,
  ) {
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private initializeFirebase() {
    try {
      const serviceAccountPath = this.configService.get<string>(
        'FIREBASE_SERVICE_ACCOUNT_PATH',
      );

      if (!serviceAccountPath) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH not configured');
      }

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
        });
      }

      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error.stack);
    }
  }

  /**
   * Send push notification using template
   */
  async sendTemplatePush(
    templateId: string,
    userId: string,
    deviceToken: string,
    variables: Record<string, any>,
    options?: {
      priority?: number;
      scheduledFor?: Date;
      metadata?: Record<string, any>;
      badge?: number;
    },
  ): Promise<NotificationLog> {
    try {
      // Find template
      const template = await this.templateModel.findOne({
        templateId,
        type: NotificationType.PUSH,
        isActive: true,
      });

      if (!template) {
        throw new Error(`Push notification template not found: ${templateId}`);
      }

      // Render template
      const title = this.renderTemplate(template.subjectKo, variables);
      const body = this.renderTemplate(template.bodyKo, variables);

      // Create notification log
      const notificationLog = new this.logModel({
        notificationId: this.generateNotificationId(),
        templateId,
        type: NotificationType.PUSH,
        userId,
        recipientDeviceToken: deviceToken,
        subject: title,
        body,
        variables,
        status: NotificationStatus.QUEUED,
        queuedAt: new Date(),
        priority: options?.priority || template.priority || 5,
        scheduledFor: options?.scheduledFor,
        metadata: options?.metadata,
      });

      await notificationLog.save();

      // Send push immediately (or queue if scheduled)
      if (!options?.scheduledFor || options.scheduledFor <= new Date()) {
        const result = await this.sendPush({
          deviceToken,
          title,
          body,
          data: template.pushData || {},
          icon: template.pushIcon,
          sound: template.pushSound,
          clickAction: template.pushClickAction,
          badge: options?.badge,
        });

        // Update log
        notificationLog.status = NotificationStatus.SENT;
        notificationLog.sentAt = new Date();
        notificationLog.provider = 'fcm';
        notificationLog.providerMessageId = result.messageId;
        await notificationLog.save();

        // Update template stats
        await this.updateTemplateStats(templateId, true);
      }

      return notificationLog;
    } catch (error) {
      this.logger.error(
        `Failed to send template push: ${templateId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send push notification via FCM
   */
  async sendPush(options: PushOptions): Promise<{ messageId: string }> {
    try {
      const message: admin.messaging.Message = {
        token: options.deviceToken,
        notification: {
          title: options.title,
          body: options.body,
          imageUrl: options.icon,
        },
        data: options.data,
        android: {
          priority: 'high',
          notification: {
            sound: options.sound || 'default',
            channelId: 'pet_to_you_notifications',
            clickAction: options.clickAction,
            icon: options.icon,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: options.title,
                body: options.body,
              },
              sound: options.sound || 'default',
              badge: options.badge || 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);

      this.logger.log(
        `Push notification sent to ${options.deviceToken}: ${response}`,
      );

      return { messageId: response };
    } catch (error) {
      this.logger.error(
        `Failed to send push to ${options.deviceToken}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send to multiple devices (multicast)
   */
  async sendMulticast(
    deviceTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<admin.messaging.BatchResponse> {
    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: deviceTokens,
        notification: {
          title,
          body,
        },
        data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'pet_to_you_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title,
                body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      this.logger.log(
        `Multicast push sent to ${deviceTokens.length} devices: ${response.successCount} succeeded, ${response.failureCount} failed`,
      );

      return response;
    } catch (error) {
      this.logger.error('Failed to send multicast push', error.stack);
      throw error;
    }
  }

  /**
   * Send topic notification
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<string> {
    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title,
          body,
        },
        data,
        android: {
          priority: 'high',
        },
      };

      const response = await admin.messaging().send(message);

      this.logger.log(`Push sent to topic ${topic}: ${response}`);

      return response;
    } catch (error) {
      this.logger.error(`Failed to send push to topic ${topic}`, error.stack);
      throw error;
    }
  }

  /**
   * Subscribe device to topic
   */
  async subscribeToTopic(
    deviceTokens: string[],
    topic: string,
  ): Promise<void> {
    try {
      await admin.messaging().subscribeToTopic(deviceTokens, topic);
      this.logger.log(
        `${deviceTokens.length} devices subscribed to topic: ${topic}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to subscribe devices to topic ${topic}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Unsubscribe device from topic
   */
  async unsubscribeFromTopic(
    deviceTokens: string[],
    topic: string,
  ): Promise<void> {
    try {
      await admin.messaging().unsubscribeFromTopic(deviceTokens, topic);
      this.logger.log(
        `${deviceTokens.length} devices unsubscribed from topic: ${topic}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe devices from topic ${topic}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send booking notification
   */
  async sendBookingNotification(
    userId: string,
    deviceToken: string,
    bookingData: {
      bookingNumber: string;
      hospitalName: string;
      appointmentDate: string;
    },
  ): Promise<NotificationLog> {
    return this.sendTemplatePush(
      'booking_notification',
      userId,
      deviceToken,
      bookingData,
    );
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(
    userId: string,
    deviceToken: string,
    paymentData: {
      amount: number;
      paymentMethod: string;
    },
  ): Promise<NotificationLog> {
    return this.sendTemplatePush(
      'payment_notification',
      userId,
      deviceToken,
      paymentData,
    );
  }

  /**
   * Render template with variables
   */
  private renderTemplate(
    template: string,
    variables: Record<string, any>,
  ): string {
    let rendered = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    }

    return rendered;
  }

  /**
   * Update template statistics
   */
  private async updateTemplateStats(
    templateId: string,
    success: boolean,
  ): Promise<void> {
    const updateFields = success
      ? { $inc: { totalSent: 1, totalDelivered: 1 }, lastSentAt: new Date() }
      : { $inc: { totalSent: 1, totalFailed: 1 } };

    await this.templateModel.updateOne({ templateId }, updateFields);
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `PUSH-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
