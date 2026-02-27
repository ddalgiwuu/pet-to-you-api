import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { User } from '../../modules/users/entities/user.entity';
import { EncryptionModule } from '../encryption/encryption.module';
import { CacheModule } from '../cache/cache.module';
import { AuditModule } from '../audit/audit.module';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { KakaoStrategy } from './strategies/kakao.strategy';
import { NaverStrategy } from './strategies/naver.strategy';
import { AppleStrategy } from './strategies/apple.strategy';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';

// Services & Controllers
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';

@Module({
  imports: [
    // Core modules
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const fs = require('fs');
        const path = require('path');
        const privateKey = fs.readFileSync(path.join(process.cwd(), 'keys', 'jwt.key'), 'utf8');
        return {
          privateKey,
          publicKey: fs.readFileSync(path.join(process.cwd(), 'keys', 'jwt.key.pub'), 'utf8'),
          signOptions: {
            algorithm: 'RS256' as const,
            expiresIn: '15m',
          },
        };
      },
    }),

    // Database
    TypeOrmModule.forFeature([User]),

    // Rate limiting (configured in main.ts but module needed for @Throttle)
    ThrottlerModule,

    // Internal modules
    EncryptionModule,
    CacheModule,
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [
    // Service
    AuthService,

    // JWT Strategies
    JwtStrategy,
    JwtRefreshStrategy,

    // OAuth2 Strategies
    KakaoStrategy,
    NaverStrategy,
    AppleStrategy,

    // Guards (exported for use in other modules)
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
  exports: [
    // Export for use in other modules
    JwtModule,
    PassportModule,
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
})
export class AuthModule {}
