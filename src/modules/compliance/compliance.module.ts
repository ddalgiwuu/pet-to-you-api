import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

// Entities
import { SecurityIncident, DataRetentionLog } from './entities';
import { AuditLog } from '../../core/audit/entities/audit-log.entity';
import { User } from '../users/entities/user.entity';
import { Pet } from '../pets/entities/pet.entity';
import { Booking } from '../booking/entities/booking.entity';
import { Payment } from '../payments/entities/payment.entity';
import { HealthNote } from '../medical-records/entities/health-note.entity';
import { VaccinationRecord } from '../medical-records/entities/vaccination-record.entity';
import { Review } from '../community/entities/review.entity';

// Services
import { DataExportService } from './services/data-export.service';
import { BreachNotificationService } from './services/breach-notification.service';
import { AuditReportService } from './services/audit-report.service';
import { DataRetentionService } from './services/data-retention.service';

// Controllers
import { ComplianceController } from './controllers/compliance.controller';

// Core Services
import { EncryptionService } from '../../core/encryption/encryption.service';
import { KmsService } from '../../core/encryption/kms.service';
import { AuditService } from '../../core/audit/audit.service';

/**
 * 🛡️ Compliance Module
 *
 * PIPA (개인정보보호법) Compliance Features:
 *
 * 1. Data Export Service (Article 35):
 *    - User data portability
 *    - Export all personal data (JSON/CSV)
 *    - Decrypt medical records
 *    - Generate downloadable archive
 *
 * 2. Breach Notification Service (Article 34):
 *    - 72-hour notification requirement
 *    - Notify authorities (MOHW, PIPC, KISA)
 *    - Notify affected users (email + SMS)
 *    - Incident documentation
 *
 * 3. Audit Report Service (Article 30):
 *    - Compliance audit reports
 *    - Anomaly detection
 *    - Access pattern analysis
 *    - Export audit logs
 *
 * 4. Data Retention Service:
 *    - 10-year medical record retention (의료법)
 *    - 5-year financial record retention (보험업법)
 *    - 3-year general data retention (PIPA)
 *    - Automated archival and deletion
 *    - Scheduled cron jobs (daily at 2am)
 *
 * Dependencies:
 * - EncryptionService: Decrypt medical records for export
 * - AuditService: Comprehensive audit logging
 * - ScheduleModule: Automated retention execution
 */
@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(), // Enable cron jobs for data retention
    TypeOrmModule.forFeature([
      // Compliance entities
      SecurityIncident,
      DataRetentionLog,
      AuditLog,

      // Referenced entities (inject repositories)
      User,
      Pet,
      Booking,
      Payment,
      HealthNote,
      VaccinationRecord,
      Review,
    ]),
  ],
  controllers: [ComplianceController],
  providers: [
    // Compliance services
    DataExportService,
    BreachNotificationService,
    AuditReportService,
    DataRetentionService,

    // Core services
    EncryptionService,
    KmsService,
    AuditService,
  ],
  exports: [
    DataExportService,
    BreachNotificationService,
    AuditReportService,
    DataRetentionService,
  ],
})
export class ComplianceModule {}
