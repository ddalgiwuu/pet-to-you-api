# 🛡️ Security Best Practices - Pet-to-You Platform

**Audience**: All developers
**Last Updated**: 2026-01-29
**Version**: 1.0

---

## 1. Secure Coding Principles

### Defense in Depth

**Never rely on a single security control**. Layer multiple defenses:

```typescript
// ✅ CORRECT - Multiple layers
@Post('submit-claim')
@UseGuards(JwtAuthGuard, RateLimitGuard)        // Layer 1: Auth + Rate limit
@RateLimits.ClaimSubmission()                   // Layer 2: Endpoint-specific limit
@UseInterceptors(SanitizeInterceptor)           // Layer 3: Input sanitization
async submitClaim(
  @Body(ValidationPipe) dto: SubmitClaimDto,    // Layer 4: DTO validation
  @Request() req,
) {
  // Layer 5: Business validation
  const costCheck = isCostReasonable(dto.totalClaimAmount, dto.claimType);
  if (!costCheck.valid) {
    throw new BadRequestException(costCheck.reason);
  }

  // Layer 6: Authorization (ownership check)
  const policy = await this.policyService.findOne(dto.policyId);
  if (policy.userId !== req.user.userId) {
    throw new ForbiddenException('Not your policy');
  }

  // Layer 7: Audit logging
  await this.auditService.log({ /* ... */ });

  // Layer 8: Encryption
  const claim = await this.claimService.create(dto); // Encrypts sensitive fields
}

// ❌ WRONG - Single layer
@Post('submit-claim')
async submitClaim(@Body() dto: any) {
  // No validation, no auth, no sanitization
  return this.claimService.create(dto);
}
```

---

### Fail Securely

**When in doubt, deny access**. Errors should not grant access.

```typescript
// ✅ CORRECT
async canActivate(context: ExecutionContext): Promise<boolean> {
  try {
    const user = await this.validateUser(context);

    if (!user) {
      return false; // Explicit denial
    }

    const hasPermission = await this.checkPermission(user);

    return hasPermission; // Only return true if explicitly granted
  } catch (error) {
    this.logger.error('Authorization error', error);
    return false; // Fail closed, deny on error
  }
}

// ❌ WRONG
async canActivate(context: ExecutionContext): Promise<boolean> {
  try {
    const user = await this.validateUser(context);
    return true; // Grants access even if permission check missing
  } catch (error) {
    return true; // Grants access on error
  }
}
```

---

### Principle of Least Privilege

**Grant minimum permissions necessary**.

```typescript
// ✅ CORRECT - Specific permissions
enum Permission {
  READ_OWN_MEDICAL_RECORDS = 'read:own:medical_records',
  READ_HOSPITAL_MEDICAL_RECORDS = 'read:hospital:medical_records',
  WRITE_MEDICAL_RECORDS = 'write:medical_records',
  APPROVE_CLAIMS = 'approve:claims',
  MANAGE_PAYMENTS = 'manage:payments',
}

// Patient can only read their own records
@UseGuards(PermissionGuard(Permission.READ_OWN_MEDICAL_RECORDS))

// Hospital staff can read hospital's records
@UseGuards(PermissionGuard(Permission.READ_HOSPITAL_MEDICAL_RECORDS))

// ❌ WRONG - Overly broad permissions
@UseGuards(AdminGuard) // Grants all permissions
```

---

### Never Trust User Input

**All input is hostile until validated**.

```typescript
// ✅ CORRECT - Comprehensive validation
async createHealthNote(dto: CreateHealthNoteDto, userId: string) {
  // 1. DTO validation (automatic via class-validator)
  // 2. Sanitization
  const sanitized = {
    diagnosis: this.sanitizationService.sanitizeAndValidate(dto.diagnosis, 'diagnosis'),
    treatment: this.sanitizationService.sanitizeAndValidate(dto.treatment, 'treatment'),
  };

  // 3. Business validation
  if (dto.actualCost && dto.actualCost > 10_000_000) {
    throw new BadRequestException('Cost exceeds maximum allowed');
  }

  // 4. Ownership validation
  const pet = await this.petRepository.findOne({ where: { id: dto.petId } });
  if (pet.userId !== userId) {
    throw new ForbiddenException('Not your pet');
  }

  // 5. Encrypt sensitive data
  const encrypted = {
    diagnosisEncrypted: await this.encryptionService.encrypt(sanitized.diagnosis),
    treatmentEncrypted: await this.encryptionService.encrypt(sanitized.treatment),
  };

  // 6. Create record
  return this.healthNoteRepository.save(encrypted);
}

// ❌ WRONG - No validation
async createHealthNote(data: any) {
  return this.healthNoteRepository.save(data); // Direct save without validation
}
```

