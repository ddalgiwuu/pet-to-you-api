import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { HospitalController } from './controllers/hospital.controller';
import { TestController } from './controllers/test.controller';
import { HospitalDashboardController } from './controllers/hospital-dashboard.controller';
import { HospitalService } from './services/hospital.service';
import { HospitalDashboardService } from './services/hospital-dashboard.service';
import { Hospital } from './entities/hospital.entity';
import { HospitalUser } from './entities/hospital-user.entity';
import { HospitalSearch, HospitalSearchSchema } from './schemas/hospital.schema';
import { Booking } from '../booking/entities/booking.entity';
import { HealthNote } from '../medical-records/entities/health-note.entity';
import { InsuranceClaim } from '../insurance/entities/insurance-claim.entity';
import { HospitalPayment } from '../payments/entities/hospital-payment.entity';
import { AuditModule } from '../../core/audit/audit.module';
import { EncryptionModule } from '../../core/encryption/encryption.module';
import { SecurityModule } from '../../core/security/security.module';
import { HospitalSeeder } from '../../database/seeds/hospital-seeder';

@Module({
  imports: [
    // PostgreSQL
    TypeOrmModule.forFeature([
      Hospital,
      HospitalUser,
      Booking,
      HealthNote,
      InsuranceClaim,
      HospitalPayment,
    ]),

    // MongoDB
    MongooseModule.forFeature([
      {
        name: HospitalSearch.name,
        schema: HospitalSearchSchema,
      },
    ]),

    // Core Modules
    AuditModule,
    EncryptionModule,
    SecurityModule,
  ],
  controllers: [
    HospitalController,
    TestController,
    HospitalDashboardController,
  ],
  providers: [
    HospitalService,
    HospitalSeeder,
    HospitalDashboardService,
  ],
  exports: [
    HospitalService,
    HospitalSeeder,
    HospitalDashboardService,
  ],
})
export class HospitalsModule {}
