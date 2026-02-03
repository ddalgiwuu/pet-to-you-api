import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NotificationType } from '../entities/notification-template.entity';

export enum NotificationStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  OPENED = 'opened',
  CLICKED = 'clicked',
}

@Schema({ collection: 'notification_logs', timestamps: true })
export class NotificationLog extends Document {
  // ============================================================
  // Notification Identification
  // ============================================================

  @Prop({ required: true, index: true })
  notificationId: string; // UUID for tracking

  @Prop({ required: true, index: true })
  templateId: string; // Reference to template

  @Prop({
    required: true,
    enum: NotificationType,
    index: true,
  })
  type: NotificationType;

  // ============================================================
  // Recipient Information
  // ============================================================

  @Prop({ required: true, index: true })
  userId: string; // User ID

  @Prop({ type: String, required: false })
  recipientEmail?: string; // Email address

  @Prop({ type: String, required: false })
  recipientPhone?: string; // Phone number (encrypted)

  @Prop({ type: String, required: false })
  recipientDeviceToken?: string; // FCM device token

  // ============================================================
  // Content Snapshot
  // ============================================================

  @Prop({ required: true })
  subject: string; // Rendered subject

  @Prop({ required: true })
  body: string; // Rendered body

  @Prop({ type: Object, default: {} })
  variables: Record<string, any>; // Variables used in rendering

  // ============================================================
  // Delivery Status
  // ============================================================

  @Prop({
    required: true,
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
    index: true,
  })
  status: NotificationStatus;

  @Prop({ type: Date, required: false })
  queuedAt?: Date; // When queued for sending

  @Prop({ type: Date, required: false })
  sentAt?: Date; // When actually sent

  @Prop({ type: Date, required: false })
  deliveredAt?: Date; // When delivered (from provider)

  @Prop({ type: Date, required: false })
  openedAt?: Date; // When opened (email)

  @Prop({ type: Date, required: false })
  clickedAt?: Date; // When clicked (email/push)

  @Prop({ type: Date, required: false })
  failedAt?: Date; // When failed

  @Prop({ type: Date, required: false })
  bouncedAt?: Date; // When bounced (email)

  // ============================================================
  // Provider Information
  // ============================================================

  @Prop({ type: String, required: false })
  provider?: string; // sendgrid, naver_cloud, fcm, etc.

  @Prop({ type: String, required: false, index: true })
  providerMessageId?: string; // Provider's message ID for tracking

  @Prop({ type: String, required: false })
  providerResponse?: string; // Provider's response (serialized JSON)

  // ============================================================
  // Error Handling & Retry
  // ============================================================

  @Prop({ type: String, required: false })
  errorCode?: string; // Error code

  @Prop({ type: String, required: false })
  errorMessage?: string; // Error message

  @Prop({ type: Object, required: false })
  errorDetails?: Record<string, any>; // Detailed error info

  @Prop({ type: Number, default: 0 })
  retryCount: number; // Number of retry attempts

  @Prop({ type: Number, default: 3 })
  maxRetries: number; // Maximum retry attempts

  @Prop({ type: Date, required: false })
  nextRetryAt?: Date; // Scheduled time for next retry

  @Prop({ type: [Date], default: [] })
  retryAttempts: Date[]; // Timestamps of retry attempts

  // ============================================================
  // Priority & Scheduling
  // ============================================================

  @Prop({ type: Number, default: 5 })
  priority: number; // 1 (highest) to 10 (lowest)

  @Prop({ type: Date, required: false })
  scheduledFor?: Date; // Scheduled send time

  @Prop({ type: Date, required: false })
  expiresAt?: Date; // Expiration time (don't send after this)

  // ============================================================
  // Context & Metadata
  // ============================================================

  @Prop({ type: String, required: false })
  resourceType?: string; // booking, payment, adoption, etc.

  @Prop({ type: String, required: false })
  resourceId?: string; // ID of related resource

  @Prop({ type: String, required: false })
  eventType?: string; // Event that triggered notification

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>; // Additional metadata

  // ============================================================
  // Audit & Tracking
  // ============================================================

  @Prop({ type: String, required: false })
  ipAddress?: string; // IP address (for audit)

  @Prop({ type: String, required: false })
  userAgent?: string; // User agent (for tracking)

  @Prop({ type: String, required: false })
  triggeredBy?: string; // User or system that triggered

  // ============================================================
  // Cost Tracking (for billing)
  // ============================================================

  @Prop({ type: Number, default: 0 })
  cost: number; // Cost in KRW (원)

  @Prop({ type: String, required: false })
  billingReference?: string; // Billing reference

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export const NotificationLogSchema =
  SchemaFactory.createForClass(NotificationLog);

// ============================================================
// Indexes for Performance
// ============================================================
NotificationLogSchema.index({ notificationId: 1 }, { unique: true });
NotificationLogSchema.index({ userId: 1, createdAt: -1 });
NotificationLogSchema.index({ templateId: 1, status: 1 });
NotificationLogSchema.index({ type: 1, status: 1, createdAt: -1 });
NotificationLogSchema.index({ status: 1, nextRetryAt: 1 });
NotificationLogSchema.index({ providerMessageId: 1 });
NotificationLogSchema.index({ resourceType: 1, resourceId: 1 });
NotificationLogSchema.index({ scheduledFor: 1, status: 1 });

// ============================================================
// TTL Index (Auto-delete after 30 days)
// ============================================================
NotificationLogSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
    partialFilterExpression: {
      status: { $in: [NotificationStatus.SENT, NotificationStatus.DELIVERED] },
    },
  },
);
