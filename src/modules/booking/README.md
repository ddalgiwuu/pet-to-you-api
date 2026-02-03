# 📅 Booking Module

High-performance booking system with distributed locking, intelligent slot calculation, and automatic status transitions.

## 🏗️ Architecture

```
booking/
├── entities/
│   └── booking.entity.ts              # Booking entity with helper methods
├── dto/
│   ├── create-booking.dto.ts          # Create booking validation
│   ├── update-booking.dto.ts          # Update booking validation
│   ├── get-available-slots.dto.ts     # Slot query and response DTOs
│   └── booking-filter.dto.ts          # Filtering and pagination
├── services/
│   ├── bookings.service.ts            # Main booking operations
│   └── slot-calculator.service.ts     # Slot availability calculation
├── controllers/
│   └── bookings.controller.ts         # REST API endpoints
└── bookings.module.ts                 # Module configuration
```

## ✨ Features

### 1. **Distributed Locking (Redis)**
- Prevents double-booking with Redis distributed locks
- 30-second lock timeout with automatic retry (3 attempts)
- Exponential backoff for lock acquisition
- Automatic lock release (even on errors)

```typescript
// Lock key format: booking:lock:{resourceId}:{startDateTime}
const lockKey = `booking:lock:${resourceId}:${timestamp}`;
const acquired = await redis.set(lockKey, '1', 'EX', 30, 'NX');
```

### 2. **Intelligent Slot Calculation**
- Based on hospital operating hours with break times
- Configurable slot duration (default: 30 minutes)
- Buffer time between bookings (5 minutes)
- Korean holiday detection
- Redis caching (5-minute TTL)

**Slot Generation Algorithm:**
1. Parse hospital operating hours
2. Generate slots based on duration + buffer
3. Exclude break times
4. Check existing bookings
5. Return available/unavailable slots

### 3. **Automatic Status Transitions**
- **PENDING** → **CONFIRMED** → **IN_PROGRESS** → **COMPLETED** → **REVIEWED**
- **PENDING** → **CANCELLED** (user cancellation)
- **PENDING** → **NO_SHOW** (no-show after booking time)

### 4. **Smart Refund Calculation**
- **24+ hours before**: 100% refund
- **2-24 hours before**: 50% refund
- **< 2 hours**: No refund
- Cannot cancel after booking time

### 5. **Performance Optimizations**

#### Database Indexes
```sql
-- Composite indexes for common queries
CREATE INDEX idx_bookings_user_status ON bookings(user_id, status);
CREATE INDEX idx_bookings_hospital_datetime ON bookings(hospital_id, start_date_time);
CREATE INDEX idx_bookings_status_datetime ON bookings(status, start_date_time);
CREATE INDEX idx_bookings_resource_type ON bookings(resource_type);
CREATE INDEX idx_bookings_booking_number ON bookings(booking_number) UNIQUE;
```

#### Redis Caching
- **Slot availability**: 5-minute TTL
- **Cache invalidation**: On new booking, cancellation
- **Lock expiration**: 30 seconds

#### Query Optimization
- Use `BETWEEN` for date range queries
- Left join relations only when needed
- Pagination with `skip/take`
- Select only required fields

## 🚀 API Endpoints

### POST /bookings
Create new booking with distributed locking.

**Request:**
```json
{
  "petId": "550e8400-e29b-41d4-a716-446655440000",
  "resourceType": "hospital",
  "resourceId": "660e8400-e29b-41d4-a716-446655440000",
  "type": "consultation",
  "startDateTime": "2024-01-20T14:00:00.000Z",
  "durationMinutes": 30,
  "notes": "강아지가 최근 식욕이 없어요",
  "services": ["일반진료", "예방접종"],
  "estimatedPrice": 50000
}
```

**Response:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "bookingNumber": "BOK-20240120-A1B2C3",
  "status": "pending",
  "paymentStatus": "pending",
  "startDateTime": "2024-01-20T14:00:00.000Z",
  "endDateTime": "2024-01-20T14:30:00.000Z",
  "durationMinutes": 30,
  "estimatedPrice": 50000,
  "createdAt": "2024-01-17T10:00:00.000Z"
}
```

**Status Codes:**
- `201`: Booking created successfully
- `400`: Invalid booking time or operating hours
- `404`: Hospital or pet not found
- `409`: Time slot already booked or currently being booked

---

### GET /bookings
List user's bookings with filters and pagination.

**Query Parameters:**
- `status`: Filter by booking status (pending, confirmed, etc.)
- `type`: Filter by booking type (consultation, vaccination, etc.)
- `paymentStatus`: Filter by payment status
- `hospitalId`: Filter by hospital
- `petId`: Filter by pet
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `page`: Page number (default: 1)
- `limit`: Page size (default: 20)

**Example:**
```
GET /bookings?status=confirmed&startDate=2024-01-01&endDate=2024-01-31&page=1&limit=20
```

**Response:**
```json
{
  "bookings": [...],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

### GET /bookings/slots/available
Get available time slots for a hospital on a specific date.

**Query Parameters:**
- `hospitalId`: Hospital ID (required)
- `date`: Date (YYYY-MM-DD) (required)
- `durationMinutes`: Slot duration in minutes (default: 30)

**Example:**
```
GET /bookings/slots/available?hospitalId=660e8400...&date=2024-01-20&durationMinutes=30
```

**Response:**
```json
[
  {
    "startTime": "2024-01-20T09:00:00.000Z",
    "endTime": "2024-01-20T09:30:00.000Z",
    "available": true
  },
  {
    "startTime": "2024-01-20T09:35:00.000Z",
    "endTime": "2024-01-20T10:05:00.000Z",
    "available": false,
    "reason": "예약 마감"
  }
]
```

**Cache:** 5-minute TTL, invalidated on new booking

---

### GET /bookings/:id
Get booking details.

**Response:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "bookingNumber": "BOK-20240120-A1B2C3",
  "status": "confirmed",
  "type": "consultation",
  "startDateTime": "2024-01-20T14:00:00.000Z",
  "endDateTime": "2024-01-20T14:30:00.000Z",
  "hospital": {
    "id": "660e8400...",
    "name": "서울 동물병원",
    "phoneNumber": "02-1234-5678"
  },
  "pet": {
    "id": "550e8400...",
    "name": "뽀삐",
    "species": "dog"
  }
}
```

---

### PATCH /bookings/:id/cancel
Cancel booking with automatic refund calculation.

**Request:**
```json
{
  "reason": "일정이 변경되어 취소합니다"
}
```

**Response:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "status": "cancelled",
  "cancelledAt": "2024-01-19T10:00:00.000Z",
  "cancellationReason": "일정이 변경되어 취소합니다"
}
```

