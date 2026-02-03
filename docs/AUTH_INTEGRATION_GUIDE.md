# Authentication Integration Guide

How to integrate the authentication system into your application modules.

## 🎯 Quick Integration

### 1. Protect Your Routes

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, Roles, Permissions } from '@core/auth';
import { User, UserRole } from '@modules/users/entities/user.entity';

@Controller('pets')
export class PetsController {
  // Public endpoint (no authentication)
  @Public()
  @Get('public')
  getPublicPets() {
    return this.petsService.findPublic();
  }

  // Authenticated endpoint
  @UseGuards(JwtAuthGuard)
  @Get('my-pets')
  getMyPets(@CurrentUser() user: User) {
    return this.petsService.findByOwner(user.id);
  }

  // Role-based protection
  @Roles(UserRole.HOSPITAL_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/all-pets')
  getAllPets() {
    return this.petsService.findAll();
  }

  // Permission-based protection
  @Permissions('pet:write', 'pet:read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  createPet(@CurrentUser() user: User, @Body() createPetDto: CreatePetDto) {
    return this.petsService.create(user.id, createPetDto);
  }
}
```

### 2. Import AuthModule

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '@core/auth/auth.module';
import { PetsController } from './controllers/pets.controller';
import { PetsService } from './services/pets.service';

@Module({
  imports: [
    AuthModule, // Import authentication module
  ],
  controllers: [PetsController],
  providers: [PetsService],
})
export class PetsModule {}
```

### 3. Use in Services

```typescript
import { Injectable } from '@nestjs/common';
import { CurrentUser } from '@core/auth';
import { User } from '@modules/users/entities/user.entity';

@Injectable()
export class PetsService {
  async findByOwner(userId: string) {
    // User is already authenticated by guard
    return this.petsRepository.find({ where: { ownerId: userId } });
  }

  async create(userId: string, createPetDto: CreatePetDto) {
    const pet = this.petsRepository.create({
      ...createPetDto,
      ownerId: userId,
    });
    return this.petsRepository.save(pet);
  }
}
```

---

## 🛡️ Authorization Patterns

### Pattern 1: Public Endpoint

```typescript
@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

**Use for:**
- Health checks
- Public documentation
- Landing pages
- OAuth callbacks (handled internally)

---

### Pattern 2: Authenticated Only

```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

**Use for:**
- User profile
- Personal data
- User-specific resources

---

### Pattern 3: Role-Based

```typescript
@Roles(UserRole.HOSPITAL_ADMIN, UserRole.PLATFORM_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('admin/dashboard')
getAdminDashboard(@CurrentUser() user: User) {
  return this.dashboardService.getAdminData(user);
}
```

**Use for:**
- Admin dashboards
- Role-specific features
- Organizational boundaries

**Note:** Multiple roles use OR logic (user needs ANY of the specified roles)

---

### Pattern 4: Permission-Based

```typescript
@Permissions('billing:read', 'billing:refund')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post('refunds')
processRefund(@CurrentUser() user: User, @Body() refundDto: RefundDto) {
  return this.billingService.processRefund(user, refundDto);
}
```

**Use for:**
- Fine-grained access control
- Resource-specific actions
- Sensitive operations

**Note:** Multiple permissions use AND logic (user needs ALL specified permissions)

---

### Pattern 5: Combined Role + Permission

```typescript
@Roles(UserRole.HOSPITAL_STAFF)
@Permissions('health_note:write')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Post('health-notes')
createHealthNote(
  @CurrentUser() user: User,
  @Body() createNoteDto: CreateHealthNoteDto,
) {
  return this.healthNoteService.create(user, createNoteDto);
}
```

**Use for:**
- Highly sensitive operations
- Medical data access
- Financial transactions

---

## 🔐 Security Best Practices

### 1. Always Validate User Context

```typescript
// ❌ DON'T: Trust user ID from request body
@Post('pets/:id')
async updatePet(@Param('id') id: string, @Body() body: { ownerId: string }) {
  return this.petsService.update(id, body.ownerId); // Vulnerable!
}

// ✅ DO: Use authenticated user ID
@UseGuards(JwtAuthGuard)
@Post('pets/:id')
async updatePet(
  @Param('id') id: string,
  @CurrentUser('id') userId: string,
  @Body() updatePetDto: UpdatePetDto,
) {
  // Verify ownership
  const pet = await this.petsService.findOne(id);
  if (pet.ownerId !== userId) {
    throw new ForbiddenException('Not your pet');
  }
  return this.petsService.update(id, updatePetDto);
}
```

### 2. Implement Resource Ownership Checks

```typescript
@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = request.params.id;

    const resource = await this.findResource(resourceId);
    
    if (resource.ownerId !== user.id && !user.isAdmin()) {
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}
```

### 3. Audit Sensitive Operations

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('billing:refund')
@Post('refunds')
async processRefund(
  @CurrentUser() user: User,
  @Body() refundDto: RefundDto,
  @Req() req: Request,
) {
  const result = await this.billingService.processRefund(refundDto);

  // Audit log
  await this.auditService.log({
    userId: user.id,
    action: AuditAction.PROCESS_REFUND,
    resource: 'refund',
    resourceId: result.id,
    purpose: 'Customer refund request',
    legalBasis: 'PIPA Article 15',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: { amount: refundDto.amount },
  });

  return result;
}
```

---

## 🌍 Global Guard Configuration

### Apply JwtAuthGuard Globally (Recommended)

**main.ts:**
```typescript
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { JwtAuthGuard } from '@core/auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply JWT guard globally (all routes require auth by default)
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  await app.listen(3000);
}
bootstrap();
```

**Benefits:**
- All routes protected by default
- Explicit opt-out with `@Public()` decorator
- Reduces boilerplate
- Prevents accidental exposure

**Mark public routes:**
```typescript
@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

