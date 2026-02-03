import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-kakao';

export interface KakaoProfile {
  provider: 'kakao';
  id: string;
  email?: string;
  name?: string;
  profileImageUrl?: string;
  _raw: string;
  _json: any;
}

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  private readonly logger = new Logger(KakaoStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('KAKAO_CLIENT_ID') || '',
      clientSecret: configService.get<string>('KAKAO_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>(
        'KAKAO_CALLBACK_URL',
        'http://localhost:3000/api/v1/auth/kakao/callback',
      ),
    });
  }

  /**
   * 🟡 Validate Kakao OAuth2 profile
   *
   * Kakao Profile Structure:
   * - id: Unique Kakao user ID
   * - kakao_account.email: User email (requires permission)
   * - kakao_account.profile.nickname: Display name
   * - kakao_account.profile.profile_image_url: Profile image
   *
   * Privacy Note:
   * - Email may not be available if user denies permission
   * - Profile info requires user consent
   *
   * @param accessToken - Kakao access token
   * @param refreshToken - Kakao refresh token
   * @param profile - Kakao user profile
   * @returns Normalized profile data
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<KakaoProfile> {
    try {
      const { id, _json } = profile;
      const kakaoAccount = _json.kakao_account || {};
      const profileData = kakaoAccount.profile || {};

      this.logger.log(`Kakao login: ${id}`);

      return {
        provider: 'kakao',
        id: String(id),
        email: kakaoAccount.email,
        name: profileData.nickname,
        profileImageUrl: profileData.profile_image_url,
        _raw: JSON.stringify(_json),
        _json,
      };
    } catch (error) {
      this.logger.error('Kakao validation error:', error);
      throw error;
    }
  }
}
