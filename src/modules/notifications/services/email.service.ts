import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  NotificationTemplate,
  NotificationType,
} from '../entities/notification-template.entity';
import {
  NotificationLog,
  NotificationStatus,
} from '../schemas/notification-log.schema';

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
  }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(NotificationTemplate.name)
    private templateModel: Model<NotificationTemplate>,
    @InjectModel(NotificationLog.name)
    private logModel: Model<NotificationLog>,
  ) {
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter (NodeMailer with SMTP or SendGrid)
   */
  private initializeTransporter() {
    const emailProvider = this.configService.get<string>(
      'EMAIL_PROVIDER',
      'smtp',
    );

    if (emailProvider === 'sendgrid') {
      // SendGrid configuration
      const sendGridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: sendGridApiKey,
        },
      });
    } else {
      // SMTP configuration (Gmail, Naver, etc.)
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST'),
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: this.configService.get<boolean>('SMTP_SECURE', false),
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    }
  }

  /**
   * Send email using template
   */
  async sendTemplateEmail(
    templateId: string,
    userId: string,
    recipientEmail: string,
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
        type: NotificationType.EMAIL,
        isActive: true,
      });

      if (!template) {
        throw new Error(`Email template not found: ${templateId}`);
      }

      // Render template with variables
      const subject = this.renderTemplate(template.subjectKo, variables);
      const body = this.renderTemplate(template.bodyKo, variables);
      const htmlBody = template.htmlBodyKo
        ? this.renderTemplate(template.htmlBodyKo, variables)
        : undefined;

      // Create notification log
      const notificationLog = new this.logModel({
        notificationId: this.generateNotificationId(),
        templateId,
        type: NotificationType.EMAIL,
        userId,
        recipientEmail,
        subject,
        body,
        variables,
        status: NotificationStatus.QUEUED,
        queuedAt: new Date(),
        priority: options?.priority || template.priority || 5,
        scheduledFor: options?.scheduledFor,
        metadata: options?.metadata,
      });

      await notificationLog.save();

      // Send email immediately (or queue if scheduledFor is set)
      if (!options?.scheduledFor || options.scheduledFor <= new Date()) {
        await this.sendEmail({
          to: recipientEmail,
          subject,
          body,
          htmlBody,
          from:
            template.fromEmail ||
            this.configService.get<string>('EMAIL_FROM'),
          cc: template.ccEmails,
          bcc: template.bccEmails,
        });

        // Update log
        notificationLog.status = NotificationStatus.SENT;
        notificationLog.sentAt = new Date();
        await notificationLog.save();

        // Update template stats
        await this.updateTemplateStats(templateId, true);
      }

      return notificationLog;
    } catch (error) {
      this.logger.error(
        `Failed to send template email: ${templateId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send plain email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from:
          options.from || this.configService.get<string>('EMAIL_FROM_ADDRESS'),
        to: options.to,
        subject: options.subject,
        text: options.body,
        html: options.htmlBody,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);

      this.logger.log(
        `Email sent successfully to ${options.to}: ${result.messageId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error.stack);
      throw error;
    }
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(
    userId: string,
    email: string,
    bookingData: {
      bookingNumber: string;
      hospitalName: string;
      serviceName: string;
      appointmentDate: string;
      petName: string;
      amount: number;
    },
  ): Promise<NotificationLog> {
    return this.sendTemplateEmail(
      'booking_confirmation',
      userId,
      email,
      bookingData,
    );
  }

  /**
   * Send payment receipt email
   */
  async sendPaymentReceipt(
    userId: string,
    email: string,
    paymentData: {
      paymentNumber: string;
      amount: number;
      paymentMethod: string;
      transactionDate: string;
      receiptUrl?: string;
    },
  ): Promise<NotificationLog> {
    return this.sendTemplateEmail(
      'payment_receipt',
      userId,
      email,
      paymentData,
    );
  }

  /**
   * Send health reminder email
   */
  async sendHealthReminder(
    userId: string,
    email: string,
    reminderData: {
      petName: string;
      reminderType: string;
      dueDate: string;
      hospitalName?: string;
    },
  ): Promise<NotificationLog> {
    return this.sendTemplateEmail(
      'health_reminder',
      userId,
      email,
      reminderData,
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

    // Replace all {{variable}} placeholders
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
    return `EMAIL-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Verify email configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email transporter connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Email transporter verification failed', error.stack);
      return false;
    }
  }
}