**Refund Rules:**
- Cannot cancel if booking starts in < 2 hours
- Cannot cancel if already completed or cancelled

---

### PATCH /bookings/:id/confirm
Confirm booking (hospital staff only).

**Response:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "status": "confirmed",
  "confirmedAt": "2024-01-19T10:00:00.000Z"
}
```

**Access:** Hospital staff only

---

## 🔧 Configuration

### Database Indexes
Run migration to create indexes:

```sql
-- High-cardinality indexes
CREATE INDEX idx_bookings_user_status ON bookings(user_id, status);
CREATE INDEX idx_bookings_hospital_datetime ON bookings(hospital_id, start_date_time);
CREATE INDEX idx_bookings_status_datetime ON bookings(status, start_date_time);
CREATE INDEX idx_bookings_resource ON bookings(resource_type, resource_id);
CREATE INDEX idx_bookings_booking_number ON bookings(booking_number) UNIQUE;
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
```

### Redis Configuration
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

### Performance Tuning
```typescript
// Adjust in slot-calculator.service.ts
private readonly SLOT_CACHE_TTL = 300; // 5 minutes
private readonly BUFFER_MINUTES = 5;   // Buffer between bookings

// Adjust in bookings.service.ts
private readonly LOCK_TIMEOUT = 30;     // 30 seconds
private readonly MAX_LOCK_RETRIES = 3;  // 3 retry attempts
```

## 🧪 Testing

### Unit Tests
```bash
npm run test -- bookings.service.spec.ts
npm run test -- slot-calculator.service.spec.ts
```

### Integration Tests
```bash
npm run test:e2e -- bookings.e2e-spec.ts
```

### Manual Testing with cURL

**Create booking:**
```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "petId": "550e8400-e29b-41d4-a716-446655440000",
    "resourceType": "hospital",
    "resourceId": "660e8400-e29b-41d4-a716-446655440000",
    "type": "consultation",
    "startDateTime": "2024-01-20T14:00:00.000Z",
    "durationMinutes": 30,
    "notes": "강아지가 최근 식욕이 없어요"
  }'
```

**Get available slots:**
```bash
curl "http://localhost:3000/bookings/slots/available?hospitalId=660e8400...&date=2024-01-20&durationMinutes=30"
```

## 📊 Performance Metrics

### Expected Performance
- **Booking creation**: < 200ms (with Redis lock)
- **Slot calculation**: < 100ms (cached), < 500ms (uncached)
- **List bookings**: < 150ms (with pagination)
- **Cache hit rate**: > 80% for slot queries

### Optimization Checklist
- ✅ Database indexes on high-cardinality columns
- ✅ Redis distributed locking (30-second timeout)
- ✅ Slot availability caching (5-minute TTL)
- ✅ Query optimization with `BETWEEN` and selective joins
- ✅ Pagination for large result sets
- ✅ Optimistic locking for concurrent updates

## 🔐 Security Considerations

### Audit Logging
All booking operations are logged:
- Create booking
- Cancel booking
- Confirm booking
- Status transitions

### Data Protection
- PCI-DSS compliance for payment data
- PIPA compliance for personal data access
- Hash chain for audit log integrity

### Access Control
- Users can only access their own bookings
- Hospital staff can confirm bookings for their hospital
- Platform admins have full access

## 🚀 Future Enhancements

### Phase 1 (Current)
- ✅ Basic booking CRUD
- ✅ Distributed locking
- ✅ Slot calculation with caching
- ✅ Refund calculation

### Phase 2 (Next)
- [ ] Payment gateway integration (Toss Payments)
- [ ] Email/SMS notifications
- [ ] Reminder system (1 day before)
- [ ] No-show tracking and penalties

### Phase 3 (Future)
- [ ] Recurring bookings
- [ ] Waitlist management
- [ ] Advanced analytics and reporting
- [ ] ML-based slot recommendation
- [ ] Multi-resource booking (rooms, equipment)

## 📚 References

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Redis SET command](https://redis.io/commands/set/)
- [Distributed Locking](https://redis.io/topics/distlock)
