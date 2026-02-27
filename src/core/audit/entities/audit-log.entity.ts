import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum AuditAction {
  // Medical Data Access
  VIEW_MEDICAL_RECORD = 'view_medical_record',
  CREATE_MEDICAL_RECORD = 'create_medical_record',
  UPDATE_MEDICAL_RECORD = 'update_medical_record',
  DELETE_MEDICAL_RECORD = 'delete_medical_record',
  READ_MEDICAL_RECORD = 'read_medical_record',

  // Insurance Claims
  VIEW_INSURANCE_CLAIM = 'view_insurance_claim',
  CREATE_INSURANCE_CLAIM = 'create_insurance_claim',
  UPDATE_INSURANCE_CLAIM = 'update_insurance_claim',
  INSURANCE_SUBSCRIBED = 'insurance_subscribed',
  CLAIM_SUBMITTED = 'claim_submitted',
  CLAIM_STATUS_UPDATED = 'claim_status_updated',
  READ_AUTO_CLAIM_SUGGESTIONS = 'read_auto_claim_suggestions',
  READ_AUTO_CLAIM_SUGGESTION = 'read_auto_claim_suggestion',

  // Payment & Settlement
  CREATE_HOSPITAL_PAYMENT = 'create_hospital_payment',
  READ_HOSPITAL_PAYMENT = 'read_hospital_payment',
  DECRYPT_BANK_INFO = 'decrypt_bank_info',

  // User Management
  USER_CREATED = 'user_created',
  CREATE_USER = 'create_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',
  VIEW_USER = 'view_user',

  // Generic CRUD Actions
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',

  // Authentication
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGED = 'password_changed',
  TOKEN_REFRESHED = 'token_refreshed',

  // Data Export (GDPR/PIPA compliance)
  EXPORT_PERSONAL_DATA = 'export_personal_data',
  DELETE_PERSONAL_DATA = 'delete_personal_data',
  DATA_EXPORT = 'data_export',
  DATA_EXPORT_FAILED = 'data_export_failed',

  // Admin Actions
  ADMIN_ACCESS = 'admin_access',
  PRIVILEGE_ESCALATION = 'privilege_escalation',

  // Compliance & Reports
  AUDIT_REPORT_GENERATED = 'audit_report_generated',
  ANOMALY_DETECTION = 'anomaly_detection',
  DATA_RETENTION_EXECUTED = 'data_retention_executed',

  // Security Events
  FAILED_AUTHORIZATION = 'failed_authorization',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SECURITY_INCIDENT = 'security_incident',
  BREACH_NOTIFICATION_SENT = 'breach_notification_sent',
}

@Entity('audit_logs')
@Index(['userId', 'timestamp'])
@Index(['resource', 'resourceId', 'timestamp'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  resource: string; // e.g., 'health_note', 'insurance_claim', 'user'

  @Column({ type: 'varchar', length: 255, nullable: true })
  resourceId?: string; // e.g., UUID of the health note

  @Column({ type: 'varchar', length: 500 })
  purpose: string; // Required for 의료법: Why was this data accessed?

  @Column({ type: 'varchar', length: 200 })
  legalBasis: string; // Required for PIPA: Legal basis for processing

  @Column({ type: 'varchar', length: 45 })
  ipAddress: string; // IPv4 or IPv6

  @Column({ type: 'varchar', length: 500 })
  userAgent: string; // Browser/device info

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // Additional context

  @CreateDateColumn()
  @Index()
  timestamp: Date;

  @Column({ type: 'varchar', length: 64, nullable: true })
  previousHash?: string; // Hash of previous log entry (tamper-proof chain)

  @Column({ type: 'varchar', length: 64 })
  @Index()
  hash: string; // SHA-256 hash of this entry (tamper detection)
}
