import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';

export interface AppleProfile {
  provider: 'apple';
  id: string;
  email?: string;
  name?: string;
  profileImageUrl?: string;
  emailVerified?: boolean;
  _raw: string;
  _json: any;
}

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  private readonly logger = new Logger(AppleStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('APPLE_CLIENT_ID') || '',
      teamID: configService.get<string>('APPLE_TEAM_ID') || '',
      keyID: configService.get<string>('APPLE_KEY_ID') || '',
      privateKeyString: configService.get<string>('APPLE_PRIVATE_KEY') || '',
      callbackURL: configService.get<string>(
        'APPLE_CALLBACK_URL',
        'http://localhost:3000/api/v1/auth/apple/callback',
      ),
      passReqToCallback: true,
    });
  }

  /**
   * 🍎 Validate Apple Sign In profile
   *
   * Apple Profile Structure:
   * - sub: Unique Apple user ID (stable identifier)
   * - email: User email (may be relay email @privaterelay.appleid.com)
   * - email_verified: Email verification status
   * - user.name: User name (only on first sign-in)
   *
   * Privacy Note:
   * - Apple provides relay emails for privacy
   * - User name only available on first authentication
   * - Store user name immediately, won't be provided again
   * - Email may change if user toggles relay setting
   *
   * Security Note:
   * - Apple uses JWT with RS256
   * - Identity token should be verified server-side
   *
   * @param req - Express request (for user data on first auth)
   * @param accessToken - Apple access token
   * @param refreshToken - Apple refresh token
   * @param idToken - Apple ID token (JWT with user claims)
   * @param profile - Apple user profile
   * @returns Normalized profile data
   */
  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: any,
  ): Promise<AppleProfile> {
    try {
      this.logger.log(`Apple login: ${profile.sub || profile.id}`);

      // Extract user data from request body (only on first sign-in)
      const userData = req.body?.user ? JSON.parse(req.body.user) : null;

      // Construct full name from Apple user data
      let fullName: string | undefined;
      if (userData?.name) {
        const { firstName, lastName } = userData.name;
        fullName = [firstName, lastName].filter(Boolean).join(' ');
      }

      return {
        provider: 'apple',
        id: String(profile.sub || profile.id),
        email: profile.email,
        name: fullName,
        emailVerified: profile.email_verified === 'true',
        _raw: JSON.stringify(profile),
        _json: profile,
      };
    } catch (error) {
      this.logger.error('Apple validation error:', error);
      throw error;
    }
  }
}
