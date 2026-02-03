import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';

// Schemas
import { UserEvent, UserEventSchema } from './schemas/user-event.schema';
import { HospitalMetrics, HospitalMetricsSchema } from './schemas/hospital-metrics.schema';
import { PlatformMetrics, PlatformMetricsSchema } from './schemas/platform-metrics.schema';

// Services
import { AnalyticsService } from './services/analytics.service';
import { MetricsAggregatorService } from './services/metrics-aggregator.service';

// Controllers
import { AnalyticsController } from './controllers/analytics.controller';

@Module({
  imports: [
    // Schedule module for cron jobs
    ScheduleModule.forRoot(),

    // Cache module for dashboard data (15-minute TTL)
    CacheModule.register({
      ttl: 900, // 15 minutes in seconds
      max: 100, // Maximum number of items in cache
    }),

    // MongoDB schemas
    MongooseModule.forFeature([
      { name: UserEvent.name, schema: UserEventSchema },
      { name: HospitalMetrics.name, schema: HospitalMetricsSchema },
      { name: PlatformMetrics.name, schema: PlatformMetricsSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    MetricsAggregatorService,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
