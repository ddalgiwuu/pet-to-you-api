declare module 'passport-naver-v2' {
  import { Strategy as PassportStrategy } from 'passport';

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
  }

  export interface Profile {
    id: string;
    provider: string;
    _raw: string;
    _json: {
      resultcode: string;
      message: string;
      response: {
        id: string;
        email?: string;
        name?: string;
        nickname?: string;
        profile_image?: string;
        mobile?: string;
        mobile_e164?: string;
      };
    };
  }

  export type VerifyCallback = (
    err?: Error | null,
    user?: any,
    info?: any,
  ) => void;

  export type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) => void;

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: VerifyFunction);
    name: string;
    authenticate(req: any, options?: any): void;
  }
}
