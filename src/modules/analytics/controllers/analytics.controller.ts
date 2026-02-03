import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AnalyticsService } from '../services/analytics.service';
import {
  TrackEventDto,
  AnalyticsQueryDto,
  HospitalDashboardResponseDto,
  PlatformDashboardResponseDto,
} from '../dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ============================================
  // EVENT TRACKING
  // ============================================

  @Post('events')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Track user event (real-time)' })
  @ApiResponse({ status: 204, description: 'Event tracked successfully' })
  async trackEvent(@Body() dto: TrackEventDto): Promise<void> {
    await this.analyticsService.trackEvent(dto);
  }

  // ============================================
  // HOSPITAL DASHBOARD
  // ============================================

  @Get('hospital/:hospitalId/dashboard')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(900) // 15 minutes cache
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_STAFF, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Get hospital dashboard analytics' })
  @ApiParam({ name: 'hospitalId', description: 'Hospital ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Hospital dashboard data',
    type: HospitalDashboardResponseDto 
  })
  async getHospitalDashboard(
    @Param('hospitalId') hospitalId: string,
    @Query() query: AnalyticsQueryDto,
  ): Promise<HospitalDashboardResponseDto> {
    return this.analyticsService.getHospitalDashboard(hospitalId, query);
  }

  // ============================================
  // PLATFORM ADMIN DASHBOARD
  // ============================================

  @Get('platform/overview')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(900) // 15 minutes cache
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Get platform overview dashboard' })
  @ApiResponse({ 
    status: 200, 
    description: 'Platform overview data',
    type: PlatformDashboardResponseDto 
  })
  async getPlatformOverview(
    @Query() query: AnalyticsQueryDto,
  ): Promise<PlatformDashboardResponseDto> {
    return this.analyticsService.getPlatformOverview(query);
  }

  @Get('platform/revenue')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(900)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Get platform revenue analytics' })
  @ApiResponse({ status: 200, description: 'Platform revenue data' })
  async getPlatformRevenue(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getPlatformRevenue(query);
  }

  @Get('platform/users')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(900)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Get platform user analytics' })
  @ApiResponse({ status: 200, description: 'Platform user metrics' })
  async getPlatformUsers(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getPlatformUsers(query);
  }

  @Get('platform/conversion')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(900)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Get conversion funnel analytics' })
  @ApiResponse({ status: 200, description: 'Conversion funnel data' })
  async getConversionFunnel(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getConversionFunnel(query);
  }
}