---

## 📊 Audit Integration

### Pattern: Audit All Data Access

```typescript
@UseGuards(JwtAuthGuard)
@Get('medical-records/:id')
async getMedicalRecord(
  @Param('id') id: string,
  @CurrentUser() user: User,
  @Req() req: Request,
) {
  const record = await this.medicalRecordsService.findOne(id);

  // PIPA & Medical Act compliance
  await this.auditService.log({
    userId: user.id,
    action: AuditAction.VIEW_MEDICAL_RECORD,
    resource: 'medical_record',
    resourceId: id,
    purpose: 'Medical record review for treatment',
    legalBasis: '의료법 Article 19 - Medical data access',
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  });

  return record;
}
```

---

## 🔄 Token Refresh Client Implementation

### Frontend Example (React)

```typescript
// api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
});

let accessToken = localStorage.getItem('accessToken');
let refreshToken = localStorage.getItem('refreshToken');

// Add token to requests
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          'http://localhost:3000/api/v1/auth/refresh',
          { refreshToken },
        );

        accessToken = data.accessToken;
        refreshToken = data.refreshToken;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
```

---

## 🧩 Module Integration Examples

### Hospital Module Integration

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '@core/auth/auth.module';
import { HospitalController } from './hospital.controller';
import { HospitalService } from './hospital.service';

