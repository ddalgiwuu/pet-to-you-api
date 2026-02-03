# 🛡️ Security Implementation Guide

**Priority**: CRITICAL
**Timeline**: 3-4 weeks
**Estimated Effort**: 120-160 hours

This guide provides step-by-step instructions for implementing the security hardening identified in the security audit.

---

## Phase 1: Critical Fixes (Week 1) - IMMEDIATE ACTION REQUIRED

### 1.1 Encrypt Bank Account Numbers (CRT-001)

**File**: `/src/modules/payments/entities/hospital-payment.entity.ts`

**Steps**:

1. Update entity to use encrypted fields:

```typescript
// BEFORE
@Column({ type: 'varchar', length: 100, nullable: true })
bankAccountNumber?: string;

@Column({ type: 'varchar', length: 100, nullable: true })
accountHolderName?: string;

// AFTER
@Column({ type: 'jsonb', nullable: true })
bankAccountNumberEncrypted?: EncryptedData;

@Column({ type: 'jsonb', nullable: true })
accountHolderNameEncrypted?: EncryptedData;

// Virtual fields (not persisted)
bankAccountNumber?: string;
accountHolderName?: string;
```

2. Update `PaymentSettlementService` to encrypt before save:

```typescript
// In handleClaimApproved method
const payment = this.paymentRepository.create({
  // ... other fields
  bankAccountNumberEncrypted: hospital.bankName
    ? await this.encryptionService.encrypt(hospital.bankAccountNumber)
    : undefined,
  accountHolderNameEncrypted: hospital.accountHolderName
    ? await this.encryptionService.encrypt(hospital.accountHolderName)
    : undefined,
});
```

3. Update read operations to decrypt:

```typescript
// After fetching payment
if (payment.bankAccountNumberEncrypted) {
  payment.bankAccountNumber = await this.encryptionService.decrypt(
    payment.bankAccountNumberEncrypted,
  );
}
if (payment.accountHolderNameEncrypted) {
  payment.accountHolderName = await this.encryptionService.decrypt(
    payment.accountHolderNameEncrypted,
  );
}
```

4. Create migration script:

```bash
npm run migration:generate -- -n EncryptHospitalPaymentFields
```

5. Run data migration (encrypt existing data):

```typescript
// migration file
const payments = await queryRunner.query(
  'SELECT id, bank_account_number, account_holder_name FROM hospital_payments WHERE bank_account_number IS NOT NULL',
);

for (const payment of payments) {
  if (payment.bank_account_number) {
    const encrypted = await encryptionService.encrypt(payment.bank_account_number);
    await queryRunner.query(
      'UPDATE hospital_payments SET bank_account_number_encrypted = $1, bank_account_number = NULL WHERE id = $2',
      [encrypted, payment.id],
    );
  }
}
```

**Testing**:
- Create test payment with bank account
- Verify data encrypted in database
- Verify decryption works in API responses
- Test with masked data in logs

---

### 1.2 Re-encrypt Medical Data in AutoClaimSuggestion (CRT-002)

**File**: `/src/modules/insurance/entities/auto-claim-suggestion.entity.ts`

**Steps**:

1. Update entity:

```typescript
// BEFORE
@Column({ type: 'text' })
diagnosis: string;

@Column({ type: 'text' })
treatment: string;

// AFTER
@Column({ type: 'jsonb' })
diagnosisEncrypted: EncryptedData;

@Column({ type: 'jsonb' })
treatmentEncrypted: EncryptedData;

// Virtual fields
diagnosis?: string;
treatment?: string;
```

2. Update `AutoClaimGeneratorService`:

```typescript
// When creating suggestion
const suggestionEntity = this.suggestionRepository.create({
  diagnosisEncrypted: await this.encryptionService.encrypt(diagnosis),
  treatmentEncrypted: await this.encryptionService.encrypt(treatment),
  // ... other fields
});
```

3. Add automatic expiration job:

```typescript
// Create cron job to delete expired suggestions
@Cron('0 0 * * *') // Daily at midnight
async cleanupExpiredSuggestions() {
  const expired = await this.suggestionRepository.find({
    where: {
      expiresAt: LessThan(new Date()),
    },
  });

  await this.suggestionRepository.remove(expired);
  this.logger.log(`Deleted ${expired.length} expired suggestions`);
}
```

