# BFF Module Architecture

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Client Applications                         │
├─────────────────┬────────────────────┬───────────────────────────────┤
│  Mobile App     │  Hospital Web UI   │  Admin Dashboard             │
│  (iOS/Android)  │  (React/Vue)       │  (React)                     │
└────────┬────────┴─────────┬──────────┴──────────┬────────────────────┘
         │                  │                     │
         │ /bff/consumer/*  │ /bff/hospital/*    │ /bff/admin/*
         │                  │                     │
         ▼                  ▼                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          API Gateway (NestJS)                        │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    BFF Layer (This Module)                     │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │ │
│  │  │  Consumer    │  │  Hospital    │  │   Admin      │        │ │
│  │  │  Controller  │  │  Controller  │  │  Controller  │        │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │ │
│  │         │                  │                  │                │ │
│  │         └──────────┬───────┴──────────┬───────┘                │ │
│  │                    │                  │                        │ │
│  │             ┌──────▼──────┐    ┌──────▼──────┐                │ │
│  │             │ Aggregation │    │   Cache     │                │ │
│  │             │   Service   │◄───┤   Service   │                │ │
│  │             └──────┬──────┘    │  (Redis)    │                │ │
│  │                    │           └─────────────┘                │ │
│  └────────────────────┼──────────────────────────────────────────┘ │
└───────────────────────┼──────────────────────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Bookings   │  │  Hospitals  │  │    Pets     │
│   Module    │  │   Module    │  │   Module    │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       ▼                ▼                ▼
┌──────────────────────────────────────────────┐
│            Database Layer                    │
│  ┌─────────────┐         ┌────────────┐     │
│  │ PostgreSQL  │         │  MongoDB   │     │
│  │ (RDBMS)     │         │ (Search)   │     │
│  └─────────────┘         └────────────┘     │
└──────────────────────────────────────────────┘
```

## Data Flow Architecture

### Consumer Home Screen Request Flow

```
1. Mobile App Request
   ↓
2. GET /bff/consumer/home?limit=5&lat=37.5&lon=127.0
   ↓
3. Check Redis Cache (key: "consumer:home:{userId}")
   ├─ HIT → Return cached data (< 100ms)
   └─ MISS ↓
4. Parallel Service Calls (Promise.all)
   ├─ BookingsService.findUpcoming()      ─┐
   ├─ PetsService.getHealthReminders()    ─┤
   ├─ HospitalsService.findNearby()       ─┼─ Concurrent
   ├─ AdoptionService.getRecommendations()─┤
   ├─ InsuranceService.getRecommendations()─┤
   └─ PromotionsService.getActive()       ─┘
   ↓ (All complete in parallel, ~500-800ms)
5. Aggregate Results
   ↓
6. Shape Response (denormalize, format)
   ↓
7. Cache Result (TTL: 5 minutes)
   ↓
8. Return to Client (total: <1s)
```

### Cache Invalidation Flow

```
User Creates Booking
   ↓
BookingsService.create(data)
   ↓
Database Insert
   ↓
Cache Invalidation Event
   ├─ Delete: consumer:home:{userId}
   ├─ Delete: consumer:dashboard:{userId}
   ├─ Delete: pet:profile:{petId}
   └─ Delete: hospital:dashboard:{hospitalId}
   ↓
Next Request = Cache MISS → Fresh Data
```

## Component Architecture

### Aggregation Service Responsibilities

```typescript
┌─────────────────────────────────────────────────┐
│         AggregationService                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  Core Methods:                                  │
│  • executeParallel()     - Parallel execution   │
│  • getOrCache()          - Cache management     │
│  • batchGetOrCache()     - Batch caching        │
│  • generateCacheKey()    - Key generation       │
│  • denormalizeRelations()- Data transformation  │
│  • shapeResponse()       - Response formatting  │
│  • paginate()            - Pagination           │
│  • calculateDistance()   - Geo calculations     │
│                                                 │
│  Error Handling:                                │
│  • Graceful degradation                         │
│  • Circuit breaker pattern                      │
│  • Fallback data                                │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Controller Responsibilities

```typescript
┌─────────────────────────────────────────────────┐
│         Controllers (Consumer/Hospital/Admin)   │
├─────────────────────────────────────────────────┤
│                                                 │
│  Responsibilities:                              │
│  • Request validation (DTOs)                    │
│  • Authentication/Authorization                 │
│  • Service orchestration                        │
│  • Response formatting                          │
│  • Error handling                               │
│  • Logging/Monitoring                           │
│                                                 │
│  NOT Responsible For:                           │
│  • Business logic (in services)                 │
│  • Direct database access                       │
│  • Complex calculations                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Caching Architecture

### Cache Strategy by Data Type

```typescript
┌──────────────────────────────────────────────────────────┐
│              Cache Strategy Matrix                       │
├────────────────────┬──────────┬──────────┬──────────────┤
│ Data Type          │ TTL      │ Strategy │ Invalidation │
├────────────────────┼──────────┼──────────┼──────────────┤
│ Home Screen        │ 5 min    │ User-key │ On booking   │
│ Search Results     │ 10 min   │ Query    │ On update    │
│ Pet Profile        │ 15 min   │ Pet-key  │ On medical   │
│ Hospital Dashboard │ 3 min    │ Hosp-key │ On data chg  │
│ Admin Dashboard    │ 2 min    │ Global   │ On critical  │
│ Static Data        │ 1 hour   │ Content  │ Manual       │
└────────────────────┴──────────┴──────────┴──────────────┘
```

### Cache Key Hierarchy

```
bff:
├── consumer:
│   ├── home:{userId}
│   ├── search:{queryHash}
│   ├── dashboard:{userId}
│   └── booking-info:{hospitalId}:{date}
├── hospital:
│   ├── dashboard:{hospitalId}:{timeRange}
│   ├── revenue:{hospitalId}:{timeRange}
│   └── patients:{hospitalId}
├── admin:
│   ├── dashboard:{timeRange}
│   ├── analytics:{timeRange}
│   └── health
└── pet:
    └── profile:{petId}:{userId}
```

### Cache Memory Management

```
Redis Configuration:
├── Max Memory: 2GB
├── Eviction Policy: allkeys-lru
├── Key Expiration: TTL-based
└── Persistence: AOF (Append Only File)

Memory Distribution:
├── Consumer Caches: 40% (800MB)
├── Hospital Caches: 30% (600MB)
├── Admin Caches: 20% (400MB)
└── Reserve: 10% (200MB)
```

## Error Handling Architecture

### Circuit Breaker Pattern

```
Service Call Flow:

┌─────────────────────────────────────────┐
│     Check Circuit Breaker State         │
└────────┬──────────┬──────────────────┬──┘
         │          │                  │
    CLOSED     HALF-OPEN           OPEN
         │          │                  │
         ▼          ▼                  ▼
   Call Service  Test Call    Return Cached/
         │          │         Fallback Data
         │          │                  │
    Success?    Success?               │
    ┌──┴──┐    ┌──┴──┐                │
   Yes   No   Yes   No                │
    │     │    │     │                 │
    ▼     ▼    ▼     └─────────────────┘
  Return  Increment   Close
  Data    Failures    Circuit
```

### Failure Handling Strategy

```typescript
┌─────────────────────────────────────────────────┐
│           Failure Handling Strategy             │
├─────────────────────────────────────────────────┤
│                                                 │
│  Level 1: Service Timeout (5s)                  │
│  └─> Return partial data with error flag        │
│                                                 │
│  Level 2: Service Error                        │
│  └─> Log error, return fallback/cached data    │
│                                                 │
│  Level 3: Multiple Failures (Circuit Breaker)  │
│  └─> Skip service call, use cached data        │
│                                                 │
│  Level 4: Complete Failure                     │
│  └─> Return minimal safe response + 503        │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Performance Optimization Layers

### Request Processing Pipeline

```
Client Request
    ↓
┌─────────────────────────────────────┐
│  1. Authentication (JWT)            │ ~10ms
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  2. Request Validation (DTOs)       │ ~5ms
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  3. Cache Check (Redis)             │ ~2-5ms
│     └─ HIT? Return immediately      │
└─────────────────┬───────────────────┘
                  ↓ (Cache MISS)
┌─────────────────────────────────────┐
│  4. Parallel Service Calls          │ ~500-800ms
│     └─ Promise.all([...])           │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  5. Data Aggregation                │ ~20-50ms
│     └─ Denormalize, format          │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  6. Cache Store (async)             │ ~2-5ms
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  7. Response Compression (gzip)     │ ~10-30ms
└─────────────────┬───────────────────┘
                  ↓
         Response to Client
```

### Optimization Techniques Applied

```
1. Database Layer:
   ├─ Connection pooling (min: 5, max: 20)
   ├─ Read replicas for queries
   ├─ Optimized indexes
   └─ Query result caching

2. Application Layer:
   ├─ Parallel execution (Promise.all)
   ├─ Response caching (Redis)
   ├─ Data denormalization
   ├─ Pagination
   └─ Lazy loading

3. Network Layer:
   ├─ Response compression (gzip/brotli)
   ├─ HTTP/2 support
   ├─ Keep-alive connections
   └─ CDN for static assets

4. Code Level:
   ├─ Object pooling
   ├─ Memoization
   ├─ Lazy evaluation
   └─ Async/await optimization
```

## Scalability Architecture

### Horizontal Scaling Strategy

```
┌────────────────────────────────────────────────┐
│              Load Balancer (NGINX)             │
└─────┬──────────┬──────────┬──────────┬─────────┘
      │          │          │          │
      ▼          ▼          ▼          ▼
  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
  │ API-1  │ │ API-2  │ │ API-3  │ │ API-N  │
  │ BFF    │ │ BFF    │ │ BFF    │ │ BFF    │
  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
      │          │          │          │
      └──────────┴─────┬────┴──────────┘
                       │
                 ┌─────▼──────┐
                 │   Redis    │
                 │  Cluster   │
                 └─────┬──────┘
                       │
              ┌────────┴────────┐
              │                 │
         ┌────▼────┐      ┌────▼────┐
         │  PG     │      │  Mongo  │
         │ Primary │      │ Primary │
         └────┬────┘      └────┬────┘
              │                │
         ┌────┴────┐      ┌────┴────┐
         │   PG    │      │  Mongo  │
         │ Replica │      │ Replica │
         └─────────┘      └─────────┘
```

### Auto-Scaling Configuration

```yaml
Auto-Scaling Rules:
  triggers:
    - metric: cpu_usage
      threshold: 70%
      action: scale_up
      cooldown: 300s

    - metric: response_time_p95
      threshold: 2000ms
      action: scale_up
      cooldown: 300s

    - metric: cache_hit_rate
      threshold: 50%
      action: alert
      cooldown: 600s

  scaling_policy:
    min_instances: 2
    max_instances: 10
    scale_up_step: 2
    scale_down_step: 1
```

## Monitoring & Observability

### Metrics Collection Points

```
┌─────────────────────────────────────────────────┐
│              Monitoring Stack                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  Application Metrics (Prometheus):              │
│  ├─ Request rate (req/sec)                      │
│  ├─ Response time (p50, p95, p99)               │
│  ├─ Error rate (%)                              │
│  ├─ Cache hit rate (%)                          │
│  └─ Active connections                          │
│                                                 │
│  Business Metrics:                              │
│  ├─ API call reduction (%)                      │
│  ├─ Data freshness (cache age)                  │
│  ├─ Aggregation efficiency                      │
│  └─ Parallel execution time                     │
│                                                 │
│  Infrastructure Metrics:                        │
│  ├─ CPU/Memory usage                            │
│  ├─ Network I/O                                 │
│  ├─ Database connections                        │
│  └─ Redis operations/sec                        │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Security Architecture

### Authentication & Authorization Flow

```
Request with JWT
    ↓
┌─────────────────────────────────────┐
│  JWT Validation                     │
│  └─ Verify signature                │
│  └─ Check expiration                │
│  └─ Extract user info               │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  Role-Based Access Control          │
│  └─ Consumer → Consumer endpoints   │
│  └─ Hospital → Hospital endpoints   │
│  └─ Admin → Admin endpoints         │
└─────────────────┬───────────────────┘
                  ↓
┌─────────────────────────────────────┐
│  Resource Authorization             │
│  └─ User can access own data        │
│  └─ Hospital can access own data    │
│  └─ Admin can access platform data  │
└─────────────────┬───────────────────┘
                  ↓
         Proceed to Controller
```

### Data Privacy

```
Sensitive Data Handling:
├─ PII encryption at rest
├─ TLS 1.3 for data in transit
├─ Cache key hashing for privacy
├─ Audit logging for access
└─ GDPR-compliant data retention
```

## Deployment Architecture

### CI/CD Pipeline

```
Code Commit (Git)
    ↓
Automated Tests
    ├─ Unit Tests
    ├─ Integration Tests
    └─ Performance Tests
    ↓
Build Docker Image
    ↓
Push to Registry
    ↓
Deploy to Staging
    ├─ Smoke Tests
    ├─ Load Tests
    └─ Manual QA
    ↓
Deploy to Production
    ├─ Blue-Green Deployment
    ├─ Gradual Rollout (10% → 50% → 100%)
    └─ Rollback on Error Rate > 1%
```

This architecture ensures **high performance**, **scalability**, **reliability**, and **maintainability** for the BFF module.
