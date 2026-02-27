import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, AccountStatus, UserRole } from '../../../modules/users/entities/user.entity';
import { EncryptionService } from '../../encryption/encryption.service';
import { CacheService } from '../../cache/cache.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  AuthResponseDto,
  TokenPair,
} from '../dto';
import {
  KakaoProfile,
  NaverProfile,
  AppleProfile,
} from '../strategies';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokenTTL = 900; // 15 minutes
  private readonly refreshTokenTTL = 604800; // 7 days
  private readonly maxLoginAttempts = 5;
  private readonly lockoutDuration = 900; // 15 minutes
  private readonly privateKey: string;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private encryptionService: EncryptionService,
    private cacheService: CacheService,
    private auditService: AuditService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    // Load RSA private key for JWT signing
    const privateKeyPath = path.join(process.cwd(), 'keys', 'jwt.key');
    this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  }

  /**
   * 📝 Register new user
   *
   * Process:
   * 1. Validate email uniqueness
   * 2. Hash password with bcrypt
   * 3. Create HMAC indexes for searchable encryption
   * 4. Save user to database
   * 5. Send verification email (TODO)
   * 6. Generate JWT tokens
   * 7. Audit log registration
   *
   * Security:
   * - Password strength validation (DTO)
   * - Email verification required before full access
   * - Terms and privacy policy acceptance required (PIPA)
   * - Rate limiting (handled by controller)
   *
   * @param registerDto - Registration data
   * @param ipAddress - User IP address
   * @param userAgent - User agent string
   * @returns Auth response with tokens
   */
  async register(
    registerDto: RegisterDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResponseDto> {
    const { email, password, phoneNumber, ...userData } = registerDto;

    // 1. Check if email already exists
    const emailHmac = await this.encryptionService.createHmac(
      email.toLowerCase(),
    );
    const existingUser = await this.userRepository.findOne({
      where: { emailHmac },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // 2. Hash password
    const passwordHash = await this.encryptionService.hashPassword(password);

    // 3. Create HMAC indexes
    const phoneNumberHmac = phoneNumber
      ? await this.encryptionService.createHmac(phoneNumber)
      : undefined;

    // 4. Create user
    const user = this.userRepository.create({
      email: email.toLowerCase(),
      emailHmac,
      passwordHash,
      phoneNumber,
      phoneNumberHmac,
      ...userData,
      status: AccountStatus.PENDING_VERIFICATION,
      role: userData.role || UserRole.CONSUMER,
      emailVerified: false,
      termsAcceptedAt: new Date(),
      privacyPolicyAcceptedAt: new Date(),
      marketingConsentAt: userData.marketingConsent ? new Date() : undefined,
      consentHistory: [
        {
          type: 'registration',
          accepted: true,
          timestamp: new Date(),
          ipAddress,
        },
      ],
    });

    const savedUser = await this.userRepository.save(user);

    // 5. TODO: Send verification email
    // await this.sendVerificationEmail(savedUser.email);

    // 6. Generate tokens
    const tokens = await this.generateTokens(savedUser);

    // 7. Audit log
    await this.auditService.log({
      userId: savedUser.id,
      action: AuditAction.USER_CREATED,
      resource: 'user',
      resourceId: savedUser.id,
      purpose: 'User registration',
      legalBasis: 'PIPA Article 15 - Consent',
      ipAddress,
      userAgent,
      metadata: { email, role: savedUser.role },
    });

    this.logger.log(`User registered: ${savedUser.id} (${email})`);

    return {
      user: this.sanitizeUser(savedUser),
      tokens,
    };
  }

  /**
   * 🔐 Login user
   *
   * Process:
   * 1. Find user by email
   * 2. Check account lockout
   * 3. Verify password
   * 4. Reset failed attempts on success
   * 5. Update last login info
   * 6. Generate JWT tokens
   * 7. Audit log login
   *
   * Security:
   * - Rate limiting (5 attempts per 15 minutes)
   * - Account lockout after 5 failed attempts
   * - Failed login attempt tracking
   * - Audit all login events
   *
   * @param loginDto - Login credentials
   * @param ipAddress - User IP address
   * @param userAgent - User agent string
   * @returns Auth response with tokens
   */
  async login(
    loginDto: LoginDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // 1. Find user
    const emailHmac = await this.encryptionService.createHmac(
      email.toLowerCase(),
    );
    const user = await this.userRepository.findOne({
      where: { emailHmac },
      select: [
        'id',
        'email',
        'passwordHash',
        'role',
        'status',
        'isDeleted',
        'failedLoginAttempts',
        'lockedUntil',
        'name',
        'profileImageUrl',
        'emailVerified',
      ],
    });

    if (!user) {
      // Prevent user enumeration - same error as wrong password
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Check account lockout
    if (user.isLocked()) {
      await this.auditService.log({
        userId: user.id,
        action: AuditAction.LOGIN_FAILED,
        resource: 'user',
        resourceId: user.id,
        purpose: 'Login attempt on locked account',
        legalBasis: 'PIPA Article 29 - Security measures',
        ipAddress,
        userAgent,
        metadata: { reason: 'account_locked' },
      });

      throw new UnauthorizedException(
        `Account locked until ${user.lockedUntil?.toISOString()}`,
      );
    }

    // 3. Verify password
    const isPasswordValid = await this.encryptionService.verifyPassword(
      password,
      user.passwordHash!,
    );

    if (!isPasswordValid) {
      await this.handleFailedLogin(user, ipAddress, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Verify account status
    if (user.isDeleted) {
      throw new UnauthorizedException('Account has been deleted');
    }

    if (user.status === AccountStatus.SUSPENDED) {
      throw new UnauthorizedException('Account has been suspended');
    }

    // 5. Reset failed attempts and update last login
    await this.userRepository.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: undefined,
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    });

    // 6. Generate tokens
    const tokens = await this.generateTokens(user);

    // 7. Audit log
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN_SUCCESS,
      resource: 'user',
      resourceId: user.id,
      purpose: 'User login',
      legalBasis: 'PIPA Article 15 - Authentication',
      ipAddress,
      userAgent,
    });

    this.logger.log(`User logged in: ${user.id} (${email})`);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * 🔄 Refresh access token
   *
   * Token Rotation Strategy:
   * - Each refresh token can only be used once
   * - After use, new token pair is issued
   * - Old refresh token is invalidated
   * - Prevents token theft and replay attacks
   *
   * @param refreshTokenDto - Refresh token
   * @param ipAddress - User IP address
   * @param userAgent - User agent string
   * @returns New token pair
   */
  async refresh(
    refreshTokenDto: RefreshTokenDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<TokenPair> {
    const { refreshToken } = refreshTokenDto;

    try {
      // Verify refresh token (JwtRefreshStrategy handles validation)
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.privateKey,
        algorithms: ['RS256'],
      });

      // Find user
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive()) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new token pair
      const tokens = await this.generateTokens(user);

      // Revoke old refresh token
      await this.revokeToken(payload.jti);

      // Audit log
      await this.auditService.log({
        userId: user.id,
        action: AuditAction.TOKEN_REFRESHED,
        resource: 'token',
        purpose: 'Token refresh',
        legalBasis: 'PIPA Article 15 - Authentication',
        ipAddress,
        userAgent,
      });

      return tokens;
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * 🚪 Logout user
   *
   * Process:
   * 1. Extract user from request
   * 2. Revoke access token (add to blacklist)
   * 3. Revoke refresh tokens for this user
   * 4. Audit log logout
   *
   * @param user - Authenticated user
   * @param jti - JWT ID from access token
   * @param ipAddress - User IP address
   * @param userAgent - User agent string
   */
  async logout(
    user: User,
    jti: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    // Revoke access token
    await this.revokeToken(jti, this.accessTokenTTL);

    // Revoke all refresh tokens for user
    const pattern = `refresh_token:${user.id}:*`;
    const redisClient = this.cacheService.getClient();
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGOUT,
      resource: 'user',
      resourceId: user.id,
      purpose: 'User logout',
      legalBasis: 'PIPA Article 15 - Authentication',
      ipAddress,
      userAgent,
    });

    this.logger.log(`User logged out: ${user.id}`);
  }

  /**
   * 🔑 Change password
   *
   * @param user - Authenticated user
   * @param changePasswordDto - Current and new password
   * @param ipAddress - User IP address
   * @param userAgent - User agent string
   */
  async changePassword(
    user: User,
    changePasswordDto: ChangePasswordDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Get user with password
    const userWithPassword = await this.userRepository.findOne({
      where: { id: user.id },
      select: ['id', 'passwordHash'],
    });

    if (!userWithPassword?.passwordHash) {
      throw new BadRequestException('Password not set for this account');
    }

    // Verify current password
    const isPasswordValid = await this.encryptionService.verifyPassword(
      currentPassword,
      userWithPassword.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash =
      await this.encryptionService.hashPassword(newPassword);

    // Update password
    await this.userRepository.update(user.id, {
      passwordHash: newPasswordHash,
    });

    // Revoke all tokens (force re-login)
    await this.revokeAllUserTokens(user.id);

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.PASSWORD_CHANGED,
      resource: 'user',
      resourceId: user.id,
      purpose: 'Password change',
      legalBasis: 'PIPA Article 29 - Security measures',
      ipAddress,
      userAgent,
    });

    this.logger.log(`Password changed: ${user.id}`);
  }

  /**
   * 🟡 OAuth2 - Kakao Login
   */
  async kakaoLogin(
    profile: KakaoProfile,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResponseDto> {
    return this.handleOAuth2Login('kakao', profile, ipAddress, userAgent);
  }

  /**
   * 🟢 OAuth2 - Naver Login
   */
  async naverLogin(
    profile: NaverProfile,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResponseDto> {
    return this.handleOAuth2Login('naver', profile, ipAddress, userAgent);
  }

  /**
   * 🍎 OAuth2 - Apple Login
   */
  async appleLogin(
    profile: AppleProfile,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResponseDto> {
    return this.handleOAuth2Login('apple', profile, ipAddress, userAgent);
  }

  /**
   * 📱 Update device token for push notifications
   *
   * @param userId - User ID
   * @param deviceToken - FCM/APNs device token
   */
  async updateDeviceToken(userId: string, deviceToken: string): Promise<void> {
    await this.userRepository.update(userId, {
      deviceToken,
      deviceTokenUpdatedAt: new Date(),
    });
  }

  /**
   * 🔐 Generate JWT token pair (access + refresh)
   */
  private async generateTokens(user: User): Promise<TokenPair> {
    const jti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    // Access token payload
    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access' as const,
      jti,
    };

    // Refresh token payload
    const refreshPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh' as const,
      jti: refreshJti,
    };

    // Sign tokens with RS256
    const accessToken = this.jwtService.sign(accessPayload, {
      privateKey: this.privateKey,
      algorithm: 'RS256',
      expiresIn: this.accessTokenTTL,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      privateKey: this.privateKey,
      algorithm: 'RS256',
      expiresIn: this.refreshTokenTTL,
    });

    // Store refresh token in Redis whitelist
    await this.cacheService.set(
      `refresh_token:${user.id}:${refreshJti}`,
      {
        userId: user.id,
        jti: refreshJti,
        createdAt: new Date().toISOString(),
        used: false,
      },
      this.refreshTokenTTL,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenTTL,
    };
  }

  /**
   * 🚫 Revoke token (add to blacklist)
   */
  private async revokeToken(jti: string, ttl?: number): Promise<void> {
    await this.cacheService.set(
      `revoked_token:${jti}`,
      { revokedAt: new Date().toISOString() },
      ttl || this.accessTokenTTL,
    );
  }

  /**
   * 🚨 Revoke all tokens for user (security incident)
   */
  private async revokeAllUserTokens(userId: string): Promise<void> {
    const pattern = `refresh_token:${userId}:*`;
    const redisClient = this.cacheService.getClient();
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }

    const sessionPattern = `active_session:${userId}:*`;
    const sessionKeys = await redisClient.keys(sessionPattern);
    if (sessionKeys.length > 0) {
      await redisClient.del(...sessionKeys);
    }
  }

  /**
   * ❌ Handle failed login attempt
   */
  private async handleFailedLogin(
    user: User,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;

    // Lock account after max attempts
    const updates: Partial<User> = {
      failedLoginAttempts: attempts,
    };

    if (attempts >= this.maxLoginAttempts) {
      updates.lockedUntil = new Date(Date.now() + this.lockoutDuration * 1000);
      this.logger.warn(`Account locked: ${user.id} (${attempts} attempts)`);
    }

    await this.userRepository.update(user.id, updates);

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN_FAILED,
      resource: 'user',
      resourceId: user.id,
      purpose: 'Failed login attempt',
      legalBasis: 'PIPA Article 29 - Security measures',
      ipAddress,
      userAgent,
      metadata: { attempts },
    });
  }

  /**
   * 🌐 Handle OAuth2 login (generic)
   */
  private async handleOAuth2Login(
    provider: string,
    profile: KakaoProfile | NaverProfile | AppleProfile,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthResponseDto> {
    // Find existing user by OAuth ID
    let user = await this.userRepository.findOne({
      where: { oauthProvider: provider, oauthId: profile.id },
    });

    if (!user && profile.email) {
      // Try to find by email and link accounts
      const emailHmac = await this.encryptionService.createHmac(
        profile.email.toLowerCase(),
      );
      user = await this.userRepository.findOne({ where: { emailHmac } });

      if (user) {
        // Link OAuth account to existing user
        await this.userRepository.update(user.id, {
          oauthProvider: provider,
          oauthId: profile.id,
        });
        this.logger.log(`Linked ${provider} account to user: ${user.id}`);
      }
    }

    if (!user) {
      // Create new user from OAuth profile
      if (!profile.email) {
        throw new BadRequestException('Email is required for registration');
      }

      const emailHmac = await this.encryptionService.createHmac(
        profile.email.toLowerCase(),
      );

      user = this.userRepository.create({
        email: profile.email.toLowerCase(),
        emailHmac,
        name: profile.name || 'User',
        profileImageUrl: profile.profileImageUrl,
        oauthProvider: provider,
        oauthId: profile.id,
        emailVerified: true, // Trust OAuth provider
        status: AccountStatus.ACTIVE,
        role: UserRole.CONSUMER,
        termsAccepted: true,
        privacyPolicyAccepted: true,
        termsAcceptedAt: new Date(),
        privacyPolicyAcceptedAt: new Date(),
      });

      user = await this.userRepository.save(user);

      // Audit log
      await this.auditService.log({
        userId: user.id,
        action: AuditAction.USER_CREATED,
        resource: 'user',
        resourceId: user.id,
        purpose: `${provider} OAuth registration`,
        legalBasis: 'PIPA Article 15 - Consent',
        ipAddress,
        userAgent,
        metadata: { provider, oauthId: profile.id },
      });

      this.logger.log(`User created via ${provider}: ${user.id}`);
    }

    // Update last login
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.LOGIN_SUCCESS,
      resource: 'user',
      resourceId: user.id,
      purpose: `${provider} OAuth login`,
      legalBasis: 'PIPA Article 15 - Authentication',
      ipAddress,
      userAgent,
      metadata: { provider },
    });

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * 🧹 Sanitize user object (remove sensitive fields)
   */
  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash, twoFactorSecret, oauthAccessToken, ...safe } = user;
    return safe;
  }
}
