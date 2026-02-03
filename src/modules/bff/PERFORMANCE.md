# BFF Module Performance Testing Guide

## Performance Targets

### Response Time SLAs

| Endpoint | Cached | Uncached | P95 | P99 |
|----------|--------|----------|-----|-----|
| Consumer Home | <100ms | <1s | <1.5s | <2s |
| Consumer Search | <150ms | <1.5s | <2s | <3s |
| Pet Profile | <100ms | <1s | <1.5s | <2s |
| Hospital Dashboard | <150ms | <1s | <1.5s | <2s |
| Admin Dashboard | <200ms | <1.5s | <2s | <3s |

### Cache Performance

| Metric | Target |
|--------|--------|
| Hit Rate | >70% |
| Memory Usage | <500MB |
| Eviction Rate | <10% |

### API Call Reduction

| Endpoint | Before | After | Reduction |
|----------|--------|-------|-----------|
| Consumer Home | 6 calls | 1 call | 83% |
| Search | 4 calls | 1 call | 75% |
| Pet Profile | 6 calls | 1 call | 83% |
| Hospital Dashboard | 8 calls | 1 call | 87% |
| Admin Dashboard | 10 calls | 1 call | 90% |

## Load Testing Setup

### Artillery Configuration

Create `loadtest/bff-loadtest.yml`:

```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10  # 10 requests/sec
      name: "Warm up"
    - duration: 120
      arrivalRate: 50  # 50 requests/sec
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100 # 100 requests/sec
      name: "Peak load"
  processor: "./loadtest-processor.js"

scenarios:
  - name: "Consumer Home Screen"
    weight: 40
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "{{ $randomString() }}@test.com"
            password: "test123"
          capture:
            - json: "$.accessToken"
              as: "token"
      - get:
          url: "/bff/consumer/home?limit=5"
          headers:
            Authorization: "Bearer {{ token }}"
          capture:
            - json: "$.upcomingBookings.total"
              as: "bookingCount"

  - name: "Hospital Dashboard"
    weight: 30
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "hospital@test.com"
            password: "test123"
          capture:
            - json: "$.accessToken"
              as: "token"
      - get:
          url: "/bff/hospital/dashboard?timeRange=today"
          headers:
            Authorization: "Bearer {{ token }}"

  - name: "Search Hospitals"
    weight: 30
    flow:
      - get:
          url: "/bff/consumer/search?query=veterinary&latitude=37.5&longitude=127.0"

plugins:
  expect:
    statusCode: 200
    maxErrorRate: 1  # 1% error rate max
  metrics-by-endpoint:
    stripQueryString: true
```

### Run Load Test

```bash
npm install -g artillery

# Run basic load test
artillery run loadtest/bff-loadtest.yml

# Run with report
artillery run --output report.json loadtest/bff-loadtest.yml
artillery report report.json

# Run quick test
artillery quick --count 100 --num 10 http://localhost:3000/bff/consumer/home
```

## Cache Performance Testing

### Cache Hit Rate Test

```typescript
// test/cache-performance.spec.ts
describe('BFF Cache Performance', () => {
  let app: INestApplication;
  let cacheService: CacheService;
  const requests = 100;
  let cacheHits = 0;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [BffModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    cacheService = module.get(CacheService);
  });

  it('should achieve >70% cache hit rate after warm-up', async () => {
    const endpoint = '/bff/consumer/home';

    // Make requests
    for (let i = 0; i < requests; i++) {
      const cacheKey = `consumer:home:user-${i % 10}`; // 10 unique users
      const cached = await cacheService.exists(cacheKey);

      if (cached) cacheHits++;

      await request(app.getHttpServer())
        .get(endpoint)
        .set('Authorization', `Bearer ${getToken(i % 10)}`)
        .expect(200);
    }

    const hitRate = (cacheHits / requests) * 100;
    console.log(`Cache hit rate: ${hitRate.toFixed(2)}%`);

    expect(hitRate).toBeGreaterThan(70);
  });
});
```

### Cache Invalidation Test

```typescript
it('should properly invalidate cache on data change', async () => {
  const userId = 'test-user';
  const cacheKey = `consumer:home:${userId}`;

  // Warm cache
  await request(app.getHttpServer())
    .get('/bff/consumer/home')
    .set('Authorization', `Bearer ${token}`);

  expect(await cacheService.exists(cacheKey)).toBe(true);

  // Create booking (should invalidate cache)
  await request(app.getHttpServer())
    .post('/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({ /* booking data */ });

  expect(await cacheService.exists(cacheKey)).toBe(false);
});
```

## Response Time Testing

### Sequential vs Parallel Execution

```typescript
describe('Parallel Execution Performance', () => {
  it('should be faster than sequential execution', async () => {
    const services = {
      bookings: () => bookingsService.findUpcoming('user-1'),
      pets: () => petsService.findByUser('user-1'),
      hospitals: () => hospitalsService.findNearby({ lat: 37.5, lon: 127.0 }),
    };

    // Sequential execution
    const sequentialStart = Date.now();
    const seq1 = await services.bookings();
    const seq2 = await services.pets();
    const seq3 = await services.hospitals();
    const sequentialTime = Date.now() - sequentialStart;

    // Parallel execution
    const parallelStart = Date.now();
    const [par1, par2, par3] = await Promise.all([
      services.bookings(),
      services.pets(),
      services.hospitals(),
    ]);
    const parallelTime = Date.now() - parallelStart;

    console.log(`Sequential: ${sequentialTime}ms, Parallel: ${parallelTime}ms`);
    console.log(`Speedup: ${(sequentialTime / parallelTime).toFixed(2)}x`);

    expect(parallelTime).toBeLessThan(sequentialTime);
  });
});
```

