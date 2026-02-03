# 📊 Data Handling Guidelines

**Purpose**: Secure handling of sensitive data in Pet-to-You platform
**Audience**: All developers, QA, DevOps
**Compliance**: PIPA, 의료법, OWASP

---

## 1. Data Classification

### Tier 1: Critical Sensitive Data (Highest Protection)

**Encryption Required**: Always, at rest and in transit
**Audit Logging**: Every access logged with purpose
**Retention**: Per legal requirements (10 years for medical)
**Access**: Minimal, authorized personnel only

**Examples**:
- Medical diagnosis, treatment, prescription
- Bank account numbers
- Payment transaction details
- Insurance policy details
- User passwords (hashed, not encrypted)

**Handling Rules**:
```typescript
// ✅ CORRECT
const diagnosis = await encryptionService.encrypt(plainDiagnosis);
await healthNoteRepository.save({ diagnosisEncrypted: diagnosis });

await auditService.log({
  userId,
  action: 'READ_MEDICAL_RECORD',
  resource: 'HealthNote',
  resourceId: healthNote.id,
  purpose: 'Treatment planning',
  legalBasis: 'User consent',
});

// ❌ WRONG
const diagnosis = plainDiagnosis; // Not encrypted
await healthNoteRepository.save({ diagnosis }); // Stored in plaintext
// No audit log
```

---

### Tier 2: Personal Identifiable Information (PII)

**Encryption Required**: Recommended, especially for bulk storage
**Audit Logging**: Access logged
**Retention**: As needed, deletable on user request
**Access**: Authorized users only

**Examples**:
- User names, addresses, phone numbers, emails
- Pet names, photos
- Hospital names, addresses
- Veterinarian names

**Handling Rules**:
```typescript
// Mask in logs
logger.log(`User ${maskName(userName)} created appointment`);
logger.log(`Phone: ${maskPhoneNumber(phone)}`);

// Sanitize before storage
const sanitizedName = sanitizationService.sanitizePlainText(userName);
```

---

### Tier 3: Business Data

**Encryption Required**: No (unless combined with Tier 1/2)
**Audit Logging**: Optional
**Retention**: Business needs
**Access**: Application users

**Examples**:
- Hospital operating hours
- Service availability
- Public content (blogs, FAQs)
- Aggregated statistics (anonymized)

---

### Tier 4: Public Data

**Encryption Required**: No
**Audit Logging**: No
**Retention**: Indefinite
**Access**: Public

**Examples**:
- Public hospital information
- Community posts (public)
- Educational content

---

## 2. Encryption Guidelines

### When to Encrypt

**MUST Encrypt**:
- Medical records (diagnosis, treatment, prescription)
- Bank account numbers
- Payment details (card numbers, transaction IDs)
- Sensitive insurance details
- Any data classified as Tier 1

**SHOULD Encrypt**:
- User email addresses (if storing in bulk)
- Phone numbers
- User addresses
- Any data classified as Tier 2 in high-risk scenarios

**DO NOT Encrypt**:
- UUIDs, IDs
- Timestamps
- Public data
- Search indexes (use HMAC instead)

### Encryption Patterns

#### Field-Level Encryption (Standard)

```typescript
// Entity definition
@Column({ type: 'jsonb' })
diagnosisEncrypted: EncryptedData;

// Virtual field (not persisted)
diagnosis?: string;

// Before save
healthNote.diagnosisEncrypted = await encryptionService.encrypt(plainDiagnosis);
await repository.save(healthNote);

// After fetch
healthNote.diagnosis = await encryptionService.decrypt(healthNote.diagnosisEncrypted);
```

#### Searchable Encryption (HMAC for Exact Match)

```typescript
// For email search
const emailHmac = await encryptionService.createHmac(email);

// Store both encrypted and HMAC
@Column({ type: 'jsonb' })
emailEncrypted: EncryptedData;

@Column({ type: 'varchar', length: 64 })
@Index()
emailHmac: string; // For searching

// Search query
WHERE email_hmac = createHmac(searchEmail)
```

---

## 3. Data Masking Guidelines

### When to Mask

**MUST Mask**:
- Sensitive data in logs
- Error messages shown to users
- Data in analytics/monitoring systems
- Third-party integrations

