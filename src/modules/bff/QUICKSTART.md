# BFF Module Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- Redis running (for caching)
- PostgreSQL running (for data)
- Existing Pet-to-You API modules

### Step 1: Verify Installation

The BFF module is already installed and registered in `app.module.ts`:

```bash
# Check module structure
ls -la src/modules/bff/

# Expected output:
# controllers/  dto/  services/  interfaces/  tests/
# bff.module.ts  README.md  etc.
```

### Step 2: Start Redis (Required for Caching)

```bash
# Using Docker
docker run -d -p 6379:6379 --name redis redis:alpine

# Or using local Redis
redis-server

# Verify Redis is running
redis-cli ping
# Expected: PONG
```

### Step 3: Configure Environment

Add to your `.env` file:

```env
# Redis Configuration (for BFF caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Step 4: Test Basic Functionality

Start the development server:

```bash
npm run start:dev
```

Test the endpoints (with proper authentication):

```bash
# Consumer Home Screen (requires JWT token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/bff/consumer/home?limit=5"

# Expected Response:
{
  "upcomingBookings": { "total": 0, "bookings": [] },
  "petHealthReminders": [],
  "nearbyHospitals": [],
  "adoptionRecommendations": [],
  "insuranceRecommendations": [],
  "promotions": []
}
```

## 📋 Quick Integration Checklist

### ✅ Phase 1: Verify Structure (Already Done)
- [x] BFF module created
- [x] Controllers implemented
- [x] Aggregation service created
- [x] DTOs defined
- [x] Module registered in app.module.ts

### 🔄 Phase 2: Connect Services (Next Steps)

#### 2.1 Import Required Modules

Edit `src/modules/bff/bff.module.ts`:

```typescript
import { BookingsModule } from '../booking/bookings.module';
import { HospitalsModule } from '../hospitals/hospitals.module';
// ... import other modules

@Module({
  imports: [
    CacheModule,
    BookingsModule,    // Add this
    HospitalsModule,   // Add this
    // ... add other modules
  ],
  // ...
})
```

#### 2.2 Inject Services in Controllers

Edit `src/modules/bff/controllers/consumer.controller.ts`:

```typescript
import { BookingsService } from '../../booking/services/bookings.service';
// ... import other services

constructor(
  private readonly aggregationService: AggregationService,
  private readonly bookingsService: BookingsService, // Add this
  // ... inject other services
) {}
```

#### 2.3 Replace TODO Comments

Find all `TODO` comments and replace with actual service calls:

```bash
# Find all TODOs
grep -r "TODO" src/modules/bff/controllers/

# Example replacement:
# Before:
// TODO: Call bookingsService.findUpcoming(userId, { limit: query.limit })
return { total: 0, bookings: [] };

# After:
const bookings = await this.bookingsService.findUpcoming(userId, {
  limit: query.limit,
});
return {
  total: bookings.length,
  bookings: bookings.map(b => ({
    id: b.id,
    hospitalName: b.hospital.name,
    // ... map fields
  })),
};
```

## 🧪 Testing

### Run Unit Tests

```bash
npm test -- bff

# Or run specific test
npm test -- consumer.controller.spec.ts
```

### Manual Testing with Postman/Insomnia

1. **Login** to get JWT token:
```bash
POST http://localhost:3000/auth/login
{
  "email": "test@example.com",
  "password": "password"
}
```

2. **Test Consumer Endpoints**:
```bash
# Home Screen
GET http://localhost:3000/bff/consumer/home?limit=5
Headers: Authorization: Bearer {token}

# Search
GET http://localhost:3000/bff/consumer/search?query=veterinary
Headers: Authorization: Bearer {token}

# Pet Profile
GET http://localhost:3000/bff/consumer/pets/{petId}/profile
Headers: Authorization: Bearer {token}
```

3. **Test Hospital Endpoints** (requires hospital role):
```bash
GET http://localhost:3000/bff/hospital/dashboard?timeRange=today
Headers: Authorization: Bearer {hospital_token}
```

4. **Test Admin Endpoints** (requires admin role):
```bash
GET http://localhost:3000/bff/admin/dashboard
Headers: Authorization: Bearer {admin_token}
```

## 📊 Verify Performance

### Check Cache is Working

```bash
# Connect to Redis CLI
redis-cli

# Check keys being cached
KEYS bff:*

# Example output:
# 1) "bff:consumer:home:user-123"
# 2) "bff:hospital:dashboard:hospital-456"

# Check a specific key
GET "bff:consumer:home:user-123"

# Check TTL (time to live)
TTL "bff:consumer:home:user-123"
# Returns seconds until expiration
```

### Monitor Response Times

```bash
# Using curl with timing
time curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/bff/consumer/home"

# First call (uncached): ~800ms-1s
# Second call (cached): ~100ms
```

### Check Logs

```bash
# Watch logs for cache hits/misses
npm run start:dev | grep -E "(Cache hit|Cache miss)"

