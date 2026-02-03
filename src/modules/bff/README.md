# BFF (Backend for Frontend) Module

## Overview

The BFF module provides **optimized aggregation endpoints** tailored for specific frontend applications. It reduces API calls from **5-10 individual requests to a single endpoint**, improving performance and user experience.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Apps                        │
├──────────────┬──────────────┬──────────────────────────┤
│ Mobile App   │ Hospital UI  │ Admin Dashboard          │
└──────┬───────┴──────┬───────┴──────────┬───────────────┘
       │              │                  │
       ▼              ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                    BFF Layer                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ Consumer   │  │ Hospital   │  │ Admin      │        │
│  │ Controller │  │ Controller │  │ Controller │        │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘        │
│        │                │                │              │
│        └────────┬───────┴────────┬───────┘              │
│                 │                │                      │
│          ┌──────▼─────┐   ┌──────▼─────┐               │
│          │ Aggregation│   │   Cache    │               │
│          │  Service   │   │  Service   │               │
│          └──────┬─────┘   └────────────┘               │
└─────────────────┼──────────────────────────────────────┘
                  │
     ┌────────────┼────────────┐
     │            │            │
     ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│Bookings │  │Hospitals│  │  Pets   │
│ Service │  │ Service │  │ Service │
└─────────┘  └─────────┘  └─────────┘
```

## Key Features

### 1. **Parallel Query Execution**
```typescript
const { data } = await aggregationService.executeParallel({
  bookings: async () => bookingsService.findUpcoming(userId),
  pets: async () => petsService.findByUser(userId),
  notifications: async () => notificationsService.getUnread(userId),
});
```

### 2. **Response Caching**
- Consumer endpoints: **5-10 minutes** TTL
- Hospital dashboard: **3-5 minutes** TTL
- Admin dashboard: **2-5 minutes** TTL

### 3. **Data Denormalization**
Includes related data in single response to avoid N+1 queries:
```typescript
{
  booking: { id, date, status },
  hospital: { name, address, phone },  // Denormalized
  pet: { name, type, breed },          // Denormalized
  service: { name, price, duration }   // Denormalized
}
```

### 4. **Graceful Degradation**
Individual service failures don't break the entire response:
```typescript
{
  data: {
    upcomingBookings: [...],  // Success
    pets: null,               // Failed gracefully
    notifications: [...]      // Success
  },
  errors: [{ service: 'pets', error: 'Connection timeout' }]
}
```

## Endpoints

### Consumer Endpoints

#### `GET /bff/consumer/home`
**Purpose**: Home screen data (upcoming bookings, health reminders, nearby hospitals)

**Query Parameters**:
- `limit` (optional): Items per category (default: 5)
- `latitude` (optional): User location
- `longitude` (optional): User location
- `radius` (optional): Search radius in km (default: 10)

**Response**:
```typescript
{
  upcomingBookings: { total: 2, bookings: [...] },
  petHealthReminders: [...],
  nearbyHospitals: [...],
  adoptionRecommendations: [...],
  insuranceRecommendations: [...],
  promotions: [...]
}
```

**Optimization**: Replaces **6 API calls** with **1 call**

---

#### `GET /bff/consumer/search`
**Purpose**: Aggregated search (hospitals + reviews + availability)

**Query Parameters**:
- `query`: Search query
- `latitude`, `longitude`: Location
- `radius`: Search radius (default: 20km)
- `specialties[]`: Filter by specialties
- `minRating`: Minimum rating filter
- `sortBy`: `relevance|rating|distance|price_low|price_high`
- `page`, `limit`: Pagination

**Response**:
```typescript
{
  results: [
    {
      id, type, name, address, distance,
      rating, reviewCount, reviews: [...],
      isOpen, nextAvailableSlot,
      services: [...], specialties: [...],
      verified: true
    }
  ],
  aggregations: { totalResults, byType, avgRating, priceRange },
  pagination: { page, limit, total, totalPages }
}
```

**Optimization**: Replaces **3-5 API calls** with **1 call**

---

#### `GET /bff/consumer/pets/:petId/profile`
**Purpose**: Comprehensive pet profile with medical timeline

**Response**:
```typescript
{
  pet: { id, name, type, breed, ... },
  healthSummary: {
    vaccinations: { upToDate, total, overdue, upcoming: [...] },
    chronicConditions: [...],
    allergies: [...],
    currentMedications: [...]
  },
  medicalTimeline: [...],  // Chronological medical history
  upcomingAppointments: [...],
  insuranceInfo: { ... },
  statistics: { totalVisits, totalSpent, healthScore }
}
```

**Optimization**: Replaces **6 API calls** with **1 call**

---

### Hospital Endpoints

#### `GET /bff/hospital/dashboard`
**Purpose**: Complete hospital dashboard overview

**Query Parameters**:
- `timeRange`: `today|week|month|quarter|year`
- `startDate`, `endDate`: Custom date range

**Response**:
```typescript
{
  todaysBookings: { total, completed, inProgress, upcoming, bookings: [...] },
  revenue: {
    today: { total, byPaymentMethod, transactionCount },
    week: { total, trend, dailyBreakdown },
    month: { total, trend, byService }
  },
  upcomingAppointments: { nextHour, next3Hours, appointments: [...] },
  recentReviews: { averageRating, totalReviews, reviews: [...] },
  performance: { utilizationRate, avgWaitTime, patientSatisfaction },
  staffSchedules: [...],
  alerts: [...]
}
```

**Optimization**: Replaces **7-10 API calls** with **1 call**

---

### Admin Endpoints

#### `GET /bff/admin/dashboard`
**Purpose**: Platform-wide overview

**Query Parameters**:
- `timeRange`: `today|week|month|quarter|year`
- `limit`: Items per list (default: 10)

**Response**:
```typescript
{
  platformOverview: {
    activeUsers: { total, consumers, hospitals, mau, dauMauRatio },
    revenue: { total, trend, byCategory, transactionVolume },
    activeHospitals: { total, verified, pending, topPerformers },
    systemHealth: { uptime, apiLatency, errorRate }
  },
  pendingVerifications: { hospitals, shelters, daycares },
  securityAlerts: { critical, high, medium, low, recentAlerts },
  auditLogSummary: { totalEvents, criticalEvents, recentEvents },
  userManagement: { newRegistrations, activeSupport, accountActions },
  contentModeration: { pendingReviews, flaggedContent },
  financials: { platformFees, payouts, refunds }
}
```

**Optimization**: Replaces **8-12 API calls** with **1 call**

---

## Performance Optimizations

### 1. Caching Strategy
```typescript
// TTL Configuration by endpoint type
const CACHE_TTL = {
  consumer: {
    home: 300,        // 5 minutes
    search: 600,      // 10 minutes
    petProfile: 900,  // 15 minutes
  },
  hospital: {
    dashboard: 180,   // 3 minutes
    revenue: 300,     // 5 minutes
  },
  admin: {
    dashboard: 120,   // 2 minutes
    analytics: 600,   // 10 minutes
  },
};
```

### 2. Cache Key Generation
```typescript
const cacheKey = aggregationService.generateCacheKey('consumer:home', {
  userId,
  latitude,
  longitude,
  limit,
});
// Result: "consumer:home:eyJ1c2VySWQiOiIxMjMiLCAibGF0Ijoi..."
```

### 3. Parallel Execution
```typescript
// All queries execute simultaneously
const result = await Promise.allSettled([
  bookingsService.findUpcoming(userId),
  petsService.findByUser(userId),
  hospitalsService.findNearby(location),
]);
```

## Cache Invalidation

### Automatic Invalidation
```typescript
// When user creates booking
await bookingsService.create(data);
await cacheService.del(`consumer:home:${userId}`);
await cacheService.del(`hospital:dashboard:${hospitalId}`);
```

### Pattern-based Invalidation
```typescript
// Invalidate all user-related caches
await aggregationService.invalidatePattern(`consumer:*:${userId}*`);
```

## Error Handling

### Graceful Degradation
```typescript
const { data, errors } = await aggregationService.executeParallel({
  bookings: async () => bookingsService.findUpcoming(userId),
  pets: async () => petsService.findByUser(userId),  // May fail
});