---

## 2. Authentication & Authorization

### JWT Best Practices

```typescript
// ✅ CORRECT - Secure JWT configuration
{
  secret: process.env.JWT_SECRET, // Strong random secret (256+ bits)
  signOptions: {
    expiresIn: '7d',
    issuer: 'pettoyou-api',
    audience: 'pettoyou-mobile',
    algorithm: 'HS256',
  },
}

// Include minimal claims
const payload = {
  sub: user.id,
  email: user.email,
  role: user.role,
  jti: uuidv4(), // JWT ID for session tracking
};

// ❌ WRONG
{
  secret: 'mysecret123', // Weak secret
  signOptions: {
    expiresIn: '365d', // Too long
  },
}

const payload = {
  ...user, // Includes password hash, sensitive data
};
```

### Authorization Patterns

```typescript
// ✅ CORRECT - Explicit ownership check
async getHealthNote(id: string, userId: string) {
  const healthNote = await this.repository.findOne({
    where: { id },
    relations: ['pet'],
  });

  if (!healthNote) {
    throw new NotFoundException('Health note not found');
  }

  // Ownership check
  if (healthNote.pet.userId !== userId) {
    // Log unauthorized access attempt
    await this.auditService.log({
      userId,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      resource: 'HealthNote',
      resourceId: id,
      purpose: 'Security incident',
      legalBasis: 'Security monitoring',
    });

    throw new ForbiddenException('Not authorized');
  }

  return healthNote;
}

// ❌ WRONG - No ownership check
async getHealthNote(id: string) {
  return this.repository.findOne({ where: { id } }); // Anyone can access
}
```

---

## 3. Data Encryption

### When to Use Encryption vs. Hashing

**Encryption** (reversible, for data you need to read):
- Medical records (diagnosis, treatment)
- Bank account numbers
- Payment details
- PII that needs to be displayed

**Hashing** (one-way, for verification only):
- Passwords (use bcrypt)
- Password reset tokens
- API keys for verification

**HMAC** (searchable, one-way):
- Email addresses (for duplicate detection)
- Phone numbers (for search)
- Any encrypted field you need to search

### Encryption Examples

```typescript
// ✅ CORRECT - Field-level encryption
const encrypted = await encryptionService.encrypt(sensitiveData);
entity.fieldEncrypted = encrypted; // Type: EncryptedData

// Later, decrypt
const plaintext = await encryptionService.decrypt(entity.fieldEncrypted);

// ✅ CORRECT - Searchable encryption
const emailHmac = await encryptionService.createHmac(email);
user.emailEncrypted = await encryptionService.encrypt(email); // For storage
user.emailHmac = emailHmac; // For searching

// Query by email
const user = await userRepository.findOne({
  where: { emailHmac: await encryptionService.createHmac(searchEmail) },
});

// ❌ WRONG - Encrypt entire object
const encrypted = await encryptionService.encrypt(JSON.stringify(user));
// Problem: Cannot query, cannot update individual fields
```

---

## 4. Input Validation

### Validation Strategy

```typescript
// Layer 1: DTO validation (automatic)
export class CreateClaimDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  diagnosis: string;

  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  @IsValidCost('claimType') // Custom validator
  totalClaimAmount: number;
}

// Layer 2: Sanitization (interceptor)
@UseInterceptors(SanitizeInterceptor)

// Layer 3: Business validation (service)
const costCheck = isCostReasonable(dto.totalClaimAmount, dto.claimType);
if (!costCheck.valid) {
  throw new BadRequestException(costCheck.reason);
}

// Layer 4: Attack pattern detection
this.sanitizationService.validateAgainstAttackPatterns(dto.diagnosis, 'diagnosis');
```