@Module({
  imports: [AuthModule],
  controllers: [HospitalController],
  providers: [HospitalService],
})
export class HospitalModule {}
```

**Controller:**
```typescript
@Controller('hospitals')
export class HospitalController {
  @Roles(UserRole.HOSPITAL_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/dashboard')
  getAdminDashboard(@CurrentUser() user: User) {
    return this.hospitalService.getAdminDashboard(user);
  }

  @Permissions('appointment:manage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('appointments')
  createAppointment(
    @CurrentUser() user: User,
    @Body() createDto: CreateAppointmentDto,
  ) {
    return this.hospitalService.createAppointment(user, createDto);
  }
}
```

---

## 🔒 Sensitive Data Handling

### Pattern: Medical Records Access

```typescript
@Permissions('health_note:read')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Get('health-notes/:id')
async getHealthNote(
  @Param('id') id: string,
  @CurrentUser() user: User,
  @Req() req: Request,
) {
  // 1. Fetch record
  const note = await this.healthNoteService.findOne(id);

  // 2. Verify authorization (owner or authorized staff)
  const canAccess = 
    note.petOwnerId === user.id ||
    user.hasRole(UserRole.HOSPITAL_STAFF) ||
    user.isAdmin();

  if (!canAccess) {
    throw new ForbiddenException('Access denied');
  }

  // 3. Audit log (REQUIRED for medical data)
  await this.auditService.log({
    userId: user.id,
    action: AuditAction.VIEW_MEDICAL_RECORD,
    resource: 'health_note',
    resourceId: id,
    purpose: 'Medical record review for treatment planning',
    legalBasis: '의료법 Article 19 - Medical data access',
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    metadata: {
      petId: note.petId,
      userRole: user.role,
    },
  });

  // 4. Return data
  return note;
}
```

---

## 🚀 Advanced Patterns

### Pattern: Conditional Authorization

```typescript
@UseGuards(JwtAuthGuard)
@Get('bookings/:id')
async getBooking(
  @Param('id') id: string,
  @CurrentUser() user: User,
) {
  const booking = await this.bookingsService.findOne(id);

  // Consumers can only see their own bookings
  if (user.role === UserRole.CONSUMER && booking.userId !== user.id) {
    throw new ForbiddenException('Access denied');
  }

  // Hospital staff can see bookings for their hospital
  if (
    user.role === UserRole.HOSPITAL_STAFF &&
    booking.hospitalId !== user.hospitalId
  ) {
    throw new ForbiddenException('Access denied');
  }

  // Admins can see all bookings
  return booking;
}
```

### Pattern: Multi-Tenant Authorization

```typescript
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.params.tenantId || request.body.tenantId;

    // Verify user belongs to tenant
    if (user.tenantId !== tenantId && !user.isAdmin()) {
      throw new ForbiddenException('Access denied to this tenant');
    }

    return true;
  }
}

// Usage
@UseGuards(JwtAuthGuard, TenantGuard)
@Get('tenants/:tenantId/resources')
getResources(@Param('tenantId') tenantId: string) {
  return this.resourceService.findByTenant(tenantId);
}
```

### Pattern: Time-Based Access

```typescript
@Injectable()
export class BusinessHoursGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Weekend check
    if (day === 0 || day === 6) {
      throw new ForbiddenException('Service not available on weekends');
    }

    // Business hours: 9 AM - 6 PM
    if (hour < 9 || hour >= 18) {
      throw new ForbiddenException('Service available 9 AM - 6 PM');
    }

    return true;
  }
}
```

---

## 🎨 Frontend Integration

### React Context Example

```typescript
// AuthContext.tsx
import React, { createContext, useState, useEffect } from 'react';
import api from './api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType>(null!);

export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Load user on mount
    const loadUser = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data);
      } catch (error) {
        setUser(null);
      }
    };
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
    localStorage.setItem('accessToken', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Protected Route Component

```typescript
// ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const ProtectedRoute: React.FC = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};
```

---

## 🔍 Debugging Tips

### View Current User

```typescript
@UseGuards(JwtAuthGuard)
@Get('debug/user')
debugUser(@CurrentUser() user: User, @Req() req: Request) {
  return {
    user: user,
    headers: req.headers,
    roles: user.role,
    isActive: user.isActive(),
    isLocked: user.isLocked(),
  };
}
```

### Test Token Validation

```typescript
@UseGuards(JwtAuthGuard)
@Get('debug/token')
debugToken(@Req() req: Request) {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = this.jwtService.decode(token);
  
  return {
    decoded,
    expiresAt: new Date(decoded.exp * 1000),
    issuedAt: new Date(decoded.iat * 1000),
    timeLeft: decoded.exp - Math.floor(Date.now() / 1000),
  };
}
```

---

## ✅ Integration Checklist

- [ ] Import AuthModule in your feature module
- [ ] Add guards to protected routes
- [ ] Use `@CurrentUser()` decorator to access authenticated user
- [ ] Implement audit logging for sensitive operations
- [ ] Add role/permission checks for admin features
- [ ] Test all authentication flows
- [ ] Test authorization rules
- [ ] Verify audit logs are created
- [ ] Test error scenarios
- [ ] Document security requirements

---

## 📚 Resources

- [NestJS Guards](https://docs.nestjs.com/guards)
- [Passport.js Documentation](http://www.passportjs.org/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
