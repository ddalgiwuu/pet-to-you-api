import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserEventDocument = UserEvent & Document;

export enum EventType {
  PAGE_VIEW = 'page_view',
  BUTTON_CLICK = 'button_click',
  BOOKING_CREATED = 'booking_created',
  BOOKING_CANCELLED = 'booking_cancelled',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',
  REVIEW_SUBMITTED = 'review_submitted',
  SEARCH_PERFORMED = 'search_performed',
  PROFILE_UPDATED = 'profile_updated',
  LOGIN = 'login',
  LOGOUT = 'logout',
  SIGNUP = 'signup',
}

@Schema({ 
  collection: 'user_events',
  timestamps: true,
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'hours'
  }
})
export class UserEvent {
  @Prop({ required: true, type: String, enum: Object.values(EventType) })
  eventType: EventType;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  sessionId: string;

  @Prop({ type: Object })
  eventProperties: Record<string, any>;

  @Prop({ type: Object })
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    platform?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
  };

  @Prop({ required: true, index: true, type: Date })
  timestamp: Date;

  @Prop({ type: Date, expires: 7776000 }) // 90 days TTL
  expiresAt: Date;
}

export const UserEventSchema = SchemaFactory.createForClass(UserEvent);

// Indexes for query optimization
UserEventSchema.index({ userId: 1, timestamp: -1 });
UserEventSchema.index({ eventType: 1, timestamp: -1 });
UserEventSchema.index({ sessionId: 1, timestamp: -1 });
UserEventSchema.index({ 'metadata.deviceType': 1, timestamp: -1 });
