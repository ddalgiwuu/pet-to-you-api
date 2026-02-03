import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Core Modules
import { DatabaseModule } from './core/database/database.module';
import { AuthModule } from './core/auth/auth.module';
import { EncryptionModule } from './core/encryption/encryption.module';
import { AuditModule } from './core/audit/audit.module';
import { CacheModule } from './core/cache/cache.module';
import { LoggerModule } from './core/logger/logger.module';
import { SecurityModule } from './core/security/security.module';

// Feature Modules
import { UsersModule } from './modules/users/users.module';
import { PetsModule } from './modules/pets/pets.module';
import { HospitalsModule } from './modules/hospitals/hospitals.module';
import { BookingsModule } from './modules/booking/bookings.module';
import { DaycareModule } from './modules/daycare/daycare.module';
import { AdoptionModule } from './modules/adoption/adoption.module';
import { InsuranceModule } from './modules/insurance/insurance.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { CommunityModule } from './modules/community/community.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BffModule } from './modules/bff/bff.module';

@Module({
  imports: [
    // 🔧 Configuration Module (load .env)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // 🔒 Rate Limiting (DDoS protection)
    ThrottlerModule.forRoot([
      {
        ttl: 900000, // 15 minutes
        limit: 100, // 100 requests per IP
      },
    ]),

    // 🎯 Event System (for auto-claim automation)
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),

    // Core Infrastructure
    DatabaseModule,
    AuthModule,
    EncryptionModule,
    AuditModule,
    CacheModule,
    LoggerModule,
    SecurityModule,

    // Feature Modules
    UsersModule,
    PetsModule,
    HospitalsModule,
    BookingsModule,
    DaycareModule,
    AdoptionModule,
    InsuranceModule,
    PaymentsModule,
    MedicalRecordsModule,
    CommunityModule,
    NotificationsModule,
    ComplianceModule,
    AnalyticsModule,
    BffModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
