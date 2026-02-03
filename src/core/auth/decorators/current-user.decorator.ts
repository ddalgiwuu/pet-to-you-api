import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../../modules/users/entities/user.entity';

/**
 * 👤 Current User Decorator
 *
 * Extracts authenticated user from request.
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
 * With specific field:
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get('my-id')
 * getMyId(@CurrentUser('id') userId: string) {
 *   return { userId };
 * }
 * ```
 *
 * Note:
 * - User is attached by JwtStrategy.validate()
 * - Requires JwtAuthGuard or equivalent
 * - Returns undefined if user not authenticated
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // Return specific field if requested
    return data ? user?.[data] : user;
  },
);