**Example**:
```typescript
// ✅ CORRECT
logger.log(`Payment processed for account ${maskBankAccount(accountNumber)}`);
logger.log(`User ${maskName(userName)} logged in from ${maskIP(ipAddress)}`);

// ❌ WRONG
logger.log(`Payment processed for account ${accountNumber}`); // Exposes full account
logger.error(`Error: ${JSON.stringify(user)}`); // Exposes all user data
```

### Masking Functions

```typescript
// Available utilities (from data-masking.util.ts)
maskBankAccount(account)      // "1234567890" → "******7890"
maskPhoneNumber(phone)         // "010-1234-5678" → "***-****-5678"
maskEmail(email)               // "user@example.com" → "u***@example.com"
maskName(name)                 // "김철수" → "김**"
maskDiagnosis(diagnosis)       // "Patellar Luxation" → "Pat*** Lux***"
maskJWT(token)                 // "eyJhbG..." → "eyJh...****"
maskTransactionId(txnId)       // "TXN-123-abc" → "TXN-***-***"
maskObjectForLogging(obj)      // Automatically masks sensitive fields
safeStringify(obj)             // Safe JSON.stringify with masking
```

---

## 4. Input Validation & Sanitization

### Validation Layers

1. **DTO Validation** (class-validator)
   - Type checking
   - Format validation
   - Range validation
   - Required fields

2. **Business Logic Validation**
   - Cost reasonability
   - Coverage limits
   - Eligibility checks
   - Fraud detection

3. **Sanitization** (DOMPurify)
   - Remove HTML tags
   - Strip script content
   - Remove dangerous attributes
   - Limit text length

### Validation Examples

```typescript
// DTO validation
export class CreateHealthNoteDto {
  @IsString()
  @MaxLength(500)
  @IsNotEmpty()
  diagnosis: string; // Basic validation

  @IsNumber()
  @Min(1000)
  @Max(10_000_000)
  @IsValidCost('visitType') // Custom validation
  actualCost?: number;
}

// Service-level validation
const costCheck = isCostReasonable(actualCost, coverageType);
if (!costCheck.valid) {
  throw new BadRequestException(costCheck.reason);
}

// Sanitization
const cleanDiagnosis = sanitizationService.sanitizePlainText(dto.diagnosis);
```

### Input Sanitization Checklist

- [ ] Remove HTML tags from text fields
- [ ] Validate URLs (whitelist domains if possible)
- [ ] Sanitize file names (remove special chars)
- [ ] Validate email format (regex)
- [ ] Validate phone format (Korean format)
- [ ] Trim whitespace
- [ ] Normalize Unicode characters
- [ ] Check for SQL injection patterns
- [ ] Check for script injection patterns

---

## 5. Output Encoding Guidelines

### API Responses

**NEVER include**:
- Raw encrypted data (EncryptedData type)
- Internal error stack traces
- Database query details
- System configuration
- Full JWT tokens in responses

**Example**:
```typescript
// ✅ CORRECT
return {
  id: healthNote.id,
  diagnosis: decryptedDiagnosis, // Decrypted for authorized user
  visitDate: healthNote.visitDate,
};

// ❌ WRONG
return {
  diagnosisEncrypted: healthNote.diagnosisEncrypted, // Exposes encrypted data
  _internalId: healthNote._id, // Exposes internal implementation
};
```

### Error Messages

```typescript
// ✅ CORRECT - Generic for client
throw new BadRequestException('Invalid input');

// Log details server-side only
logger.error('Validation failed', {
  field: 'actualCost',
  value: maskAmount(actualCost),
  reason: 'Exceeds maximum limit',
});

// ❌ WRONG - Exposes internal details
throw new BadRequestException(`Database query failed: SELECT * FROM users WHERE id = ${userId}`);
```

---

## 6. Data Retention & Deletion

### Retention Policies

| Data Type | Retention Period | Legal Basis | Auto-Delete |
|-----------|------------------|-------------|-------------|
| **Medical Records** | 10 years | 의료법 Article 19 | No (soft delete) |
| **Auto-Claim Suggestions** | 30 days | Business need | Yes |
| **Audit Logs** | 3 years | PIPA Article 24 | Yes |
| **Session Data** | 30 days | Security best practice | Yes (Redis TTL) |
| **Payment Records** | 5 years | Tax law | No |
| **User Accounts** | Until deletion request | PIPA Article 21 | On request |

### Deletion Procedures

#### User-Initiated Deletion (GDPR/PIPA Right to Erasure)