4. Create migration and data migration script.

**Testing**:
- Create auto-claim suggestion
- Verify encrypted in database
- Verify expiration cleanup works
- Test decryption in API responses

---

### 1.3 Implement Rate Limiting (CRT-003)

**Steps**:

1. Install dependencies:

```bash
npm install --save express-rate-limit rate-limit-redis ioredis
npm install --save-dev @types/express-rate-limit
```

2. Create rate limit guard:

```typescript
// File: src/core/security/guards/rate-limit.guard.ts
import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private limiters: Map<string, RateLimiterRedis> = new Map();

  constructor(
    private reflector: Reflector,
    private redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!rateLimitOptions) {
      return true; // No rate limit configured
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId || 'anonymous';
    const ip = request.ip || request.connection.remoteAddress;
    const key = `${rateLimitOptions.keyPrefix || 'default'}:${userId}:${ip}`;

    let limiter = this.limiters.get(key);
    if (!limiter) {
      limiter = new RateLimiterRedis({
        storeClient: this.redis,
        keyPrefix: rateLimitOptions.keyPrefix || 'rl',
        points: rateLimitOptions.points,
        duration: rateLimitOptions.duration,
        blockDuration: rateLimitOptions.blockDuration || rateLimitOptions.duration,
      });
      this.limiters.set(key, limiter);
    }

    try {
      await limiter.consume(key);
      return true;
    } catch (rateLimiterRes) {
      if (rateLimiterRes instanceof RateLimiterRes) {
        const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests. Please try again later.',
            retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw rateLimiterRes;
    }
  }
}
```

3. Apply to sensitive endpoints:

```typescript
// In insurance-claim.controller.ts
@Post('submit')
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimits.ClaimSubmission()
async submitClaim(@Body() dto: SubmitClaimDto) {
  // ...
}

// In payment.controller.ts
@Post()
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimits.PaymentCreation()
async createPayment(@Body() dto: CreatePaymentDto) {
  // ...
}
```

**Testing**:
- Submit 6 claims in 1 hour (5th should succeed, 6th should fail)
- Verify 429 status code with retry-after header
- Test IP-based and user-based limits
- Verify Redis keys created correctly

---

### 1.4 Add Cost Validation Limits (HIGH-003)

**Steps**:

1. Create validation decorator:

```typescript
// File: src/core/security/validators/cost-validator.ts
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { isCostReasonable } from '../security-config.constants';

export function IsValidCost(coverageType: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidCost',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'number') return false;

          const type = (args.object as any)[coverageType] || 'GENERAL';
          const result = isCostReasonable(value, type);

          return result.valid;
        },
        defaultMessage(args: ValidationArguments) {
          const value = args.value;
          const type = (args.object as any)[coverageType] || 'GENERAL';
          const result = isCostReasonable(value, type);

          return result.reason || 'Invalid cost amount';
        },
      },
    });
  };
}
```

2. Update DTOs:

```typescript
// In create-health-note.dto.ts
@IsNumber()
@Min(1000)
@Max(10_000_000)
@IsValidCost('visitType') // Validates against coverage type limits
actualCost?: number;

// In submit-claim.dto.ts
@IsNumber()
@Min(0)
@Max(10_000_000)
@IsValidCost('claimType')
totalClaimAmount: number;
```

3. Add server-side validation in service:

```typescript
// In auto-claim-generator.service.ts
const costCheck = isCostReasonable(actualCost, coverageType);

if (!costCheck.valid) {
  this.logger.warn(`Cost validation failed: ${costCheck.reason}`);
  return null;
}

if (costCheck.alertRequired) {
  // Send alert to admin dashboard
  this.eventEmitter.emit('alert.high-value-claim', {
    amount: actualCost,
    coverageType,
    reason: costCheck.reason,
  });
}
```

**Testing**:
- Submit claim with cost > max limit (should fail)
- Submit claim with cost > alert threshold (should succeed with alert)
- Test all coverage types
- Verify admin alerts triggered

---

## Phase 2: High Priority Fixes (Week 2)

