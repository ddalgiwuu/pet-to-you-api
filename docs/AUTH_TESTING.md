# Authentication System - Testing Guide

Comprehensive testing guide for JWT + OAuth2 authentication system.

## 🧪 Test Categories

1. **Unit Tests** - Individual components
2. **Integration Tests** - Component interactions
3. **E2E Tests** - Complete user flows
4. **Security Tests** - Attack scenarios
5. **Performance Tests** - Load and stress testing

---

## 1️⃣ Unit Tests

### AuthService Tests

```typescript
describe('AuthService', () => {
  describe('register', () => {
    it('should create new user with hashed password');
    it('should throw ConflictException if email exists');
    it('should create HMAC indexes for searchable encryption');
    it('should record consent timestamps');
    it('should generate JWT tokens');
    it('should create audit log');
  });

  describe('login', () => {
    it('should return tokens for valid credentials');
    it('should throw UnauthorizedException for invalid password');
    it('should throw UnauthorizedException for non-existent user');
    it('should check account lockout status');
    it('should increment failed login attempts');
    it('should lock account after 5 failed attempts');
    it('should reset failed attempts on successful login');
  });

  describe('refresh', () => {
    it('should generate new token pair');
    it('should revoke old refresh token');
    it('should throw for already-used refresh token');
    it('should revoke all tokens if refresh token reused');
  });

  describe('logout', () => {
    it('should revoke access token');
    it('should revoke all refresh tokens');
    it('should create audit log');
  });

  describe('OAuth2', () => {
    it('should create user from Kakao profile');
    it('should link Kakao account to existing user');
    it('should create user from Naver profile');
    it('should create user from Apple profile');
    it('should handle missing email in OAuth profile');
  });
});
```

### JWT Strategy Tests

```typescript
describe('JwtStrategy', () => {
  it('should validate access token with RS256');
  it('should extract user from token payload');
  it('should throw for revoked token');
  it('should throw for expired token');
  it('should throw for refresh token type');
  it('should throw for deleted user');
  it('should throw for locked user');
  it('should throw for suspended user');
  it('should update last activity timestamp');
});
```

### JWT Refresh Strategy Tests

```typescript
describe('JwtRefreshStrategy', () => {
  it('should validate refresh token');
  it('should check token exists in whitelist');
  it('should throw for already-used token');
  it('should revoke all tokens on token reuse');
  it('should mark token as used');
});
```

### Guards Tests

```typescript
describe('JwtAuthGuard', () => {
  it('should allow access with valid token');
  it('should deny access without token');
  it('should allow public routes');
  it('should handle expired tokens');
});

describe('RolesGuard', () => {
  it('should allow access with correct role');
  it('should deny access with insufficient role');
  it('should allow multiple roles (OR logic)');
  it('should skip public routes');
});

describe('PermissionsGuard', () => {
  it('should allow access with required permissions');
  it('should deny access without permissions');
  it('should support wildcard permissions');
  it('should require all permissions (AND logic)');
});
```

---

## 2️⃣ Integration Tests

### Registration Flow

```typescript
describe('POST /auth/register', () => {
  it('should register user and return tokens', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecureP@ssw0rd123',
        name: 'Test User',
        termsAccepted: true,
        privacyPolicyAccepted: true,
      })
      .expect(201);

    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('tokens.accessToken');
    expect(response.body).toHaveProperty('tokens.refreshToken');
    expect(response.body.user.email).toBe('test@example.com');
  });

  it('should reject weak password', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
        termsAccepted: true,
        privacyPolicyAccepted: true,
      })
      .expect(400);
  });

  it('should reject duplicate email', async () => {
    // Register first user
    await registerUser('test@example.com');
    
    // Try to register again
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecureP@ssw0rd123',
        name: 'Test User',
        termsAccepted: true,
        privacyPolicyAccepted: true,
      })
      .expect(409);
  });
});
```

### Login Flow

```typescript
describe('POST /auth/login', () => {
  beforeEach(async () => {
    await registerUser('test@example.com', 'SecureP@ssw0rd123');
  });

  it('should login with valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecureP@ssw0rd123',
      })
      .expect(200);

    expect(response.body).toHaveProperty('tokens.accessToken');
  });

  it('should reject invalid password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword',
      })
      .expect(401);
  });

  it('should lock account after 5 failed attempts', async () => {
    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
        .expect(401);
    }

    // 6th attempt should report account locked
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecureP@ssw0rd123',
      })
      .expect(401);

    expect(response.body.message).toContain('locked');
  });
});
```

### Token Refresh Flow

```typescript
describe('POST /auth/refresh', () => {
  it('should refresh tokens', async () => {
    const loginResponse = await loginUser('test@example.com');
    const { refreshToken } = loginResponse.body.tokens;

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body.refreshToken).not.toBe(refreshToken);
  });

  it('should reject already-used refresh token', async () => {
    const loginResponse = await loginUser('test@example.com');
    const { refreshToken } = loginResponse.body.tokens;

    // Use refresh token once
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    // Try to use again (should fail)
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
```