```typescript
async deleteUserData(userId: string) {
  // 1. Verify user identity (MFA)
  // 2. Check for legal holds (active claims, ongoing treatment)
  // 3. Export user data (GDPR/PIPA right to data portability)
  // 4. Anonymize instead of delete (for analytics)
  // 5. Soft delete with 30-day recovery period
  // 6. Hard delete after 30 days

  const user = await userRepository.findOne({ where: { id: userId } });

  // Mark for deletion
  user.deletionScheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  user.isActive = false;

  await userRepository.save(user);

  // Log deletion request
  await auditService.log({
    userId,
    action: 'USER_DELETION_REQUESTED',
    resource: 'User',
    resourceId: userId,
    purpose: 'PIPA Article 21 - User request',
    legalBasis: 'User consent withdrawal',
  });

  // Schedule hard delete in 30 days (cron job)
}
```

#### Automated Deletion (Expired Data)

```typescript
// Cron job: Daily at 2 AM
@Cron('0 2 * * *')
async cleanupExpiredData() {
  // Delete expired auto-claim suggestions
  const expiredSuggestions = await suggestionRepository.find({
    where: {
      expiresAt: LessThan(new Date()),
      status: In([AutoClaimSuggestionStatus.PENDING, AutoClaimSuggestionStatus.VIEWED]),
    },
  });

  await suggestionRepository.remove(expiredSuggestions);
  logger.log(`Deleted ${expiredSuggestions.length} expired suggestions`);

  // Delete old audit logs (>3 years)
  const threeYearsAgo = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000);
  const oldLogs = await auditRepository.delete({
    timestamp: LessThan(threeYearsAgo),
  });
  logger.log(`Deleted ${oldLogs.affected} old audit logs`);

  // Clean up expired sessions (Redis)
  // Redis TTL handles this automatically
}
```

---

## 7. Logging Best Practices

### DO Log

- Authentication events (success/failure)
- Authorization failures
- Data access (medical records, payments)
- Data modifications
- Sensitive operations (payment, claim submission)
- Security events (IDOR attempts, rate limit hits)
- System errors

### DO NOT Log

- Passwords (plain or hashed)
- Full credit card numbers
- Full bank account numbers
- Encryption keys
- Session tokens
- Full JWT tokens
- Unmasked PII in production

### Logging Example

```typescript
// ✅ CORRECT
logger.log('User login', {
  userId: user.id,
  email: maskEmail(user.email),
  ip: request.ip,
  userAgent: request.headers['user-agent'],
  timestamp: new Date().toISOString(),
});

logger.error('Payment failed', {
  paymentId: payment.id,
  amount: formatAmount(payment.amount),
  account: maskBankAccount(payment.bankAccountNumber),
  error: error.message, // Not error.stack in production
});

// ❌ WRONG
logger.log('User login', user); // Exposes all user data
logger.error('Payment failed', { password: user.password }); // Never log passwords
logger.debug('JWT token', { token: fullJwtToken }); // Exposes session token
```

---

## 8. Database Query Security

### Safe Query Patterns

```typescript
// ✅ CORRECT - Parameterized query (TypeORM)
const users = await userRepository.find({
  where: { email: userEmail }, // Parameterized
});

// ✅ CORRECT - Query builder with parameters
const claims = await claimRepository
  .createQueryBuilder('claim')
  .where('claim.userId = :userId', { userId }) // Parameterized
  .getMany();

// ❌ WRONG - String concatenation (SQL Injection risk)
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;
const users = await connection.query(query);
```

### Query Performance & Security

```typescript
// Add limits to prevent DoS
const claims = await claimRepository.find({
  where: { userId },
  take: 100, // Limit results
  skip: offset,
});

// Use indexes for encrypted field searches (HMAC)
const user = await userRepository.findOne({
  where: { emailHmac: await encryptionService.createHmac(email) },
});
```

---

## 9. API Security Checklist

### Before Every API Call

- [ ] Validate authentication (JWT)
- [ ] Validate authorization (RBAC, ownership)
- [ ] Validate input (DTO)
- [ ] Sanitize input (XSS prevention)
- [ ] Check rate limits
- [ ] Validate session (if implemented)

### After Every API Call

- [ ] Mask sensitive data in response
- [ ] Log access (if Tier 1 data)
- [ ] Remove internal fields
- [ ] Set security headers

