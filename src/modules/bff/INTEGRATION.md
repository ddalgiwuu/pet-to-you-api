# BFF Module Integration Guide

## Overview

This guide explains how to integrate existing services with the BFF module to enable the aggregation endpoints.

## Integration Steps

### 1. Import Required Modules

Update `/src/modules/bff/bff.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CacheModule } from '../../core/cache/cache.module';
import { BookingsModule } from '../booking/bookings.module';
import { HospitalsModule } from '../hospitals/hospitals.module';
import { PetsModule } from '../pets/pets.module';
import { AdoptionModule } from '../adoption/adoption.module';
import { InsuranceModule } from '../insurance/insurance.module';
import { PaymentsModule } from '../payments/payments.module';
import { MedicalRecordsModule } from '../medical-records/medical-records.module';
// ... other imports

@Module({
  imports: [
    CacheModule,
    BookingsModule,
    HospitalsModule,
    PetsModule,
    AdoptionModule,
    InsuranceModule,
    PaymentsModule,
    MedicalRecordsModule,
  ],
  // ... rest of configuration
})
export class BffModule {}
```

### 2. Inject Services in Controllers

#### Consumer Controller Example

```typescript
import { BookingsService } from '../../booking/services/bookings.service';
import { HospitalService } from '../../hospitals/services/hospital.service';
import { PetsService } from '../../pets/services/pets.service';
import { AdoptionService } from '../../adoption/services/adoption.service';
import { InsuranceService } from '../../insurance/services/insurance.service';

@Controller('bff/consumer')
export class ConsumerController {
  constructor(
    private readonly aggregationService: AggregationService,
    private readonly bookingsService: BookingsService,
    private readonly hospitalsService: HospitalService,
    private readonly petsService: PetsService,
    private readonly adoptionService: AdoptionService,
    private readonly insuranceService: InsuranceService,
  ) {}

  // ... methods
}
```

### 3. Implement Service Method Calls

Replace TODO comments with actual service calls:

```typescript
@Get('home')
async getHomeScreen(@Request() req, @Query() query: ConsumerHomeQueryDto) {
  const userId = req.user.id;
  const cacheKey = this.aggregationService.generateCacheKey('consumer:home', {
    userId,
    ...query,
  });

  const result = await this.aggregationService.getOrCache(
    cacheKey,
    async () => {
      const { data, errors } = await this.aggregationService.executeParallel({
        // Replace TODO with actual implementation
        upcomingBookings: async () => {
          const bookings = await this.bookingsService.findUpcoming(userId, {
            limit: query.limit,
          });
          return {
            total: bookings.length,
            bookings: bookings.map((b) => ({
              id: b.id,
              hospitalName: b.hospital.name,
              hospitalAddress: b.hospital.address,
              appointmentDate: b.appointmentDate,
              serviceName: b.service.name,
              petName: b.pet.name,
              petType: b.pet.type,
              status: b.status,
              estimatedDuration: b.service.duration,
            })),
          };
        },

        petHealthReminders: async () => {
          const pets = await this.petsService.findByUser(userId);
          const reminders = [];

          for (const pet of pets) {
            const vaccinations = await this.medicalRecordsService
              .getVaccinations(pet.id);

            const overdueVaccinations = vaccinations.filter(
              (v) => v.nextDue < new Date() && !v.completed
            );

            reminders.push(
              ...overdueVaccinations.map((v) => ({
                petId: pet.id,
                petName: pet.name,
                reminderType: 'vaccination' as const,
                dueDate: v.nextDue,
                priority: 'high' as const,
                description: `${v.vaccineName} vaccination overdue`,
              }))
            );
          }

          return reminders;
        },

        nearbyHospitals: async () => {
          if (!query.latitude || !query.longitude) return [];

          const hospitals = await this.hospitalsService.findNearby({
            latitude: query.latitude,
            longitude: query.longitude,
            radius: query.radius,
            limit: query.limit,
          });

          return hospitals.map((h) => ({
            id: h.id,
            name: h.name,
            address: h.address,
            distance: this.aggregationService.calculateDistance(
              query.latitude,
              query.longitude,
              h.latitude,
              h.longitude,
            ),
            rating: h.averageRating,
            reviewCount: h.reviewCount,
            specialties: h.specialties,
            nextAvailableSlot: h.nextAvailableSlot,
            isOpen: h.isCurrentlyOpen,
          }));
        },

        // ... other parallel operations
      });

      return data;
    },
    300, // 5 minute cache
  );

  return result.data;
}
```