### Protected Routes

```typescript
describe('GET /auth/me', () => {
  it('should return user profile with valid token', async () => {
    const { accessToken } = await getAuthTokens();

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email');
  });

  it('should reject without token', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);
  });

  it('should reject with expired token', async () => {
    const expiredToken = generateExpiredToken();

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });
});
```

---

## 3️⃣ E2E Tests

### Complete User Journey

```typescript
describe('User Authentication Journey', () => {
  it('should complete full authentication lifecycle', async () => {
    // 1. Register
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(validRegistrationData)
      .expect(201);

    const { accessToken, refreshToken } = registerResponse.body.tokens;

    // 2. Access protected route
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // 3. Wait for token to expire (or mock time)
    // ...

    // 4. Refresh token
    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    const newAccessToken = refreshResponse.body.accessToken;

    // 5. Access with new token
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(200);

    // 6. Change password
    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .send({
        currentPassword: 'SecureP@ssw0rd123',
        newPassword: 'NewSecureP@ssw0rd456',
      })
      .expect(204);

    // 7. Old tokens should be revoked
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(401);

    // 8. Login with new password
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'NewSecureP@ssw0rd456',
      })
      .expect(200);

    // 9. Logout
    const { accessToken: finalToken } = await getAuthTokens();
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${finalToken}`)
      .expect(204);

    // 10. Verify token is revoked
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${finalToken}`)
      .expect(401);
  });
});
```

---

## 4️⃣ Security Tests

### Attack Scenario Tests

```typescript
describe('Security Tests', () => {
  describe('Brute Force Protection', () => {
    it('should rate limit login attempts', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'test@example.com', password: 'wrong' })
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter(r => r.status === 429);
      
      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Token Security', () => {
    it('should reject manipulated token', async () => {
      const validToken = await getValidToken();
      const manipulated = validToken.slice(0, -10) + 'MANIPULATED';

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${manipulated}`)
        .expect(401);
    });

    it('should reject token signed with wrong algorithm', async () => {
      const hs256Token = signTokenWithHS256({ sub: 'user-id' });

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${hs256Token}`)
        .expect(401);
    });
  });

  describe('SQL Injection Protection', () => {
    it('should sanitize email input', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: "admin'--",
          password: 'anything',
        })
        .expect(401); // Should not cause SQL error
    });
  });

  describe('User Enumeration Protection', () => {
    it('should return same error for wrong email and password', async () => {
      const wrongEmailResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'anything' });

      const wrongPasswordResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'existing@example.com', password: 'wrong' });

      expect(wrongEmailResponse.body.message).toBe(wrongPasswordResponse.body.message);
    });
  });
});
```

---

## 5️⃣ Performance Tests

### Load Testing with Artillery

**artillery.yml:**
```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: Warm up
    - duration: 120
      arrivalRate: 50
      name: Sustained load
    - duration: 60
      arrivalRate: 100
      name: Peak load

scenarios:
  - name: Login Flow
    flow:
      - post:
          url: '/api/v1/auth/login'
          json:
            email: 'load-test@example.com'
            password: 'SecureP@ssw0rd123'
          capture:
            - json: '$.tokens.accessToken'
              as: 'accessToken'
      - get:
          url: '/api/v1/auth/me'
          headers:
            Authorization: 'Bearer {{ accessToken }}'
```

**Run:**
```bash
npm install -g artillery
artillery run artillery.yml
```

**Expected Performance:**
- Login: < 200ms (p95)
- Token Refresh: < 50ms (p95)
- Protected Route: < 10ms (p95)
- Success Rate: > 99%

---

## 🔍 Manual Testing

### Test Case 1: Registration

```bash
# Valid registration
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manual@example.com",
    "password": "SecureP@ssw0rd123",
    "name": "Manual Test",
    "phoneNumber": "01012345678",
    "termsAccepted": true,
    "privacyPolicyAccepted": true
  }'

# Expected: 201 Created with user and tokens
```

### Test Case 2: Login

```bash
# Valid login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manual@example.com",
    "password": "SecureP@ssw0rd123"
  }'

# Expected: 200 OK with tokens
```

### Test Case 3: Protected Route

```bash
# With token
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Expected: 200 OK with user profile

# Without token
curl http://localhost:3000/api/v1/auth/me

# Expected: 401 Unauthorized
```

### Test Case 4: Token Refresh

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'

# Expected: 200 OK with new token pair
```

### Test Case 5: Account Lockout

```bash
# Make 5 failed login attempts
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "manual@example.com",
      "password": "WrongPassword"
    }'
  echo "\nAttempt $i"
  sleep 1
done

# 6th attempt should report account locked
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manual@example.com",
    "password": "SecureP@ssw0rd123"
  }'

