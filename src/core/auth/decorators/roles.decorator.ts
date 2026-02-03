import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../../modules/users/entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * 🛡️ Roles Decorator
 *
 * Restricts access to specific user roles.
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
 * Multiple roles (OR logic):
 * ```typescript
 * // User must have HOSPITAL_ADMIN OR PLATFORM_ADMIN role
 * @Roles(UserRole.HOSPITAL_ADMIN, UserRole.PLATFORM_ADMIN)
 * ```
 *
 * Single role:
 * ```typescript
 * // User must have SUPER_ADMIN role
 * @Roles(UserRole.SUPER_ADMIN)
 * ```
 *
 * Note:
 * - Works with RolesGuard
 * - Requires JwtAuthGuard for authentication
 * - Uses OR logic for multiple roles
 */
export const Roles = (...roles: (UserRole | string)[]) => SetMetadata(ROLES_KEY, roles);
