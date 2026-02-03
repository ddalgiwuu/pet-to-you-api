# Medical Records Module - Integration Checklist

## ✅ Pre-Integration Verification

### 1. Dependencies Check
```bash
# Ensure these modules exist:
- [x] src/core/encryption/encryption.service.ts
- [x] src/core/audit/audit.service.ts
- [x] src/modules/pets/entities/pet.entity.ts

# Install required packages (if not already installed):
npm install @nestjs/cache-manager cache-manager
npm install class-validator class-transformer
npm install @nestjs/swagger
```

### 2. Environment Variables
Add to `.env`:
```bash
# Encryption (should already exist)
ENCRYPTION_MASTER_KEY=<32-byte-hex-key>
KMS_KEY_ID=<kms-key-id>

# Database (should already exist)
DATABASE_URL=postgresql://...
```

### 3. Database Migration

#### Option A: Generate Migration
```bash
npm run migration:generate -- src/migrations/CreateMedicalRecordsTables
npm run migration:run
```

#### Option B: Manual SQL (if needed)
```sql
-- Create health_notes table
CREATE TABLE health_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  
  -- Hospital & Veterinarian
  hospital_name VARCHAR(200) NOT NULL,
  hospital_address VARCHAR(200),
  hospital_phone VARCHAR(20),
  veterinarian_name VARCHAR(100) NOT NULL,
  veterinarian_license VARCHAR(50),
  
  -- Visit Info
  visit_date TIMESTAMP NOT NULL,
  visit_reason VARCHAR(500) NOT NULL,
  visit_type VARCHAR(100),
  
  -- ENCRYPTED FIELDS (stores EncryptedData as JSONB)
  diagnosis_encrypted JSONB NOT NULL,
  treatment_encrypted JSONB NOT NULL,
  prescription_encrypted JSONB,
  
  -- Vital Signs
  temperature DECIMAL(4,1),
  weight DECIMAL(5,2),
  heart_rate INTEGER,
  respiratory_rate INTEGER,
  blood_pressure VARCHAR(20),
  
  -- Lab Results & Attachments
  lab_results JSONB,
  attachment_urls TEXT[],
  
  -- Follow-up
  follow_up_recommendations TEXT,
  next_appointment_date TIMESTAMP,
  next_appointment_reason VARCHAR(500),
  
  -- Cost
  cost_breakdown JSONB,
  total_cost INTEGER,
  payment_method VARCHAR(50),
  insurance_claim_id VARCHAR(100),
  
  -- Metadata
  record_type VARCHAR(100),
  notes TEXT,
  is_emergency BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create vaccination_records table
CREATE TABLE vaccination_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  
  -- Vaccine Info
  vaccine_type VARCHAR(50) NOT NULL,
  vaccine_name VARCHAR(200) NOT NULL,
  manufacturer VARCHAR(200),
  batch_number VARCHAR(100),
  dose_number INTEGER,
  
  -- Dates
  vaccination_date DATE NOT NULL,
  expiration_date DATE,
  next_due_date DATE,
  
  -- Veterinarian
  hospital_name VARCHAR(200) NOT NULL,
  hospital_address VARCHAR(200),
  hospital_phone VARCHAR(20),
  veterinarian_name VARCHAR(100) NOT NULL,
  veterinarian_license VARCHAR(50),
  
  -- Details
  injection_site VARCHAR(20),
  notes TEXT,
  had_reaction BOOLEAN DEFAULT FALSE,
  reaction_details TEXT,
  
  -- Cost
  cost INTEGER,
  payment_method VARCHAR(50),
  
  -- Attachments
  certificate_urls TEXT[],
  
  -- Reminders
  reminder_enabled BOOLEAN DEFAULT TRUE,
  reminder_days_before INTEGER DEFAULT 14,
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMP,
  
  -- Metadata
  is_core BOOLEAN DEFAULT FALSE,
  is_booster BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_health_notes_pet_visit ON health_notes(pet_id, visit_date DESC);
CREATE INDEX idx_health_notes_pet_deleted ON health_notes(pet_id, is_deleted);
CREATE INDEX idx_health_notes_hospital ON health_notes(hospital_name, visit_date);

CREATE INDEX idx_vaccination_pet_date ON vaccination_records(pet_id, vaccination_date DESC);
CREATE INDEX idx_vaccination_upcoming ON vaccination_records(pet_id, next_due_date);
CREATE INDEX idx_vaccination_type ON vaccination_records(vaccine_type, pet_id);
```

## 🔧 Module Registration

### Add to `app.module.ts`
```typescript
import { MedicalRecordsModule } from './modules/medical-records';

@Module({
  imports: [
    // ... existing modules
    MedicalRecordsModule,
  ],
})
export class AppModule {}
```

### Verify Module Loading
```bash
npm run start:dev

# Check logs for:
# ✓ MedicalRecordsModule dependencies initialized
# ✓ HealthNote entity registered
# ✓ VaccinationRecord entity registered
# ✓ Medical records routes mapped
```

## 🧪 Testing

### 1. Unit Tests
```bash
# Create test file
touch src/modules/medical-records/services/medical-records.service.spec.ts

# Run tests
npm run test src/modules/medical-records
```

### 2. Integration Tests
```bash
# Create e2e test
touch test/medical-records.e2e-spec.ts

# Run e2e tests
npm run test:e2e medical-records
```

### 3. Manual API Testing (Postman/Insomnia)

