# Authentication System - Quick Setup Guide

Complete setup guide for the JWT + OAuth2 authentication system.

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ running
- Redis 6+ running
- Git installed

---

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate RSA Keys (IMPORTANT)

RSA key pair for JWT RS256 signing:

```bash
# Generate 4096-bit RSA key pair
mkdir -p keys
ssh-keygen -t rsa -b 4096 -m PEM -f keys/jwt.key -N ""
openssl rsa -in keys/jwt.key -pubout -outform PEM -out keys/jwt.key.pub

# Verify keys
ls -lh keys/
# Should show: jwt.key (private) and jwt.key.pub (public)
```

**Security:** Add `keys/` to `.gitignore` (already done)

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=pet_to_you

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
ENCRYPTION_MASTER_KEY=change_this_to_32_random_bytes_in_production
BCRYPT_ROUNDS=12

# Frontend URL (for OAuth callbacks)
FRONTEND_URL=http://localhost:3000
```

### 4. Run Database Migrations

```bash
npm run migration:run
```

### 5. Start Development Server

```bash
npm run start:dev
```

Server starts at: `http://localhost:3000`

---

## 🧪 Testing Authentication

### Test 1: Health Check

```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok"}`

### Test 2: User Registration

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecureP@ssw0rd123",
    "name": "Test User",
    "termsAccepted": true,
    "privacyPolicyAccepted": true
  }'
```

Expected: User object + JWT tokens

### Test 3: Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecureP@ssw0rd123"
  }'
```

Save the `accessToken` from response.

### Test 4: Access Protected Route

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: User profile data

### Test 5: Token Refresh

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

Expected: New token pair

### Test 6: Logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected: 204 No Content

---

## 🔐 OAuth2 Setup (Optional)

### Kakao Login Setup

1. **Register App:**
   - Visit: https://developers.kakao.com
   - Create new app
   - Note: REST API Key

2. **Configure Redirect URI:**
   - Platform → Web → Redirect URI
   - Add: `http://localhost:3000/api/v1/auth/kakao/callback`

3. **Update `.env`:**
   ```env
   KAKAO_CLIENT_ID=your_rest_api_key
   KAKAO_CLIENT_SECRET=your_client_secret
   KAKAO_CALLBACK_URL=http://localhost:3000/api/v1/auth/kakao/callback
   ```

4. **Test:**
   - Open browser: `http://localhost:3000/api/v1/auth/kakao`
   - Login with Kakao account
   - Should redirect to frontend with tokens

### Naver Login Setup

1. **Register App:**
   - Visit: https://developers.naver.com
   - Create new application
   - Select: "네이버 로그인" API

2. **Configure Callback URL:**
   - Add: `http://localhost:3000/api/v1/auth/naver/callback`

3. **Update `.env`:**
   ```env
   NAVER_CLIENT_ID=your_client_id
   NAVER_CLIENT_SECRET=your_client_secret
   NAVER_CALLBACK_URL=http://localhost:3000/api/v1/auth/naver/callback
   ```

4. **Test:**
   - Open browser: `http://localhost:3000/api/v1/auth/naver`

### Apple Sign In Setup

1. **Configure Apple Developer Account:**
   - Create Service ID
   - Generate Private Key (.p8)
   - Configure Sign in with Apple

2. **Update `.env`:**
   ```env
   APPLE_CLIENT_ID=your_service_id
   APPLE_TEAM_ID=your_team_id
   APPLE_KEY_ID=your_key_id
   APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----
   APPLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/apple/callback
   ```

3. **Test:**
   - Open browser: `http://localhost:3000/api/v1/auth/apple`

---

## 📊 API Documentation

Swagger UI is available at: `http://localhost:3000/api/docs`

Explore all endpoints interactively.

---

## 🔍 Verify Installation

### Check JWT Keys

```bash
# Verify private key
openssl rsa -in keys/jwt.key -text -noout

# Verify public key
openssl rsa -pubin -in keys/jwt.key.pub -text -noout
```

### Check Redis Connection

```bash
redis-cli ping
# Expected: PONG
```

### Check PostgreSQL Connection

```bash
psql -h localhost -U postgres -d pet_to_you -c "SELECT version();"
```

### Check Audit Logs

```bash
# After login, check audit logs in database
psql -h localhost -U postgres -d pet_to_you

SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 5;
```

---

## 🛡️ Security Checklist

Before deploying to production:

- [ ] Generate production RSA keys (4096-bit)
- [ ] Set strong `ENCRYPTION_MASTER_KEY` (32+ random bytes)
- [ ] Configure proper KMS (AWS KMS recommended)
- [ ] Enable HTTPS for all endpoints
- [ ] Set `NODE_ENV=production`
- [ ] Disable `DB_SYNCHRONIZE`
- [ ] Configure Redis password
- [ ] Update OAuth callback URLs to HTTPS
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerting
- [ ] Regular security audits
- [ ] Implement email verification
- [ ] Set up backup strategy

---

## 🐛 Troubleshooting

### Error: "RSA key not found"

```bash
# Regenerate keys
mkdir -p keys
ssh-keygen -t rsa -b 4096 -m PEM -f keys/jwt.key -N ""
openssl rsa -in keys/jwt.key -pubout -outform PEM -out keys/jwt.key.pub
```

### Error: "Redis connection failed"

```bash
# Start Redis
redis-server

# Or with Docker
docker run -d -p 6379:6379 redis:alpine
```

### Error: "Database connection failed"

```bash
# Start PostgreSQL
pg_ctl start

# Or create database
createdb pet_to_you
```

### Error: "Invalid token"

- Check token expiration (15 minutes for access tokens)
- Verify RSA public key is readable
- Check Redis connectivity
- Ensure JWT payload structure is correct

### Error: "Account locked"

- Wait 15 minutes for automatic unlock
- Or manually unlock in database:
  ```sql
  UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE email = 'user@example.com';
  ```

---

## 📚 Additional Resources

- [Full Authentication Documentation](./AUTHENTICATION.md)
- [API Reference](http://localhost:3000/api/docs)
- [Security Best Practices](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [PIPA Compliance Guide](https://www.privacy.go.kr/eng)

---

## 🤝 Support

If you encounter issues:

1. Check this guide
2. Review [AUTHENTICATION.md](./AUTHENTICATION.md)
3. Check server logs: `npm run start:dev`
4. Verify environment variables
5. Test each component individually

---

## ✅ Success Indicators

You have successfully set up authentication when:

1. ✅ Health check returns 200 OK
2. ✅ User registration creates account
3. ✅ Login returns JWT tokens
4. ✅ Protected routes require authentication
5. ✅ Token refresh generates new tokens
6. ✅ Logout revokes tokens
7. ✅ Audit logs are created
8. ✅ OAuth2 callbacks redirect properly

**Next Steps:** Integrate authentication into your application modules!
