# Authentication System Documentation

Complete JWT authentication system with OAuth2 integration for Pet to You API.

## Table of Contents

1. [Overview](#overview)
2. [Security Architecture](#security-architecture)
3. [Authentication Methods](#authentication-methods)
4. [Authorization](#authorization)
5. [API Endpoints](#api-endpoints)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### Features

✅ **JWT Authentication with RS256**
- Asymmetric encryption for enhanced security
- Token rotation on refresh (prevents replay attacks)
- Token revocation support (Redis blacklist)
- 15-minute access tokens, 7-day refresh tokens

✅ **OAuth2 Integration**
- Kakao Login (Korea)
- Naver Login (Korea)
- Apple Sign In

✅ **Security Hardening**
- bcrypt password hashing (12 rounds)
- Account lockout after 5 failed attempts
- Rate limiting (5 login attempts per 15 minutes)
- Audit logging for all authentication events
- PIPA compliance for Korean privacy laws

✅ **Authorization**
- Role-Based Access Control (RBAC)
- Fine-Grained Permissions (ABAC)
- Public route markers

---

## Security Architecture

### JWT RS256 (Asymmetric Encryption)

```
┌─────────────────────────────────────────┐
│         RSA Key Pair (4096-bit)         │
├─────────────────────────────────────────┤
│  Private Key (keys/jwt.key)             │
│  - Used for SIGNING tokens              │
│  - NEVER exposed to clients             │
│  - Stored securely on server            │
├─────────────────────────────────────────┤
│  Public Key (keys/jwt.key.pub)          │
│  - Used for VERIFYING tokens            │
│  - Can be shared safely                 │
│  - Distributed to microservices         │
└─────────────────────────────────────────┘
```

**Benefits of RS256 over HS256:**
- Private key never leaves the server
- Public key can be shared for verification
- Better key rotation strategy
- Industry standard for production systems

### Token Flow

```
┌─────────┐                              ┌─────────┐
│ Client  │                              │ Server  │
└────┬────┘                              └────┬────┘
     │                                        │
     │  1. POST /auth/login                  │
     │  { email, password }                  │
     ├──────────────────────────────────────>│
     │                                        │
     │                                        │ 2. Validate credentials
     │                                        │ 3. Generate tokens (RS256)
     │                                        │ 4. Store refresh token in Redis
     │                                        │
     │  5. Return tokens                     │
     │  { accessToken, refreshToken }        │
     │<──────────────────────────────────────┤
     │                                        │
     │  6. API Request with Bearer token     │
     │  Authorization: Bearer <accessToken>  │
     ├──────────────────────────────────────>│
     │                                        │
     │                                        │ 7. Verify signature (public key)
     │                                        │ 8. Check revocation (Redis)
     │                                        │ 9. Validate user status
     │                                        │
     │  10. Protected resource               │
     │<──────────────────────────────────────┤
     │                                        │
     │  11. Token expired (after 15 min)     │
     │  POST /auth/refresh                   │
     │  { refreshToken }                     │
     ├──────────────────────────────────────>│
     │                                        │
     │                                        │ 12. Verify refresh token
     │                                        │ 13. Check Redis whitelist
     │                                        │ 14. Revoke old refresh token
     │                                        │ 15. Generate new token pair
     │                                        │
     │  16. New tokens                       │
     │<──────────────────────────────────────┤
     │                                        │
```

### Token Rotation (Refresh)

**Security Measure:** Each refresh token can only be used **once**.

```
┌─────────────────────────────────────────┐
│   Refresh Token Lifecycle               │
├─────────────────────────────────────────┤
│  1. Login → Generate refresh token A    │
│     Store in Redis: refresh_token:A     │
├─────────────────────────────────────────┤
│  2. Client uses refresh token A         │
│     Server checks: exists & not used    │
│     Mark as used, generate token B      │
│     Store in Redis: refresh_token:B     │
│     Delete refresh_token:A              │
├─────────────────────────────────────────┤
│  3. If token A used again (attack!)     │
│     Revoke ALL user tokens              │
│     Force re-login                      │
└─────────────────────────────────────────┘
```

---

## Authentication Methods

### 1. Email/Password Authentication

**Registration:**
```typescript
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd123",
  "name": "John Doe",
  "phoneNumber": "01012345678",
  "termsAccepted": true,
  "privacyPolicyAccepted": true,
  "marketingConsent": false
}

Response:
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "consumer",
    "status": "pending_verification"
  },
  "tokens": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "expiresIn": 900
  }
}
```

**Login:**
```typescript
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd123"
}

Response:
{
  "user": { ... },
  "tokens": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "expiresIn": 900
  }
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

---

### 2. OAuth2 Authentication

#### Kakao Login

```typescript
// 1. Redirect to Kakao
GET /api/v1/auth/kakao

// 2. Kakao redirects back with authorization code
GET /api/v1/auth/kakao/callback?code=XXXXX

// 3. Server exchanges code for user info and redirects to frontend
// Frontend receives: ?accessToken=XXX&refreshToken=YYY
```

**Setup:**
1. Register app at https://developers.kakao.com
2. Configure redirect URI: `http://localhost:3000/api/v1/auth/kakao/callback`
3. Set `KAKAO_CLIENT_ID` and `KAKAO_CLIENT_SECRET` in `.env`

#### Naver Login

```typescript
// 1. Redirect to Naver
GET /api/v1/auth/naver

// 2. Naver redirects back
GET /api/v1/auth/naver/callback?code=XXXXX&state=XXXXX

// 3. Frontend receives tokens
```

**Setup:**
1. Register app at https://developers.naver.com
2. Configure redirect URI: `http://localhost:3000/api/v1/auth/naver/callback`
3. Set `NAVER_CLIENT_ID` and `NAVER_CLIENT_SECRET` in `.env`

#### Apple Sign In

```typescript
// 1. Redirect to Apple
GET /api/v1/auth/apple

// 2. Apple redirects back
GET /api/v1/auth/apple/callback

// 3. Frontend receives tokens
```

**Setup:**
1. Register app at https://developer.apple.com
2. Create Service ID
3. Generate private key (.p8 file)
4. Configure all Apple credentials in `.env`

**Important:** Apple only provides user name on first sign-in. Store it immediately.

---

## Authorization

### Role-Based Access Control (RBAC)

**User Roles** (hierarchical):
1. `CONSUMER` - Regular users
2. `HOSPITAL_STAFF` - Hospital employees
3. `HOSPITAL_ADMIN` - Hospital administrators
4. `SHELTER_ADMIN` - Shelter administrators
5. `DAYCARE_ADMIN` - Daycare administrators
6. `PLATFORM_ADMIN` - Platform administrators
7. `SUPER_ADMIN` - System administrators

**Usage:**
```typescript
@Roles(UserRole.HOSPITAL_ADMIN, UserRole.PLATFORM_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('admin/dashboard')
getAdminDashboard() {
  return { ... };
}
```

### Fine-Grained Permissions (ABAC)

**Permission Format:** `resource:action`

**Examples:**
- `pet:read` - Read pet data
- `pet:write` - Create/update pets
- `pet:delete` - Delete pets
- `booking:approve` - Approve bookings
- `billing:refund` - Process refunds

**Usage:**
```typescript
@Permissions('billing:read', 'billing:refund')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post('refunds')
processRefund() {
  return { ... };
}
```

### Public Routes

```typescript
@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Auth Required | Rate Limit | Description |
|--------|----------|---------------|------------|-------------|
| POST | `/auth/register` | No | 3/min | Register new user |
| POST | `/auth/login` | No | 5/15min | Login user |
| POST | `/auth/refresh` | No | - | Refresh access token |
| POST | `/auth/logout` | Yes | - | Logout user |
| GET | `/auth/me` | Yes | - | Get current user |
| POST | `/auth/change-password` | Yes | - | Change password |

### OAuth2 Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/kakao` | Redirect to Kakao login |
| GET | `/auth/kakao/callback` | Kakao callback |
| GET | `/auth/naver` | Redirect to Naver login |
| GET | `/auth/naver/callback` | Naver callback |
| GET | `/auth/apple` | Redirect to Apple Sign In |
| GET | `/auth/apple/callback` | Apple callback |

---

## Security Best Practices

### 1. Token Storage (Client-Side)

**✅ Recommended:**
- Store access token in memory (React state, Vuex, etc.)
- Store refresh token in `httpOnly` cookie (server-side set)
- Never store tokens in localStorage (XSS vulnerable)

**Example (NestJS):**
```typescript
@Post('login')
async login(@Res() res: Response) {
  const { accessToken, refreshToken } = await this.authService.login();
  
  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  
  return res.json({ accessToken });
}
```

### 2. Token Revocation

**When to revoke:**
- User logout
- Password change
- Account deletion
- Security incident

**How it works:**
- Access tokens → Redis blacklist
- Refresh tokens → Delete from Redis whitelist

### 3. Account Lockout

**Rules:**
- 5 failed login attempts → 15-minute lockout
- Reset counter on successful login
- Audit all failed attempts

### 4. Rate Limiting

**Login endpoint:**
- 5 requests per 15 minutes per IP
- Prevents brute force attacks

**Registration endpoint:**
- 3 requests per minute per IP
- Prevents spam accounts

### 5. Audit Logging

**All authentication events are logged:**
- User registration
- Login success/failure
- Token refresh
- Password change
- Account lockout
- OAuth2 login

**PIPA Compliance:**
- Purpose of access recorded
- Legal basis documented
- Tamper-proof hash chain

---

## Troubleshooting

### Common Issues

**1. "Invalid token" error**
- Check token expiration
- Verify RS256 public key is accessible
- Check Redis connectivity

**2. "Token has been revoked"**
- User logged out or changed password
- Re-authenticate with login

**3. "Account locked" error**
- Wait 15 minutes for automatic unlock
- Or contact support for manual unlock

**4. OAuth2 callback fails**
- Verify redirect URIs match exactly
- Check OAuth credentials in `.env`
- Ensure HTTPS in production

**5. "Refresh token already used"**
- Possible token theft detected
- All sessions revoked for security
- User must re-login

### Debug Mode

Enable detailed logging:
```env
LOG_LEVEL=debug
ENABLE_AUDIT_LOGGING=true
```

### Health Check

```typescript
GET /health

Response:
{
  "status": "ok",
  "redis": "connected",
  "database": "connected",
  "jwt": "valid"
}
```

---

## Production Deployment Checklist

- [ ] Generate production RSA keys (4096-bit)
- [ ] Set strong `ENCRYPTION_MASTER_KEY` (32+ bytes)
- [ ] Configure proper KMS (AWS KMS, GCP KMS)
- [ ] Set `NODE_ENV=production`
- [ ] Disable `DB_SYNCHRONIZE`
- [ ] Configure Redis password
- [ ] Set up HTTPS for all callbacks
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerting
- [ ] Regular security audits
- [ ] Implement email verification
- [ ] Set up backup and disaster recovery
- [ ] Load test authentication endpoints
- [ ] Document incident response procedures

---

## References

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Korean PIPA Law](https://www.privacy.go.kr/eng)
- [RS256 vs HS256](https://auth0.com/blog/rs256-vs-hs256-whats-the-difference/)
