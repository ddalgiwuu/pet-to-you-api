# Insurance Module (보험 모듈)

Complete Korean pet insurance module with policy comparison, AI recommendations, and encrypted claims processing.

## 🎯 Features

### 1. **Insurance Policy Comparison** (정책 비교)
- Compare policies from 5 major Korean insurance companies
  - 삼성화재 (Samsung Fire)
  - KB손해보험 (KB Insurance)
  - 현대해상 (Hyundai Marine)
  - DB손해보험 (DB Insurance)
  - 메리츠화재 (Meritz Fire)
- AI-powered recommendation scoring
- 24-hour result caching for performance

### 2. **AI Recommendations** (AI 추천)
- Pet-specific recommendations based on:
  - Age (연령)
  - Breed (품종)
  - Health conditions (건강 상태)
- Weighted scoring algorithm:
  - Coverage amount (30%)
  - Premium cost (25%)
  - Coverage scope (20%)
  - Popularity (15%)
  - Rating (10%)

### 3. **Encrypted Claims Processing** (암호화된 청구 처리)
- **Security Features**:
  - Medical record encryption (EncryptionService)
  - Diagnosis and treatment details protected
  - Audit logging for compliance (보험업법)
- **Performance Goals**:
  - Target: 30분 → 3분 processing time
  - Async queue processing
  - Auto-document generation from medical records

### 4. **Subscription Management** (가입 관리)
- Policy subscription with eligibility checks
- Age and breed restrictions
- Waiting period enforcement
- Auto-renewal support

## 📁 Module Structure

```
insurance/
├── entities/
│   ├── insurance-policy.entity.ts      # 보험 정책
│   ├── insurance-claim.entity.ts       # 보험 청구 (ENCRYPTED)
│   └── user-insurance.entity.ts        # 사용자 가입 정보
├── dto/
│   ├── compare-policies.dto.ts         # 정책 비교 요청
│   ├── submit-claim.dto.ts             # 청구 제출
│   ├── subscribe-policy.dto.ts         # 보험 가입
│   └── update-claim-status.dto.ts      # 청구 상태 업데이트
├── services/
│   └── insurance.service.ts            # 비즈니스 로직
├── controllers/
│   └── insurance.controller.ts         # REST API
├── insurance.module.ts                 # 모듈 정의
├── index.ts                            # Exports
└── README.md                           # 문서
```

## 🔐 Security Features

### Encrypted Claims (암호화된 청구)

**Encrypted Fields** (using `EncryptionService`):
- Diagnosis (진단명)
- Treatment details (치료 내용)
- Medical record details (의료 기록)
- Hospital name (병원명)
- Veterinarian name (수의사명)

**Example**:
```typescript
// Submit claim - encryption happens automatically
const claim = await insuranceService.submitClaim(userId, {
  diagnosis: '슬개골 탈구',
  treatment: '수술 및 재활',
  hospitalName: '서울동물병원',
  // ... other fields
});

// Get claim details - decryption happens automatically
const details = await insuranceService.getClaimDetails(claimId, userId);
console.log(details.claimDetails.diagnosis); // 슬개골 탈구
```

### Audit Logging (감사 로그)

All claim operations are logged for compliance:
```typescript
{
  action: 'claim_submitted',
  userId: 'user-id',
  resourceType: 'insurance_claim',
  resourceId: 'claim-id',
  details: { claimNumber, claimType, totalClaimAmount }
}
```

## 🚀 API Endpoints

### Policy Comparison & Recommendations

**Compare Policies**
```http
GET /insurance/policies/compare?species=dog&ageMonths=24&breed=말티즈
```

Response:
```json
{
  "totalPolicies": 5,
  "recommendations": [
    {
      "id": "policy-id",
      "company": "samsung_fire",
      "companyName": "삼성화재",
      "policyName": "펫보험 프리미엄",
      "monthlyPremium": 45000,
      "maxCoveragePerYear": 10000000,
      "coveragePercentage": 80,
      "aiScore": 87.5
    }
  ],
  "searchCriteria": { ... },
  "generatedAt": "2024-01-17T12:00:00Z"
}
```

**Recommend for Pet**
```http
GET /insurance/policies/recommend/:petId
```

### Subscription Management

**Subscribe to Policy**
```http
POST /insurance/subscribe
Content-Type: application/json

{
  "policyId": "policy-id",
  "petId": "pet-id",
  "startDate": "2024-02-01",
  "paymentCycle": "monthly",
  "selectedSpecialClauses": ["배상책임보장"],
  "autoRenewal": true
}
```

### Claims Processing

**Submit Claim**
```http
POST /insurance/claims
Content-Type: application/json

{
  "userInsuranceId": "subscription-id",
  "claimType": "surgery",
  "diagnosis": "슬개골 탈구",
  "treatment": "슬개골 정복술",
  "hospitalName": "서울동물병원",
  "incidentDate": "2024-01-15",
  "totalClaimAmount": 1500000,
  "attachedDocuments": ["url1", "url2"]
}
```

