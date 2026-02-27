import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../../modules/users/entities/user.entity';

/**
 * 🏢 Organization Isolation Guard
 *
 * Multi-tenant security guard ensuring users can only access resources
 * from their own organization (hospital, daycare, shelter, etc.)
 *
 * Features:
 * - Automatic organization ID injection from JWT
 * - Platform admins bypass organization checks
 * - Hospital/Business resource isolation
 * - Audit logging for access attempts
 *
 * Usage:
 * ```typescript
 * @UseGuards(JwtAuthGuard, RolesGuard, OrganizationGuard)
 * @Roles(UserRole.HOSPITAL_ADMIN)
 * @Get('dashboard/hospital/stats')
 * getStats() { ... }
 * ```
 *
 * Security Model:
 * - SUPER_ADMIN / PLATFORM_ADMIN: Access all organizations
 * - HOSPITAL_ADMIN / HOSPITAL_STAFF: Only their hospital
 * - DAYCARE_ADMIN / SHELTER_ADMIN: Only their business
 * - CONSUMER: No organization access (personal data only)
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
  private readonly logger = new Logger(OrganizationGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Platform admins bypass organization checks
    if (this.isPlatformAdmin(user.role)) {
      this.logger.debug(`Platform admin ${user.id} bypassing organization check`);
      return true;
    }

    // Extract organization identifiers from request
    const requestedHospitalId = this.extractParam(request, 'hospitalId');
    const requestedBusinessId = this.extractParam(request, 'businessId');

    // Handle hospital users
    if (this.isHospitalUser(user.role)) {
      return this.validateHospitalAccess(user, requestedHospitalId, request);
    }

    // Handle business users (daycare, shelter, grooming)
    if (this.isBusinessUser(user.role)) {
      return this.validateBusinessAccess(user, requestedBusinessId, request);
    }

    // Consumers should not access organization endpoints
    if (user.role === UserRole.CONSUMER) {
      this.logger.warn(
        `Consumer ${user.id} attempted to access organization endpoint: ${request.url}`,
      );
      throw new ForbiddenException(
        'Consumers cannot access organization dashboards',
      );
    }

    return true;
  }

  /**
   * Check if user is platform administrator
   */
  private isPlatformAdmin(role: UserRole): boolean {
    return [UserRole.PLATFORM_ADMIN, UserRole.SUPER_ADMIN].includes(role);
  }

  /**
   * Check if user is hospital staff/admin
   */
  private isHospitalUser(role: UserRole): boolean {
    return [UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_STAFF].includes(role);
  }

  /**
   * Check if user is business admin (daycare, shelter, etc.)
   */
  private isBusinessUser(role: UserRole): boolean {
    return [
      UserRole.DAYCARE_ADMIN,
      UserRole.SHELTER_ADMIN,
    ].includes(role);
  }

  /**
   * Extract parameter from query, params, or body
   */
  private extractParam(request: any, paramName: string): string | undefined {
    return (
      request.query?.[paramName] ||
      request.params?.[paramName] ||
      request.body?.[paramName]
    );
  }

  /**
   * Validate hospital user access to hospital resources
   */
  private validateHospitalAccess(
    user: any,
    requestedHospitalId: string | undefined,
    request: any,
  ): boolean {
    // Verify user has associated hospital
    if (!user.hospitalId) {
      this.logger.error(
        `Hospital user ${user.id} has no associated hospitalId in JWT`,
      );
      throw new ForbiddenException('User not associated with any hospital');
    }

    // If no hospitalId in request, inject user's hospitalId
    if (!requestedHospitalId) {
      this.logger.debug(
        `Injecting hospitalId ${user.hospitalId} for user ${user.id}`,
      );
      Object.assign(request.query, { hospitalId: user.hospitalId });
      return true;
    }

    // Verify user can access requested hospital
    if (requestedHospitalId !== user.hospitalId) {
      this.logger.warn(
        `Hospital user ${user.id} (hospital: ${user.hospitalId}) attempted to access hospital ${requestedHospitalId}`,
      );
      throw new ForbiddenException(
        'Access denied: Cannot access data from other hospitals',
      );
    }

    this.logger.debug(
      `Hospital user ${user.id} authorized for hospital ${user.hospitalId}`,
    );
    return true;
  }

  /**
   * Validate business user access to business resources
   */
  private validateBusinessAccess(
    user: any,
    requestedBusinessId: string | undefined,
    request: any,
  ): boolean {
    // Verify user has associated business
    if (!user.businessId) {
      this.logger.error(
        `Business user ${user.id} has no associated businessId in JWT`,
      );
      throw new ForbiddenException('User not associated with any business');
    }

    // If no businessId in request, inject user's businessId
    if (!requestedBusinessId) {
      this.logger.debug(
        `Injecting businessId ${user.businessId} for user ${user.id}`,
      );
      Object.assign(request.query, { businessId: user.businessId });
      return true;
    }

    // Verify user can access requested business
    if (requestedBusinessId !== user.businessId) {
      this.logger.warn(
        `Business user ${user.id} (business: ${user.businessId}) attempted to access business ${requestedBusinessId}`,
      );
      throw new ForbiddenException(
        'Access denied: Cannot access data from other businesses',
      );
    }

    this.logger.debug(
      `Business user ${user.id} authorized for business ${user.businessId}`,
    );
    return true;
  }
}
