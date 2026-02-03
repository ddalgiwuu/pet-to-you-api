import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { PushService } from './push.service';
import {
  NotificationTemplate,
  NotificationType,
} from '../entities/notification-template.entity';
import {
  NotificationLog,
  NotificationStatus,
} from '../schemas/notification-log.schema';

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface SendNotificationOptions {
  templateId: string;
  userId: string;
  email?: string;
  phone?: string;
  deviceToken?: string;
  variables: Record<string, any>;
  preferences?: NotificationPreferences;
  priority?: number;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
    @InjectModel(NotificationTemplate.name)
    private templateModel: Model<NotificationTemplate>,
    @InjectModel(NotificationLog.name)
    private logModel: Model<NotificationLog>,
  ) {}

  /**
   * Send notification by user preference
   */
  async sendNotification(
    options: SendNotificationOptions,
  ): Promise<NotificationLog[]> {
    const logs: NotificationLog[] = [];

    try {
      // Default preferences (all enabled)
      const preferences: NotificationPreferences = options.preferences || {
        email: true,
        sms: true,
        push: true,
      };

      // Send email notification
      if (preferences.email && options.email) {
        try {
          const emailLog = await this.emailService.sendTemplateEmail(
            options.templateId,
            options.userId,
            options.email,
            options.variables,
            {
              priority: options.priority,
              scheduledFor: options.scheduledFor,
              metadata: options.metadata,
            },
          );
          logs.push(emailLog);
        } catch (error) {
          this.logger.error('Failed to send email notification', error.stack);
        }
      }

      // Send SMS notification
      if (preferences.sms && options.phone) {
        try {
          const smsLog = await this.smsService.sendTemplateSms(
            options.templateId,
            options.userId,
            options.phone,
            options.variables,
            {
              priority: options.priority,
              scheduledFor: options.scheduledFor,
              metadata: options.metadata,
            },
          );
          logs.push(smsLog);
        } catch (error) {
          this.logger.error('Failed to send SMS notification', error.stack);
        }
      }

      // Send push notification
      if (preferences.push && options.deviceToken) {
        try {
          const pushLog = await this.pushService.sendTemplatePush(
            options.templateId,
            options.userId,
            options.deviceToken,
            options.variables,
            {
              priority: options.priority,
              scheduledFor: options.scheduledFor,
              metadata: options.metadata,
            },
          );
          logs.push(pushLog);
        } catch (error) {
          this.logger.error('Failed to send push notification', error.stack);
        }
      }

      this.logger.log(
        `Sent ${logs.length} notifications for template: ${options.templateId}`,
      );

      return logs;
    } catch (error) {
      this.logger.error('Failed to send notification', error.stack);
      throw error;
    }
  }

  /**
   * Send batch notifications
   */
  async sendBatchNotifications(
    notifications: SendNotificationOptions[],
  ): Promise<NotificationLog[]> {
    const allLogs: NotificationLog[] = [];

    for (const notification of notifications) {
      try {
        const logs = await this.sendNotification(notification);
        allLogs.push(...logs);
      } catch (error) {
        this.logger.error(
          `Failed to send batch notification for user: ${notification.userId}`,
          error.stack,
        );
      }
    }

    return allLogs;
  }

  /**
   * Retry failed notifications with exponential backoff
   */
  async retryFailedNotifications(): Promise<void> {
    try {
      const failedLogs = await this.logModel.find({
        status: NotificationStatus.FAILED,
        retryCount: { $lt: 3 }, // Max 3 retries
        nextRetryAt: { $lte: new Date() },
      });

      for (const log of failedLogs) {
        try {
          // Calculate exponential backoff (1min, 5min, 15min)
          const backoffMinutes = Math.pow(5, log.retryCount);
          const nextRetry = new Date(
            Date.now() + backoffMinutes * 60 * 1000,
          );

          // Retry based on type
          if (log.type === NotificationType.EMAIL && log.recipientEmail) {
            await this.emailService.sendEmail({
              to: log.recipientEmail,
              subject: log.subject,
              body: log.body,
            });
          } else if (log.type === NotificationType.SMS && log.recipientPhone) {
            // Retry SMS (implementation depends on provider)
            this.logger.warn('SMS retry not implemented');
          } else if (
            log.type === NotificationType.PUSH &&
            log.recipientDeviceToken
          ) {
            await this.pushService.sendPush({
              deviceToken: log.recipientDeviceToken,
              title: log.subject,
              body: log.body,
            });
          }

          // Update log
          log.status = NotificationStatus.SENT;
          log.sentAt = new Date();
          log.retryCount += 1;
          log.retryAttempts.push(new Date());
          await log.save();

          this.logger.log(
            `Successfully retried notification: ${log.notificationId}`,
          );
        } catch (error) {
          // Update retry info
          const backoffMinutes = Math.pow(5, log.retryCount + 1);
          log.retryCount += 1;
          log.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
          log.retryAttempts.push(new Date());
          log.errorMessage = error.message;
          await log.save();

          this.logger.error(
            `Failed to retry notification: ${log.notificationId}`,
            error.stack,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to retry notifications', error.stack);
    }
  }

  /**
   * Track delivery status
   */
  async updateDeliveryStatus(
    notificationId: string,
    status: NotificationStatus,
    providerResponse?: any,
  ): Promise<void> {
    try {
      const updateFields: any = { status };

      if (status === NotificationStatus.DELIVERED) {
        updateFields.deliveredAt = new Date();
      } else if (status === NotificationStatus.FAILED) {
        updateFields.failedAt = new Date();
      } else if (status === NotificationStatus.BOUNCED) {
        updateFields.bouncedAt = new Date();
      }

      if (providerResponse) {
        updateFields.providerResponse = JSON.stringify(providerResponse);
      }

      await this.logModel.updateOne(
        { notificationId },
        { $set: updateFields },
      );
    } catch (error) {
      this.logger.error(
        `Failed to update delivery status for: ${notificationId}`,
        error.stack,
      );
    }
  }

  /**
   * Get notification logs for user
   */
  async getUserNotifications(
    userId: string,
    options?: {
      type?: NotificationType;
      status?: NotificationStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<NotificationLog[]> {
    const query: any = { userId };

    if (options?.type) {
      query.type = options.type;
    }

    if (options?.status) {
      query.status = options.status;
    }

    return this.logModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(options?.limit || 50)
      .skip(options?.offset || 0)
      .exec();
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(templateId?: string): Promise<any> {
    const matchStage = templateId ? { templateId } : {};

    const stats = await this.logModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    return stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});
  }

  /**
   * Check rate limiting
   */
  async checkRateLimit(
    userId: string,
    templateId: string,
  ): Promise<boolean> {
    try {
      const template = await this.templateModel.findOne({ templateId });

      if (!template) {
        return true; // No template, allow
      }

      const now = new Date();

      // Check hourly limit
      if (template.maxSendsPerHour) {
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const hourCount = await this.logModel.countDocuments({
          userId,
          templateId,
          createdAt: { $gte: hourAgo },
        });

        if (hourCount >= template.maxSendsPerHour) {
          this.logger.warn(
            `Hourly rate limit exceeded for user ${userId}, template ${templateId}`,
          );
          return false;
        }
      }

      // Check daily limit
      if (template.maxSendsPerDay) {
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const dayCount = await this.logModel.countDocuments({
          userId,
          templateId,
          createdAt: { $gte: dayAgo },
        });

        if (dayCount >= template.maxSendsPerDay) {
          this.logger.warn(
            `Daily rate limit exceeded for user ${userId}, template ${templateId}`,
          );
          return false;
        }
      }

      // Check cooldown
      if (template.cooldownMinutes > 0) {
        const cooldownAgo = new Date(
          now.getTime() - template.cooldownMinutes * 60 * 1000,
        );
        const recentNotification = await this.logModel.findOne({
          userId,
          templateId,
          createdAt: { $gte: cooldownAgo },
        });

        if (recentNotification) {
          this.logger.warn(
            `Cooldown period active for user ${userId}, template ${templateId}`,
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to check rate limit', error.stack);
      return true; // Fail open to avoid blocking legitimate notifications
    }
  }

  /**
   * Clean up old notification logs (30+ days)
   */
  async cleanupOldLogs(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await this.logModel.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        status: { $in: [NotificationStatus.SENT, NotificationStatus.DELIVERED] },
      });

      this.logger.log(`Cleaned up ${result.deletedCount} old notification logs`);

      return result.deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup old logs', error.stack);
      return 0;
    }
  }
}
