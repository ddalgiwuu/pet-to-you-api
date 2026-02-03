# Authentication Quick Reference

One-page reference for developers using the authentication system.

## 🔐 Import Statements

```typescript
import { 
  JwtAuthGuard, 
  RolesGuard, 
  PermissionsGuard,
  CurrentUser,
  Roles,
  Permissions,
  Public,
} from '@core/auth';
import { User, UserRole } from '@modules/users/entities/user.entity';
```

---

## 🛡️ Route Protection Patterns

### Public Route
```typescript
@Public()
@Get('endpoint')
publicEndpoint() { }
```

### Authenticated Only
```typescript
@UseGuards(JwtAuthGuard)
@Get('endpoint')
authenticatedEndpoint(@CurrentUser() user: User) { }
```

### Role-Based
```typescript
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('endpoint')
adminEndpoint() { }
```

### Permission-Based
```typescript
@Permissions('resource:action')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post('endpoint')
permissionEndpoint() { }
```

### Combined
```typescript
@Roles(UserRole.HOSPITAL_STAFF)
@Permissions('health_note:write')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Post('endpoint')
combinedEndpoint() { }
```

---

## 👤 User Roles

| Role | Level | Use Case |
|------|-------|----------|
| `CONSUMER` | 1 | Regular users (pet owners) |
| `HOSPITAL_STAFF` | 2 | Hospital employees |
| `HOSPITAL_ADMIN` | 3 | Hospital administrators |
| `SHELTER_ADMIN` | 4 | Shelter administrators |
| `DAYCARE_ADMIN` | 5 | Daycare administrators |
| `PLATFORM_ADMIN` | 6 | Platform administrators |
| `SUPER_ADMIN` | 7 | System administrators |

---

## 🔑 Permission Format

**Pattern:** `resource:action`

**Common Permissions:**
- `pet:read`, `pet:write`, `pet:delete`
- `booking:read`, `booking:write`, `booking:approve`
- `health_note:read`, `health_note:write`
- `billing:read`, `billing:refund`
- `user:manage`, `system:configure`

---

## 🌐 API Endpoints

### Authentication
```bash
POST   /auth/register          # Register user
POST   /auth/login             # Login
POST   /auth/refresh           # Refresh token
POST   /auth/logout            # Logout
GET    /auth/me                # Current user
POST   /auth/change-password   # Change password
```

### OAuth2
```bash
GET    /auth/kakao             # Kakao redirect
GET    /auth/kakao/callback    # Kakao callback
GET    /auth/naver             # Naver redirect
GET    /auth/naver/callback    # Naver callback
GET    /auth/apple             # Apple redirect
GET    /auth/apple/callback    # Apple callback
```

---

## 🧪 cURL Examples

### Register
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecureP@ssw0rd123","name":"Test User","termsAccepted":true,"privacyPolicyAccepted":true}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecureP@ssw0rd123"}'
```

### Protected Route
```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## ⚡ Token Lifetimes

- **Access Token:** 15 minutes
- **Refresh Token:** 7 days
- **Account Lockout:** 15 minutes
- **Rate Limit Window:** 15 minutes

---

## 🚨 Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 401 | Unauthorized | Invalid/expired token, wrong password |
| 403 | Forbidden | Insufficient role/permissions |
| 409 | Conflict | Email already exists |
| 429 | Too Many Requests | Rate limit exceeded |

---

## 🔒 Security Rules

1. **Never** store passwords in plaintext
2. **Always** use `@CurrentUser()` for user ID
3. **Always** audit sensitive operations
4. **Never** trust user ID from request body
5. **Always** verify resource ownership
6. **Use** `@Public()` sparingly
7. **Combine** guards for sensitive routes
8. **Log** all authentication events

---

## 📊 Quick Checks

### Verify Auth Setup
```bash
# Check RSA keys exist
ls -lh keys/jwt.key*

# Check Redis connection
redis-cli ping

# Check database
psql -h localhost -U postgres -d pet_to_you -c "\dt"

# Start server
npm run start:dev
```

### Test Flow
```bash
# 1. Register
curl -X POST http://localhost:3000/api/v1/auth/register -H "Content-Type: application/json" -d '{"email":"quick@test.com","password":"QuickP@ss123","name":"Quick Test","termsAccepted":true,"privacyPolicyAccepted":true}'

# 2. Extract token from response and test
curl http://localhost:3000/api/v1/auth/me -H "Authorization: Bearer TOKEN"

# 3. Should return user profile
```

---

## 📚 Documentation Files

1. **AUTHENTICATION.md** - Complete reference
2. **AUTH_SETUP.md** - Setup guide
3. **AUTH_INTEGRATION_GUIDE.md** - Integration patterns
4. **AUTH_TESTING.md** - Testing guide
5. **SECURITY_CHECKLIST.md** - Security audit
6. **AUTH_QUICK_REFERENCE.md** - This file

---

## 🎯 Common Use Cases

### Protect User Resource
```typescript
@UseGuards(JwtAuthGuard)
@Get('my-pets')
getMyPets(@CurrentUser('id') userId: string) {
  return this.petsService.findByOwner(userId);
}
```

### Admin Only
```typescript
@Roles(UserRole.PLATFORM_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('admin/stats')
getStats() { }
```

### Sensitive Operation
```typescript
@Permissions('billing:refund')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post('refunds')
refund(@CurrentUser() user: User, @Req() req: Request) {
  // Audit log required
  await this.auditService.log({ userId: user.id, ... });
}
```

---

## ✅ Quick Verification

Authentication system is working if:

1. ✅ Registration creates user + returns tokens
2. ✅ Login returns tokens
3. ✅ `/auth/me` requires token
4. ✅ Invalid token returns 401
5. ✅ Token refresh works
6. ✅ Logout revokes tokens
7. ✅ Audit logs created
8. ✅ Account locks after 5 failures

---

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid token" | Check token expiry, verify RSA keys exist |
| "Account locked" | Wait 15 min or reset in DB |
| "Redis error" | Start Redis: `redis-server` |
| "DB error" | Check PostgreSQL connection |
| "Build fails" | Run `npm install`, check tsconfig |

---

## 🔗 Resources

- **Setup:** [AUTH_SETUP.md](./AUTH_SETUP.md)
- **Integration:** [AUTH_INTEGRATION_GUIDE.md](./AUTH_INTEGRATION_GUIDE.md)
- **Testing:** [AUTH_TESTING.md](./AUTH_TESTING.md)
- **Security:** [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
- **API Docs:** http://localhost:3000/api/docs

---

**Quick Start:** `docs/AUTH_SETUP.md`
**Full Docs:** `docs/AUTHENTICATION.md`
**Help:** Check documentation or server logs
