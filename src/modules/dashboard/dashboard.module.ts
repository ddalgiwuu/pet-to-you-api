import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HospitalDashboardController } from './controllers/hospital-dashboard.controller';
import { BusinessDashboardController } from './controllers/business-dashboard.controller';
import { HospitalDashboardService } from './services/hospital-dashboard.service';
import { BusinessDashboardService } from './services/business-dashboard.service';
import { Booking } from '../booking/entities/booking.entity';
import { Pet } from '../pets/entities/pet.entity';
import { Hospital } from '../hospitals/entities/hospital.entity';
import { User } from '../users/entities/user.entity';

/**
 * 📊 Dashboard Module
 *
 * Provides comprehensive dashboard functionality for hospitals and businesses.
 *
 * Features:
 * - Hospital dashboard with 5 endpoints ✅
 * - Business dashboard with 5 endpoints ✅
 * - RBAC with organization isolation
 * - Redis caching for statistics
 * - TypeORM queries with optimization
 *
 * Controllers:
 * - HospitalDashboardController: Hospital-specific endpoints (5)
 * - BusinessDashboardController: Business-specific endpoints (5)
 *
 * Services:
 * - HospitalDashboardService: Hospital dashboard business logic
 * - BusinessDashboardService: Business dashboard business logic
 *
 * Security:
 * - JWT Authentication (JwtAuthGuard)
 * - Role-Based Access Control (RolesGuard)
 * - Organization Isolation (OrganizationGuard)
 * - Permission-Based Access (PermissionsGuard)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      Pet,
      Hospital,
      User,
    ]),
  ],
  controllers: [
    HospitalDashboardController,
    BusinessDashboardController,
  ],
  providers: [
    HospitalDashboardService,
    BusinessDashboardService,
  ],
  exports: [
    HospitalDashboardService,
    BusinessDashboardService,
  ],
})
export class DashboardModule {}
