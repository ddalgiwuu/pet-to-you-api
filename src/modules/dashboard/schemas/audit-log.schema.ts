import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * 📝 Audit Log Schema (MongoDB)
 *
 * Comprehensive audit trail for compliance and security.
 *
 * Features:
 * - All user actions tracked
 * - Data change history
 * - Security event logging
 * - Compliance reporting support
 *
 * Compliance:
 * - GDPR compliant
 * - SOC2 audit trail
 * - HIPAA logging requirements
 * - PCI DSS event tracking
 *
 * Performance:
 * - Indexed by resourceId, userId, action, timestamp
 * - TTL index for automatic retention management
 * - Supports fast compliance queries
 */
@Schema({
  collection: 'audit_logs',
  timestamps: true,
})
export class AuditLog extends Document {
  @Prop({ required: true, index: true })
  resourceType: 'hospital' | 'business' | 'system'; // Scope

  @Prop({ index: true })
  resourceId?: string; // Hospital/Business UUID (optional for system events)

  @Prop({ required: true, index: true })
  userId: string; // Who performed the action

  @Prop({ required: true })
  userName: string; // Cached for performance

  @Prop({ required: true })
  userRole: string; // Role at time of action

  @Prop({ required: true, index: true })
  action: string; // Action performed (e.g., 'pet.create', 'booking.update', 'user.login')

  @Prop({ required: true, enum: ['read', 'create', 'update', 'delete', 'auth', 'system'], index: true })
  actionType: 'read' | 'create' | 'update' | 'delete' | 'auth' | 'system';

  @Prop({ required: true })
  entityType: string; // Entity affected (e.g., 'Pet', 'Booking', 'User')

  @Prop()
  entityId?: string; // UUID of affected entity

  // Change Tracking
  @Prop({ type: Object })
  changes?: {
    before?: any; // State before change (for updates/deletes)
    after?: any; // State after change (for creates/updates)
    fields?: string[]; // Changed field names
  };

  // Request Context
  @Prop({ required: true })
  ipAddress: string;

  @Prop()
  userAgent: string;

  @Prop()
  requestId?: string; // Correlation ID for tracing

  @Prop()
  sessionId?: string; // User session ID

  // Security Context
  @Prop({ enum: ['success', 'failure', 'error'], default: 'success', index: true })
  status: 'success' | 'failure' | 'error';

  @Prop()
  errorMessage?: string; // If status is 'failure' or 'error'

  @Prop({ default: 'info', enum: ['info', 'warning', 'error', 'critical'], index: true })
  severity: 'info' | 'warning' | 'error' | 'critical';

  @Prop({ type: [String], default: [] })
  tags: string[]; // For categorization (e.g., ['security', 'pii', 'financial'])

  // Compliance & Retention
  @Prop({ default: false })
  isPiiRelated: boolean; // Contains PII data

  @Prop({ default: false })
  isSecurityEvent: boolean; // Security-related event

  @Prop({ default: false })
  isFinancialEvent: boolean; // Financial transaction

  @Prop({ required: true, index: true })
  timestamp: Date; // When action occurred

  @Prop()
  createdAt: Date;

  @Prop({ type: Date, expires: 31536000 }) // TTL: 365 days (can be customized per regulation)
  expiresAt: Date;

  // Additional Context
  @Prop({ type: Object })
  metadata?: {
    apiVersion?: string;
    endpoint?: string;
    method?: string;
    duration?: number; // Request duration in ms
    location?: string; // Geographic location
    device?: string; // Device type
  };
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Indexes
AuditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ actionType: 1, severity: 1, timestamp: -1 });
AuditLogSchema.index({ isSecurityEvent: 1, timestamp: -1 });
AuditLogSchema.index({ isPiiRelated: 1, timestamp: -1 });
AuditLogSchema.index({ tags: 1, timestamp: -1 });
AuditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
