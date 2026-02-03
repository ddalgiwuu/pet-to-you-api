import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-naver-v2';

export interface NaverProfile {
  provider: 'naver';
  id: string;
  email?: string;
  name?: string;
  profileImageUrl?: string;
  phoneNumber?: string;
  _raw: string;
  _json: any;
}

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
  private readonly logger = new Logger(NaverStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('NAVER_CLIENT_ID') || '',
      clientSecret: configService.get<string>('NAVER_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>(
        'NAVER_CALLBACK_URL',
        'http://localhost:3000/api/v1/auth/naver/callback',
      ),
    });
  }

  /**
   * 🟢 Validate Naver OAuth2 profile
   *
   * Naver Profile Structure:
   * - response.id: Unique Naver user ID
   * - response.email: User email
   * - response.name: User name
   * - response.profile_image: Profile image URL
   * - response.mobile: Phone number (format: 010-1234-5678)
   *
   * Privacy Note:
   * - Email is typically available
   * - Phone number requires additional permission
   *
   * @param accessToken - Naver access token
   * @param refreshToken - Naver refresh token
   * @param profile - Naver user profile
   * @returns Normalized profile data
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<NaverProfile> {
    try {
      const { id, _json } = profile;
      const response = _json.response || {};

      this.logger.log(`Naver login: ${id}`);

      return {
        provider: 'naver',
        id: String(id),
        email: response.email,
        name: response.name || response.nickname,
        profileImageUrl: response.profile_image,
        phoneNumber: response.mobile?.replace(/-/g, ''), // Remove dashes
        _raw: JSON.stringify(_json),
        _json,
      };
    } catch (error) {
      this.logger.error('Naver validation error:', error);
      throw error;
    }
  }
}
