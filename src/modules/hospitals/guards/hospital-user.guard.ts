/**
 * Hospital User Guard
 * Verifies JWT and hospital staff authorization
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HospitalUser, HospitalUserRole } from '../entities/hospital-user.entity';

/**
 * Guard to verify hospital staff access
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, HospitalUserGuard)
 *
 * Validates:
 * 1. JWT is valid (handled by JwtAuthGuard)
 * 2. User is hospital staff
 * 3. User belongs to the requested hospital
 * 4. User has required role (optional)
 */
@Injectable()
export class HospitalUserGuard implements CanActivate {
  constructor(
    @InjectRepository(HospitalUser)
    private readonly hospitalUserRepository: Repository<HospitalUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard

    if (!user || !user.userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    // Get hospitalId from route params
    const hospitalId = request.params.hospitalId;

    if (!hospitalId) {
      throw new ForbiddenException('Hospital ID required');
    }

    // Fetch hospital user
    const hospitalUser = await this.hospitalUserRepository.findOne({
      where: {
        id: user.userId, // Assuming userId is hospital user ID
        hospitalId,
        isActive: true,
      },
    });

    if (!hospitalUser) {
      throw new ForbiddenException(
        'Access denied: Not a staff member of this hospital',
      );
    }

    // Check if account is locked
    if (hospitalUser.lockedUntil && hospitalUser.lockedUntil > new Date()) {
      throw new ForbiddenException(
        `Account locked until ${hospitalUser.lockedUntil.toISOString()}`,
      );
    }

    // Attach hospital user to request for use in controllers
    request.hospitalUser = hospitalUser;

    // Update last login
    await this.hospitalUserRepository.update(hospitalUser.id, {
      lastLoginAt: new Date(),
      lastLoginIp: request.ip || request.connection.remoteAddress,
    });

    return true;
  }
}

/**
 * Role-specific guard
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, HospitalUserGuard, RequireHospitalRole(HospitalUserRole.ADMIN))
 */
export function RequireHospitalRole(...roles: HospitalUserRole[]) {
  @Injectable()
  class RoleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      const hospitalUser = request.hospitalUser;

      if (!hospitalUser) {
        throw new ForbiddenException('Hospital user not found in request');
      }

      if (!roles.includes(hospitalUser.role)) {
        throw new ForbiddenException(
          `Required role: ${roles.join(' or ')}, but user has: ${hospitalUser.role}`,
        );
      }

      return true;
    }
  }

  return RoleGuard;
}
