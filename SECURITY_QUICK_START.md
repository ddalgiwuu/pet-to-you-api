# 🚀 Security Hardening - Quick Start Guide

**For**: Development Team
**Timeline**: Start immediately
**Priority**: CRITICAL

---

## 🎯 What We're Fixing

We found **3 critical security holes** that could expose sensitive data:

1. **Bank account numbers stored in plaintext** → Anyone with database access sees all hospital bank accounts
2. **Medical records copied without encryption** → Patient diagnoses exposed in claims table
3. **No rate limiting** → Attackers can submit thousands of fraudulent claims

**Risk**: ₩500M+ fines, license suspension, data breach liability

---

## 📋 Phase 1: Critical Fixes (THIS WEEK)

### Monday: Encrypt Bank Accounts (CRT-001)

**What**: Encrypt `bankAccountNumber` and `accountHolderName` in HospitalPayment entity

**Files to modify**:
1. `/src/modules/payments/entities/hospital-payment.entity.ts`
2. `/src/modules/payments/services/payment-settlement.service.ts`

**Reference**:
- Secure entity: `/src/modules/payments/entities/hospital-payment-secure.entity.ts`
- Implementation guide: `/docs/SECURITY_IMPLEMENTATION_GUIDE.md` (Section 1.1)

**Steps**:
```bash
# 1. Copy secure entity definition
# 2. Generate migration
npm run migration:generate -- -n EncryptBankAccounts

# 3. Update service to encrypt/decrypt
# 4. Test
npm run test -- payment-encryption

# 5. Run migration
npm run migration:run
```

**Verification**:
```sql
-- Check database - should NOT see account numbers in plaintext
SELECT id, bank_name, bank_account_number, bank_account_number_encrypted
FROM hospital_payments LIMIT 1;

-- bank_account_number should be NULL
-- bank_account_number_encrypted should be JSON with encrypted/iv/authTag
```

---

### Tuesday-Wednesday: Re-encrypt Medical Snapshots (CRT-002)

**What**: Encrypt diagnosis/treatment in AutoClaimSuggestion entity

**Files to modify**:
1. `/src/modules/insurance/entities/auto-claim-suggestion.entity.ts`
2. `/src/modules/insurance/services/auto-claim-generator.service.ts`
3. Add cron job for 30-day expiration

**Reference**:
- Secure entity: `/src/modules/insurance/entities/auto-claim-suggestion-secure.entity.ts`
- Implementation guide: Section 1.2

**Steps**:
```bash
# 1. Update entity with encrypted fields
# 2. Generate migration
npm run migration:generate -- -n ReEncryptMedicalSnapshots

# 3. Update AutoClaimGeneratorService
# 4. Add expiration cron job
# 5. Test
npm run test -- auto-claim-security

# 6. Run migration
npm run migration:run
```

**Cron Job** (add to auto-claim-generator.service.ts):
```typescript
@Cron('0 0 * * *') // Daily at midnight
async cleanupExpiredSuggestions() {
  const expired = await this.suggestionRepository.find({
    where: { expiresAt: LessThan(new Date()) },
  });

  await this.suggestionRepository.remove(expired);
  this.logger.log(`Deleted ${expired.length} expired suggestions`);
}
```

---

### Thursday-Friday: Rate Limiting (CRT-003)

**What**: Prevent abuse with rate limits on sensitive endpoints

**Files to modify**:
1. Install dependencies: `rate-limiter-flexible`, `ioredis`
2. Create `/src/core/security/guards/rate-limit.guard.ts`
3. Update controllers to use `@RateLimits` decorators

**Reference**:
- Rate limit decorator: `/src/core/security/decorators/rate-limit.decorator.ts`
- Implementation guide: Section 1.3

**Steps**:
```bash
# 1. Install dependencies
npm install --save rate-limiter-flexible ioredis

# 2. Create RateLimitGuard (copy from implementation guide)

# 3. Apply decorators to controllers
# - InsuranceClaimController: @RateLimits.ClaimSubmission()
# - PaymentController: @RateLimits.PaymentCreation()
# - MedicalRecordsController: @RateLimits.MedicalRecordCreation()

# 4. Test
npm run test -- rate-limiting
```

**Test Script**:
```bash
# Should succeed 5 times, fail on 6th
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/claims/submit \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d @claim-payload.json
done
```

---

## 📊 Progress Tracking

### Daily Standup Questions

1. What security fix did you complete yesterday?
2. What security fix are you working on today?
3. Any blockers or questions?

### Weekly Checklist

**Week 1**:
- [ ] CRT-001: Bank account encryption deployed
- [ ] CRT-002: Medical snapshot re-encryption deployed
- [ ] CRT-003: Rate limiting deployed
- [ ] HIGH-003: Cost validation added
- [ ] All tests passing
- [ ] No production issues

**Week 2**:
- [ ] HIGH-001: IDOR fix deployed
- [ ] HIGH-002: Session management deployed
- [ ] HIGH-004: XSS protection deployed
- [ ] HIGH-005: Password policy enforced
- [ ] Penetration test scheduled