**Get User Claims**
```http
GET /insurance/claims?status=approved
```

**Get Claim Details** (with decryption)
```http
GET /insurance/claims/:id
```

**Update Claim Status** (Admin)
```http
PUT /insurance/claims/:id/status
Content-Type: application/json

{
  "status": "approved",
  "approvedAmount": 1200000,
  "coveragePercentage": 80,
  "reviewedBy": "admin@insurance.com",
  "reviewNotes": "모든 서류 확인 완료"
}
```

### Statistics

**Processing Performance Stats**
```http
GET /insurance/stats/processing?startDate=2024-01-01&endDate=2024-01-31
```

Response:
```json
{
  "totalClaims": 1000,
  "fastProcessed": 950,
  "fastProcessingRate": 95.0,
  "avgProcessingTime": 2.5,
  "targetProcessingTime": 3,
  "improvement": 91.67
}
```

## ⚡ Performance Optimizations

### 1. Caching Strategy
```typescript
// Policy comparison results cached for 24 hours
const cacheKey = `policy_comparison:${species}:${ageMonths}:${breed}`;
await cacheService.set(cacheKey, result, 24 * 60 * 60);
```

### 2. Database Indexes
```typescript
@Index(['policyId', 'status', 'submittedAt'])
@Index(['userId', 'status'])
@Index(['petId', 'status'])
@Index(['claimNumber'])
```

### 3. Async Processing (TODO)
```typescript
// Add to processing queue
await queueService.add('process-claim', { claimId });
```

## 📊 Korean Insurance Requirements

### Age Restrictions (연령 제한)
- Minimum age: 2 months (최소 2개월)
- Maximum age: 10 years (최대 10년)
- Coverage until: 15 years (보장 종료: 15세)

### Breed Restrictions (품종 제한)
```typescript
// Example: Dangerous breeds excluded
excludedBreeds: ['핏불', '도사견', '로트와일러']

// Example: Specific breeds allowed
allowedBreeds: ['말티즈', '푸들', '시바견', '닥스훈트']
```

### Waiting Periods (대기 기간)
- General illness: 30 days (일반 질병: 30일)
- Surgery: 90 days (수술: 90일)
- Accident: 0 days (사고: 즉시)

### Coverage Types (보장 유형)
- Accident (상해)
- Illness (질병)
- Surgery (수술)
- Hospitalization (입원)
- Outpatient (통원)
- Medication (약제비)
- Liability (배상책임)
- Funeral (장례비)

## 🔧 Implementation Notes

### 1. **Setup Database Tables**
```bash
# Run migrations
npm run migration:run
```

### 2. **Seed Sample Policies**
Create sample policies for 5 insurance companies:
```typescript
// Example: Samsung Fire Policy
{
  company: InsuranceCompany.SAMSUNG_FIRE,
  companyName: '삼성화재',
  policyName: '펫보험 프리미엄',
  policyCode: 'SF-PET-001',
  monthlyPremium: 45000,
  annualPremium: 540000,
  maxCoveragePerYear: 10000000,
  coveragePercentage: 80,
  deductible: 100000,
  coverageTypes: [CoverageType.ACCIDENT, CoverageType.ILLNESS, CoverageType.SURGERY],
  // ... other fields
}
```

### 3. **Import Module**
Add to `app.module.ts`:
```typescript
import { InsuranceModule } from './modules/insurance/insurance.module';

@Module({
  imports: [
    // ... other modules
    InsuranceModule,
  ],
})
export class AppModule {}
```

### 4. **Queue Setup (Optional)**
For production, implement async claim processing:
```typescript
// Using Bull or AWS SQS
import { Queue } from 'bull';

@InjectQueue('claim-processing')
private claimQueue: Queue;

async submitClaim(userId: string, dto: SubmitClaimDto) {
  // ... save claim

  // Add to processing queue
  await this.claimQueue.add('process', {
    claimId: saved.id,
    priority: 'high',
  });
}
```

## 🧪 Testing

### Unit Tests
```bash
npm run test:watch insurance
```

### Integration Tests
```bash
npm run test:e2e insurance
```

### Test Coverage Goals
- Service: ≥ 90%
- Controller: ≥ 85%
- Entities: ≥ 80%

## 📋 TODO

- [ ] Implement async claim processing queue
- [ ] Add payment gateway integration
- [ ] Create admin dashboard for claim management
- [ ] Add automated fraud detection
- [ ] Implement real-time claim status notifications
- [ ] Add document OCR for automatic claim processing
- [ ] Create mobile-optimized claim submission flow
- [ ] Add multi-language support (Korean/English)

## 📞 Support

For questions or issues, contact the development team.

---

**보험업법 준수**: 모든 보험 관련 데이터는 암호화되어 저장되며, 감사 로그가 기록됩니다.
**CISO Requirement**: 청구 상세 정보는 EncryptionService를 사용하여 AES-256-GCM으로 암호화됩니다.