### Database Query Optimization

```typescript
it('should use optimized queries with proper joins', async () => {
  const queryLogger = [];

  // Enable query logging
  const connection = app.get(Connection);
  connection.logger = {
    logQuery: (query) => queryLogger.push(query),
  };

  await request(app.getHttpServer())
    .get('/bff/consumer/home')
    .set('Authorization', `Bearer ${token}`);

  // Analyze queries
  const selectQueries = queryLogger.filter(q => q.includes('SELECT'));
  console.log(`Total SELECT queries: ${selectQueries.length}`);

  // Should use joins, not N+1 queries
  expect(selectQueries.length).toBeLessThan(10);
});
```

## Memory Profiling

### Memory Leak Detection

```typescript
describe('Memory Usage', () => {
  it('should not leak memory over time', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      await request(app.getHttpServer())
        .get('/bff/consumer/home')
        .set('Authorization', `Bearer ${token}`);
    }

    // Force garbage collection
    if (global.gc) global.gc();

    const finalMemory = process.memoryUsage().heapUsed;
    const leakMB = (finalMemory - initialMemory) / 1024 / 1024;

    console.log(`Memory leak: ${leakMB.toFixed(2)} MB`);

    // Should not leak more than 50MB
    expect(leakMB).toBeLessThan(50);
  });
});
```

### Run with Memory Profiling

```bash
# Enable garbage collection exposure
node --expose-gc dist/main.js

# Run with heap snapshot
node --heap-prof dist/main.js

# Analyze with clinic.js
npx clinic doctor -- node dist/main.js
```

## Benchmarking Tools

### K6 Load Testing

Create `loadtest/k6-script.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.01'],    // Error rate <1%
  },
};

export default function () {
  const token = 'your-jwt-token';

  let res = http.get('http://localhost:3000/bff/consumer/home?limit=5', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
    'has bookings': (r) => JSON.parse(r.body).upcomingBookings !== undefined,
  });

  sleep(1);
}
```

Run K6:
```bash
k6 run loadtest/k6-script.js
```

## Performance Optimization Checklist

### Database Level
- [ ] Indexes created on frequently queried fields
- [ ] N+1 query problems eliminated with proper joins
- [ ] Read replicas configured for read-heavy operations
- [ ] Connection pooling optimized (min: 5, max: 20)
- [ ] Query result pagination implemented

### Caching Level
- [ ] Redis configured with appropriate memory limits
- [ ] TTL values tuned based on data freshness requirements
- [ ] Cache key namespacing implemented
- [ ] Cache invalidation strategy documented
- [ ] Cache warming on deployment

### Application Level
- [ ] Parallel execution for independent queries
- [ ] Response compression enabled (gzip/brotli)
- [ ] Unnecessary data transformations removed
- [ ] Error handling doesn't block responses
- [ ] Connection reuse for external services

### Infrastructure Level
- [ ] Auto-scaling configured
- [ ] Load balancer health checks tuned
- [ ] CDN configured for static assets
- [ ] Database and cache in same region as API
- [ ] Monitoring and alerting configured

## Performance Monitoring

### Metrics to Track

```typescript
// Example metrics collection
@Get('home')
async getHomeScreen(@Request() req, @Query() query) {
  const startTime = Date.now();

  try {
    const result = await this.aggregationService.getOrCache(/* ... */);

    // Track metrics
    const metrics = {
      endpoint: 'bff.consumer.home',
      duration: Date.now() - startTime,
      cached: result.cached,
      userId: req.user.id,
      timestamp: new Date(),
    };

    // Send to monitoring service
    this.metricsService.record(metrics);

    return result.data;
  } catch (error) {
    this.metricsService.recordError({
      endpoint: 'bff.consumer.home',
      error: error.message,
      userId: req.user.id,
    });
    throw error;
  }
}
```

### Prometheus Metrics

```typescript
import { Counter, Histogram } from 'prom-client';

const requestDuration = new Histogram({
  name: 'bff_request_duration_seconds',
  help: 'BFF request duration in seconds',
  labelNames: ['endpoint', 'cached'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const cacheHitRate = new Counter({
  name: 'bff_cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['endpoint'],
});

// Usage
requestDuration
  .labels('consumer.home', result.cached.toString())
  .observe(duration / 1000);

if (result.cached) {
  cacheHitRate.labels('consumer.home').inc();
}
```

## Continuous Performance Testing

### GitHub Actions Workflow

```yaml
name: Performance Tests

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # Daily

jobs:
  performance:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Start services
        run: |
          docker-compose up -d postgres redis
          npm run start:dev &
          sleep 30

      - name: Run load test
        run: |
          npm install -g artillery
          artillery run loadtest/bff-loadtest.yml --output report.json

      - name: Analyze results
        run: |
          artillery report report.json
          node scripts/check-performance-thresholds.js report.json

      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: performance-report
          path: report.html
```

## Troubleshooting Performance Issues

### Slow Queries
```bash
# Enable PostgreSQL slow query log
ALTER DATABASE pet_to_you SET log_min_duration_statement = 1000;

# Check slow queries
SELECT * FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### High Memory Usage
```bash
# Monitor Redis memory
redis-cli INFO memory

# Check for memory leaks with heapdump
npm install heapdump
node --require heapdump dist/main.js

# Create heap snapshot
kill -USR2 <pid>
```

### Cache Issues
```bash
# Monitor cache hit rate
redis-cli INFO stats | grep keyspace

# Check cache size
redis-cli DBSIZE

# Monitor cache operations
redis-cli MONITOR
```