### 2.1 Fix IDOR Vulnerability (HIGH-001)

**File**: `/src/modules/hospitals/guards/hospital-user.guard.ts`

**Implementation**:

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest();
  const user = request.user;

  if (!user || !user.userId) {
    throw new UnauthorizedException('Not authenticated');
  }

  const hospitalId = request.params.hospitalId;

  if (!hospitalId) {
    throw new ForbiddenException('Hospital ID required');
  }

  // CRITICAL FIX: Verify user-hospital relationship
  const hospitalUser = await this.hospitalUserRepository.findOne({
    where: {
      id: user.userId,
      hospitalId, // Must match request hospital
      isActive: true,
    },
    relations: ['hospital'], // Load hospital for additional checks
  });

  if (!hospitalUser) {
    // Log potential security incident
    await this.auditService.log({
      userId: user.userId,
      action: 'UNAUTHORIZED_HOSPITAL_ACCESS_ATTEMPT',
      resource: 'Hospital',
      resourceId: hospitalId,
      purpose: 'Security incident',
      legalBasis: 'Security monitoring',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: {
        attemptedHospitalId: hospitalId,
        userHospitalId: null,
        severity: 'HIGH',
      },
    });

    throw new ForbiddenException('Access denied: Not a staff member of this hospital');
  }

  // ADDITIONAL CHECK: Verify hospital is active
  if (!hospitalUser.hospital || !hospitalUser.hospital.isActive) {
    throw new ForbiddenException('Hospital account is inactive');
  }

  // Check if account is locked
  if (hospitalUser.lockedUntil && hospitalUser.lockedUntil > new Date()) {
    throw new ForbiddenException(
      `Account locked until ${hospitalUser.lockedUntil.toISOString()}`,
    );
  }

  // Attach hospital user to request
  request.hospitalUser = hospitalUser;

  // Update last login (async, don't await)
  this.hospitalUserRepository
    .update(hospitalUser.id, {
      lastLoginAt: new Date(),
      lastLoginIp: request.ip || request.connection.remoteAddress,
    })
    .catch((err) => this.logger.error('Failed to update last login', err));

  return true;
}
```

**Testing**:
- Hospital A staff tries to access Hospital B data (should fail)
- Verify audit log created for unauthorized attempt
- Test with inactive hospital account
- Test with locked user account

---

### 2.2 Implement Session Management (HIGH-002)

**Steps**:

1. Create session service:

```typescript
// File: src/core/auth/session.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { SecurityConfig } from '../security/security-config.constants';

@Injectable()
export class SessionService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async createSession(userId: string, token: string, metadata: any): Promise<void> {
    const sessionKey = `session:${userId}:${token}`;
    const userSessionsKey = `user-sessions:${userId}`;

    // Store session data
    await this.redis.setex(
      sessionKey,
      SecurityConfig.SESSION.ABSOLUTE_TIMEOUT_MS / 1000,
      JSON.stringify({
        userId,
        token,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        ...metadata,
      }),
    );

    // Add to user's session list
    await this.redis.sadd(userSessionsKey, token);

