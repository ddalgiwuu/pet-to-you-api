# 🏥 Medical Records Module

Complete medical records management system with **field-level encryption** and **의료법 (Medical Act) compliance**.

## Features

### 🔒 Security & Compliance
- **Field-Level Encryption**: Diagnosis, treatment, and prescription fields encrypted with AES-256-GCM
- **Envelope Encryption**: Each field uses unique Data Encryption Key (DEK)
- **Audit Logging**: Every access logged with purpose and legal basis (의료법 Article 19)
- **10-Year Retention**: Soft delete only, physical deletion prohibited by law
- **Access Control**: Pet owner or treating veterinarian only
- **Tamper-Proof Logs**: Hash chain prevents retroactive tampering

### 📋 Medical Records
- **Health Notes**: Comprehensive medical visit records
  - Hospital and veterinarian information
  - Visit details (date, reason, type)
  - Encrypted diagnosis, treatment, prescription
  - Vital signs (temperature, weight, heart rate, etc.)
  - Lab results and attachments
  - Follow-up recommendations
  - Cost breakdown and insurance integration

- **Vaccination Records**: Complete vaccination tracking
  - Vaccine type and details (name, manufacturer, batch)
  - Vaccination dates and expiration
  - Next due date with reminder system
  - Veterinarian information
  - Reaction tracking
  - Certificate storage

### ⚡ Performance
- **Caching**: 5-minute TTL for recent records
- **Indexed Queries**: (petId, visitDate), (petId, isDeleted)
- **Lazy Loading**: Encrypted fields decrypted on-demand
- **Batch Operations**: Parallel encryption/decryption

## Architecture

```
medical-records/
├── entities/
│   ├── health-note.entity.ts        # Health visit records
│   └── vaccination-record.entity.ts # Vaccination tracking
├── dto/
│   ├── create-health-note.dto.ts
│   ├── update-health-note.dto.ts
│   ├── create-vaccination-record.dto.ts
│   ├── update-vaccination-record.dto.ts
│   └── medical-access.dto.ts        # Purpose & legal basis
├── services/
│   └── medical-records.service.ts   # Core business logic
├── controllers/
│   └── medical-records.controller.ts
├── guards/
│   └── pet-owner.guard.ts           # Access control
└── medical-records.module.ts
```

## API Endpoints

### Health Notes

```http
POST   /medical-records/health-notes
GET    /medical-records/health-notes/:id
GET    /medical-records/pets/:petId/health-notes
PUT    /medical-records/health-notes/:id
DELETE /medical-records/health-notes/:id
```

### Vaccination Records

```http
POST /medical-records/vaccinations
GET  /medical-records/pets/:petId/vaccinations
GET  /medical-records/pets/:petId/vaccinations/upcoming
```

### Timeline & Export

```http
GET /medical-records/pets/:petId/timeline
GET /medical-records/pets/:petId/export/pdf
GET /medical-records/pets/:petId/search?q=검색어
```

## Usage Examples

### Create Health Note

```typescript
POST /medical-records/health-notes
{
  "petId": "123e4567-e89b-12d3-a456-426614174000",
  "hospitalName": "서울동물병원",
  "veterinarianName": "김수의",
  "visitDate": "2024-01-15T10:30:00Z",
  "visitReason": "정기 건강 검진",
  "diagnosis": "경미한 위염 의심. 식이 관리 필요.", // ENCRYPTED
  "treatment": "링거 처치 진행, 위장약 처방",      // ENCRYPTED
  "prescription": "위장약 3일분",                  // ENCRYPTED
  "temperature": 38.5,
  "weight": 12.5,
  "totalCost": 150000,
  
  // Required for audit compliance
  "purpose": "진료 목적",
  "legalBasis": "진료계약 이행"
}
```

### Retrieve Health Notes

```typescript
GET /medical-records/pets/:petId/health-notes
{
  "purpose": "진료 기록 조회",
  "legalBasis": "정보주체 동의"
}

// Response includes decrypted fields
[
  {
    "id": "...",
    "diagnosis": "경미한 위염 의심. 식이 관리 필요.", // Decrypted
    "treatment": "링거 처치 진행, 위장약 처방",      // Decrypted
    "prescription": "위장약 3일분",                  // Decrypted
    ...
  }
]
```

### Create Vaccination Record

```typescript
POST /medical-records/vaccinations
{
  "petId": "123e4567-e89b-12d3-a456-426614174000",
  "vaccineType": "dhppl",
  "vaccineName": "노비백 DHPPL",
  "manufacturer": "MSD Animal Health",
  "batchNumber": "A123456",
  "doseNumber": 1,
  "vaccinationDate": "2024-01-15",
  "nextDueDate": "2025-01-15",
  "hospitalName": "서울동물병원",
  "veterinarianName": "김수의",
  "cost": 50000,
  "reminderEnabled": true,
  "reminderDaysBefore": 14
}
```

### Get Health Timeline

```typescript
GET /medical-records/pets/:petId/timeline
{
  "purpose": "전체 건강 기록 조회",
  "legalBasis": "정보주체 동의"
}

// Response
{
  "healthNotes": [...],
  "vaccinations": [...]
}
```

## Database Schema

### HealthNote Table

