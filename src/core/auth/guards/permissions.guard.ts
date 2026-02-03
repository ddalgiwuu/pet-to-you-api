import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * 🔑 Fine-Grained Permission Guard
 *
 * Implements attribute-based access control (ABAC) for granular permissions.
 *
 * Permission Format: "resource:action"
 * Examples:
 * - "pet:read" - Read pet data
 * - "pet:write" - Create/update pets
 * - "pet:delete" - Delete pets
 * - "booking:approve" - Approve bookings
 * - "user:manage" - Manage users
 * - "billing:refund" - Process refunds
 *
 * Usage:
 * ```typescript
 * @Permissions('pet:write', 'pet:read')
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @Post('pets')
 * createPet(@Body() createPetDto: CreatePetDto) {
 *   return this.petService.create(createPetDto);
 * }
 * ```
 *
 * Role-Permission Mapping (example):
 * - CONSUMER: pet:read, booking:read, booking:write
 * - HOSPITAL_STAFF: pet:read, health_note:write, appointment:manage
 * - HOSPITAL_ADMIN: All hospital permissions + billing:read
 * - PLATFORM_ADMIN: All permissions except super_admin actions
 * - SUPER_ADMIN: All permissions
 *
 * Note: This is a basic implementation. For production, consider:
 * - Database-backed permissions
 * - Dynamic role-permission mapping
 * - Permission inheritance
 * - Caching for performance
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  // Role-based permission mapping (hardcoded for MVP)
  // TODO: Move to database or configuration service
  private readonly rolePermissions: Record<string, string[]> = {
    consumer: [
      'pet:read',
      'pet:write',
      'booking:read',
      'booking:write',
      'profile:read',
      'profile:write',
    ],
    hospital_staff: [
      'pet:read',
      'health_note:read',
      'health_note:write',
      'appointment:read',
      'appointment:manage',
      'insurance_claim:read',
    ],
    hospital_admin: [
      'pet:read',
      'health_note:read',
      'health_note:write',
      'appointment:read',
      'appointment:manage',
      'insurance_claim:read',
      'insurance_claim:write',
      'billing:read',
      'staff:manage',
    ],
    shelter_admin: [
      'pet:read',
      'pet:write',
      'pet:delete',
      'adoption:manage',
      'shelter:manage',
    ],
    daycare_admin: [
      'pet:read',
      'daycare:manage',
      'booking:manage',
      'staff:manage',
    ],
    platform_admin: [
      '*:*', // All permissions except super_admin actions
    ],
    super_admin: [
      '*:*', // All permissions
      'system:configure',
      'user:impersonate',
      'audit:delete',
    ],
  };

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Skip authorization
    }

    // Get required permissions from @Permissions() decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required, allow access
    }

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request (PermissionsGuard)');
      throw new ForbiddenException(
        'Authentication required to access this resource',
      );
    }

    // Get user's permissions based on role
    const userPermissions = this.rolePermissions[user.role] || [];

    // Check if user has wildcard permission
    if (userPermissions.includes('*:*')) {
      return true;
    }

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((requiredPerm) =>
      this.hasPermission(userPermissions, requiredPerm),
    );

    if (!hasAllPermissions) {
      this.logger.warn(
        `Access denied for user ${user.id} with role ${user.role}. Required: ${requiredPermissions.join(', ')}`,
      );
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }

  /**
   * Check if user has specific permission (supports wildcards)
   */
  private hasPermission(
    userPermissions: string[],
    requiredPermission: string,
  ): boolean {
    return userPermissions.some((userPerm) => {
      // Exact match
      if (userPerm === requiredPermission) {
        return true;
      }

      // Wildcard match (e.g., "pet:*" matches "pet:read", "pet:write")
      const [userResource, userAction] = userPerm.split(':');
      const [reqResource, reqAction] = requiredPermission.split(':');

      if (userAction === '*' && userResource === reqResource) {
        return true;
      }

      if (userResource === '*' && userAction === reqAction) {
        return true;
      }

      return false;
    });
  }
}
