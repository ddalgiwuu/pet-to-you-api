# Analytics Module

Comprehensive analytics and metrics tracking system for Pet-to-You platform with optimized MongoDB aggregations and real-time event tracking.

## 📊 Features

### Hospital Dashboard
- **Revenue Analytics**: Daily/weekly/monthly revenue with service breakdown
- **Booking Statistics**: Total bookings, completion rates, cancellation rates, average values
- **Patient Demographics**: Species distribution, age groups, new vs returning
- **Popular Services**: Top services by bookings and revenue
- **Peak Hours Analysis**: Hourly booking patterns and revenue
- **Review & Ratings**: Average ratings, distribution, trends
- **Staff Performance**: Individual staff metrics and revenue contribution
- **Operational Metrics**: Wait times, utilization rates, repeat customer rates

### Platform Admin Dashboard
- **User Metrics**: MAU, DAU, new users, returning users, retention rates
- **Revenue Metrics**: Total revenue, GMV, platform fees, service breakdown
- **Booking Metrics**: Platform-wide booking statistics and trends
- **Conversion Funnel**: Landing → Search → Listing → Booking → Payment
- **Geographic Distribution**: Top cities by bookings and revenue
- **Provider Performance**: Hospital/daycare/shelter metrics and top performers
- **Cohort Analysis**: User retention over time by cohort
- **Performance Monitoring**: Response times, error rates

## 🏗️ Architecture

### Data Storage Strategy

**Event Tracking (MongoDB Time Series)**
- Real-time event collection with 90-day TTL
- Optimized for write-heavy workloads
- Automatic partitioning by time
- Compressed storage for efficiency

**Pre-Computed Metrics (MongoDB)**
- Daily aggregated metrics via cron job
- Materialized views for fast dashboard queries
- 15-minute cache layer for API responses
- Indexed for optimal query performance

### Optimization Techniques

1. **MongoDB Aggregation Pipeline**: Complex queries use $facet and $group for efficiency
2. **Daily Cron Job**: Pre-compute metrics at 1 AM (MetricsAggregatorService)
3. **Response Caching**: 15-minute TTL on dashboard endpoints
4. **Compound Indexes**: Optimized for common query patterns
5. **Time-Series Collection**: Automatic data compression and partitioning

## 📦 Installation

### 1. Install Required Dependencies

```bash
npm install @nestjs/schedule @nestjs/cache-manager cache-manager
```

### 2. Add to package.json

```json
{
  "dependencies": {
    "@nestjs/schedule": "^4.0.0",
    "@nestjs/cache-manager": "^2.2.0",
    "cache-manager": "^5.4.0"
  }
}
```

### 3. MongoDB Indexes Setup

The indexes are automatically created via schema decorators, but you can manually verify:

```javascript
// User Events Collection
db.user_events.createIndex({ userId: 1, timestamp: -1 });
db.user_events.createIndex({ eventType: 1, timestamp: -1 });
db.user_events.createIndex({ sessionId: 1, timestamp: -1 });
db.user_events.createIndex({ "metadata.deviceType": 1, timestamp: -1 });

// Hospital Metrics Collection
db.hospital_metrics.createIndex({ hospitalId: 1, date: -1 });
db.hospital_metrics.createIndex({ date: -1, hospitalId: 1 });

// Platform Metrics Collection
db.platform_metrics.createIndex({ date: -1 });
```

## 🚀 API Endpoints

### Event Tracking

```
POST /analytics/events
```
Track user events in real-time (page views, clicks, bookings, payments)

**Request Body**:
```json
{
  "eventType": "booking_created",
  "userId": "user-123",
  "sessionId": "session-456",
  "eventProperties": {
    "hospitalId": "hospital-789",
    "bookingValue": 15000,
    "serviceType": "consultation"
  },
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "platform": "web",
    "deviceType": "desktop"
  }
}
```

### Hospital Dashboard

```
GET /analytics/hospital/:hospitalId/dashboard
  ?timeRange=week
  &startDate=2024-01-01
  &endDate=2024-01-31
```

**Query Parameters**:
- `timeRange`: `day` | `week` | `month` | `quarter` | `year` | `custom`
- `startDate`: ISO 8601 date (for custom range)
- `endDate`: ISO 8601 date (for custom range)

**Response**: Complete hospital analytics dashboard data

### Platform Admin Dashboard

```
GET /analytics/platform/overview?timeRange=month
GET /analytics/platform/revenue?timeRange=month
GET /analytics/platform/users?timeRange=month
GET /analytics/platform/conversion?timeRange=month
```

**Authorization**: Requires `PLATFORM_ADMIN` role

## 📈 Event Types

