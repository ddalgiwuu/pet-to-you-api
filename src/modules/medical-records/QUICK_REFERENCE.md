# Medical Records Module - Quick Reference

## 🚀 Quick Start

```typescript
// 1. Import module in app.module.ts
import { MedicalRecordsModule } from './modules/medical-records';

// 2. Run database migration
npm run migration:generate -- CreateMedicalRecordsTables
npm run migration:run

// 3. Start using APIs
```

## 📝 Common Use Cases

### Create Health Note
```typescript
POST /medical-records/health-notes
Authorization: Bearer <token>

{
  "petId": "pet-uuid",
  "hospitalName": "서울동물병원",
  "veterinarianName": "김수의",
  "visitDate": "2024-01-15T10:30:00Z",
  "visitReason": "정기 건강 검진",
  "diagnosis": "경미한 위염", // Will be encrypted
  "treatment": "링거 처치",   // Will be encrypted
  "temperature": 38.5,
  "weight": 12.5,
  "totalCost": 150000,
  
  // Required for audit
  "purpose": "진료 목적",
  "legalBasis": "진료계약 이행"
}
```

### Get Health History
```typescript
GET /medical-records/pets/:petId/health-notes?startDate=2024-01-01&limit=10
Authorization: Bearer <token>

Body: {
  "purpose": "진료 기록 조회",
  "legalBasis": "정보주체 동의"
}
```

### Add Vaccination
```typescript
POST /medical-records/vaccinations
Authorization: Bearer <token>

{
  "petId": "pet-uuid",
  "vaccineType": "dhppl",
  "vaccineName": "노비백 DHPPL",
  "vaccinationDate": "2024-01-15",
  "nextDueDate": "2025-01-15",
  "hospitalName": "서울동물병원",
  "veterinarianName": "김수의",
  "cost": 50000
}
```

## 🔒 Security Checklist

- ✅ Always include JWT token in Authorization header
- ✅ Provide `purpose` and `legalBasis` for health note access
- ✅ Verify pet ownership before operations
- ✅ Never log decrypted sensitive data
- ✅ Use HTTPS in production

## 🗂️ Database Schema

### Health Notes
```typescript
{
  id: UUID,
  petId: UUID (FK → pets),
  
  // Encrypted fields (JSONB)
  diagnosisEncrypted: EncryptedData,
  treatmentEncrypted: EncryptedData,
  prescriptionEncrypted: EncryptedData,
  
  // Plain fields
  hospitalName: string,
  visitDate: Date,
  temperature: number,
  weight: number,
  ...
}
```

### Vaccination Records
```typescript
{
  id: UUID,
  petId: UUID (FK → pets),
  vaccineType: VaccineType (enum),
  vaccinationDate: Date,
  nextDueDate: Date,
  reminderEnabled: boolean,
  ...
}
```

## ⚡ Performance Tips

1. **Use caching**: Results cached for 5 minutes
2. **Filter by date**: Use `startDate`/`endDate` query params
3. **Limit results**: Use `limit` parameter
4. **Batch operations**: Create multiple records in parallel

## 🔧 Error Handling

```typescript
try {
  const healthNote = await medicalRecordsService.getHealthNote(id, userId, ...);
} catch (error) {
  if (error instanceof NotFoundException) {
    // Health note not found
  } else if (error instanceof ForbiddenException) {
    // Not the pet owner
  }
}
```

## 📊 Audit Log Structure

Every access creates an audit log:
```typescript
{
  userId: string,
  action: 'view_medical_record' | 'create_medical_record' | ...,
  resource: 'health_note',
  resourceId: string,
  purpose: '진료 목적',           // Required
  legalBasis: '진료계약 이행',     // Required
  ipAddress: string,
  userAgent: string,
  timestamp: Date,
  hash: string,                    // Tamper-proof chain
  previousHash: string
}
```

## 🧪 Testing Examples

```typescript
describe('MedicalRecordsService', () => {
  it('should encrypt sensitive fields', async () => {
    const dto = {
      diagnosis: 'Test diagnosis',
      treatment: 'Test treatment',
      ...
    };
    
    const note = await service.createHealthNote(dto, userId, ...);
    
    expect(note.diagnosisEncrypted).toBeDefined();
    expect(note.diagnosisEncrypted.encrypted).toBeTruthy();
  });
  
  it('should decrypt on retrieval', async () => {
    const note = await service.getHealthNote(id, userId, ...);
    
    expect(note.diagnosis).toBe('Test diagnosis');
    expect(note.treatment).toBe('Test treatment');
  });
});
```

## 📱 Frontend Integration

### React Example
```typescript
// Create health note
const createHealthNote = async (data) => {
  const response = await fetch('/medical-records/health-notes', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...data,
      purpose: '진료 목적',
      legalBasis: '진료계약 이행',
    }),
  });
  
  return response.json();
};

// Get health timeline
const getHealthTimeline = async (petId) => {
  const response = await fetch(`/medical-records/pets/${petId}/timeline`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      purpose: '건강 기록 조회',
      legalBasis: '정보주체 동의',
    }),
  });
  
  return response.json();
};
```

## 🔔 Vaccination Reminders

```typescript
// Get upcoming vaccinations (next 30 days)
GET /medical-records/pets/:petId/vaccinations/upcoming?daysAhead=30

// Response
[
  {
    vaccineType: 'dhppl',
    vaccineName: '노비백 DHPPL',
    nextDueDate: '2024-02-15',
    reminderDaysBefore: 14,
    // Reminder will be sent on 2024-02-01
  }
]
```

## 📊 Health Timeline View

```typescript
GET /medical-records/pets/:petId/timeline

// Response
{
  "healthNotes": [
    {
      "visitDate": "2024-01-15",
      "diagnosis": "경미한 위염",
      "treatment": "링거 처치"
    }
  ],
  "vaccinations": [
    {
      "vaccinationDate": "2024-01-10",
      "vaccineType": "dhppl",
      "nextDueDate": "2025-01-10"
    }
  ]
}
```

## 🔍 Search Medical Records

```typescript
// Search by hospital, vet, or reason
GET /medical-records/pets/:petId/search?q=서울동물병원

// Response: Health notes matching query
[
  {
    "hospitalName": "서울동물병원",
    "visitDate": "2024-01-15",
    ...
  }
]

// Note: Cannot search encrypted fields (diagnosis, treatment, prescription)
```

## 💡 Best Practices

1. **Always audit access**: Include meaningful purpose
2. **Cache wisely**: Use caching for read-heavy operations
3. **Validate input**: Use DTOs with class-validator
4. **Handle errors**: Catch and log encryption/decryption errors
5. **Monitor performance**: Track encryption overhead
6. **Regular backups**: Encrypted data cannot be recovered if keys are lost

## 🚨 Common Pitfalls

❌ **DON'T**:
- Search encrypted fields directly
- Skip purpose/legal basis in audit logs
- Delete records physically (use soft delete)
- Log decrypted data in production
- Share encryption keys

✅ **DO**:
- Use provided DTOs for validation
- Include audit information in all requests
- Cache frequently accessed records
- Monitor cache hit rates
- Rotate encryption keys periodically

## 📞 Support

- Security issues: security@pet-to-you.com
- Technical questions: dev@pet-to-you.com
- Medical compliance: medical@pet-to-you.com
