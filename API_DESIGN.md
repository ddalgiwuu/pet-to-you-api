# Pet-to-You Dashboard API Design

**Version:** 1.0.0
**Last Updated:** 2026-02-07
**Architecture:** RESTful API with RBAC (Role-Based Access Control)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Hospital Dashboard Endpoints](#hospital-dashboard-endpoints)
4. [Business Dashboard Endpoints](#business-dashboard-endpoints)
5. [RBAC Middleware Design](#rbac-middleware-design)
6. [MongoDB Schema Extensions](#mongodb-schema-extensions)
7. [Response Formats & Error Handling](#response-formats--error-handling)
8. [OpenAPI/Swagger Specification](#openapi-swagger-specification)

---

## Overview

### API Architecture

- **Base URL:** `https://api.pet-to-you.com/api/v1`
- **Protocol:** HTTPS only
- **Authentication:** JWT Bearer tokens
- **Rate Limiting:** 100 requests/minute (authenticated), 20 requests/minute (unauthenticated)
- **Caching:** Redis-based caching for dashboard statistics (TTL: 5 minutes)

### Design Principles

1. **RESTful Design**: Resources represented by nouns, actions by HTTP verbs
2. **Consistent Structure**: All responses follow standard envelope format
3. **RBAC Enforcement**: Every endpoint validates user role and organization access
4. **Performance First**: Aggregation pipelines for analytics, Redis caching for stats
5. **Security**: Input validation, rate limiting, audit logging

---

## Authentication & Authorization

### JWT Token Structure

```typescript
interface JwtPayload {
  sub: string;              // User ID (UUID)
  email: string;            // User email
  role: UserRole;           // User role (hospital_admin, hospital_staff, etc.)
  hospitalId?: string;      // Associated hospital ID (for hospital roles)
  businessId?: string;      // Associated business ID (for business roles)
  iat: number;              // Issued at timestamp
  exp: number;              // Expiration timestamp (24 hours)
}
```

### Authorization Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
```

### Role Hierarchy

```
SUPER_ADMIN (7) - Full system access
  ↓
PLATFORM_ADMIN (6) - Platform management
  ↓
HOSPITAL_ADMIN (3) - Hospital management
  ↓
HOSPITAL_STAFF (2) - Hospital operations
  ↓
CONSUMER (1) - Basic user access
```

---

## Hospital Dashboard Endpoints

### 1. Hospital Overview Statistics

**Endpoint:** `GET /api/v1/dashboard/hospital/stats`

**Description:** Real-time overview statistics for hospital dashboard

**Authorization:** `@Roles(UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_STAFF)`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | No | Time period: `today`, `week`, `month`, `year` (default: `today`) |
| `hospitalId` | string | No | Hospital ID (auto-filled from JWT for hospital users) |

**Response:**

```typescript
interface HospitalStatsResponse {
  success: true;
  data: {
    overview: {
      todayAppointments: number;
      todayRevenue: number;
      activePets: number;
      completionRate: number; // Percentage
      averageRating: number;
    };
    trends: {
      appointmentsGrowth: number;    // Percentage change vs previous period
      revenueGrowth: number;          // Percentage change
      newPatientsGrowth: number;      // Percentage change
    };
    upcomingAppointments: number;
    pendingPayments: number;
    recentReviews: number;
  };
  meta: {
    timestamp: string;
    cached: boolean;
    cacheTTL?: number;
  };
}
```

**Example Request:**

```bash
curl -X GET "https://api.pet-to-you.com/api/v1/dashboard/hospital/stats?period=today" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Caching Strategy:** Redis cache with 5-minute TTL, invalidated on new bookings/payments

---

### 2. Pet List with Pagination & Filtering

**Endpoint:** `GET /api/v1/dashboard/hospital/pets`

**Description:** List all pets registered at the hospital with advanced filtering

**Authorization:** `@Roles(UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_STAFF)`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |
| `search` | string | No | Search by pet name, owner name, or registration number |
| `species` | string | No | Filter by species: `dog`, `cat`, `rabbit`, etc. |
| `status` | string | No | Filter: `active`, `inactive`, `archived` |
| `hasInsurance` | boolean | No | Filter pets with/without insurance |
| `sortBy` | string | No | Sort field: `name`, `createdAt`, `lastVisit` (default: `createdAt`) |
| `sortOrder` | string | No | Sort order: `asc`, `desc` (default: `desc`) |

**Response:**

```typescript
interface PetListResponse {
  success: true;
  data: {
    pets: Array<{
      id: string;
      name: string;
      species: PetSpecies;
      breed: string;
      age: { years: number; months: number };
      owner: {
        id: string;
        name: string;
        phoneNumber: string;
        email: string;
      };
      lastVisit?: {
        date: string;
        type: BookingType;
        diagnosis?: string;
      };
      upcomingAppointments: number;
      hasInsurance: boolean;
      insuranceProvider?: string;
      medicalAlerts: string[];      // Active allergies/conditions
      registrationDate: string;
      primaryPhotoUrl?: string;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
  meta: {
    timestamp: string;
  };
}
```

**MongoDB Query Optimization:**

```typescript
// Compound index for efficient filtering and sorting
db.pets.createIndex({ hospitalId: 1, species: 1, isDeleted: 1 });
db.pets.createIndex({ hospitalId: 1, createdAt: -1 });
db.pets.createIndex({ ownerId: 1, hospitalId: 1 });

// Text index for search
db.pets.createIndex({ name: "text", "owner.name": "text" });
```

---

### 3. Hospital Appointments Management

**Endpoint:** `GET /api/v1/dashboard/hospital/appointments`

**Description:** List appointments with filtering and status management

**Authorization:** `@Roles(UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_STAFF)`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |
| `status` | string | No | Filter: `pending`, `confirmed`, `in_progress`, `completed`, `cancelled` |
| `startDate` | string | No | ISO 8601 date (e.g., `2026-02-07T00:00:00Z`) |
| `endDate` | string | No | ISO 8601 date |
| `type` | string | No | Booking type: `consultation`, `vaccination`, `surgery`, etc. |
| `petId` | string | No | Filter by specific pet |
| `sortBy` | string | No | Sort field: `startDateTime`, `status`, `type` (default: `startDateTime`) |

**Response:**

```typescript
interface AppointmentListResponse {
  success: true;
  data: {
    appointments: Array<{
      id: string;
      bookingNumber: string;
      type: BookingType;
      status: BookingStatus;
      startDateTime: string;        // ISO 8601
      endDateTime: string;
      durationMinutes: number;
      pet: {
        id: string;
        name: string;
        species: PetSpecies;
        breed?: string;
        photoUrl?: string;
      };
      owner: {
        id: string;
        name: string;
        phoneNumber: string;
      };
      services: string[];
      notes?: string;
      estimatedPrice: number;
      finalPrice: number;
      paymentStatus: PaymentStatus;
      isUpcoming: boolean;
      canBeCancelled: boolean;
      confirmedAt?: string;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
    summary: {
      totalAppointments: number;
      byStatus: Record<BookingStatus, number>;
      totalRevenue: number;
    };
  };
  meta: {
    timestamp: string;
  };
}
```

**MongoDB Aggregation Pipeline:**

```typescript
[
  { $match: { hospitalId: ObjectId(hospitalId), status: { $in: statuses } } },
  { $lookup: { from: "pets", localField: "petId", foreignField: "_id", as: "pet" } },
  { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "owner" } },
  { $sort: { startDateTime: -1 } },
  { $skip: (page - 1) * limit },
  { $limit: limit },
  { $facet: {
      data: [{ $project: { /* fields */ } }],
      summary: [{ $group: { _id: "$status", count: { $sum: 1 }, revenue: { $sum: "$finalPrice" } } }]
    }
  }
]
```

---

### 4. Revenue Analytics

**Endpoint:** `GET /api/v1/dashboard/hospital/revenue`

**Description:** Revenue analytics with time-series data and breakdowns

**Authorization:** `@Roles(UserRole.HOSPITAL_ADMIN)`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | No | `daily`, `weekly`, `monthly`, `yearly` (default: `monthly`) |
| `startDate` | string | No | ISO 8601 date (defaults to 30 days ago) |
| `endDate` | string | No | ISO 8601 date (defaults to today) |
| `groupBy` | string | No | Group by: `service`, `payment_method`, `date` |

**Response:**

```typescript
interface RevenueAnalyticsResponse {
  success: true;
  data: {
    summary: {
      totalRevenue: number;
      totalTransactions: number;
      averageTransactionValue: number;
      growth: {
        percentage: number;         // vs previous period
        amount: number;
      };
    };
    timeSeries: Array<{
      date: string;                 // ISO 8601 date
      revenue: number;
      transactions: number;
      averageValue: number;
    }>;
    breakdown: {
      byService: Array<{
        service: string;
        revenue: number;
        transactions: number;
        percentage: number;
      }>;
      byPaymentMethod: Array<{
        method: string;
        revenue: number;
        transactions: number;
      }>;
    };
    topServices: Array<{
      service: string;
      revenue: number;
      bookings: number;
    }>;
    paymentStatus: {
      paid: number;
      pending: number;
      refunded: number;
    };
  };
  meta: {
    timestamp: string;
    period: string;
    dateRange: { start: string; end: string };
  };
}
```

**MongoDB Aggregation with Time Series:**

```typescript
[
  {
    $match: {
      hospitalId: ObjectId(hospitalId),
      paidAt: { $gte: startDate, $lte: endDate },
      paymentStatus: "paid"
    }
  },
  {
    $group: {
      _id: {
        $dateToString: { format: "%Y-%m-%d", date: "$paidAt" }
      },
      revenue: { $sum: "$finalPrice" },
      transactions: { $sum: 1 }
    }
  },
  { $sort: { "_id": 1 } }
]
```

---

### 5. Patient Reviews & Ratings

**Endpoint:** `GET /api/v1/dashboard/hospital/reviews`

**Description:** Hospital reviews with filtering and sentiment analysis

**Authorization:** `@Roles(UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_STAFF)`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20) |
| `minRating` | number | No | Filter by minimum rating (1-5) |
| `sortBy` | string | No | Sort: `createdAt`, `rating` (default: `createdAt`) |
| `status` | string | No | Filter: `published`, `pending`, `reported` |

**Response:**

```typescript
interface ReviewsResponse {
  success: true;
  data: {
    reviews: Array<{
      id: string;
      rating: number;               // 1-5
      comment: string;
      petName: string;
      ownerName: string;
      serviceName: string;
      createdAt: string;
      isVerified: boolean;
      response?: {
        text: string;
        respondedAt: string;
        respondedBy: string;
      };
    }>;
    analytics: {
      averageRating: number;
      totalReviews: number;
      ratingDistribution: {
        "5": number;
        "4": number;
        "3": number;
        "2": number;
        "1": number;
      };
      sentiment: {
        positive: number;           // Percentage
        neutral: number;
        negative: number;
      };
    };
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
    };
  };
  meta: {
    timestamp: string;
  };
}
```

---

## Business Dashboard Endpoints

### 1. Business Overview Statistics

**Endpoint:** `GET /api/v1/dashboard/business/stats`

**Description:** Business dashboard overview for daycare, grooming, and other services

**Authorization:** `@Roles(UserRole.DAYCARE_ADMIN, UserRole.SHELTER_ADMIN, UserRole.PLATFORM_ADMIN)`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | No | Time period: `today`, `week`, `month`, `year` |
| `businessId` | string | No | Business ID (auto-filled from JWT) |

**Response:**

```typescript
interface BusinessStatsResponse {
  success: true;
  data: {
    overview: {
      activeBookings: number;
      todayRevenue: number;
      totalCustomers: number;
      occupancyRate: number;       // Percentage for daycare/hotel
      averageRating: number;
    };
    trends: {
      bookingsGrowth: number;
      revenueGrowth: number;
      customerGrowth: number;
    };
    capacity: {
      total: number;
      occupied: number;
      available: number;
    };
    upcomingBookings: number;
    pendingPayments: number;
  };
  meta: {
    timestamp: string;
    businessType: string;          // 'daycare', 'grooming', 'shelter'
    cached: boolean;
  };
}
```

---

### 2. Service Offerings Management

**Endpoint:** `GET /api/v1/dashboard/business/services`

**Description:** Manage service offerings, pricing, and availability

**Authorization:** `@Roles(UserRole.DAYCARE_ADMIN, UserRole.SHELTER_ADMIN)`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter: `daycare`, `grooming`, `training`, `boarding` |
| `status` | string | No | Filter: `active`, `inactive`, `seasonal` |

**Response:**

```typescript
interface BusinessServicesResponse {
  success: true;
  data: {
    services: Array<{
      id: string;
      name: string;
      category: string;
      description: string;
      pricing: {
        basePrice: number;
        currency: string;
        pricingModel: string;      // 'hourly', 'daily', 'fixed'
        discounts?: Array<{
          type: string;
          percentage: number;
          conditions: string;
        }>;
      };
      duration: {
        value: number;
        unit: string;              // 'hours', 'days', 'weeks'
      };
      availability: {
        daysOfWeek: string[];
        timeSlots: Array<{
          start: string;
          end: string;
        }>;
        maxCapacity: number;
        currentBookings: number;
      };
      requirements: string[];
      isActive: boolean;
      bookingCount: number;
      totalRevenue: number;
    }>;
    summary: {
      totalServices: number;
      activeServices: number;
      totalRevenue: number;
    };
  };
  meta: {
    timestamp: string;
  };
}
```

---

### 3. Service Bookings & Schedule

**Endpoint:** `GET /api/v1/dashboard/business/bookings`

**Description:** Service bookings with calendar view and schedule management

**Authorization:** `@Roles(UserRole.DAYCARE_ADMIN, UserRole.SHELTER_ADMIN)`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number |
| `startDate` | string | No | ISO 8601 date |
| `endDate` | string | No | ISO 8601 date |
| `status` | string | No | Filter by booking status |
| `serviceId` | string | No | Filter by specific service |

**Response:**

```typescript
interface BusinessBookingsResponse {
  success: true;
  data: {
    bookings: Array<{
      id: string;
      bookingNumber: string;
      service: {
        id: string;
        name: string;
        category: string;
      };
      pet: {
        id: string;
        name: string;
        species: string;
        breed?: string;
        photoUrl?: string;
      };
      customer: {
        id: string;
        name: string;
        phoneNumber: string;
        email: string;
      };
      schedule: {
        startDateTime: string;
        endDateTime: string;
        duration: number;
      };
      status: BookingStatus;
      pricing: {
        basePrice: number;
        additionalCharges: number;
        discounts: number;
        totalPrice: number;
      };
      paymentStatus: PaymentStatus;
      specialRequests?: string;
      checkInTime?: string;
      checkOutTime?: string;
    }>;
    calendar: Array<{
      date: string;
      bookings: number;
      capacity: number;
      occupancyRate: number;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
    };
  };
  meta: {
    timestamp: string;
  };
}
```

---

### 4. Customer Management

**Endpoint:** `GET /api/v1/dashboard/business/customers`

**Description:** Customer list with pet information and booking history

**Authorization:** `@Roles(UserRole.DAYCARE_ADMIN, UserRole.SHELTER_ADMIN)`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number |
| `search` | string | No | Search by customer or pet name |
| `sortBy` | string | No | Sort: `name`, `lastVisit`, `totalSpent` |
| `hasActiveBookings` | boolean | No | Filter customers with active bookings |

**Response:**

```typescript
interface BusinessCustomersResponse {
  success: true;
  data: {
    customers: Array<{
      id: string;
      name: string;
      email: string;
      phoneNumber: string;
      registrationDate: string;
      pets: Array<{
        id: string;
        name: string;
        species: string;
        breed?: string;
        age: string;
      }>;
      bookingHistory: {
        totalBookings: number;
        completedBookings: number;
        cancelledBookings: number;
        lastVisit?: string;
      };
      financials: {
        totalSpent: number;
        averageTransactionValue: number;
        outstandingBalance: number;
      };
      preferences: {
        favoriteServices: string[];
        specialRequests: string[];
      };
      status: string;              // 'active', 'inactive', 'vip'
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
    };
  };
  meta: {
    timestamp: string;
  };
}
```

---

### 5. Revenue & Payment Tracking

**Endpoint:** `GET /api/v1/dashboard/business/revenue`

**Description:** Business revenue analytics and payment tracking

**Authorization:** `@Roles(UserRole.DAYCARE_ADMIN, UserRole.SHELTER_ADMIN)`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `period` | string | No | `daily`, `weekly`, `monthly` |
| `startDate` | string | No | ISO 8601 date |
| `endDate` | string | No | ISO 8601 date |

**Response:**

```typescript
interface BusinessRevenueResponse {
  success: true;
  data: {
    summary: {
      totalRevenue: number;
      totalTransactions: number;
      averageTransactionValue: number;
      growth: number;              // Percentage
    };
    timeSeries: Array<{
      date: string;
      revenue: number;
      transactions: number;
    }>;
    breakdown: {
      byService: Array<{
        serviceName: string;
        revenue: number;
        percentage: number;
      }>;
      byPaymentMethod: Array<{
        method: string;
        amount: number;
      }>;
    };
    pendingPayments: {
      count: number;
      totalAmount: number;
      items: Array<{
        bookingId: string;
        customerName: string;
        amount: number;
        dueDate: string;
      }>;
    };
  };
  meta: {
    timestamp: string;
    period: string;
  };
}
```

---

## RBAC Middleware Design

### 1. Role-Based Guards Implementation

**File:** `src/core/auth/guards/roles.guard.ts` (already exists)

**Enhanced with Organization Isolation:**

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../../modules/users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Get required roles
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check role
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      this.logger.warn(
        `Access denied for user ${user.id} with role ${user.role}`,
      );
      throw new ForbiddenException(
        `Insufficient permissions. Required role: ${requiredRoles.join(' or ')}`,
      );
    }

    return true;
  }
}
```

---

### 2. Organization Resource Guard

**File:** `src/core/auth/guards/organization.guard.ts` (new)

**Purpose:** Ensure users can only access resources belonging to their organization

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { UserRole } from '../../../modules/users/entities/user.entity';

/**
 * Organization Isolation Guard
 *
 * Ensures users can only access resources from their organization:
 * - HOSPITAL_ADMIN/STAFF can only access their hospital's data
 * - DAYCARE_ADMIN can only access their daycare's data
 * - PLATFORM_ADMIN/SUPER_ADMIN can access all resources
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, RolesGuard, OrganizationGuard)
 * @Roles(UserRole.HOSPITAL_ADMIN)
 * @Get('dashboard/hospital/stats')
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
  private readonly logger = new Logger(OrganizationGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Platform admins bypass organization checks
    if (
      user.role === UserRole.PLATFORM_ADMIN ||
      user.role === UserRole.SUPER_ADMIN
    ) {
      return true;
    }

    // Extract organization ID from query params or body
    const requestedHospitalId =
      request.query?.hospitalId ||
      request.params?.hospitalId ||
      request.body?.hospitalId;

    const requestedBusinessId =
      request.query?.businessId ||
      request.params?.businessId ||
      request.body?.businessId;

    // Hospital users must access their own hospital
    if (
      user.role === UserRole.HOSPITAL_ADMIN ||
      user.role === UserRole.HOSPITAL_STAFF
    ) {
      if (!user.hospitalId) {
        throw new ForbiddenException('User not associated with any hospital');
      }

      // If no hospitalId in request, inject user's hospitalId
      if (!requestedHospitalId) {
        request.query = { ...request.query, hospitalId: user.hospitalId };
        return true;
      }

      // Verify access to requested hospital
      if (requestedHospitalId !== user.hospitalId) {
        this.logger.warn(
          `User ${user.id} attempted to access hospital ${requestedHospitalId} but belongs to ${user.hospitalId}`,
        );
        throw new ForbiddenException(
          'Access denied: Cannot access other organization data',
        );
      }

      return true;
    }

    // Business users (daycare, shelter, etc.)
    if (
      user.role === UserRole.DAYCARE_ADMIN ||
      user.role === UserRole.SHELTER_ADMIN
    ) {
      // Similar logic for business entities
      if (!user.businessId) {
        throw new ForbiddenException('User not associated with any business');
      }

      if (!requestedBusinessId) {
        request.query = { ...request.query, businessId: user.businessId };
        return true;
      }

      if (requestedBusinessId !== user.businessId) {
        throw new ForbiddenException(
          'Access denied: Cannot access other organization data',
        );
      }

      return true;
    }

    return true;
  }
}
```

---

### 3. Permission-Based Decorator

**File:** `src/core/auth/decorators/permissions.decorator.ts` (new)

**Purpose:** Fine-grained permission control beyond roles

```typescript
import { SetMetadata } from '@nestjs/common';

export enum Permission {
  // Dashboard permissions
  DASHBOARD_VIEW = 'dashboard:view',
  DASHBOARD_EDIT = 'dashboard:edit',

  // Pet management
  PET_VIEW = 'pet:view',
  PET_CREATE = 'pet:create',
  PET_EDIT = 'pet:edit',
  PET_DELETE = 'pet:delete',

  // Appointment management
  APPOINTMENT_VIEW = 'appointment:view',
  APPOINTMENT_CREATE = 'appointment:create',
  APPOINTMENT_EDIT = 'appointment:edit',
  APPOINTMENT_CANCEL = 'appointment:cancel',

  // Financial permissions
  REVENUE_VIEW = 'revenue:view',
  PAYMENT_PROCESS = 'payment:process',
  REFUND_PROCESS = 'refund:process',

  // Staff management
  STAFF_VIEW = 'staff:view',
  STAFF_MANAGE = 'staff:manage',
}

export const PERMISSIONS_KEY = 'permissions';

/**
 * Permissions Decorator
 *
 * Usage:
 * @Permissions(Permission.REVENUE_VIEW, Permission.DASHBOARD_VIEW)
 * @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
 */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

---

### 4. Controller Implementation Example

**File:** `src/modules/dashboard/controllers/hospital-dashboard.controller.ts` (new)

```typescript
import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { OrganizationGuard } from '../../../core/auth/guards/organization.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { HospitalDashboardService } from '../services/hospital-dashboard.service';
import { GetStatsDto } from '../dto/get-stats.dto';

@ApiTags('Hospital Dashboard')
@ApiBearerAuth()
@Controller('api/v1/dashboard/hospital')
@UseGuards(JwtAuthGuard, RolesGuard, OrganizationGuard)
export class HospitalDashboardController {
  constructor(
    private readonly hospitalDashboardService: HospitalDashboardService,
  ) {}

  @Get('stats')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get hospital overview statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getStats(
    @CurrentUser() user: any,
    @Query() query: GetStatsDto,
  ) {
    return this.hospitalDashboardService.getStats(user.hospitalId, query);
  }

  @Get('pets')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get hospital pet list with pagination' })
  async getPets(
    @CurrentUser() user: any,
    @Query() query: any,
  ) {
    return this.hospitalDashboardService.getPets(user.hospitalId, query);
  }

  @Get('appointments')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get hospital appointments' })
  async getAppointments(
    @CurrentUser() user: any,
    @Query() query: any,
  ) {
    return this.hospitalDashboardService.getAppointments(user.hospitalId, query);
  }

  @Get('revenue')
  @Roles(UserRole.HOSPITAL_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get revenue analytics (Admin only)' })
  async getRevenue(
    @CurrentUser() user: any,
    @Query() query: any,
  ) {
    return this.hospitalDashboardService.getRevenue(user.hospitalId, query);
  }

  @Get('reviews')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get hospital reviews' })
  async getReviews(
    @CurrentUser() user: any,
    @Query() query: any,
  ) {
    return this.hospitalDashboardService.getReviews(user.hospitalId, query);
  }
}
```

---

## MongoDB Schema Extensions

### 1. User Model Updates

**File:** `src/modules/users/entities/user.entity.ts` (extend existing)

**Add Business Association Field:**

```typescript
// Add to existing User entity
@Column({ type: 'uuid', nullable: true })
businessId?: string; // For daycare/shelter/grooming admin users

@Column({ type: 'varchar', length: 50, nullable: true })
businessType?: string; // 'daycare', 'shelter', 'grooming_salon'
```

**MongoDB Index Extensions:**

```typescript
// Add compound indexes for dashboard queries
db.users.createIndex({ role: 1, hospitalId: 1, status: 1 });
db.users.createIndex({ role: 1, businessId: 1, status: 1 });
db.users.createIndex({ email: 1, role: 1 });
```

---

### 2. Dashboard Statistics Collection (MongoDB)

**Collection:** `dashboard_stats` (cached aggregations)

**Purpose:** Pre-computed statistics for fast dashboard loading

```typescript
interface DashboardStats {
  _id: ObjectId;
  organizationType: 'hospital' | 'business';
  organizationId: string;           // hospitalId or businessId
  date: Date;                        // Aggregation date (daily)

  // Hospital-specific stats
  hospitalStats?: {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    revenue: number;
    newPatients: number;
    returningPatients: number;
    averageRating: number;
    totalReviews: number;
  };

  // Business-specific stats
  businessStats?: {
    totalBookings: number;
    completedBookings: number;
    occupancyRate: number;
    revenue: number;
    newCustomers: number;
    capacity: {
      total: number;
      occupied: number;
    };
  };

  // Common fields
  paymentBreakdown: {
    card: number;
    cash: number;
    transfer: number;
  };

  topServices: Array<{
    serviceId: string;
    serviceName: string;
    count: number;
    revenue: number;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

// Indexes
db.dashboard_stats.createIndex({ organizationId: 1, date: -1 });
db.dashboard_stats.createIndex({ organizationType: 1, date: -1 });
db.dashboard_stats.createIndex({ date: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL
```

**Update Strategy:** Nightly batch job + real-time invalidation on key events

---

### 3. Review Collection (MongoDB)

**Collection:** `reviews`

**Schema:**

```typescript
interface Review {
  _id: ObjectId;
  organizationType: 'hospital' | 'business';
  organizationId: string;
  userId: string;
  petId: string;
  bookingId: string;

  rating: number;                    // 1-5
  comment: string;
  photos?: string[];

  serviceName: string;
  serviceCategory: string;

  isVerified: boolean;               // Verified booking
  isPublished: boolean;
  isReported: boolean;

  sentiment?: {
    score: number;                   // -1 to 1
    label: string;                   // 'positive', 'neutral', 'negative'
  };

  response?: {
    text: string;
    respondedAt: Date;
    respondedBy: string;
  };

  metadata: {
    userAgent?: string;
    ipAddress?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

// Indexes
db.reviews.createIndex({ organizationId: 1, isPublished: 1, createdAt: -1 });
db.reviews.createIndex({ organizationId: 1, rating: 1 });
db.reviews.createIndex({ userId: 1, bookingId: 1 }, { unique: true });
db.reviews.createIndex({ comment: "text" }); // Full-text search
```

---

### 4. Audit Log Collection (MongoDB)

**Collection:** `audit_logs`

**Purpose:** Track all dashboard actions for compliance and security

```typescript
interface AuditLog {
  _id: ObjectId;
  userId: string;
  userRole: UserRole;
  action: string;                    // 'view', 'create', 'update', 'delete'
  resource: string;                  // 'appointment', 'pet', 'payment'
  resourceId?: string;

  organizationType: 'hospital' | 'business';
  organizationId: string;

  details: {
    method: string;                  // HTTP method
    endpoint: string;
    queryParams?: Record<string, any>;
    changes?: {
      before: any;
      after: any;
    };
  };

  metadata: {
    ipAddress: string;
    userAgent: string;
    requestId: string;
  };

  timestamp: Date;
}

// Indexes
db.audit_logs.createIndex({ organizationId: 1, timestamp: -1 });
db.audit_logs.createIndex({ userId: 1, timestamp: -1 });
db.audit_logs.createIndex({ action: 1, resource: 1 });
db.audit_logs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 15552000 }); // 180 days TTL
```

---

## Response Formats & Error Handling

### 1. Standard Response Envelope

**Success Response:**

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;              // ISO 8601
    requestId?: string;
    cached?: boolean;
    cacheTTL?: number;
    [key: string]: any;
  };
}
```

**Error Response:**

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;                    // Machine-readable error code
    message: string;                 // Human-readable message
    details?: any;                   // Additional error details
    timestamp: string;
    requestId: string;
    path: string;                    // Request path
  };
}
```

---

### 2. Pagination Format

**Standard Pagination Object:**

```typescript
interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

**Query Parameters:**

```typescript
interface PaginationQuery {
  page?: number;                     // Default: 1
  limit?: number;                    // Default: 20, Max: 100
  sortBy?: string;                   // Field name
  sortOrder?: 'asc' | 'desc';        // Default: 'desc'
}
```

---

### 3. Error Codes & HTTP Status Mapping

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `AUTH_001` | 401 | Invalid or expired JWT token |
| `AUTH_002` | 403 | Insufficient permissions |
| `AUTH_003` | 403 | Organization access denied |
| `VALIDATION_001` | 400 | Invalid request parameters |
| `VALIDATION_002` | 400 | Missing required fields |
| `RESOURCE_001` | 404 | Resource not found |
| `RESOURCE_002` | 409 | Resource already exists |
| `RATE_LIMIT_001` | 429 | Rate limit exceeded |
| `SERVER_001` | 500 | Internal server error |
| `DATABASE_001` | 503 | Database connection error |

**Example Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "AUTH_003",
    "message": "Access denied: Cannot access other organization data",
    "timestamp": "2026-02-07T10:30:00Z",
    "requestId": "req_abc123xyz",
    "path": "/api/v1/dashboard/hospital/stats"
  }
}
```

---

### 4. Global Exception Filter

**File:** `src/core/filters/global-exception.filter.ts`

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'SERVER_001';
    let message = 'Internal server error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        details = (exceptionResponse as any).details;
      }

      // Map HTTP status to error codes
      switch (status) {
        case HttpStatus.UNAUTHORIZED:
          errorCode = 'AUTH_001';
          break;
        case HttpStatus.FORBIDDEN:
          errorCode = 'AUTH_002';
          break;
        case HttpStatus.NOT_FOUND:
          errorCode = 'RESOURCE_001';
          break;
        case HttpStatus.BAD_REQUEST:
          errorCode = 'VALIDATION_001';
          break;
        case HttpStatus.TOO_MANY_REQUESTS:
          errorCode = 'RATE_LIMIT_001';
          break;
      }
    }

    // Log error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    // Send response
    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message,
        details,
        timestamp: new Date().toISOString(),
        requestId: request.headers['x-request-id'] || 'unknown',
        path: request.url,
      },
    });
  }
}
```

---

## OpenAPI/Swagger Specification

### 1. Swagger Configuration

**File:** `src/main.ts` (add Swagger setup)

```typescript
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Pet-to-You Dashboard API')
    .setDescription('RESTful API for Hospital and Business Dashboards')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Hospital Dashboard', 'Hospital-specific dashboard endpoints')
    .addTag('Business Dashboard', 'Business-specific dashboard endpoints')
    .addTag('Authentication', 'Authentication and authorization')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
  console.log('🚀 API running on http://localhost:3000');
  console.log('📚 Swagger docs available at http://localhost:3000/api/docs');
}
bootstrap();
```

---

### 2. Example DTO with Swagger Decorators

**File:** `src/modules/dashboard/dto/get-stats.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID } from 'class-validator';

export enum StatsPeriod {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class GetStatsDto {
  @ApiProperty({
    description: 'Time period for statistics',
    enum: StatsPeriod,
    default: StatsPeriod.TODAY,
    required: false,
  })
  @IsOptional()
  @IsEnum(StatsPeriod)
  period?: StatsPeriod = StatsPeriod.TODAY;

  @ApiProperty({
    description: 'Hospital ID (auto-filled for hospital users)',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  hospitalId?: string;
}
```

---

### 3. Swagger Response Examples

**File:** `src/modules/dashboard/dto/hospital-stats-response.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class HospitalStatsOverviewDto {
  @ApiProperty({ example: 25, description: 'Number of appointments today' })
  todayAppointments: number;

  @ApiProperty({ example: 1250000, description: 'Revenue today (KRW)' })
  todayRevenue: number;

  @ApiProperty({ example: 342, description: 'Total active pets' })
  activePets: number;

  @ApiProperty({ example: 92.5, description: 'Appointment completion rate (%)' })
  completionRate: number;

  @ApiProperty({ example: 4.7, description: 'Average rating (1-5)' })
  averageRating: number;
}

export class HospitalStatsTrendsDto {
  @ApiProperty({ example: 15.3, description: 'Appointments growth (%)' })
  appointmentsGrowth: number;

  @ApiProperty({ example: 22.1, description: 'Revenue growth (%)' })
  revenueGrowth: number;

  @ApiProperty({ example: 8.5, description: 'New patients growth (%)' })
  newPatientsGrowth: number;
}

export class HospitalStatsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: () => ({
    overview: HospitalStatsOverviewDto,
    trends: HospitalStatsTrendsDto,
    upcomingAppointments: Number,
    pendingPayments: Number,
    recentReviews: Number,
  })})
  data: {
    overview: HospitalStatsOverviewDto;
    trends: HospitalStatsTrendsDto;
    upcomingAppointments: number;
    pendingPayments: number;
    recentReviews: number;
  };

  @ApiProperty({ type: () => ({
    timestamp: String,
    cached: Boolean,
    cacheTTL: Number,
  })})
  meta: {
    timestamp: string;
    cached: boolean;
    cacheTTL?: number;
  };
}
```

---

### 4. Full OpenAPI Endpoint Example

**Controller with Full Swagger Documentation:**

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { GetStatsDto } from '../dto/get-stats.dto';
import { HospitalStatsResponseDto } from '../dto/hospital-stats-response.dto';

@ApiTags('Hospital Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/dashboard/hospital')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HospitalDashboardController {
  @Get('stats')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_STAFF)
  @ApiOperation({
    summary: 'Get hospital overview statistics',
    description:
      'Retrieves real-time dashboard statistics including appointments, revenue, and patient metrics',
  })
  @ApiQuery({
    name: 'period',
    enum: ['today', 'week', 'month', 'year'],
    required: false,
    description: 'Time period for statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: HospitalStatsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
    schema: {
      example: {
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Invalid or expired JWT token',
          timestamp: '2026-02-07T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getStats(@Query() query: GetStatsDto) {
    // Implementation
  }
}
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create `OrganizationGuard` for resource isolation
- [ ] Create `PermissionsGuard` for fine-grained access control
- [ ] Extend User entity with `businessId` and `businessType`
- [ ] Create MongoDB indexes for dashboard queries
- [ ] Set up Redis caching for dashboard stats

### Phase 2: Hospital Dashboard
- [ ] Implement `HospitalDashboardService` with all endpoints
- [ ] Create `HospitalDashboardController` with RBAC guards
- [ ] Set up MongoDB aggregation pipelines for analytics
- [ ] Implement real-time statistics caching
- [ ] Add Swagger documentation for all endpoints

### Phase 3: Business Dashboard
- [ ] Implement `BusinessDashboardService` with all endpoints
- [ ] Create `BusinessDashboardController` with RBAC guards
- [ ] Set up business-specific analytics pipelines
- [ ] Implement capacity management for daycare/hotel services
- [ ] Add Swagger documentation

### Phase 4: Testing & Documentation
- [ ] Write unit tests for guards and services
- [ ] Write integration tests for all endpoints
- [ ] Create Postman collection for API testing
- [ ] Generate comprehensive API documentation
- [ ] Set up monitoring and alerting

---

## Performance Considerations

### 1. Caching Strategy

**Redis Cache Keys:**
```
dashboard:hospital:{hospitalId}:stats:{period}
dashboard:hospital:{hospitalId}:revenue:{startDate}:{endDate}
dashboard:business:{businessId}:stats:{period}
```

**Cache TTL:**
- Stats: 5 minutes
- Revenue analytics: 15 minutes
- Reviews: 10 minutes

**Cache Invalidation:**
- On new bookings/appointments
- On payment status changes
- On review submissions

### 2. Database Optimization

**Compound Indexes:**
```typescript
// MongoDB
db.bookings.createIndex({ hospitalId: 1, startDateTime: -1, status: 1 });
db.bookings.createIndex({ hospitalId: 1, paymentStatus: 1 });
db.reviews.createIndex({ organizationId: 1, isPublished: 1, createdAt: -1 });

// PostgreSQL
CREATE INDEX idx_users_role_hospital ON users(role, hospital_id, status);
CREATE INDEX idx_bookings_hospital_date ON bookings(hospital_id, start_date_time DESC);
```

### 3. Query Optimization

- Use aggregation pipelines for complex analytics
- Implement pagination with cursor-based approach for large datasets
- Pre-compute daily statistics with nightly batch jobs
- Use read replicas for dashboard queries

---

## Security Best Practices

1. **JWT Token Security**
   - Short expiration time (24 hours)
   - Refresh token rotation
   - Token blacklisting on logout

2. **Rate Limiting**
   - Per-user limits: 100 req/min
   - Global limits: 1000 req/min
   - Stricter limits for analytics endpoints

3. **Input Validation**
   - Use class-validator for all DTOs
   - Sanitize user inputs
   - Validate date ranges and pagination params

4. **Audit Logging**
   - Log all dashboard actions
   - Track permission checks
   - Monitor unusual access patterns

5. **Data Privacy**
   - Mask sensitive patient information
   - Implement field-level encryption for PII
   - GDPR/PIPA compliance for data exports

---

## Next Steps

1. **Implementation Priority:**
   - Phase 1: Core Infrastructure (Week 1)
   - Phase 2: Hospital Dashboard (Week 2-3)
   - Phase 3: Business Dashboard (Week 4)
   - Phase 4: Testing & Documentation (Week 5)

2. **Frontend Integration:**
   - Provide TypeScript types for all responses
   - Create API client SDK
   - Set up webhook notifications for real-time updates

3. **Monitoring & Analytics:**
   - Set up Grafana dashboards for API metrics
   - Implement error tracking with Sentry
   - Monitor cache hit rates and query performance

---

**Document Status:** ✅ Complete
**Review Status:** Pending review by team lead
**Implementation Status:** Ready for development
