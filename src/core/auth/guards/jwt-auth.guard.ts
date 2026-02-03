import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * 🔐 JWT Authentication Guard
 *
 * Protects routes with JWT authentication.
 *
 * Usage:
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 * ```
 *
 * Public Routes:
 * Use @Public() decorator to bypass authentication:
 * ```typescript
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 *
 * Features:
 * - Validates JWT signature with RSA public key
 * - Checks token expiration
 * - Verifies token revocation (Redis)
 * - Validates user account status
 * - Skips authentication for @Public() routes
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Check if route is public before enforcing authentication
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Skip authentication
    }

    // Execute JWT authentication
    return super.canActivate(context);
  }

  /**
   * Handle authentication errors
   */
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    // Handle specific JWT errors
    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException('Token has expired');
    }

    if (info?.name === 'JsonWebTokenError') {
      throw new UnauthorizedException('Invalid token');
    }

    if (info?.name === 'NotBeforeError') {
      throw new UnauthorizedException('Token not active yet');
    }

    // Handle other errors
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication failed');
    }

    return user;
  }
}