    // Enforce max concurrent sessions
    const sessions = await this.redis.smembers(userSessionsKey);
    if (sessions.length > SecurityConfig.SESSION.MAX_CONCURRENT_SESSIONS) {
      // Remove oldest session
      const oldestSession = sessions[0];
      await this.revokeSession(userId, oldestSession);
    }
  }

  async validateSession(userId: string, token: string): Promise<boolean> {
    const sessionKey = `session:${userId}:${token}`;
    const session = await this.redis.get(sessionKey);

    if (!session) {
      return false;
    }

    const sessionData = JSON.parse(session);

    // Check idle timeout
    const lastActivity = new Date(sessionData.lastActivity);
    const idleTime = Date.now() - lastActivity.getTime();

    if (idleTime > SecurityConfig.SESSION.IDLE_TIMEOUT_MS) {
      await this.revokeSession(userId, token);
      return false;
    }

    // Update last activity
    sessionData.lastActivity = new Date().toISOString();
    await this.redis.set(sessionKey, JSON.stringify(sessionData));

    return true;
  }

  async revokeSession(userId: string, token: string): Promise<void> {
    const sessionKey = `session:${userId}:${token}`;
    const userSessionsKey = `user-sessions:${userId}`;

    await this.redis.del(sessionKey);
    await this.redis.srem(userSessionsKey, token);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    const userSessionsKey = `user-sessions:${userId}`;
    const sessions = await this.redis.smembers(userSessionsKey);

    for (const token of sessions) {
      await this.revokeSession(userId, token);
    }
  }

  async getUserSessions(userId: string): Promise<any[]> {
    const userSessionsKey = `user-sessions:${userId}`;
    const tokens = await this.redis.smembers(userSessionsKey);

    const sessions = [];
    for (const token of tokens) {
      const sessionKey = `session:${userId}:${token}`;
      const sessionData = await this.redis.get(sessionKey);
      if (sessionData) {
        sessions.push(JSON.parse(sessionData));
      }
    }

    return sessions;
  }
}
```

2. Update JWT strategy to validate session:

```typescript
// In jwt.strategy.ts
async validate(payload: any) {
  const isValid = await this.sessionService.validateSession(
    payload.sub,
    payload.jti, // JWT ID
  );

  if (!isValid) {
    throw new UnauthorizedException('Session expired or invalid');
  }

  return { userId: payload.sub, email: payload.email };
}
```

3. Add logout endpoint:

```typescript
@Post('logout')
@UseGuards(JwtAuthGuard)
async logout(@Request() req) {
  await this.sessionService.revokeSession(req.user.userId, req.user.jti);
  return { message: 'Logged out successfully' };
}

@Post('logout-all')
@UseGuards(JwtAuthGuard)
async logoutAll(@Request() req) {
  await this.sessionService.revokeAllSessions(req.user.userId);
  return { message: 'All sessions revoked' };
}
```

**Testing**:
- Login and verify session created in Redis
- Test idle timeout (wait 31 minutes, request should fail)
- Login from 4 devices (4th should invalidate 1st)
- Test logout and logout-all endpoints
- Verify concurrent session detection

---

### 2.3 Implement XSS Protection (HIGH-004)

**Steps**:

1. Install DOMPurify:

```bash
npm install --save isomorphic-dompurify
```

2. Create sanitization service:

```typescript
// File: src/core/security/sanitization.service.ts
import DOMPurify from 'isomorphic-dompurify';
import { SecurityConfig } from './security-config.constants';

export class SanitizationService {
  /**
   * Sanitize HTML input to prevent XSS
   */
  sanitizeHtml(dirty: string): string {
    if (!dirty) return '';

    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: SecurityConfig.XSS.ALLOWED_TAGS,
      ALLOWED_ATTR: SecurityConfig.XSS.ALLOWED_ATTRIBUTES,
    });
  }

  /**
   * Sanitize plain text (remove HTML entirely)
   */
  sanitizePlainText(dirty: string): string {
    if (!dirty) return '';

    // Remove all HTML tags
    let clean = dirty.replace(/<[^>]*>/g, '');

    // Remove script content
    clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove dangerous attributes
    clean = clean.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    clean = clean.replace(/javascript:/gi, '');

    // Limit length
    if (clean.length > SecurityConfig.XSS.MAX_TEXT_LENGTH) {
      clean = clean.substring(0, SecurityConfig.XSS.MAX_TEXT_LENGTH);
    }

    return clean.trim();
  }

  /**
   * Sanitize object recursively
   */
  sanitizeObject<T>(obj: T): T {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item)) as unknown as T;
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizePlainText(value);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized as T;
  }
}
```

3. Create transformation interceptor:

```typescript
// File: src/core/security/interceptors/sanitize.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SanitizationService } from '../sanitization.service';

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  constructor(private readonly sanitizationService: SanitizationService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Sanitize request body
    if (request.body) {
      request.body = this.sanitizationService.sanitizeObject(request.body);
    }

    // Sanitize query parameters
    if (request.query) {
      request.query = this.sanitizationService.sanitizeObject(request.query);
    }

    return next.handle();
  }
}
```

4. Apply globally or to specific controllers:

```typescript
// In main.ts
app.useGlobalInterceptors(new SanitizeInterceptor(new SanitizationService()));

