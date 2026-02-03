import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import * as crypto from 'crypto';
import {
  NotificationTemplate,
  NotificationType,
} from '../entities/notification-template.entity';
import {
  NotificationLog,
  NotificationStatus,
} from '../schemas/notification-log.schema';

export interface SmsOptions {
  to: string;
  message: string;
  from?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(NotificationTemplate.name)
    private templateModel: Model<NotificationTemplate>,
    @InjectModel(NotificationLog.name)
    private logModel: Model<NotificationLog>,
  ) {}

  /**
   * Send SMS using template
   */
  async sendTemplateSms(
    templateId: string,
    userId: string,
    recipientPhone: string,
    variables: Record<string, any>,
    options?: {
      priority?: number;
      scheduledFor?: Date;
      metadata?: Record<string, any>;
    },
  ): Promise<NotificationLog> {
    try {
      // Find template
      const template = await this.templateModel.findOne({
        templateId,
        type: NotificationType.SMS,
        isActive: true,
      });

      if (!template) {
        throw new Error(`SMS template not found: ${templateId}`);
      }

      // Render template
      const message = this.renderTemplate(template.bodyKo, variables);

      // Validate phone number (Korean format)
      const normalizedPhone = this.normalizePhoneNumber(recipientPhone);
      if (!this.isValidKoreanPhoneNumber(normalizedPhone)) {
        throw new Error(`Invalid Korean phone number: ${recipientPhone}`);
      }

      // Create notification log
      const notificationLog = new this.logModel({
        notificationId: this.generateNotificationId(),
        templateId,
        type: NotificationType.SMS,
        userId,
        recipientPhone: this.encryptPhoneNumber(normalizedPhone),
        subject: template.subjectKo,
        body: message,
        variables,
        status: NotificationStatus.QUEUED,
        queuedAt: new Date(),
        priority: options?.priority || template.priority || 5,
        scheduledFor: options?.scheduledFor,
        metadata: options?.metadata,
      });

      await notificationLog.save();

      // Send SMS immediately (or queue if scheduled)
      if (!options?.scheduledFor || options.scheduledFor <= new Date()) {
        const provider =
          template.smsProvider ||
          this.configService.get<string>('SMS_PROVIDER', 'naver_cloud');

        if (provider === 'naver_cloud') {
          await this.sendNaverCloudSms({
            to: normalizedPhone,
            message,
            from:
              template.senderPhoneNumber ||
              this.configService.get<string>('SMS_FROM_NUMBER'),
          });
        } else if (provider === 'kakao_alimtalk') {
          if (!template.kakaoTemplateCode) {
            throw new Error('Kakao template code not configured');
          }
          await this.sendKakaoAlimtalk(
            normalizedPhone,
            template.kakaoTemplateCode,
            variables,
          );
        }

        // Update log
        notificationLog.status = NotificationStatus.SENT;
        notificationLog.sentAt = new Date();
        notificationLog.provider = provider;
        await notificationLog.save();

        // Update template stats
        await this.updateTemplateStats(templateId, true);
      }

      return notificationLog;
    } catch (error) {
      this.logger.error(
        `Failed to send template SMS: ${templateId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send SMS via Naver Cloud Platform
   */
  private async sendNaverCloudSms(options: SmsOptions): Promise<void> {
    try {
      const serviceId = this.configService.get<string>(
        'NAVER_CLOUD_SMS_SERVICE_ID',
      );
      const accessKey = this.configService.get<string>(
        'NAVER_CLOUD_ACCESS_KEY',
      );
      const secretKey = this.configService.get<string>(
        'NAVER_CLOUD_SECRET_KEY',
      );

      if (!secretKey) {
        throw new Error('NAVER_CLOUD_SECRET_KEY not configured');
      }

      const timestamp = Date.now().toString();
      const method = 'POST';
      const url = `/sms/v2/services/${serviceId}/messages`;
      const signature = this.makeNaverCloudSignature(
        method,
        url,
        timestamp,
        secretKey,
      );

      const response = await axios.post(
        `https://sens.apigw.ntruss.com${url}`,
        {
          type: 'SMS',
          from: options.from,
          content: options.message,
          messages: [
            {
              to: options.to,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'x-ncp-apigw-timestamp': timestamp,
            'x-ncp-iam-access-key': accessKey,
            'x-ncp-apigw-signature-v2': signature,
          },
        },
      );

      this.logger.log(
        `Naver Cloud SMS sent to ${options.to}: ${response.data.requestId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send Naver Cloud SMS to ${options.to}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send Kakao Alimtalk
   */
  private async sendKakaoAlimtalk(
    phoneNumber: string,
    templateCode: string,
    variables: Record<string, any>,
  ): Promise<void> {
    try {
      const kakaoApiKey = this.configService.get<string>('KAKAO_API_KEY');
      const senderKey = this.configService.get<string>('KAKAO_SENDER_KEY');

      const response = await axios.post(
        'https://alimtalk-api.bizmsg.kr/v2/sender/send',
        {
          senderKey,
          templateCode,
          to: phoneNumber,
          message: variables,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `KakaoAK ${kakaoApiKey}`,
          },
        },
      );

      this.logger.log(
        `Kakao Alimtalk sent to ${phoneNumber}: ${response.data.requestId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send Kakao Alimtalk to ${phoneNumber}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send booking reminder SMS
   */
  async sendBookingReminder(
    userId: string,
    phone: string,
    bookingData: {
      petName: string;
      hospitalName: string;
      appointmentDate: string;
      appointmentTime: string;
    },
  ): Promise<NotificationLog> {
    return this.sendTemplateSms('booking_reminder', userId, phone, bookingData);
  }

  /**
   * Send payment confirmation SMS
   */
  async sendPaymentConfirmation(
    userId: string,
    phone: string,
    paymentData: {
      amount: number;
      paymentMethod: string;
      approvalNumber?: string;
    },
  ): Promise<NotificationLog> {
    return this.sendTemplateSms(
      'payment_confirmation',
      userId,
      phone,
      paymentData,
    );
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCode(
    userId: string,
    phone: string,
    verificationCode: string,
  ): Promise<NotificationLog> {
    return this.sendTemplateSms('verification_code', userId, phone, {
      code: verificationCode,
      expiryMinutes: 5,
    });
  }

  /**
   * Normalize Korean phone number
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let normalized = phone.replace(/\D/g, '');

    // Add country code if not present
    if (normalized.startsWith('010')) {
      normalized = `82${normalized.substring(1)}`;
    } else if (!normalized.startsWith('82')) {
      normalized = `82${normalized}`;
    }

    return normalized;
  }

  /**
   * Validate Korean phone number
   */
  private isValidKoreanPhoneNumber(phone: string): boolean {
    // Korean phone format: 82 + 10|11|16|17|18|19 + 7-8 digits
    const koreanPhoneRegex = /^82(10|11|16|17|18|19)\d{7,8}$/;
    return koreanPhoneRegex.test(phone);
  }

  /**
   * Encrypt phone number for storage (PII protection)
   */
  private encryptPhoneNumber(phone: string): string {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') ?? '';
    const key = crypto.createHash('sha256').update(encryptionKey).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(phone, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt phone number
   */
  private decryptPhoneNumber(encryptedPhone: string): string {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') ?? '';
    const key = crypto.createHash('sha256').update(encryptionKey).digest();
    const parts = encryptedPhone.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Make Naver Cloud signature
   */
  private makeNaverCloudSignature(
    method: string,
    url: string,
    timestamp: string,
    secretKey: string,
  ): string {
    const message = `${method} ${url}\n${timestamp}\n`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(message)
      .digest('base64');
    return signature;
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
    return `SMS-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