# Example output:
# [AggregationService] Cache miss for key: consumer:home:user-123, executing function
# [AggregationService] Cache hit for key: consumer:home:user-123
```

## 🐛 Troubleshooting

### Issue: "Redis connection failed"

**Solution**:
```bash
# Check Redis is running
redis-cli ping

# If not running, start Redis
docker start redis
# or
redis-server
```

### Issue: "Service not found" errors

**Solution**:
```typescript
// Make sure modules are imported in bff.module.ts
@Module({
  imports: [
    CacheModule,
    BookingsModule,  // ← Must be imported!
    HospitalsModule, // ← Must be imported!
  ],
})
```

### Issue: "Unauthorized" responses

**Solution**:
```bash
# Get fresh JWT token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Use the accessToken from response
```

### Issue: Slow response times

**Solution**:
```bash
# Check if parallel execution is working
# Look for these patterns in code:

# ✅ GOOD - Parallel
const { data } = await this.aggregationService.executeParallel({
  bookings: async () => ...,
  pets: async () => ...,
});

# ❌ BAD - Sequential
const bookings = await this.bookingsService.find();
const pets = await this.petsService.find(); // Waits for bookings!
```

## 📚 Next Steps

1. **Complete Integration** - Follow [INTEGRATION.md](./INTEGRATION.md)
2. **Performance Testing** - Follow [PERFORMANCE.md](./PERFORMANCE.md)
3. **Production Deployment** - Review [ARCHITECTURE.md](./ARCHITECTURE.md)

## 🔗 Useful Resources

### Documentation Files
- **README.md** - Complete API documentation
- **INTEGRATION.md** - Service integration guide
- **PERFORMANCE.md** - Performance testing guide
- **ARCHITECTURE.md** - System architecture
- **SUMMARY.md** - Implementation summary

### Example Code
- `controllers/consumer.controller.ts` - Example endpoint implementation
- `services/aggregation.service.ts` - Core aggregation utilities
- `tests/consumer.controller.spec.ts` - Test examples

### API Endpoints

#### Consumer (Mobile App)
```
GET /bff/consumer/home
GET /bff/consumer/search
GET /bff/consumer/pets/:id/profile
GET /bff/consumer/hospitals/:id/booking-info
GET /bff/consumer/dashboard
```

#### Hospital (Dashboard)
```
GET /bff/hospital/dashboard
GET /bff/hospital/revenue
GET /bff/hospital/patients/analytics
GET /bff/hospital/inventory
GET /bff/hospital/staff/performance
```

#### Admin (Platform Management)
```
GET /bff/admin/dashboard
GET /bff/admin/users/analytics
GET /bff/admin/system/health
GET /bff/admin/security/fraud
GET /bff/admin/insights/business
```

## 💡 Pro Tips

### 1. Cache Warming
Warm caches on deployment for better initial performance:

```typescript
// In main.ts or deployment script
async function warmCaches() {
  const topUsers = await getUsersService.getTopActiveUsers(100);

  for (const user of topUsers) {
    await fetch(`/bff/consumer/home?userId=${user.id}`);
  }
}
```

### 2. Monitoring
Add custom metrics:

```typescript
@Get('home')
async getHomeScreen() {
  const start = Date.now();
  // ... logic
  const duration = Date.now() - start;

  this.metricsService.record({
    endpoint: 'consumer.home',
    duration,
    cached: result.cached,
  });
}
```

### 3. Rate Limiting
Add endpoint-specific rate limits:

```typescript
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 10 requests per 60 seconds
@Get('search')
async search() {
  // ...
}
```

## ✅ Verification Checklist

Before considering integration complete:

- [ ] Redis is running and configured
- [ ] All required modules are imported in bff.module.ts
- [ ] Services are injected in controllers
- [ ] TODO comments are replaced with actual implementations
- [ ] Cache invalidation is implemented in service methods
- [ ] Integration tests pass
- [ ] Response times meet SLAs (<1s uncached, <200ms cached)
- [ ] Cache hit rate >70% after warmup
- [ ] Error handling works (partial failures don't break responses)
- [ ] Documentation is updated with actual response examples

## 🆘 Getting Help

If you encounter issues:

1. Check logs: `npm run start:dev`
2. Review documentation in this folder
3. Check Redis connection: `redis-cli ping`
4. Verify environment variables: `.env`
5. Run tests: `npm test -- bff`

## 🎉 Success Indicators

You'll know it's working when:

✅ Single API call replaces 5-10 individual calls
✅ Response times <500ms for cached endpoints
✅ Cache hit rate >70% in production
✅ Mobile app loads significantly faster
✅ Reduced backend load by 80%+

**Congratulations! Your BFF module is ready to optimize your frontend applications!** 🚀
