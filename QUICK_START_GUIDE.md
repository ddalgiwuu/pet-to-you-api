# Pet to You API - Quick Start Guide

## ✅ What's Already Done

### Hospital Module - COMPLETE ✅
- PostgreSQL entity with Korean address system
- MongoDB schema with geospatial search
- DTOs with comprehensive validation
- Service with search aggregation
- RESTful controller with Swagger docs
- Module configuration

**Files**: 7 files, ~1,200 lines of production-ready code

---

## 🚀 How to Use the Hospital Module

### 1. Import Module in app.module.ts

```typescript
import { HospitalsModule } from './modules/hospitals/hospitals.module';

@Module({
  imports: [
    DatabaseModule,
    EncryptionModule,
    AuditModule,
    CacheModule.register({ /* redis config */ }),
    UsersModule,
    PetsModule,
    HospitalsModule, // ✅ Add this
  ],
})
export class AppModule {}
```

### 2. Create MongoDB Indexes

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/pet_to_you

# Create geospatial index
db.hospital_search.createIndex({ location: '2dsphere' })

# Create text search index
db.hospital_search.createIndex({ name: 'text', description: 'text' })

# Create compound indexes
db.hospital_search.createIndex({ status: 1, type: 1 })
db.hospital_search.createIndex({ sido: 1, sigungu: 1 })
db.hospital_search.createIndex({ hasEmergency: 1, isCurrentlyOpen: 1 })
db.hospital_search.createIndex({ averageRating: -1 })
```

### 3. Run Migration

```bash
# Generate migration
npm run migration:generate -- -n CreateHospitalsTable

# Run migration
npm run migration:run
```

### 4. Test the API

```bash
# Start server
npm run start:dev

