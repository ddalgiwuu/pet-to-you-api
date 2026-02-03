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

/**
 * 🛡️ Role-Based Access Control (RBAC) Guard
 *
 * Restricts access based on user roles.
 *
 * Role Hierarchy (from lowest to highest privilege):
 * 1. CONSUMER - Regular users
 * 2. HOSPITAL_STAFF - Hospital employees
 * 3. HOSPITAL_ADMIN - Hospital administrators
 * 4. SHELTER_ADMIN - Shelter administrators
 * 5. DAYCARE_ADMIN - Daycare administrators
 * 6. PLATFORM_ADMIN - Platform administrators
 * 7. SUPER_ADMIN - System administrators
 *
 * Usage:
 * ```typescript
 * @Roles(UserRole.HOSPITAL_ADMIN, UserRole.PLATFORM_ADMIN)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Get('admin/dashboard')
 * getAdminDashboard() {
 *   return { ... };
 * }
 * ```
 *
 * Features:
 * - Validates user role against required roles
 * - Supports multiple required roles (OR logic)
 * - Skips authorization for @Public() routes
 * - Provides detailed error messages
 */
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
      return true; // Skip authorization
    }

    // Get required roles from @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required, allow access
    }

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request (RolesGuard)');
      throw new ForbiddenException(
        'Authentication required to access this resource',
      );
    }

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      this.logger.warn(
        `Access denied for user ${user.id} with role ${user.role}. Required: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException(
        `Insufficient permissions. Required role: ${requiredRoles.join(' or ')}`,
      );
    }

    return true;
  }
}