---

## 🧪 Testing Your Changes

### Test Encryption

```typescript
// Test bank account encryption
const payment = await paymentRepository.save({
  bankAccountNumber: '1234567890', // Plaintext input
  // ... other fields
});

// Check database
const rawPayment = await dataSource.query(
  'SELECT * FROM hospital_payments WHERE id = $1',
  [payment.id],
);

// Should be encrypted
expect(rawPayment.bank_account_number).toBeNull();
expect(rawPayment.bank_account_number_encrypted).toBeDefined();
expect(rawPayment.bank_account_number_encrypted.encrypted).not.toContain('1234567890');

// Should decrypt correctly
const decrypted = await encryptionService.decrypt(
  rawPayment.bank_account_number_encrypted,
);
expect(decrypted).toBe('1234567890');
```

### Test Rate Limiting

```bash
# Install artillery for load testing
npm install -g artillery

# Test claim submission rate limit
artillery quick \
  --count 1 \
  --num 10 \
  --header "Authorization: Bearer $TOKEN" \
  --payload claim-payload.json \
  http://localhost:3000/api/claims/submit

# Expected: First 5 succeed (201), next 5 fail (429)
```

### Test Data Masking

```typescript
import { maskBankAccount, safeStringify } from './core/security/data-masking.util';

// Should mask account numbers in logs
logger.log(`Payment to ${maskBankAccount('1234567890')}`);
// Output: "Payment to ******7890"

// Should mask entire objects
const payment = {
  amount: 100000,
  bankAccountNumber: '1234567890',
  diagnosis: 'Patellar Luxation'
};

logger.log(safeStringify(payment));
// Output: { amount: 100000, bankAccountNumber: "******7890", diagnosis: "Pat*** Lux***" }
```

---

## ❓ Common Questions

### Q: Will encryption slow down the API?

**A**: Minimal impact. AES-256-GCM encryption adds ~0.1-0.5ms per field. For typical API response with 10 encrypted fields, total overhead is ~1-5ms (negligible).

### Q: What if migration fails?

**A**: We have rollback plan:
1. Database backed up before migration
2. Migration script includes rollback logic
3. Can revert to old schema if critical issues
4. 24-hour monitoring window before marking complete

### Q: Do I need to update frontend?

**A**: No changes required for critical fixes. API contracts remain the same. Frontend continues to send/receive plaintext; encryption happens transparently in backend.

### Q: How do I test locally?

**A**:
```bash
# 1. Start Redis (required for rate limiting)
docker run -d -p 6379:6379 redis:7-alpine

# 2. Set environment variables
export ENCRYPTION_MASTER_KEY="your-dev-key-32-chars-min"
export REDIS_URL="redis://localhost:6379"

# 3. Run migrations
npm run migration:run

# 4. Start API
npm run start:dev

# 5. Run tests
npm run test:security
```

---

## 🚨 Red Flags - Stop and Ask

Stop and consult security team if:

- Migration fails or data looks corrupted
- Encryption/decryption errors in production
- Performance degradation >10%
- Tests failing after changes
- Users reporting access issues
- Audit logs showing anomalies

**Contact**: security@pettoyou.com or Slack #security

---

## 📚 Resources

### Must Read

1. **Security Audit Report** - Understand vulnerabilities
2. **Implementation Guide** - Step-by-step code changes
3. **Data Handling Guidelines** - How to handle sensitive data

### Reference

1. **Compliance Checklist** - Track compliance status
2. **Best Practices Guide** - Security patterns and anti-patterns
3. **Incident Response Plan** - What to do if breach occurs

### Code References

1. **security-config.constants.ts** - All security settings
2. **data-masking.util.ts** - How to mask sensitive data
3. ***-secure.entity.ts** - Example secure entities

---

## ✅ Quick Win Checklist

Before you start coding:

- [ ] Read Security Audit Report (30 min)
- [ ] Review Implementation Guide for your assigned fix (1 hour)
- [ ] Set up local Redis instance
- [ ] Create feature branch: `security/[fix-name]`
- [ ] Write tests FIRST (TDD approach)
- [ ] Implement fix
- [ ] Verify tests pass
- [ ] Manual testing
- [ ] Code review with security team
- [ ] Merge to staging
- [ ] QA validation
- [ ] Deploy to production (with monitoring)

---

## 🎓 Security Training

### Required Reading (2 hours)

- [ ] OWASP Top 10 (2021): https://owasp.org/Top10/
- [ ] PIPA Overview: https://www.pipc.go.kr/
- [ ] Data Handling Guidelines (our docs)
- [ ] Security Best Practices (our docs)

### Hands-On Practice (2 hours)

- [ ] Encrypt a field using EncryptionService
- [ ] Add rate limiting to an endpoint
- [ ] Write security test for authorization
- [ ] Use data masking in logs

---

**Remember**: Security is everyone's responsibility. When in doubt, ask!

**Questions?** → #security Slack channel or security@pettoyou.com

---

**Last Updated**: 2026-01-29
**Version**: 1.0
**Owner**: Security Team
