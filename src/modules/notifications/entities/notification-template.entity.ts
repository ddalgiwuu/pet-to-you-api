import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
}

export enum TemplateCategory {
  BOOKING = 'booking',
  PAYMENT = 'payment',
  ADOPTION = 'adoption',
  MEDICAL = 'medical',
  DAYCARE = 'daycare',
  INSURANCE = 'insurance',
  AUTHENTICATION = 'authentication',
  GENERAL = 'general',
}

@Schema({ collection: 'notification_templates', timestamps: true })
export class NotificationTemplate extends Document {
  // ============================================================
  // Template Identification
  // ============================================================

  // Note: unique: true creates index automatically - no need for duplicate index: true
  @Prop({ required: true, unique: true })
  templateId: string; // booking_confirmation, payment_receipt, etc.

  @Prop({ required: true })
  name: string; // Friendly name

  @Prop({
    required: true,
    enum: NotificationType,
    index: true,
  })
  type: NotificationType;

  @Prop({
    required: true,
    enum: TemplateCategory,
    index: true,
  })
  category: TemplateCategory;

  // ============================================================
  // Template Content
  // ============================================================

  @Prop({ required: true })
  subject: string; // For email, title for push

  @Prop({ required: true })
  body: string; // Template with {{variable}} placeholders

  @Prop({ type: String, required: false })
  htmlBody?: string; // HTML version for email

  // ============================================================
  // Korean Localization
  // ============================================================

  @Prop({ required: true })
  subjectKo: string; // 한국어 제목

  @Prop({ required: true })
  bodyKo: string; // 한국어 본문

  @Prop({ type: String, required: false })
  htmlBodyKo?: string; // 한국어 HTML 버전

  // ============================================================
  // Variables & Validation
  // ============================================================

  @Prop({ type: [String], default: [] })
  requiredVariables: string[]; // Variables that must be provided

  @Prop({ type: Object, default: {} })
  defaultVariables: Record<string, string>; // Default values

  @Prop({ type: Object, default: {} })
  sampleVariables: Record<string, string>; // Example values for testing

  // ============================================================
  // Configuration
  // ============================================================

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Number, default: 0 })
  priority: number; // Higher = more important

  @Prop({ type: [String], default: [] })
  tags: string[]; // For categorization and search

  // ============================================================
  // Rate Limiting & Throttling
  // ============================================================

  @Prop({ type: Number, required: false })
  maxSendsPerHour?: number; // Max sends per hour per user

  @Prop({ type: Number, required: false })
  maxSendsPerDay?: number; // Max sends per day per user

  @Prop({ type: Number, default: 0 })
  cooldownMinutes: number; // Minimum time between same template sends

  // ============================================================
  // SMS-Specific Configuration
  // ============================================================

  @Prop({ type: String, required: false })
  smsProvider?: string; // naver_cloud, kakao_alimtalk

  @Prop({ type: String, required: false })
  senderPhoneNumber?: string; // Sender phone number for SMS

  @Prop({ type: String, required: false })
  kakaoTemplateCode?: string; // 카카오 알림톡 템플릿 코드

  // ============================================================
  // Email-Specific Configuration
  // ============================================================

  @Prop({ type: String, required: false })
  fromEmail?: string; // Sender email

  @Prop({ type: String, required: false })
  fromName?: string; // Sender name

  @Prop({ type: [String], default: [] })
  ccEmails?: string[]; // CC recipients

  @Prop({ type: [String], default: [] })
  bccEmails?: string[]; // BCC recipients

  // ============================================================
  // Push Notification Configuration
  // ============================================================

  @Prop({ type: String, required: false })
  pushIcon?: string; // Icon URL for push

  @Prop({ type: String, required: false })
  pushSound?: string; // Sound for push notification

  @Prop({ type: String, required: false })
  pushClickAction?: string; // Deep link or action

  @Prop({ type: Object, default: {} })
  pushData?: Record<string, any>; // Additional data payload

  // ============================================================
  // Metadata & Tracking
  // ============================================================

  @Prop({ type: Number, default: 0 })
  totalSent: number; // Total times this template was used

  @Prop({ type: Number, default: 0 })
  totalDelivered: number; // Total successful deliveries

  @Prop({ type: Number, default: 0 })
  totalFailed: number; // Total failures

  @Prop({ type: Date, required: false })
  lastSentAt?: Date; // Last time this template was used

  @Prop({ type: String, required: false })
  description?: string; // Template description

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>; // Additional metadata

  // ============================================================
  // Audit
  // ============================================================

  @Prop({ type: String, required: false })
  createdBy?: string; // User ID who created

  @Prop({ type: String, required: false })
  updatedBy?: string; // User ID who updated

  // Timestamps added by @Schema({ timestamps: true })
  createdAt: Date;
  updatedAt: Date;
}

export const NotificationTemplateSchema = SchemaFactory.createForClass(
  NotificationTemplate,
);

// ============================================================
// Indexes for Performance
// ============================================================
// Note: templateId unique index already created by @Prop({ unique: true }) - no duplicate needed
NotificationTemplateSchema.index({ type: 1, category: 1 });
NotificationTemplateSchema.index({ isActive: 1 });
NotificationTemplateSchema.index({ tags: 1 });