# Create hospital
curl -X POST http://localhost:3000/hospitals \
  -H "Content-Type: application/json" \
  -d '{
    "name": "강남동물병원",
    "type": "general",
    "businessRegistrationNumber": "123-45-67890",
    "representativeName": "홍길동",
    "veterinaryLicenseNumber": "VET-12345",
    "postalCode": "06234",
    "sido": "서울특별시",
    "sigungu": "강남구",
    "roadAddress": "테헤란로 123",
    "latitude": 37.5012,
    "longitude": 127.0396,
    "phoneNumber": "02-1234-5678",
    "services": ["일반진료", "예방접종"],
    "operatingHours": {
      "monday": { "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
      "tuesday": { "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
      "wednesday": { "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
      "thursday": { "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
      "friday": { "isOpen": true, "openTime": "09:00", "closeTime": "18:00" },
      "saturday": { "isOpen": true, "openTime": "09:00", "closeTime": "15:00" },
      "sunday": { "isOpen": false, "openTime": "00:00", "closeTime": "00:00" }
    }
  }'

# Search hospitals near location
curl "http://localhost:3000/hospitals/search?latitude=37.5012&longitude=127.0396&radiusKm=5&page=1&limit=20"

# Get hospital details
curl http://localhost:3000/hospitals/{id}
```

---

## 📋 Implementing Remaining Modules

### Step-by-Step Process (Use Hospital Module as Template)

#### 1. Daycare Module

```bash
# Create files (copy from Hospital module, modify for Daycare)
cp -r src/modules/hospitals src/modules/daycare

# Update entity: daycare.entity.ts
# Changes: Add capacity, facilities, pricing for daycare services
# Same pattern: Korean address, operating hours, geospatial

# Update schema: daycare.schema.ts
# Changes: Add capacity fields, denormalized data
# Same pattern: 2dsphere index, text search

# Update DTOs
# Changes: Add daycare-specific validation
# Same pattern: Korean formats, nested objects

# Update service
# Changes: Availability checking, capacity management
# Same pattern: PostgreSQL + MongoDB sync, audit logging

# Update controller
# Changes: Add /daycare/availability endpoint
# Same pattern: RESTful, Swagger docs

# Create module: daycare.module.ts
```

#### 2. Adoption Module

```bash
# New entities needed:
- adoption-pet.entity.ts
- adoption-application.entity.ts
- shelter.entity.ts

# Key differences:
- Encrypt medical records (use EncryptionService)
- Encrypt personal info in applications
- No geospatial search (use text search only)
- Application workflow (PENDING → APPROVED → ADOPTED)

# Follow pattern:
1. Create entities with encryption fields
2. Create DTOs with validation
3. Create service with encryption logic
4. Create controller with endpoints
5. Create module and import
```

#### 3. Insurance Module

```bash
# New entities needed:
- insurance-policy.entity.ts
- insurance-claim.entity.ts

# Key differences:
- Encrypt financial data (PCI-DSS compliance)
- Encrypt payment info
- Complex claim workflow
- Integration with external insurance APIs

# Follow pattern:
1. Create entities with encrypted fields
2. Create DTOs with financial validation
3. Create service with encryption + audit
4. Create controller with secure endpoints
5. Create module and import
```

#### 4. Booking Module

```bash
# New entities needed:
- booking.entity.ts (✅ Already created)
- booking-slot.entity.ts

# Key differences:
- Distributed locking (Redis)
- Toss Payments integration
- Polymorphic relations (Hospital, Daycare, etc.)
- Reminder system

# Follow pattern:
1. Complete booking-slot.entity.ts
2. Create DTOs for booking/cancellation
3. Create service with distributed locking
4. Create controller with booking flow
5. Create module and import
```

#### 5. Community Module

```bash
# New entities needed:
- post.entity.ts
- comment.entity.ts

# Key differences:
- Moderation features
- Like/bookmark functionality
- Nested comments (parent-child)
- Text search on content

# Follow pattern:
1. Create entities with engagement metrics
2. Create DTOs for posts/comments
3. Create service with text search
4. Create controller with CRUD
5. Create module and import
```

---

## 🔧 Common Code Patterns

### Pattern 1: Entity with Korean Address
```typescript
@Column() postalCode: string; // 5 digits
@Column() sido: string; // 시/도
@Column() sigungu: string; // 시/군/구
@Column() dong?: string; // 동/읍/면
@Column() roadAddress: string; // 도로명주소
@Column({ type: 'decimal' }) latitude: number;
@Column({ type: 'decimal' }) longitude: number;
```

### Pattern 2: MongoDB Geospatial Schema
```typescript
@Prop({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
  },
  index: '2dsphere',
})
location: {
  type: 'Point';
  coordinates: number[];
};
```

### Pattern 3: DTO with Korean Validation
```typescript
@Matches(/^\d{5}$/) postalCode: string;
@Matches(/^0\d{1,2}-\d{3,4}-\d{4}$/) phoneNumber: string;
@Matches(/^\d{3}-\d{2}-\d{5}$/) businessRegistrationNumber: string;
@IsLatitude() latitude: number;
@IsLongitude() longitude: number;
```

### Pattern 4: Service with Encryption
```typescript
async create(dto: CreateDto): Promise<Entity> {
  // Encrypt sensitive data
  const encrypted = await this.encryptionService.encrypt(
    JSON.stringify(dto.sensitiveData)
  );

  const entity = this.repository.create({
    ...dto,
    encryptedField: encrypted,
  });

  const saved = await this.repository.save(entity);

  // Audit log
  await this.auditService.log({
    userId: 'user-id',
    action: AuditAction.CREATE,
    resource: 'entity-name',
    resourceId: saved.id,
    purpose: 'Creation reason',
    legalBasis: 'Legal basis',
    ipAddress: '0.0.0.0',
    userAgent: 'system',
  });

  return saved;
}
```

### Pattern 5: Controller with Swagger
```typescript
@ApiTags('resource-name')
@Controller('resource-name')
export class ResourceController {
  @Post()
  @ApiOperation({ summary: '리소스 생성' })
  @ApiResponse({ status: 201, type: Entity })
  async create(@Body() dto: CreateDto): Promise<Entity> {
    return this.service.create(dto);
  }

  @Get('search')
  @ApiOperation({ summary: '리소스 검색' })
  async search(@Query() dto: SearchDto): Promise<PaginatedResponse> {
    return this.service.search(dto);
  }
}
```

### Pattern 6: Module Configuration
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Entity]),
    MongooseModule.forFeature([{ name: Schema.name, schema: SchemaDefinition }]),
    AuditModule,
    EncryptionModule, // if needed
  ],
  controllers: [ResourceController],
  providers: [ResourceService],
  exports: [ResourceService],
})
export class ResourceModule {}
```

---

## 🧪 Testing Template

### Unit Test Template
```typescript
describe('HospitalService', () => {
  let service: HospitalService;
  let repository: Repository<Hospital>;
  let searchModel: Model<HospitalSearchDocument>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        HospitalService,
        {
          provide: getRepositoryToken(Hospital),
          useValue: createMockRepository(),
        },
        {
          provide: getModelToken(HospitalSearch.name),
          useValue: createMockModel(),
        },
        {
          provide: AuditService,
          useValue: createMockAuditService(),
        },
      ],
    }).compile();

    service = module.get<HospitalService>(HospitalService);
  });

  it('should create hospital', async () => {
    const dto = createValidDto();
    const result = await service.create(dto, 'user-id');
    expect(result.id).toBeDefined();
  });
});
```

### E2E Test Template
```typescript
describe('HospitalsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('POST /hospitals', () => {
    return request(app.getHttpServer())
      .post('/hospitals')
      .send(validDto)
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
      });
  });
});
```

---

## 📦 Environment Setup

### .env Template
```bash
# PostgreSQL
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=pet_to_you
DATABASE_USER=postgres
DATABASE_PASSWORD=password

# MongoDB
MONGODB_URI=mongodb://localhost:27017/pet_to_you

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Encryption
ENCRYPTION_MASTER_KEY=your-256-bit-key-here
BCRYPT_ROUNDS=12

# Toss Payments
TOSS_CLIENT_KEY=test_ck_xxx
TOSS_SECRET_KEY=test_sk_xxx

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=3600

# AWS KMS (Production)
AWS_KMS_KEY_ID=arn:aws:kms:ap-northeast-2:xxx
```

### Docker Compose (Development)
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: pet_to_you
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"

  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"

  redis:
    image: redis:7
    ports:
      - "6379:6379"
```

---

## 🎯 Implementation Priority

### Week 1-2: Core Modules
1. ✅ Hospital Module (COMPLETE)
2. 📋 Daycare Module (copy Hospital pattern)
3. 📋 Adoption Module (add encryption)

### Week 3: Booking System
1. 📋 Complete Booking service
2. 📋 Distributed locking
3. 📋 Toss Payments integration

### Week 4: Remaining Features
1. 📋 Insurance Module
2. 📋 Community Module
3. 📋 Testing

---

## 💡 Pro Tips

1. **Always start with Hospital Module as reference**
   - It has all the patterns you need
   - Copy and modify rather than starting from scratch

2. **Use TypeORM migration for schema changes**
   - Never modify entities directly in production
   - Always generate and review migrations

3. **Test MongoDB indexes**
   - Use `.explain()` to verify query performance
   - Ensure 2dsphere index is being used for geospatial queries

4. **Validate Korean formats strictly**
   - Phone numbers, postal codes, business registration
   - Users expect strict validation for Korean data

5. **Encrypt everything sensitive**
   - Medical records, personal info, financial data
   - Use `EncryptionService` consistently

6. **Audit everything**
   - Every CREATE, UPDATE, DELETE on sensitive resources
   - Include purpose and legal basis for PIPA compliance

7. **Use distributed locks for critical sections**
   - Booking slot reservation
   - Inventory updates
   - Payment processing

---

## 🆘 Common Issues & Solutions

### Issue: MongoDB connection failed
```bash
# Solution: Ensure MongoDB is running
docker-compose up -d mongodb

# Verify connection
mongosh mongodb://localhost:27017/pet_to_you
```

### Issue: Geospatial query not using index
```bash
# Solution: Recreate index with correct format
db.hospital_search.dropIndex('location_2dsphere')
db.hospital_search.createIndex({ location: '2dsphere' })

# Verify with explain
db.hospital_search.find({
  location: {
    $near: {
      $geometry: { type: 'Point', coordinates: [127.0396, 37.5012] },
      $maxDistance: 5000
    }
  }
}).explain('executionStats')
```

### Issue: Distributed lock not releasing
```bash
# Solution: Set shorter TTL and use try-finally
const lockTTL = 30; // 30 seconds max
try {
  // Critical section
} finally {
  await cacheManager.del(lockKey); // Always release
}
```

### Issue: Validation failing for Korean phone numbers
```typescript
// Solution: Use exact regex pattern
@Matches(/^0\d{1,2}-\d{3,4}-\d{4}$/, {
  message: 'Phone number must be in format: 0X(X)-XXXX-XXXX',
})
phoneNumber: string;
```

---

## 📚 Additional Resources

- **IMPLEMENTATION_GUIDE.md**: Complete specifications for all 6 modules
- **PROJECT_SUMMARY.md**: Architecture overview and deployment checklist
- **Hospital Module**: Reference implementation in `/src/modules/hospitals/`

---

**Ready to Start**: Import HospitalsModule → Test API → Implement Daycare Module

**Estimated Time**:
- Daycare Module: 2-3 days (copy Hospital pattern)
- Adoption Module: 3-4 days (add encryption logic)
- Insurance Module: 3-4 days (add financial encryption)
- Booking Module: 4-5 days (distributed locking + Toss)
- Community Module: 2-3 days (straightforward CRUD)

**Total**: ~3-4 weeks for complete backend implementation