### Common Validation Patterns

```typescript
// UUID validation
@IsUUID('4')
petId: string;

// Date validation (ISO 8601)
@IsDateString()
incidentDate: string;

// Enum validation
@IsEnum(ClaimType)
claimType: ClaimType;

// Email validation
@IsEmail()
email: string;

// Nested object validation
@ValidateNested()
@Type(() => CostBreakdownDto)
costBreakdown: CostBreakdownDto;

// Array validation
@IsArray()
@ValidateNested({ each: true })
@Type(() => DocumentDto)
documents: DocumentDto[];

// Custom validation
@IsValidCost('claimType')
totalClaimAmount: number;
```

---

## 5. Audit Logging

### What to Log

**ALWAYS Log**:
- Authentication (login, logout, failures)
- Authorization failures
- Medical record access (의료법 requirement)
- Payment operations
- Sensitive data modifications
- Security incidents

**NEVER Log**:
- Passwords
- Encryption keys
- Full JWT tokens
- Full credit card numbers
- Unmasked PII in production

### Logging Pattern

```typescript
// ✅ CORRECT - Comprehensive audit log
await this.auditService.log({
  userId: req.user.userId,
  action: 'READ_MEDICAL_RECORD',
  resource: 'HealthNote',
  resourceId: healthNote.id,
  purpose: 'View medical history for claim submission',
  legalBasis: 'User consent (PIPA Article 15)',
  ipAddress: req.ip || req.connection.remoteAddress,
  userAgent: req.headers['user-agent'],
  metadata: {
    correlationId: req.correlationId,
    petId: healthNote.petId,
    hospitalId: healthNote.hospitalId,
    accessedFields: ['diagnosis', 'treatment'],
  },
});

// ❌ WRONG - Insufficient context
logger.log('User accessed medical record');
```

---

## 6. Error Handling

### Secure Error Responses

```typescript
// ✅ CORRECT - Generic message for client, detailed log for server
try {
  await processPayment(paymentId);
} catch (error) {
  // Log detailed error server-side
  this.logger.error('Payment processing failed', {
    paymentId: maskTransactionId(paymentId),
    error: error.message,
    stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
  });

  // Return generic error to client
  throw new InternalServerErrorException('Payment processing failed. Please try again.');
}

// ❌ WRONG - Exposes internal details
catch (error) {
  throw new InternalServerErrorException(error.stack); // Stack trace to client
}
```

---

## 7. Database Security

### Query Security

```typescript
// ✅ CORRECT - Parameterized queries
const users = await userRepository.find({
  where: { email: userEmail }, // Parameterized by TypeORM
});

const results = await repository
  .createQueryBuilder('claim')
  .where('claim.userId = :userId', { userId }) // Named parameter
  .andWhere('claim.amount > :minAmount', { minAmount: 1000 })
  .getMany();

// ❌ WRONG - String concatenation (SQL injection)
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;
const users = await connection.query(query);

// ❌ WRONG - Template literal in where clause
const users = await repository
  .createQueryBuilder('user')
  .where(`user.email = '${userEmail}'`) // SQL injection risk
  .getMany();
```

### Database Permissions

**Application database user should have**:
- SELECT, INSERT, UPDATE on application tables
- NO DROP, TRUNCATE, ALTER permissions
- NO superuser privileges

**Separate database users for**:
- Application (read/write)
- Migrations (schema changes)
- Backups (read-only)
- Monitoring (read-only, limited tables)

---

## 8. Session Management

### Session Security Checklist

- [ ] Use secure, random session IDs (UUID v4)
- [ ] Store sessions server-side (Redis, not cookies)
- [ ] Implement idle timeout (30 minutes)
- [ ] Implement absolute timeout (12 hours)
- [ ] Regenerate session ID after login
- [ ] Invalidate session on logout
- [ ] Limit concurrent sessions (max 3)
- [ ] Detect and alert on session hijacking

### Session Validation

