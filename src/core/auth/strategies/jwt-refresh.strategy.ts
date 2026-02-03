import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../modules/users/entities/user.entity';
import { CacheService } from '../../cache/cache.service';
import { JwtPayload } from './jwt.strategy';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  private readonly logger = new Logger(JwtRefreshStrategy.name);

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    // Load RSA public key for RS256 verification
    const publicKeyPath = path.join(process.cwd(), 'keys', 'jwt.key.pub');
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
      passReqToCallback: true, // Pass request to validate method
    });
  }

  /**
   * 🔄 Validate refresh token and return user
   *
   * Security Checks for Refresh Token:
   * 1. Verify token type is 'refresh'
   * 2. Check token exists in Redis whitelist (stored during login)
   * 3. Verify token hasn't been used (prevent replay attacks)
   * 4. Validate user exists and is active
   * 5. Mark token as used (token rotation)
   *
   * Token Rotation Strategy:
   * - Each refresh token can only be used once
   * - After use, token is invalidated and new pair is issued
   * - Prevents token theft and replay attacks
   *
   * @param req - Express request object
   * @param payload - Decoded JWT payload
   * @returns User object with refresh token metadata
   * @throws UnauthorizedException if validation fails
   */
  async validate(req: any, payload: JwtPayload): Promise<User & { jti: string }> {
    try {
      // 1. Verify token type
      if (payload.type !== 'refresh') {
        this.logger.warn(`Invalid token type for refresh: ${payload.type}`);
        throw new UnauthorizedException('Invalid token type');
      }

      if (!payload.jti) {
        this.logger.warn('Refresh token missing JTI');
        throw new UnauthorizedException('Invalid refresh token');
      }

      // 2. Check if refresh token exists in whitelist
      const tokenKey = `refresh_token:${payload.sub}:${payload.jti}`;
      const storedToken = await this.cacheService.get<any>(tokenKey);

      if (!storedToken) {
        this.logger.warn(`Refresh token not found in whitelist: ${payload.jti}`);
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // 3. Check if token has been used (prevent replay attacks)
      if (storedToken.used) {
        this.logger.warn(
          `Refresh token already used (possible attack): ${payload.jti}`,
        );
        
        // Token reuse detected - invalidate all refresh tokens for this user
        await this.revokeAllUserTokens(payload.sub);
        
        throw new UnauthorizedException(
          'Refresh token has already been used. All sessions invalidated for security.',
        );
      }

      // 4. Find user in database
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        this.logger.warn(`User not found: ${payload.sub}`);
        throw new UnauthorizedException('User not found');
      }

      // 5. Verify user is active
      if (!user.isActive()) {
        throw new UnauthorizedException('Account is not active');
      }

      // 6. Mark token as used (token rotation)
      await this.cacheService.set(
        tokenKey,
        { ...storedToken, used: true, usedAt: new Date().toISOString() },
        300, // Keep for 5 minutes for audit trail
      );

      // Return user with JTI for token rotation
      return Object.assign(user, { jti: payload.jti });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Refresh token validation error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * 🚨 Revoke all refresh tokens for a user (security incident)
   *
   * @param userId - User ID
   */
  private async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      // Get all refresh tokens for user
      const pattern = `refresh_token:${userId}:*`;
      const redisClient = this.cacheService.getClient();
      const keys = await redisClient.keys(pattern);

      // Delete all refresh tokens
      if (keys.length > 0) {
        await redisClient.del(...keys);
        this.logger.warn(
          `Revoked ${keys.length} refresh tokens for user ${userId}`,
        );
      }

      // Also revoke active sessions
      const sessionPattern = `active_session:${userId}:*`;
      const sessionKeys = await redisClient.keys(sessionPattern);
      if (sessionKeys.length > 0) {
        await redisClient.del(...sessionKeys);
      }
    } catch (error) {
      this.logger.error('Failed to revoke user tokens:', error);
    }
  }
}