// Response includes partial data + error details
return {
  ...data,
  _errors: errors,  // [{ service: 'pets', error: 'Timeout' }]
};
```

### Circuit Breaker Pattern
```typescript
// Fail fast after repeated failures
if (serviceFailureCount > threshold) {
  return cachedFallback || emptyData;
}
```

## Implementation Checklist

### Phase 1: Core Infrastructure ✅
- [x] Aggregation service
- [x] Cache integration
- [x] Error handling utilities
- [x] DTO definitions

### Phase 2: Consumer Endpoints
- [ ] Inject BookingsService, HospitalsService, PetsService
- [ ] Implement `GET /home` logic
- [ ] Implement `GET /search` logic
- [ ] Implement `GET /pets/:id/profile` logic
- [ ] Add integration tests

### Phase 3: Hospital Endpoints
- [ ] Inject required services
- [ ] Implement dashboard aggregation
- [ ] Implement revenue analytics
- [ ] Implement patient analytics
- [ ] Add integration tests

### Phase 4: Admin Endpoints
- [ ] Inject analytics and audit services
- [ ] Implement platform overview
- [ ] Implement security monitoring
- [ ] Implement business insights
- [ ] Add integration tests

### Phase 5: Optimization
- [ ] Add Redis caching
- [ ] Implement cache warming strategies
- [ ] Add monitoring and metrics
- [ ] Load testing and performance tuning

## Testing

### Example Integration Test
```typescript
describe('ConsumerController', () => {
  it('should return home screen data in single call', async () => {
    const response = await request(app)
      .get('/bff/consumer/home')
      .query({ limit: 5, latitude: 37.5, longitude: 127.0 })
      .expect(200);

    expect(response.body).toHaveProperty('upcomingBookings');
    expect(response.body).toHaveProperty('petHealthReminders');
    expect(response.body).toHaveProperty('nearbyHospitals');
    expect(response.body.upcomingBookings.bookings).toHaveLength(5);
  });
});
```

## Monitoring

### Key Metrics
- **Cache Hit Rate**: Target >70%
- **Response Time**: Target <500ms for cached, <2s for uncached
- **Error Rate**: Target <1%
- **API Call Reduction**: 80-90% fewer calls from frontend

### Performance Dashboard
```typescript
{
  endpoint: '/bff/consumer/home',
  metrics: {
    avgResponseTime: 345,     // ms
    cacheHitRate: 76.5,       // %
    requestsPerMinute: 450,
    errorRate: 0.3,           // %
  }
}
```

## Best Practices

1. **Always use caching** for aggregation endpoints
2. **Set appropriate TTLs** based on data freshness requirements
3. **Handle partial failures** gracefully with fallback data
4. **Monitor cache hit rates** and adjust TTLs accordingly
5. **Invalidate caches** when underlying data changes
6. **Use parallel execution** for independent queries
7. **Denormalize data** to avoid additional API calls
8. **Document response shapes** for frontend teams

## Future Enhancements

- [ ] GraphQL integration for flexible queries
- [ ] Real-time updates via WebSockets
- [ ] Predictive cache warming
- [ ] A/B testing support
- [ ] Multi-region caching
- [ ] Advanced analytics and insights