```typescript
// ✅ CORRECT
async validateSession(userId: string, sessionId: string): Promise<boolean> {
  const session = await redis.get(`session:${userId}:${sessionId}`);

  if (!session) {
    return false; // Session expired or invalid
  }

  const sessionData = JSON.parse(session);

  // Check idle timeout
  const lastActivity = new Date(sessionData.lastActivity);
  const idleTime = Date.now() - lastActivity.getTime();

  if (idleTime > IDLE_TIMEOUT_MS) {
    await this.revokeSession(userId, sessionId);
    return false;
  }

  // Update last activity
  await redis.set(
    `session:${userId}:${sessionId}`,
    JSON.stringify({ ...sessionData, lastActivity: new Date() }),
  );

  return true;
}
```

---

## 9. Rate Limiting

### Rate Limit Strategy

**Global Rate Limit**: 1000 requests per 15 minutes per IP
**Endpoint-Specific**:
- Claim submission: 5 per hour per user
- Payment creation: 10 per hour per user
- Authentication: 5 attempts per 15 minutes
- File uploads: 10 per 10 minutes

### Implementation

```typescript
// ✅ CORRECT - Layered rate limiting
@Post('submit')
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimits.ClaimSubmission() // 5 per hour
async submitClaim(@Body() dto: SubmitClaimDto, @Request() req) {
  // Additional business-level rate limit
  const recentClaims = await this.claimRepository.count({
    where: {
      userId: req.user.userId,
      createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
    },
  });

  if (recentClaims >= 10) {
    throw new BadRequestException('Maximum 10 claims per day');
  }

  // Process claim
}
```

---

## 10. CSRF Protection

### Implementation

```typescript
// In main.ts
import * as csurf from 'csurf';
import * as cookieParser from 'cookie-parser';

app.use(cookieParser());

// Enable CSRF protection for state-changing operations
app.use(
  csurf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      key: '__Host-csrf', // __Host prefix for additional security
    },
  }),
);

// Provide CSRF token to frontend
app.use((req, res, next) => {
  res.cookie('XSRF-TOKEN', req.csrfToken(), {
    httpOnly: false, // Readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  next();
});
```

### Frontend Integration

```typescript
// Mobile app (React Native)
const csrfToken = await AsyncStorage.getItem('csrf-token');

const response = await fetch('/api/claims/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-TOKEN': csrfToken,
  },
  body: JSON.stringify(claimData),
});
```

---

## 11. Security Headers

### Helmet Configuration

```typescript
// In main.ts
import helmet from 'helmet';

app.use(
  helmet({
    // HSTS - Force HTTPS
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Avoid unsafe-inline in production
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://cdn.pettoyou.com'],
        connectSrc: ["'self'", 'https://api.pettoyou.com'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },

    // Additional headers
    frameguard: { action: 'deny' }, // X-Frame-Options: DENY
    noSniff: true, // X-Content-Type-Options: nosniff
    referrerPolicy: { policy: 'no-referrer' },
    permissionsPolicy: {
      features: {
        geolocation: ["'none'"],
        microphone: ["'none'"],
        camera: ["'none'"],
        payment: ["'self'"],
      },
    },
  }),
);
```

---

## 12. Dependency Security

### Secure Dependency Management

```bash
# Check for vulnerabilities regularly
npm audit

# Auto-fix where possible
npm audit fix

# Update dependencies monthly
npm update

# Check for outdated packages
npm outdated
```

### Dependencies to Avoid

**Known Vulnerable Packages**:
- Any package with critical vulnerabilities
- Unmaintained packages (>2 years no updates)
- Packages from untrusted sources

**High-Risk Packages** (use with caution):
- Packages requiring native binaries
- Packages with broad file system access
- Packages with network access

---

## 13. Monitoring & Alerting

### Security Events to Monitor

```typescript
// Critical alerts (immediate response)
- Audit chain integrity broken
- Mass data export attempts
- Repeated authorization failures
- High-value payments (>₩5M)
- Unusual access patterns

// Warning alerts (1-hour response)
- Rate limit hits (potential attack)
- Failed authentication spikes
- Cross-hospital access attempts
- Cost anomalies in claims
- Encryption/decryption errors

// Info alerts (24-hour review)
- New user registrations
- Password changes
- Permission changes
- Unusual login locations
```

### Monitoring Implementation

