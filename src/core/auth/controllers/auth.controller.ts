import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../../../modules/users/entities/user.entity';
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

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  // ============================================================
  // Email/Password Authentication
  // ============================================================

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    return this.authService.register(registerDto, ipAddress, userAgent);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 requests per 15 minutes
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: TokenPair,
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<TokenPair> {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    return this.authService.refresh(refreshTokenDto, ipAddress, userAgent);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @CurrentUser() user: User,
    @Req() req: Request,
  ): Promise<void> {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Extract JTI from request (set by JWT strategy)
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    const decoded: any = token ? JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()) : {};
    const jti = decoded.jti || '';

    await this.authService.logout(user, jti, ipAddress, userAgent);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile', type: User })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser() user: User): User {
    return user;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 204, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid current password' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<void> {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    await this.authService.changePassword(
      user,
      changePasswordDto,
      ipAddress,
      userAgent,
    );
  }

  // ============================================================
  // OAuth2 - Kakao Login
  // ============================================================

  @Public()
  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: 'Kakao OAuth login - Redirect to Kakao' })
  @ApiResponse({ status: 302, description: 'Redirect to Kakao login page' })
  kakaoLogin() {
    // Passport will handle the redirect to Kakao
  }

  @Public()
  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: 'Kakao OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend with tokens' })
  async kakaoCallback(
    @Req() req: Request & { user: KakaoProfile },
    @Res() res: Response,
  ) {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      const result = await this.authService.kakaoLogin(
        req.user,
        ipAddress,
        userAgent,
      );

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${result.tokens.accessToken}&refreshToken=${result.tokens.refreshToken}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('Kakao callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/error?message=kakao_login_failed`);
    }
  }

  // ============================================================
  // OAuth2 - Naver Login
  // ============================================================

  @Public()
  @Get('naver')
  @UseGuards(AuthGuard('naver'))
  @ApiOperation({ summary: 'Naver OAuth login - Redirect to Naver' })
  @ApiResponse({ status: 302, description: 'Redirect to Naver login page' })
  naverLogin() {
    // Passport will handle the redirect to Naver
  }

  @Public()
  @Get('naver/callback')
  @UseGuards(AuthGuard('naver'))
  @ApiOperation({ summary: 'Naver OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend with tokens' })
  async naverCallback(
    @Req() req: Request & { user: NaverProfile },
    @Res() res: Response,
  ) {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      const result = await this.authService.naverLogin(
        req.user,
        ipAddress,
        userAgent,
      );

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${result.tokens.accessToken}&refreshToken=${result.tokens.refreshToken}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('Naver callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/error?message=naver_login_failed`);
    }
  }

  // ============================================================
  // OAuth2 - Apple Sign In
  // ============================================================

  @Public()
  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple Sign In - Redirect to Apple' })
  @ApiResponse({ status: 302, description: 'Redirect to Apple sign in page' })
  appleLogin() {
    // Passport will handle the redirect to Apple
  }

  @Public()
  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple Sign In callback' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend with tokens' })
  async appleCallback(
    @Req() req: Request & { user: AppleProfile },
    @Res() res: Response,
  ) {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      const result = await this.authService.appleLogin(
        req.user,
        ipAddress,
        userAgent,
      );

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${result.tokens.accessToken}&refreshToken=${result.tokens.refreshToken}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('Apple callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/error?message=apple_login_failed`);
    }
  }
}
