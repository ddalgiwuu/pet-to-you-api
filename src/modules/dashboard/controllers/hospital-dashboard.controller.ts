import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { OrganizationGuard } from '../../../core/auth/guards/organization.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { HospitalDashboardService } from '../services/hospital-dashboard.service';
import {
  GetStatsDto,
  GetPetsDto,
  GetAppointmentsDto,
  GetRevenueDto,
  GetReviewsDto,
} from '../dto/hospital-dashboard.dto';

/**
 * 🏥 Hospital Dashboard Controller
 *
 * RESTful API endpoints for hospital dashboard functionality.
 *
 * Features:
 * - Real-time statistics and analytics
 * - Pet management with pagination
 * - Appointment scheduling and tracking
 * - Revenue analytics with time-series data
 * - Patient reviews and ratings
 *
 * Security:
 * - JWT authentication required
 * - Role-based access control (HOSPITAL_ADMIN, HOSPITAL_STAFF)
 * - Organization isolation (users can only access their hospital data)
 *
 * Performance:
 * - Redis caching (5-minute TTL)
 * - MongoDB aggregation pipelines
 * - Pagination for large datasets
 */
@ApiTags('Hospital Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard/hospital')
@UseGuards(JwtAuthGuard, RolesGuard, OrganizationGuard)
export class HospitalDashboardController {
  private readonly logger = new Logger(HospitalDashboardController.name);

  constructor(
    private readonly hospitalDashboardService: HospitalDashboardService,
  ) {}

  /**
   * 📊 Get Hospital Overview Statistics
   *
   * Returns real-time dashboard statistics including:
   * - Today's appointments count
   * - Today's revenue
   * - Active patients
   * - Completion rate
   * - Average rating
   * - Growth trends
   *
   * Caching: 5-minute TTL
   */
  @Get('stats')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get hospital overview statistics',
    description:
      'Retrieves real-time dashboard statistics including appointments, revenue, and patient metrics',
  })
  @ApiQuery({
    name: 'period',
    enum: ['today', 'week', 'month', 'year'],
    required: false,
    description: 'Time period for statistics (default: today)',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          overview: {
            todayAppointments: 25,
            todayRevenue: 1250000,
            activePets: 342,
            completionRate: 92.5,
            averageRating: 4.7,
          },
          trends: {
            appointmentsGrowth: 15.3,
            revenueGrowth: 22.1,
            newPatientsGrowth: 8.5,
          },
          upcomingAppointments: 18,
          pendingPayments: 5,
          recentReviews: 12,
        },
        meta: {
          timestamp: '2026-02-07T13:00:00Z',
          cached: true,
          cacheTTL: 300,
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getStats(
    @CurrentUser() user: any,
    @Query() query: GetStatsDto,
  ) {
    this.logger.log(
      `Hospital stats requested by user ${user.id} for hospital ${user.hospitalId}`,
    );
    return this.hospitalDashboardService.getStats(user.hospitalId, query);
  }

  /**
   * 🐾 Get Hospital Pet List
   *
   * Returns paginated list of pets with filtering and search.
   *
   * Features:
   * - Full-text search (name, owner name, registration number)
   * - Filter by species, insurance status
   * - Sort by name, created date, last visit
   * - Pagination (default 20 items per page)
   */
  @Get('pets')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get hospital pet list with pagination',
    description:
      'Returns paginated pet list with advanced filtering, search, and sorting',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: false,
    description: 'Search by pet name, owner name, or registration number',
  })
  @ApiQuery({
    name: 'species',
    enum: ['dog', 'cat', 'rabbit', 'hamster', 'bird', 'other'],
    required: false,
    description: 'Filter by species',
  })
  @ApiQuery({
    name: 'hasInsurance',
    type: Boolean,
    required: false,
    description: 'Filter pets with/without insurance',
  })
  @ApiResponse({
    status: 200,
    description: 'Pet list retrieved successfully',
  })
  async getPets(
    @CurrentUser() user: any,
    @Query() query: GetPetsDto,
  ) {
    this.logger.log(
      `Pet list requested by user ${user.id} for hospital ${user.hospitalId}`,
    );
    return this.hospitalDashboardService.getPets(user.hospitalId, query);
  }

  /**
   * 📅 Get Hospital Appointments
   *
   * Returns appointment list with filtering and status tracking.
   *
   * Features:
   * - Filter by status, type, date range
   * - Search by pet name or owner
   * - Sort by date, status, type
   * - Summary statistics by status
   */
  @Get('appointments')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get hospital appointments',
    description:
      'Returns appointment list with filtering, search, and status management',
  })
  @ApiQuery({
    name: 'status',
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    required: false,
    description: 'Filter by appointment status',
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Start date (ISO 8601 format)',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'End date (ISO 8601 format)',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointments retrieved successfully',
  })
  async getAppointments(
    @CurrentUser() user: any,
    @Query() query: GetAppointmentsDto,
  ) {
    this.logger.log(
      `Appointments requested by user ${user.id} for hospital ${user.hospitalId}`,
    );
    return this.hospitalDashboardService.getAppointments(
      user.hospitalId,
      query,
    );
  }

  /**
   * 💰 Get Revenue Analytics
   *
   * Returns revenue analytics with time-series data.
   *
   * Features:
   * - Daily/weekly/monthly/yearly aggregation
   * - Revenue breakdown by service
   * - Payment method analysis
   * - Growth trends vs previous period
   *
   * Access: Hospital Admin only
   */
  @Get('revenue')
  @Roles(UserRole.HOSPITAL_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get revenue analytics (Admin only)',
    description:
      'Returns revenue analytics with time-series data and breakdowns',
  })
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: false,
    description: 'Aggregation period (default: monthly)',
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Start date (ISO 8601 format)',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'End date (ISO 8601 format)',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue analytics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getRevenue(
    @CurrentUser() user: any,
    @Query() query: GetRevenueDto,
  ) {
    this.logger.log(
      `Revenue analytics requested by admin ${user.id} for hospital ${user.hospitalId}`,
    );
    return this.hospitalDashboardService.getRevenue(user.hospitalId, query);
  }

  /**
   * ⭐ Get Hospital Reviews
   *
   * Returns patient reviews and ratings with analytics.
   *
   * Features:
   * - Filter by rating, status
   * - Sort by date, rating
   * - Rating distribution analytics
   * - Sentiment analysis
   */
  @Get('reviews')
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get hospital reviews',
    description: 'Returns patient reviews with filtering and analytics',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'minRating',
    type: Number,
    required: false,
    description: 'Filter by minimum rating (1-5)',
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
  })
  async getReviews(
    @CurrentUser() user: any,
    @Query() query: GetReviewsDto,
  ) {
    this.logger.log(
      `Reviews requested by user ${user.id} for hospital ${user.hospitalId}`,
    );
    return this.hospitalDashboardService.getReviews(user.hospitalId, query);
  }
}