```typescript
// In application
if (payment.amount > 5_000_000) {
  await alertService.sendAlert({
    level: 'CRITICAL',
    category: 'FINANCIAL',
    message: `High-value payment: ₩${payment.amount.toLocaleString()}`,
    metadata: {
      paymentId: payment.id,
      hospitalId: payment.hospitalId,
      amount: payment.amount,
    },
    notifyChannels: ['slack', 'email', 'sms'],
  });
}
```

---

## 14. Code Review Security Checklist

Use this checklist for every PR:

### Authentication & Authorization
- [ ] Authentication required for all non-public endpoints
- [ ] Authorization checks ownership/permissions
- [ ] No hardcoded credentials
- [ ] JWT properly validated
- [ ] Session validated (if implemented)

### Data Protection
- [ ] Sensitive data encrypted before storage
- [ ] PII masked in logs
- [ ] No sensitive data in error messages
- [ ] Audit logging for Tier 1 data access
- [ ] Data retention policies followed

### Input Validation
- [ ] All inputs validated via DTOs
- [ ] XSS sanitization applied
- [ ] SQL injection prevented (parameterized queries)
- [ ] File uploads validated (type, size)
- [ ] Cost limits enforced

### Output Security
- [ ] No raw encrypted data in responses
- [ ] No stack traces in error responses
- [ ] Sensitive fields filtered from responses
- [ ] Security headers set

### Business Logic
- [ ] Rate limiting on sensitive endpoints
- [ ] Idempotency for financial operations
- [ ] CSRF protection for state changes
- [ ] Fraud detection logic included

---

## 15. Testing Security

### Security Test Suite

```typescript
// Authentication tests
describe('Authentication', () => {
  it('should reject invalid JWT', async () => {
    await request(app)
      .get('/api/medical-records')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('should lock account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'wrong' })
        .expect(401);
    }

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'correct' })
      .expect(401);

    expect(response.body.message).toContain('locked');
  });
});

// Authorization tests
describe('Authorization', () => {
  it('should prevent cross-user data access', async () => {
    const userAToken = await getToken(userA);
    const userBHealthNoteId = userBHealthNote.id;

    await request(app)
      .get(`/api/medical-records/${userBHealthNoteId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(403);
  });
});

// Encryption tests
describe('Encryption', () => {
  it('should store diagnosis encrypted', async () => {
    const healthNote = await createHealthNote({ diagnosis: 'test diagnosis' });

    const rawRecord = await connection.query(
      'SELECT * FROM health_notes WHERE id = $1',
      [healthNote.id],
    );

    expect(rawRecord[0].diagnosis).toBeUndefined();
    expect(rawRecord[0].diagnosis_encrypted).toBeDefined();
    expect(rawRecord[0].diagnosis_encrypted.encrypted).not.toContain('test diagnosis');
  });
});

// Rate limiting tests
describe('Rate Limiting', () => {
  it('should enforce claim submission limit', async () => {
    const token = await getToken(user);

    // Submit 5 claims (should succeed)
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/claims/submit')
        .set('Authorization', `Bearer ${token}`)
        .send(claimDto)
        .expect(201);
    }

    // 6th should fail
    await request(app)
      .post('/api/claims/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(claimDto)
      .expect(429);
  });
});

// XSS tests
describe('XSS Protection', () => {
  it('should sanitize HTML in diagnosis', async () => {
    const malicious = '<script>alert("XSS")</script>Test diagnosis';

    const healthNote = await createHealthNote({ diagnosis: malicious });

    // Fetch and decrypt
    const decrypted = await encryptionService.decrypt(healthNote.diagnosisEncrypted);

    expect(decrypted).not.toContain('<script>');
    expect(decrypted).toContain('Test diagnosis');
  });
});
```

---

## 16. Deployment Security

### Pre-Deployment Checklist

- [ ] All environment variables set
- [ ] No default/weak secrets
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] Database encrypted at rest
- [ ] Backups encrypted
- [ ] Firewall rules configured
- [ ] DDoS protection enabled

### Production Configuration

```typescript
// ✅ CORRECT - Production-ready
{
  NODE_ENV: 'production',
  LOG_LEVEL: 'error', // Don't log debug info
  ENABLE_CORS: 'false', // Or specific origins only
  TRUST_PROXY: 'true', // Behind load balancer
  SESSION_SECURE: 'true', // HTTPS-only cookies
  CSRF_ENABLED: 'true',
  RATE_LIMIT_ENABLED: 'true',
}