### Example

```typescript
@Post('submit')
@UseGuards(JwtAuthGuard, RateLimitGuard) // Auth + Rate limit
@RateLimits.ClaimSubmission()
@UseInterceptors(SanitizeInterceptor) // XSS protection
async submitClaim(
  @Body(ValidationPipe) dto: SubmitClaimDto, // Input validation
  @Request() req,
) {
  // Authorization check
  const policy = await this.insuranceService.getUserPolicy(req.user.userId, dto.policyId);
  if (!policy) {
    throw new ForbiddenException('Not your policy');
  }

  // Business validation
  const costCheck = isCostReasonable(dto.totalClaimAmount, dto.claimType);
  if (!costCheck.valid) {
    throw new BadRequestException(costCheck.reason);
  }

  // Create claim with encryption
  const claim = await this.insuranceService.createClaim(dto, req.user.userId);

  // Audit log
  await this.auditService.log({
    userId: req.user.userId,
    action: 'SUBMIT_CLAIM',
    resource: 'InsuranceClaim',
    resourceId: claim.id,
    purpose: 'Insurance claim submission',
    legalBasis: 'User consent',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Return safe response (no sensitive data)
  return {
    id: claim.id,
    status: claim.status,
    submittedAt: claim.submittedAt,
  };
}
```

---

## 10. Third-Party Integration Security

### Payment Gateway (Toss Payments)

**Security Requirements**:
- [ ] Use HTTPS only
- [ ] Validate webhook signatures
- [ ] Implement idempotency keys
- [ ] Never log API keys
- [ ] Rotate API keys quarterly
- [ ] Use separate keys for test/production
- [ ] Implement request signing

**Example**:
```typescript
// ✅ CORRECT
const response = await axios.post(
  'https://api.tosspayments.com/v1/payments',
  payload,
  {
    headers: {
      Authorization: `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64')}`,
      'Idempotency-Key': uuidv4(), // Prevent duplicate processing
    },
    timeout: 10000,
  },
);

// ❌ WRONG
const response = await axios.post(
  'http://api.tosspayments.com/v1/payments', // Not HTTPS
  payload,
  {
    headers: {
      Authorization: `Basic ${hardcodedKey}`, // Hardcoded key
    },
  },
);
logger.log('Payment request', { apiKey: secretKey }); // Logs API key
```

### Webhook Security

```typescript
// Validate webhook signature
function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

// In webhook handler
@Post('webhook/payment')
async handlePaymentWebhook(@Req() req, @Headers('x-signature') signature: string) {
  const rawBody = JSON.stringify(req.body);

  if (!validateWebhookSignature(rawBody, signature, process.env.WEBHOOK_SECRET)) {
    throw new UnauthorizedException('Invalid signature');
  }

  // Process webhook
}
```

---

## 11. File Handling Security

### Upload Validation

```typescript
// File validation pipeline
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(
  @UploadedFile(FileValidationPipe) file: Express.Multer.File,
) {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new BadRequestException('Invalid file type');
  }

  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    throw new BadRequestException('File too large');
  }

  // Sanitize filename
  const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');

  // Generate random storage name (prevent overwrite/path traversal)
  const storageKey = `${uuidv4()}_${sanitizedFilename}`;

  // Scan for malware (future: ClamAV integration)
  // await scanFileForMalware(file.buffer);

  // Upload to S3 with encryption
  await s3.upload({
    Bucket: process.env.S3_BUCKET,
    Key: storageKey,
    Body: file.buffer,
    ServerSideEncryption: 'AES256',
    ContentType: file.mimetype,
  });

  return { url: `https://cdn.pettoyou.com/${storageKey}` };
}
```

### Download Protection

```typescript
// Validate user ownership before download
@Get('download/:fileId')
async downloadFile(@Param('fileId') fileId: string, @Request() req) {
  const file = await fileRepository.findOne({ where: { id: fileId } });

  if (!file) {
    throw new NotFoundException('File not found');
  }

  // Authorization check
  const healthNote = await healthNoteRepository.findOne({
    where: { id: file.healthNoteId },
    relations: ['pet'],
  });

  if (healthNote.pet.userId !== req.user.userId) {
    await auditService.log({
      userId: req.user.userId,
      action: 'UNAUTHORIZED_FILE_ACCESS_ATTEMPT',
      resource: 'File',
      resourceId: fileId,
      purpose: 'Security incident',
      legalBasis: 'Security monitoring',
    });

    throw new ForbiddenException('Not authorized');
  }

  // Generate signed URL (expires in 5 minutes)
  const signedUrl = await s3.getSignedUrl('getObject', {
    Bucket: process.env.S3_BUCKET,
    Key: file.storageKey,
    Expires: 300,
  });

  return { url: signedUrl };
}
```

---

## 12. Environment Security

### Environment Variables

**Sensitive Variables** (NEVER commit):
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
ENCRYPTION_MASTER_KEY=...
TOSS_SECRET_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
REDIS_URL=...
```