#### Step 1: Authenticate
```http
POST /auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Save the JWT token
```

#### Step 2: Create Health Note
```http
POST /medical-records/health-notes
Authorization: Bearer <token>
Content-Type: application/json

{
  "petId": "<pet-uuid>",
  "hospitalName": "서울동물병원",
  "veterinarianName": "김수의",
  "visitDate": "2024-01-15T10:30:00Z",
  "visitReason": "정기 건강 검진",
  "diagnosis": "경미한 위염 의심",
  "treatment": "링거 처치 진행",
  "prescription": "위장약 3일분",
  "temperature": 38.5,
  "weight": 12.5,
  "totalCost": 150000,
  "purpose": "진료 목적",
  "legalBasis": "진료계약 이행"
}

# Expected: 201 Created
```

#### Step 3: Retrieve Health Note
```http
GET /medical-records/health-notes/<id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "purpose": "진료 기록 조회",
  "legalBasis": "정보주체 동의"
}

# Expected: 200 OK with decrypted fields
```

#### Step 4: Create Vaccination Record
```http
POST /medical-records/vaccinations
Authorization: Bearer <token>
Content-Type: application/json

{
  "petId": "<pet-uuid>",
  "vaccineType": "dhppl",
  "vaccineName": "노비백 DHPPL",
  "vaccinationDate": "2024-01-15",
  "nextDueDate": "2025-01-15",
  "hospitalName": "서울동물병원",
  "veterinarianName": "김수의",
  "cost": 50000
}

# Expected: 201 Created
```

## 🔍 Verification Steps

### 1. Database Verification
```sql
-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('health_notes', 'vaccination_records');

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('health_notes', 'vaccination_records');

-- Verify foreign key constraints
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f' AND conrelid::regclass::text LIKE '%health_notes%';
```

### 2. Encryption Verification
```typescript
// In service test or debug endpoint
const encrypted = await encryptionService.encrypt('test data');
console.log('Encrypted:', encrypted);
// Should have: { encrypted, iv, authTag, encryptedDek, version }

const decrypted = await encryptionService.decrypt(encrypted);
console.log('Decrypted:', decrypted);
// Should equal: 'test data'
```

### 3. Audit Log Verification
```sql
-- Check audit logs created
SELECT * FROM audit_logs 
WHERE resource IN ('health_note', 'health_note_list')
ORDER BY timestamp DESC
LIMIT 10;

-- Verify hash chain integrity
-- Each log should have previousHash matching previous entry's hash
```

### 4. Cache Verification
```bash
# Enable debug logging
LOG_LEVEL=debug npm run start:dev

# Look for cache logs:
# - Cache hit for health note <id>
# - Cache miss for health note <id>
# - Cache invalidated for pet <petId>
```

## 🚨 Common Issues & Solutions

### Issue 1: "EncryptionModule not found"
**Solution**: Verify EncryptionModule exists at `src/core/encryption/encryption.module.ts`
```bash
ls -la src/core/encryption/
```

### Issue 2: "AuditService not found"
**Solution**: Verify AuditModule exists at `src/core/audit/audit.module.ts`
```bash
ls -la src/core/audit/
```

### Issue 3: "Pet entity not found"
**Solution**: Verify Pet entity exists
```bash
ls -la src/modules/pets/entities/pet.entity.ts
```

### Issue 4: "Migration fails"
**Solution**: Check database connection and run migrations manually
```bash
npm run typeorm migration:run
```

### Issue 5: "Cache module error"
**Solution**: Install cache-manager
```bash
npm install @nestjs/cache-manager cache-manager
```

## 📊 Performance Benchmarks

After integration, verify performance:

```bash
# Load test with Apache Bench
ab -n 1000 -c 10 -H "Authorization: Bearer <token>" \
  http://localhost:3000/medical-records/pets/<petId>/health-notes

# Expected metrics:
# - Requests per second: > 100
# - Mean response time: < 100ms (cached)
# - Mean response time: < 500ms (uncached with decryption)
# - Cache hit rate: > 80% for repeated requests
```

## 🎯 Success Criteria

- [x] All files created in `src/modules/medical-records/`
- [ ] Database tables created with indexes
- [ ] Module registered in `app.module.ts`
- [ ] All endpoints return expected responses
- [ ] Encryption/decryption working correctly
- [ ] Audit logs being created
- [ ] Cache hit rate > 80% for repeated requests
- [ ] Pet ownership verification enforced
- [ ] No TypeScript compilation errors
- [ ] All tests passing (when written)

## 📝 Next Actions

1. **Run database migration**
   ```bash
   npm run migration:generate -- CreateMedicalRecordsTables
   npm run migration:run
   ```

2. **Register module in app.module.ts**
   - Add `MedicalRecordsModule` to imports

3. **Test API endpoints**
   - Use Postman collection (create one)
   - Verify all CRUD operations

4. **Write tests**
   - Unit tests for service
   - Integration tests for controller
   - E2E tests for complete flows

5. **Deploy to staging**
   - Test with real data
   - Monitor performance
   - Verify audit logs

6. **Production deployment**
   - Enable monitoring
   - Set up alerts
   - Document for operations team

## 🔗 Related Documentation

- [README.md](./README.md) - Comprehensive module documentation
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Implementation details
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Developer quick reference

## 📞 Support

If you encounter issues during integration:
- Technical: dev@pet-to-you.com
- Security: security@pet-to-you.com
- Compliance: medical@pet-to-you.com