## Service Method Requirements

### BookingsService

Required methods:
```typescript
class BookingsService {
  // Find upcoming bookings for a user
  async findUpcoming(userId: string, options?: { limit?: number }) {
    // Return bookings with relations: hospital, service, pet
  }

  // Find bookings by pet
  async findByPet(petId: string) {
    // Return bookings for specific pet
  }

  // Get available time slots
  async getAvailableSlots(hospitalId: string, date: string) {
    // Return available booking slots
  }

  // Find today's bookings for hospital
  async findTodaysBookings(hospitalId: string) {
    // Return bookings for today with patient info
  }
}
```

### HospitalsService

Required methods:
```typescript
class HospitalService {
  // Find hospitals near coordinates
  async findNearby(params: {
    latitude: number;
    longitude: number;
    radius: number;
    limit?: number;
  }) {
    // Return hospitals with distance calculation
  }

  // Get hospital with full details
  async findOne(hospitalId: string) {
    // Return hospital with services, reviews, etc.
  }

  // Get hospital services
  async getServices(hospitalId: string) {
    // Return list of services with pricing
  }
}
```

### PetsService

Required methods:
```typescript
class PetsService {
  // Find all pets for a user
  async findByUser(userId: string) {
    // Return user's pets
  }

  // Get single pet with details
  async findOne(petId: string, userId: string) {
    // Return pet with owner verification
  }

  // Get health reminders
  async getHealthReminders(userId: string) {
    // Return upcoming vaccinations, checkups, etc.
  }

  // Get health alerts
  async getHealthAlerts(userId: string) {
    // Return urgent health-related alerts
  }
}
```

### MedicalRecordsService

Required methods:
```typescript
class MedicalRecordsService {
  // Get health summary for pet
  async getHealthSummary(petId: string) {
    // Return vaccinations, conditions, allergies, medications
  }

  // Get medical timeline
  async getTimeline(petId: string) {
    // Return chronological medical history
  }

  // Get vaccinations
  async getVaccinations(petId: string) {
    // Return vaccination records with due dates
  }
}
```

### PaymentsService

Required methods:
```typescript
class PaymentsService {
  // Get revenue data for hospital
  async getRevenue(hospitalId: string, timeRange: TimeRangeEnum) {
    // Return revenue with breakdowns
  }

  // Get spending summary for user
  async getSpendingSummary(userId: string) {
    // Return monthly spending data
  }

  // Get platform-wide financial data
  async getPlatformFinancials(timeRange: TimeRangeEnum) {
    // Return fees, payouts, refunds
  }
}
```

## Cache Invalidation Strategy

### When to Invalidate

Implement cache invalidation in service methods that modify data:

```typescript
@Injectable()
export class BookingsService {
  constructor(
    private readonly cacheService: CacheService,
  ) {}

  async create(createBookingDto: CreateBookingDto) {
    const booking = await this.bookingRepository.save(createBookingDto);

    // Invalidate related caches
    await this.invalidateCaches(booking);

    return booking;
  }

  async update(id: string, updateBookingDto: UpdateBookingDto) {
    const booking = await this.bookingRepository.save({
      id,
      ...updateBookingDto,
    });

    await this.invalidateCaches(booking);

    return booking;
  }

  private async invalidateCaches(booking: Booking) {
    // Consumer cache
    await this.cacheService.del(`consumer:home:${booking.userId}`);
    await this.cacheService.del(`consumer:dashboard:${booking.userId}`);
    await this.cacheService.del(`pet:profile:${booking.petId}`);

    // Hospital cache
    await this.cacheService.del(`hospital:dashboard:${booking.hospitalId}`);
    await this.cacheService.del(`hospital:booking-info:${booking.hospitalId}`);
  }
}
```

