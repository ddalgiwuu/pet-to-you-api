import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, AccountStatus } from '../../../modules/users/entities/user.entity';
import { CacheService } from '../../cache/cache.service';
import * as fs from 'fs';
import * as path from 'path';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
  jti?: string; // JWT ID for token revocation
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

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
      algorithms: ['RS256'], // Only accept RS256 signed tokens
    });
  }

  /**
   * 🔐 Validate JWT payload and return user
   *
   * This method is called automatically by Passport after JWT signature verification.
   *
   * Security Checks:
   * 1. Verify token type is 'access' (not refresh token)
   * 2. Check token revocation (Redis blacklist)
   * 3. Validate user exists and is active
   * 4. Verify account is not locked or suspended
   * 5. Update last login timestamp
   *
   * @param payload - Decoded JWT payload
   * @returns User object (attached to request.user)
   * @throws UnauthorizedException if validation fails
   */
  async validate(payload: JwtPayload): Promise<User> {
    try {
      // 1. Verify token type
      if (payload.type !== 'access') {
        this.logger.warn(`Invalid token type: ${payload.type}`);
        throw new UnauthorizedException('Invalid token type');
      }

      // 2. Check token revocation (Redis blacklist)
      const isRevoked = await this.checkTokenRevocation(payload.jti);
      if (isRevoked) {
        this.logger.warn(`Revoked token used: ${payload.jti}`);
        throw new UnauthorizedException('Token has been revoked');
      }

      // 3. Find user in database
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        this.logger.warn(`User not found: ${payload.sub}`);
        throw new UnauthorizedException('User not found');
      }

      // 4. Verify user account status
      if (user.isDeleted) {
        throw new UnauthorizedException('Account has been deleted');
      }

      if (user.status === AccountStatus.SUSPENDED) {
        throw new UnauthorizedException('Account has been suspended');
      }

      if (user.status === AccountStatus.PENDING_VERIFICATION) {
        throw new UnauthorizedException('Email verification required');
      }

      if (user.isLocked()) {
        throw new UnauthorizedException(
          `Account is locked until ${user.lockedUntil?.toISOString()}`,
        );
      }

      if (!user.isActive()) {
        throw new UnauthorizedException('Account is not active');
      }

      // 5. Update last activity (async, don't wait)
      this.updateLastActivity(user.id, payload.jti).catch((err) =>
        this.logger.error('Failed to update last activity:', err),
      );

      // Return user object (will be attached to request.user)
      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('JWT validation error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * 🚫 Check if token has been revoked (logout, password change, etc.)
   *
   * @param jti - JWT ID (unique token identifier)
   * @returns True if token is revoked
   */
  private async checkTokenRevocation(jti?: string): Promise<boolean> {
    if (!jti) return false;

    const revokedKey = `revoked_token:${jti}`;
    return await this.cacheService.exists(revokedKey);
  }

  /**
   * 📊 Update last activity timestamp
   *
   * @param userId - User ID
   * @param jti - JWT ID
   */
  private async updateLastActivity(
    userId: string,
    jti?: string,
  ): Promise<void> {
    try {
      // Track active session
      if (jti) {
        await this.cacheService.set(
          `active_session:${userId}:${jti}`,
          { lastActivity: new Date().toISOString() },
          900, // 15 minutes (access token TTL)
        );
      }

      // Update user last login (throttled to once per hour)
      const lastUpdateKey = `last_login_updated:${userId}`;
      const wasUpdated = await this.cacheService.exists(lastUpdateKey);

      if (!wasUpdated) {
        await this.userRepository.update(userId, {
          lastLoginAt: new Date(),
        });
        await this.cacheService.set(lastUpdateKey, true, 3600); // 1 hour
      }
    } catch (error) {
      this.logger.error('Failed to update last activity:', error);
    }
  }
}