**Storage**:
- Development: `.env.local` (gitignored)
- Staging: AWS Secrets Manager
- Production: AWS Secrets Manager + KMS

**Rotation**:
- JWT_SECRET: Every 90 days
- ENCRYPTION_MASTER_KEY: Quarterly (with re-encryption)
- TOSS_SECRET_KEY: Every 6 months
- Database passwords: Every 90 days

### Configuration Validation

```typescript
// In main.ts
if (process.env.NODE_ENV === 'production') {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'ENCRYPTION_MASTER_KEY',
    'TOSS_SECRET_KEY',
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }

    // Check for weak defaults
    if (process.env[varName].includes('default') || process.env[varName].includes('changeme')) {
      throw new Error(`Weak default value for ${varName}`);
    }
  }
}
```

---

## 13. Testing Security

### Security Test Types

1. **Unit Tests**: Test individual security functions
2. **Integration Tests**: Test authentication/authorization flows
3. **E2E Tests**: Test complete user workflows with security
4. **Penetration Tests**: External security assessment (annual)

### Security Test Examples

```typescript
// Encryption test
describe('EncryptionService', () => {
  it('should encrypt and decrypt data correctly', async () => {
    const plaintext = 'sensitive medical data';
    const encrypted = await encryptionService.encrypt(plaintext);

    expect(encrypted.encrypted).not.toBe(plaintext);
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();

    const decrypted = await encryptionService.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should fail on tampered data', async () => {
    const encrypted = await encryptionService.encrypt('data');
    encrypted.encrypted = 'tampered'; // Simulate tampering

    await expect(encryptionService.decrypt(encrypted)).rejects.toThrow();
  });
});

// Authorization test
describe('HospitalUserGuard', () => {
  it('should block cross-hospital access', async () => {
    const hospitalAUser = { userId: 'user-a', hospitalId: 'hospital-a' };
    const request = { user: hospitalAUser, params: { hospitalId: 'hospital-b' } };

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(ForbiddenException);
  });
});

// Rate limiting test
describe('Rate Limiting', () => {
  it('should block after limit exceeded', async () => {
    // Submit 5 claims (should succeed)
    for (let i = 0; i < 5; i++) {
      const response = await request(app.getHttpServer())
        .post('/claims/submit')
        .set('Authorization', `Bearer ${token}`)
        .send(claimDto)
        .expect(201);
    }

    // 6th claim should fail
    await request(app.getHttpServer())
      .post('/claims/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(claimDto)
      .expect(429); // Too Many Requests
  });
});
```

---

## 14. Code Review Security Checklist

### For Every PR

- [ ] No hardcoded secrets or API keys
- [ ] Sensitive data encrypted before storage
- [ ] User input validated and sanitized
- [ ] Authentication/authorization checks present
- [ ] Audit logging for Tier 1 data access
- [ ] Error messages don't leak sensitive info
- [ ] Data masked in logs
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Rate limiting on sensitive endpoints
- [ ] Tests include security test cases

### Security Review Triggers

Require security team review if PR includes:
- Authentication/authorization changes
- Encryption changes
- Payment processing
- Medical record handling
- Database schema changes
- Third-party integrations

---

## 15. Developer Checklist

Before writing code involving sensitive data:

- [ ] Check data classification tier
- [ ] Determine encryption requirements
- [ ] Identify audit logging needs
- [ ] Plan input validation strategy
- [ ] Consider data masking for logs
- [ ] Review authorization requirements
- [ ] Check rate limiting needs
- [ ] Plan error handling (generic messages)
- [ ] Write security tests
- [ ] Document security decisions

---

**Document Owner**: Security Team
**Review Frequency**: Quarterly
**Next Update**: 2026-04-29