### Pattern-Based Invalidation

For complex scenarios:

```typescript
// Invalidate all user-related caches
async invalidateUserCaches(userId: string) {
  const pattern = `*:${userId}*`;
  // Note: Requires Redis SCAN implementation
  await this.aggregationService.invalidatePattern(pattern);
}
```

## Error Handling

### Service-Level Error Handling

```typescript
upcomingBookings: async () => {
  try {
    const bookings = await this.bookingsService.findUpcoming(userId);
    return {
      total: bookings.length,
      bookings: bookings.map(/* ... */),
    };
  } catch (error) {
    this.logger.error('Error fetching upcoming bookings:', error);
    // Return fallback data
    return {
      total: 0,
      bookings: [],
    };
  }
},
```

### Circuit Breaker Pattern

For external services:

```typescript
private bookingServiceFailures = 0;
private readonly FAILURE_THRESHOLD = 5;

upcomingBookings: async () => {
  if (this.bookingServiceFailures > this.FAILURE_THRESHOLD) {
    // Return cached/fallback data
    return this.getCachedBookings(userId);
  }

  try {
    const bookings = await this.bookingsService.findUpcoming(userId);
    this.bookingServiceFailures = 0; // Reset on success
    return bookings;
  } catch (error) {
    this.bookingServiceFailures++;
    throw error;
  }
},
```

## Performance Monitoring

### Add Timing Metrics

```typescript
@Get('home')
async getHomeScreen(@Request() req, @Query() query: ConsumerHomeQueryDto) {
  const startTime = Date.now();

  const result = await this.aggregationService.getOrCache(/* ... */);

  const duration = Date.now() - startTime;
  this.logger.debug(`Home screen aggregation completed in ${duration}ms`);

  // Send metrics to monitoring service
  // metricsService.recordTiming('bff.consumer.home', duration);

  return result.data;
}
```

### Cache Hit Rate Monitoring

```typescript
const cacheHit = await this.cacheService.exists(cacheKey);
// metricsService.recordCacheHit('bff.consumer.home', cacheHit);
```

## Testing Integration

### Integration Test Example

```typescript
describe('BFF Consumer Integration', () => {
  let app: INestApplication;
  let bookingsService: BookingsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [BffModule, BookingsModule, /* ... */],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    bookingsService = module.get(BookingsService);
  });

  it('should aggregate home screen data from real services', async () => {
    // Create test data
    const user = await createTestUser();
    const pet = await createTestPet(user);
    const booking = await bookingsService.create({
      userId: user.id,
      petId: pet.id,
      /* ... */
    });

    // Call BFF endpoint
    const response = await request(app.getHttpServer())
      .get('/bff/consumer/home')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    // Verify aggregation
    expect(response.body.upcomingBookings.total).toBe(1);
    expect(response.body.upcomingBookings.bookings[0].id).toBe(booking.id);
  });
});
```

## Deployment Checklist

- [ ] All required modules imported in BFF module
- [ ] Services injected in controllers
- [ ] TODO comments replaced with actual implementations
- [ ] Cache invalidation implemented in service methods
- [ ] Error handling and fallbacks configured
- [ ] Performance monitoring integrated
- [ ] Integration tests passing
- [ ] Cache TTLs tuned based on load testing
- [ ] Documentation updated with actual response examples

## Troubleshooting

### High Cache Miss Rate

**Symptoms**: Cache hit rate <50%
**Solutions**:
- Increase TTL values
- Implement cache warming on deployment
- Check cache key generation for consistency

### Slow Response Times

**Symptoms**: P95 response time >2s
**Solutions**:
- Check service method performance
- Ensure parallel execution is working
- Add indices to database queries
- Consider read replicas for heavy queries

### Partial Data Failures

**Symptoms**: Frequent partial responses with errors
**Solutions**:
- Implement circuit breaker pattern
- Add retry logic with exponential backoff
- Improve error handling in service methods
- Consider degraded mode with cached data

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Redis Caching Best Practices](https://redis.io/docs/manual/patterns/)
- [API Performance Optimization](https://web.dev/performance/)