# Expected: 401 with "Account locked" message
```

### Test Case 6: Token Rotation

```bash
# Login and save refresh token
REFRESH_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manual@example.com","password":"SecureP@ssw0rd123"}' \
  | jq -r '.tokens.refreshToken')

# Use refresh token once
NEW_REFRESH=$(curl -s -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" \
  | jq -r '.refreshToken')

echo "New refresh token: $NEW_REFRESH"

# Try to use old refresh token again (should fail)
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"

# Expected: 401 Unauthorized with "already been used" message
```

---

## 📊 Test Coverage Goals

### Coverage Targets
- **Unit Tests:** ≥ 80%
- **Integration Tests:** ≥ 70%
- **E2E Tests:** 100% of critical paths
- **Security Tests:** All attack scenarios

### Critical Paths (Must Test)
- ✅ User registration
- ✅ User login
- ✅ Token refresh
- ✅ Token revocation
- ✅ Account lockout
- ✅ Password change
- ✅ OAuth2 flows
- ✅ Role-based access
- ✅ Permission-based access

---

## 🛠️ Testing Tools

### Recommended Tools
- **Jest** - Unit and integration tests
- **Supertest** - HTTP endpoint testing
- **Artillery** - Load testing
- **OWASP ZAP** - Security scanning
- **Burp Suite** - Penetration testing
- **k6** - Performance testing

### Install Test Dependencies

```bash
npm install --save-dev \
  @nestjs/testing \
  jest \
  supertest \
  @types/jest \
  @types/supertest
```

---

## 🚨 Security Testing Tools

### OWASP ZAP (Free)

```bash
# Docker
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000 \
  -r zap-report.html

# Focus on authentication endpoints
docker run -t owasp/zap2docker-stable zap-full-scan.py \
  -t http://localhost:3000/api/v1/auth \
  -r auth-security-scan.html
```

### JWT Security Testing

```bash
# Install jwt_tool
pip install jwt_tool

# Scan JWT for vulnerabilities
jwt_tool YOUR_JWT_TOKEN

# Test common attacks
jwt_tool YOUR_JWT_TOKEN -M at  # Algorithm tampering
jwt_tool YOUR_JWT_TOKEN -M pb  # Payload brute force
```

---

## ✅ Test Checklist

### Before Each Release
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Security scan completed (no high/critical issues)
- [ ] Load test passes (response times acceptable)
- [ ] Manual testing of critical flows
- [ ] OAuth2 flows tested in staging
- [ ] Audit logs verified
- [ ] Token rotation verified
- [ ] Account lockout verified

### Regression Testing
- [ ] Re-test after dependency updates
- [ ] Re-test after security patches
- [ ] Re-test after OAuth2 provider updates
- [ ] Re-test after infrastructure changes

---

## 📝 Test Data

### Test Users

```typescript
const testUsers = [
  {
    email: 'consumer@test.com',
    password: 'TestP@ssw0rd123',
    role: UserRole.CONSUMER,
  },
  {
    email: 'admin@test.com',
    password: 'AdminP@ssw0rd123',
    role: UserRole.PLATFORM_ADMIN,
  },
  {
    email: 'hospital@test.com',
    password: 'HospitalP@ssw0rd123',
    role: UserRole.HOSPITAL_ADMIN,
  },
];
```

### Seed Test Data

```bash
npm run seed -- --env=test
```

---

## 🎯 Success Criteria

### Functional Tests
- ✅ All endpoints return expected status codes
- ✅ All endpoints return expected response structure
- ✅ Error messages are clear and helpful
- ✅ Validation errors are descriptive

### Security Tests
- ✅ No SQL injection vulnerabilities
- ✅ No XSS vulnerabilities
- ✅ Token manipulation detected
- ✅ Account lockout works
- ✅ Rate limiting effective
- ✅ Audit logs complete

### Performance Tests
- ✅ Login < 200ms under normal load
- ✅ Token refresh < 50ms
- ✅ Protected route < 10ms
- ✅ System handles 100 concurrent users
- ✅ No memory leaks during load test

---

## 🚀 Continuous Testing

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: pet_to_you_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Generate RSA Keys
        run: |
          mkdir -p keys
          ssh-keygen -t rsa -b 4096 -m PEM -f keys/jwt.key -N ""
          openssl rsa -in keys/jwt.key -pubout -outform PEM -out keys/jwt.key.pub
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: postgres
          DB_PASSWORD: postgres
          DB_DATABASE: pet_to_you_test
          REDIS_HOST: localhost
          REDIS_PORT: 6379
      
      - name: Security scan
        run: npm audit --audit-level=moderate
```

---

## 📚 Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Artillery Load Testing](https://www.artillery.io/docs)
