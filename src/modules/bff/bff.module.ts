import { Module } from '@nestjs/common';
import { CacheModule } from '../../core/cache/cache.module';
import { AggregationService } from './services/aggregation.service';
import { ConsumerController } from './controllers/consumer.controller';
import { HospitalController } from './controllers/hospital.controller';
import { AdminController } from './controllers/admin.controller';

// Import other modules for service injection
// import { BookingsModule } from '../booking/bookings.module';
// import { HospitalsModule } from '../hospitals/hospitals.module';
// import { PetsModule } from '../pets/pets.module';
// import { AdoptionModule } from '../adoption/adoption.module';
// import { InsuranceModule } from '../insurance/insurance.module';
// import { PaymentsModule } from '../payments/payments.module';
// import { UsersModule } from '../users/users.module';
// import { MedicalRecordsModule } from '../medical-records/medical-records.module';

/**
 * BFF (Backend for Frontend) Module
 *
 * Provides optimized aggregation endpoints for:
 * - Consumer mobile app
 * - Hospital dashboard
 * - Admin dashboard
 *
 * Key optimizations:
 * - Parallel query execution
 * - Response caching (5-15 minute TTL)
 * - Data denormalization
 * - Reduced API calls from frontend (5-10 calls → 1 call)
 */
@Module({
  imports: [
    CacheModule,
    // TODO: Import required modules as they're implemented
    // BookingsModule,
    // HospitalsModule,
    // PetsModule,
    // AdoptionModule,
    // InsuranceModule,
    // PaymentsModule,
    // UsersModule,
    // MedicalRecordsModule,
  ],
  controllers: [
    ConsumerController,
    HospitalController,
    AdminController,
  ],
  providers: [AggregationService],
  exports: [AggregationService],
})
export class BffModule {}