// ❌ WRONG - Development settings in production
{
  NODE_ENV: 'development',
  LOG_LEVEL: 'debug', // Logs sensitive info
  ENABLE_CORS: '*', // Allows all origins
  DISABLE_AUTH: 'true', // Disables authentication
}
```

---

## 17. Quick Reference

### Security Decision Tree

```
New endpoint?
├─ Public? → No auth, rate limit, sanitize
├─ Authenticated?
│  ├─ → Add @UseGuards(JwtAuthGuard)
│  ├─ → Validate authorization (ownership/role)
│  └─ → Audit log access
├─ Sensitive operation?
│  ├─ → Add rate limiting
│  ├─ → Add CSRF protection
│  ├─ → Require session validation
│  └─ → Enhanced audit logging
└─ Handles Tier 1 data?
   ├─ → Encrypt before storage
   ├─ → Decrypt for authorized users only
   ├─ → Mask in logs
   └─ → Comprehensive audit trail
```

### Common Security Anti-Patterns

```typescript
// ❌ ANTI-PATTERN 1: No authorization check
async getData(id: string) {
  return this.repository.findOne({ where: { id } });
}

// ❌ ANTI-PATTERN 2: Trusting client-provided IDs
async updateRecord(@Body() dto: { userId: string, data: any }) {
  // Client can specify any userId
  return this.repository.update(dto.userId, dto.data);
}

// ❌ ANTI-PATTERN 3: Logging sensitive data
logger.log('Processing payment', { payment }); // Contains bank account

// ❌ ANTI-PATTERN 4: Exposing errors
catch (error) {
  return { error: error.stack }; // Leaks implementation details
}

// ❌ ANTI-PATTERN 5: No input validation
async createRecord(@Body() data: any) {
  return this.repository.save(data); // Accepts anything
}
```

---

## 18. Emergency Contacts

### Security Incidents

| Severity | Contact | Response Time |
|----------|---------|---------------|
| **Critical (P0)** | CTO + Security Lead | < 15 minutes |
| **High (P1)** | Security Lead | < 1 hour |
| **Medium (P2)** | Security Team | < 4 hours |
| **Low (P3)** | Security Team | < 24 hours |

### External Resources

- **KISA (한국인터넷진흥원)**: 118 (cyber crime hotline)
- **Police Cybercrime**: 112
- **Privacy Commissioner**: +82-2-2100-3000

---

## 19. Training & Awareness

### Required Training

- **All Developers**: Secure coding fundamentals (8 hours, annual)
- **Backend Team**: OWASP Top 10 deep dive (16 hours, annual)
- **DevOps**: Infrastructure security (12 hours, annual)
- **QA Team**: Security testing (8 hours, annual)

### Security Resources

- OWASP Top 10: https://owasp.org/Top10/
- SANS Secure Coding: https://www.sans.org/security-resources/
- KISA Guidelines: https://www.kisa.or.kr/

---

## 20. Continuous Improvement

### Security Metrics

Track monthly:
- Vulnerability count (by severity)
- Mean time to patch critical vulnerabilities
- Security test coverage
- Failed authentication rate
- Rate limit hits
- Audit log completeness

### Security Roadmap

**Q1 2026**:
- Fix all critical/high vulnerabilities
- Implement rate limiting
- Add session management
- Enhance audit logging

**Q2 2026**:
- Implement automated security scanning
- Add fraud detection AI
- Complete PIPA compliance
- Penetration testing

**Q3 2026**:
- ISO 27001 preparation
- Implement SIEM system
- Advanced threat detection
- Bug bounty program

**Q4 2026**:
- ISO 27001 certification
- SOC 2 Type I preparation
- Security maturity assessment
- Annual security review

---

**Remember**: Security is not a one-time effort. It's a continuous process of improvement, monitoring, and adaptation to new threats.

**When in doubt, ask the security team**: security@pettoyou.com

---

**Document Owner**: Security Team
**Approval**: CTO
**Version**: 1.0
**Next Review**: 2026-04-29