```sql
CREATE TABLE health_notes (
  id UUID PRIMARY KEY,
  pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
  
  -- Hospital Info
  hospital_name VARCHAR(200),
  hospital_address VARCHAR(200),
  hospital_phone VARCHAR(20),
  veterinarian_name VARCHAR(100),
  veterinarian_license VARCHAR(50),
  
  -- Visit Info
  visit_date TIMESTAMP,
  visit_reason VARCHAR(500),
  visit_type VARCHAR(100),
  
  -- ENCRYPTED FIELDS (JSONB stores EncryptedData)
  diagnosis_encrypted JSONB NOT NULL,
  treatment_encrypted JSONB NOT NULL,
  prescription_encrypted JSONB,
  
  -- Vital Signs
  temperature DECIMAL(4,1),
  weight DECIMAL(5,2),
  heart_rate INTEGER,
  respiratory_rate INTEGER,
  blood_pressure VARCHAR(20),
  
  -- Lab Results
  lab_results JSONB,
  attachment_urls TEXT[],
  
  -- Follow-up
  follow_up_recommendations TEXT,
  next_appointment_date TIMESTAMP,
  
  -- Cost
  cost_breakdown JSONB,
  total_cost INTEGER,
  
  -- Metadata
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_health_notes_pet_visit ON health_notes(pet_id, visit_date DESC);
CREATE INDEX idx_health_notes_hospital ON health_notes(hospital_name, visit_date);
```

### VaccinationRecord Table

```sql
CREATE TABLE vaccination_records (
  id UUID PRIMARY KEY,
  pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
  
  -- Vaccine Info
  vaccine_type VARCHAR(50),
  vaccine_name VARCHAR(200),
  manufacturer VARCHAR(200),
  batch_number VARCHAR(100),
  dose_number INTEGER,
  
  -- Dates
  vaccination_date DATE,
  expiration_date DATE,
  next_due_date DATE,
  
  -- Veterinarian
  hospital_name VARCHAR(200),
  veterinarian_name VARCHAR(100),
  
  -- Details
  injection_site VARCHAR(20),
  notes TEXT,
  had_reaction BOOLEAN DEFAULT FALSE,
  reaction_details TEXT,
  
  -- Reminders
  reminder_enabled BOOLEAN DEFAULT TRUE,
  reminder_days_before INTEGER DEFAULT 14,
  reminder_sent BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vaccination_pet_date ON vaccination_records(pet_id, vaccination_date DESC);
CREATE INDEX idx_vaccination_upcoming ON vaccination_records(pet_id, next_due_date);
```

## Security Implementation

### Field-Level Encryption

```typescript
// Encryption (on create/update)
const diagnosisEncrypted = await encryptionService.encrypt(diagnosis);
// Stores: { encrypted, iv, authTag, encryptedDek, version }

// Decryption (on retrieve)
const diagnosis = await encryptionService.decrypt(diagnosisEncrypted);
```

### Audit Logging

```typescript
await auditService.log({
  userId: req.user.id,
  action: AuditAction.VIEW_MEDICAL_RECORD,
  resource: 'health_note',
  resourceId: healthNote.id,
  purpose: '진료 목적',              // Required by 의료법
  legalBasis: '진료계약 이행',        // Required by PIPA
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  metadata: { petId: healthNote.petId }
});
```

### Access Control Flow

```
1. JWT Authentication → req.user
2. PetOwnerGuard → Verify pet ownership
3. Service Layer → Decrypt sensitive fields
4. Audit Logging → Record access with purpose
5. Cache Result → 5-minute TTL
```

## Compliance Checklist

### 의료법 (Medical Act) Article 19
- ✅ Purpose of access recorded (진료 목적, 보험 청구 목적, etc.)
- ✅ 10-year retention policy (soft delete only)
- ✅ Access logs preserved
- ✅ Encrypted storage for sensitive data

### 개인정보보호법 (PIPA)
- ✅ Legal basis for processing (진료계약 이행, 정보주체 동의, etc.)
- ✅ Encryption of sensitive medical data
- ✅ Access control and audit trails
- ✅ Data minimization (only necessary fields)

## Performance Optimization

### Caching Strategy
- Cache individual health notes (5 min TTL)
- Cache pet health note lists (5 min TTL)
- Cache vaccination records (5 min TTL)
- Invalidate on create/update/delete

### Query Optimization
```typescript
// Index on (petId, visitDate DESC)
CREATE INDEX idx_health_notes_pet_visit ON health_notes(pet_id, visit_date DESC);

// Index on (petId, isDeleted)
CREATE INDEX idx_health_notes_pet_deleted ON health_notes(pet_id, is_deleted);
```

### Encryption Performance
- Parallel encryption/decryption using Promise.all()
- Lazy loading (decrypt only when accessed)
- Envelope encryption (fast symmetric encryption with DEK)

## Future Enhancements

### Phase 1 (Current)
- ✅ Health notes with encryption
- ✅ Vaccination records
- ✅ Basic timeline
- ✅ Audit logging

### Phase 2
- [ ] PDF export implementation
- [ ] Vaccination reminder scheduler
- [ ] Medical record sharing (temporary access)
- [ ] Integration with hospital systems

### Phase 3
- [ ] AI-powered health insights
- [ ] Symptom tracking
- [ ] Medication reminders
- [ ] Telemedicine integration

## Testing

```bash
# Unit tests
npm run test src/modules/medical-records

# Integration tests
npm run test:e2e medical-records

# Encryption tests
npm run test src/core/encryption

# Audit tests
npm run test src/core/audit
```

## Support

For questions or issues:
- Security: security@pet-to-you.com
- Medical: medical@pet-to-you.com
- General: support@pet-to-you.com