```typescript
enum EventType {
  PAGE_VIEW = 'page_view',
  BUTTON_CLICK = 'button_click',
  BOOKING_CREATED = 'booking_created',
  BOOKING_CANCELLED = 'booking_cancelled',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',
  REVIEW_SUBMITTED = 'review_submitted',
  SEARCH_PERFORMED = 'search_performed',
  PROFILE_UPDATED = 'profile_updated',
  LOGIN = 'login',
  LOGOUT = 'logout',
  SIGNUP = 'signup',
}
```

## 🔄 Cron Jobs

### Daily Metrics Aggregation

Runs every day at 1:00 AM (configured via `@Cron` decorator):

```typescript
@Cron(CronExpression.EVERY_DAY_AT_1AM)
async aggregateDailyMetrics() {
  // Pre-compute previous day's metrics
  // Aggregate platform-wide metrics
  // Aggregate hospital-specific metrics
}
```

**Purpose**: Convert raw events into queryable metrics for dashboard performance

## 🎯 Usage Examples

### Track Booking Creation

```typescript
import { AnalyticsService, EventType } from '@/modules/analytics';

// In your booking service
await analyticsService.trackEvent({
  eventType: EventType.BOOKING_CREATED,
  userId: booking.userId,
  sessionId: request.sessionId,
  eventProperties: {
    hospitalId: booking.hospitalId,
    bookingValue: booking.totalAmount,
    serviceType: booking.serviceType,
    bookingId: booking.id,
  },
  metadata: {
    userAgent: request.headers['user-agent'],
    platform: 'web',
    deviceType: 'desktop',
  },
});
```

### Fetch Hospital Dashboard

```typescript
import { AnalyticsService, TimeRange } from '@/modules/analytics';

const dashboard = await analyticsService.getHospitalDashboard(
  'hospital-123',
  { timeRange: TimeRange.MONTH }
);

console.log(dashboard.revenue.monthly); // 5000000
console.log(dashboard.bookings.total); // 342
console.log(dashboard.patients.total); // 215
```

### Fetch Platform Overview

```typescript
const overview = await analyticsService.getPlatformOverview({
  timeRange: TimeRange.QUARTER,
});

console.log(overview.users.mau); // 15000
console.log(overview.revenue.total); // 125000000
console.log(overview.conversionFunnel.conversionRate); // 3.5%
```

## ⚡ Performance Considerations

### Write Performance
- Events are written to time-series collection with automatic partitioning
- 90-day TTL keeps collection size manageable
- Indexes optimized for event insertion patterns

### Read Performance
- Dashboard queries use pre-computed metrics (not raw events)
- 15-minute cache on API responses
- Compound indexes for efficient range queries
- Aggregation pipelines optimized with $facet for parallel processing

### Memory Management
- Cache limited to 100 items with 15-minute TTL
- MongoDB connection pool: 2-10 connections
- Automatic cleanup of expired events via TTL index

## 🔒 Security & Authorization

**Hospital Dashboard**:
- Requires: `HOSPITAL_ADMIN`, `HOSPITAL_STAFF`, or `PLATFORM_ADMIN` role
- Hospital staff can only access their own hospital's data
- Enforced via RolesGuard

**Platform Dashboard**:
- Requires: `PLATFORM_ADMIN` role only
- Access to all platform-wide metrics and cross-hospital analytics

## 🧪 Testing

```bash
# Unit tests
npm test analytics.service.spec.ts

# E2E tests
npm run test:e2e analytics.e2e-spec.ts
```

## 📝 TODO / Future Enhancements

- [ ] Real-time dashboards with WebSocket updates
- [ ] Custom report builder for hospitals
- [ ] Email digest for weekly/monthly reports
- [ ] A/B testing framework integration
- [ ] Predictive analytics (ML-based forecasting)
- [ ] Export analytics to CSV/PDF
- [ ] Custom metric definitions for hospitals
- [ ] Anomaly detection and alerting
- [ ] Multi-tenant data isolation enforcement

## 🐛 Troubleshooting

### Metrics Not Updating
- Check cron job execution: logs should show "Starting daily metrics aggregation..."
- Verify MongoDB connection in DatabaseModule
- Check event tracking: events should appear in `user_events` collection

### Slow Dashboard Queries
- Verify indexes are created: `db.hospital_metrics.getIndexes()`
- Check cache hit rate in logs
- Increase cache TTL if acceptable for your use case
- Consider adding more specific compound indexes

### Missing Data
- Ensure events are being tracked with proper `eventType`
- Check date range query parameters
- Verify hospital/user IDs in event tracking
- Review cron job logs for aggregation errors

## 📚 References

- [NestJS Schedule Module](https://docs.nestjs.com/techniques/task-scheduling)
- [NestJS Cache Manager](https://docs.nestjs.com/techniques/caching)
- [MongoDB Time Series Collections](https://www.mongodb.com/docs/manual/core/timeseries-collections/)
- [MongoDB Aggregation Pipeline](https://www.mongodb.com/docs/manual/core/aggregation-pipeline/)