// OR in controller
@UseInterceptors(SanitizeInterceptor)
@Controller('medical-records')
export class MedicalRecordsController {}
```

**Testing**:
- Submit medical record with `<script>alert('XSS')</script>` in diagnosis
- Verify script tags removed before storage
- Test with various XSS payloads
- Verify legitimate content not corrupted

---

### 2.4 Enforce Strong Password Policy (HIGH-005)

**Steps**:

1. Create password validation pipe:

```typescript
// File: src/core/auth/pipes/password-validation.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { validatePasswordStrength } from '../../security/security-config.constants';

@Injectable()
export class PasswordValidationPipe implements PipeTransform {
  transform(value: any) {
    if (!value || !value.password) {
      return value;
    }

    const validation = validatePasswordStrength(value.password);

    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Password does not meet security requirements',
        errors: validation.errors,
      });
    }

    return value;
  }
}
```

2. Check against leaked passwords:

```typescript
// In auth.service.ts
async checkPasswordLeak(password: string): Promise<boolean> {
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.substring(0, 5);
  const suffix = sha1.substring(5);

  const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`);
  const hashes = response.data.split('\n');

  for (const line of hashes) {
    const [hash, count] = line.split(':');
    if (hash === suffix) {
      return true; // Password is leaked
    }
  }

  return false;
}

// In register/change password
const isLeaked = await this.authService.checkPasswordLeak(dto.password);
if (isLeaked) {
  throw new BadRequestException('This password has been compromised in a data breach. Please choose a different password.');
}
```

3. Implement password history:

```typescript
// Add to User entity
@Column({ type: 'jsonb', default: [] })
passwordHistory: string[]; // Array of hashed passwords

// In change password service
// Check against last 5 passwords
for (const oldHash of user.passwordHistory.slice(-5)) {
  const matches = await bcrypt.compare(newPassword, oldHash);
  if (matches) {
    throw new BadRequestException('Cannot reuse recent passwords');
  }
}

// Add new password to history
user.passwordHistory.push(await bcrypt.hash(newPassword, 12));
```

4. Add account lockout:

```typescript
// Add to HospitalUser entity
@Column({ type: 'integer', default: 0 })
failedLoginAttempts: number;

@Column({ type: 'timestamp', nullable: true })
lockedUntil?: Date;

// In login service
if (user.lockedUntil && user.lockedUntil > new Date()) {
  throw new UnauthorizedException('Account is locked');
}

const passwordValid = await bcrypt.compare(password, user.passwordHash);

if (!passwordValid) {
  user.failedLoginAttempts += 1;

  if (user.failedLoginAttempts >= 5) {
    user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  }

  await this.hospitalUserRepository.save(user);
  throw new UnauthorizedException('Invalid credentials');
}

// Reset on successful login
user.failedLoginAttempts = 0;
user.lockedUntil = null;
await this.hospitalUserRepository.save(user);
```

**Testing**:
- Try weak passwords (should fail)
- Try leaked password (should fail)
- Try reusing old password (should fail)
- Test account lockout after 5 failed attempts
- Verify lockout expires after 30 minutes

---

## Phase 3: Medium Priority Fixes (Week 3-4)

### 3.1 Implement CSRF Protection (MED-001)

```bash
npm install --save csurf cookie-parser
```

```typescript
// In main.ts
import * as csurf from 'csurf';
import * as cookieParser from 'cookie-parser';

app.use(cookieParser());
app.use(
  csurf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  }),
);

// Add CSRF token to response
app.use((req, res, next) => {
  res.cookie('XSRF-TOKEN', req.csrfToken());
  next();
});
```

### 3.2 Enhance Audit Logging (MED-002)

```typescript
// Add to payment operations
await this.auditService.log({
  userId: claim.userId,
  action: 'HOSPITAL_PAYMENT_CREATED',
  resource: 'HospitalPayment',
  resourceId: savedPayment.id,
  purpose: 'Financial transaction audit',
  legalBasis: 'Contract fulfillment',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  metadata: {
    amount: savedPayment.amount,
    hospitalId: savedPayment.hospitalId,
    claimId: savedPayment.claimId,
    paymentMethod: savedPayment.paymentMethod,
    correlationId: uuidv4(), // For transaction tracking
    bankAccount: maskBankAccount(savedPayment.bankAccountNumber),
  },
});
```

### 3.3 Implement Key Rotation (MED-003)

Create key rotation service and schedule quarterly rotations.

### 3.4 Add File Upload Validation (MED-004)

```typescript
// Create file validation pipe
@Injectable()
export class FileValidationPipe implements PipeTransform {
  transform(file: Express.Multer.File) {
    // Check file size
    if (file.size > SecurityConfig.FILE_UPLOAD.MAX_FILE_SIZE_MB * 1024 * 1024) {
      throw new BadRequestException('File too large');
    }

    // Check MIME type
    if (!SecurityConfig.FILE_UPLOAD.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type');
    }

    // Sanitize filename
    file.originalname = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');

    return file;
  }
}
```

### 3.5 Implement API Versioning (MED-005)

```typescript
// In main.ts
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});

// In controllers
@Controller({ path: 'claims', version: '1' })
export class InsuranceClaimController {}
```

### 3.6 Improve Error Messages (MED-006)

```typescript
// Create error filter
@Catch()
export class SecurityErrorFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    // Generic error message for clients
    response.status(exception.status || 500).json({
      statusCode: exception.status || 500,
      message: 'An error occurred',
      errorCode: 'E' + (exception.status || 500),
    });

    // Log detailed error server-side only
    this.logger.error('Error occurred', {
      exception: exception.stack,
      request: maskObjectForLogging(ctx.getRequest()),
    });
  }
}
```

---

## Phase 4: Low Priority & Polish (Month 2)

- Implement HTTPS enforcement
- Fix weak default keys
- Add security headers (helmet)
- Implement automated compliance reporting
- Add security monitoring dashboard

---

## Testing Checklist

### Security Testing

- [ ] Encryption tests for all sensitive fields
- [ ] Rate limiting tests (exceed limits)
- [ ] IDOR tests (cross-hospital access)
- [ ] XSS tests (malicious scripts)
- [ ] CSRF tests (cross-site requests)
- [ ] Session management tests
- [ ] Password policy tests
- [ ] Cost validation tests
- [ ] File upload tests (malware, oversized)
- [ ] Audit log tests (chain integrity)

### Compliance Testing

- [ ] PIPA Article 24 compliance (encryption)
- [ ] 의료법 Article 19 compliance (medical records)
- [ ] Data retention tests (30-day expiration)
- [ ] Audit logging completeness
- [ ] User consent tracking

### Performance Testing

- [ ] Encryption/decryption performance
- [ ] Rate limiting performance
- [ ] Session validation performance
- [ ] Database query performance with encrypted fields

---

## Deployment Checklist

### Pre-Deployment

- [ ] Run all tests
- [ ] Run security audit scan
- [ ] Review all environment variables
- [ ] Backup database
- [ ] Create rollback plan

### Deployment

- [ ] Run database migrations
- [ ] Run data encryption migration
- [ ] Deploy new code
- [ ] Verify encryption working
- [ ] Verify rate limiting working
- [ ] Monitor error logs

### Post-Deployment

- [ ] Verify no data loss
- [ ] Test critical user flows
- [ ] Monitor performance metrics
- [ ] Check audit logs for errors
- [ ] Notify stakeholders

---

## Monitoring & Alerting

### Critical Alerts

- Audit chain integrity broken
- High-value payment (>₩5M)
- Multiple failed login attempts
- Unauthorized access attempts
- Encryption/decryption failures

### Metrics to Track

- Rate limit hits per endpoint
- Average encryption/decryption time
- Session creation/revocation rate
- Failed authentication rate
- File upload rejections

---

**Estimated Timeline Summary**:

- Week 1 (Critical): 40-50 hours
- Week 2 (High): 40-50 hours
- Week 3-4 (Medium): 30-40 hours
- Month 2 (Low + Polish): 10-20 hours

**Total**: 120-160 hours

---

**Next Steps**:

1. Review this implementation guide
2. Assign team members to each phase
3. Set up security testing environment
4. Begin Phase 1 implementation
5. Schedule daily security standups

**Contact**: Security team for questions/clarifications
