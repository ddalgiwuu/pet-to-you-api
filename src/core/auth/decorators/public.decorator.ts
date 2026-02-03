import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 🌍 Public Decorator
 *
 * Marks routes as publicly accessible (no authentication required).
 *
 * Usage:
 * ```typescript
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 *
 * Public auth endpoints:
 * ```typescript
 * @Public()
 * @Post('login')
 * login(@Body() loginDto: LoginDto) {
 *   return this.authService.login(loginDto);
 * }
 * ```
 *
 * Note:
 * - Bypasses JwtAuthGuard, RolesGuard, and PermissionsGuard
 * - Use for: health checks, login, registration, OAuth callbacks
 * - Should be used sparingly and only for truly public endpoints
 * - Can be applied at controller or method level
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
