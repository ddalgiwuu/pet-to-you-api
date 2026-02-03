import { Request } from 'express';
import { User } from '../../modules/users/entities/user.entity';

/**
 * Express Request with authenticated user
 * Used when JwtAuthGuard is applied
 */
export interface AuthRequest extends Request {
  user: User;
}
