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
import { BusinessDashboardService } from '../services/business-dashboard.service';
import {
  GetBusinessStatsDto,
  GetServicesDto,
  GetBusinessBookingsDto,
  GetCustomersDto,
  GetBusinessRevenueDto,
} from '../dto/business-dashboard.dto';

/**
 * 🏢 Business Dashboard Controller
 *
 * RESTful API endpoints for business dashboard functionality.
 * Supports daycare, shelter, grooming salon, and other pet service businesses.
 *
 * Features:
 * - Real-time business statistics and analytics
 * - Service offerings management
 * - Booking schedule with capacity tracking
 * - Customer relationship management
 * - Revenue analytics and payment tracking
 *
 * Security:
 * - JWT authentication required
 * - Role-based access control (DAYCARE_ADMIN, SHELTER_ADMIN, PLATFORM_ADMIN)
 * - Organization isolation (users can only access their business data)
 *
 * Performance:
 * - Redis caching (5-minute TTL)
 * - Efficient TypeORM queries
 * - Pagination for large datasets
 */
@ApiTags('Business Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard/business')
@UseGuards(JwtAuthGuard, RolesGuard, OrganizationGuard)
export class BusinessDashboardController {
  private readonly logger = new Logger(BusinessDashboardController.name);

  constructor(
    private readonly businessDashboardService: BusinessDashboardService,
  ) {}

  /**
   * 📊 Get Business Overview Statistics
   *
   * Returns real-time business dashboard statistics including:
   * - Active bookings count
   * - Today's revenue
   * - Total customers
   * - Occupancy rate (for daycare/boarding)
   * - Average rating
   * - Growth trends
   *
   * Caching: 5-minute TTL
   */
  @Get('stats')
  @Roles(UserRole.DAYCARE_ADMIN, UserRole.SHELTER_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get business overview statistics',
    description:
      'Retrieves real-time dashboard statistics including bookings, revenue, and capacity metrics',
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
            activeBookings: 15,
            todayRevenue: 850000,
            totalCustomers: 142,
            occupancyRate: 75.5,
            averageRating: 4.6,
          },
          trends: {
            bookingsGrowth: 12.8,
            revenueGrowth: 18.3,
            customerGrowth: 6.2,
          },
          capacity: {
            total: 20,
            occupied: 15,
            available: 5,
          },
          upcomingBookings: 8,
          pendingPayments: 3,
        },
        meta: {
          timestamp: '2026-02-07T14:00:00Z',
          businessType: 'daycare',
          cached: true,
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
    @Query() query: GetBusinessStatsDto,
  ) {
    this.logger.log(
      `Business stats requested by user ${user.id} for business ${user.businessId}`,
    );
    return this.businessDashboardService.getStats(user.businessId, query);
  }

  /**
   * 🛠️ Get Service Offerings
   *
   * Returns business service offerings with pricing and availability.
   *
   * Features:
   * - Filter by category (daycare, grooming, training, boarding)
   * - Filter by status (active, inactive, seasonal)
   * - Sort by name, creation date, booking count
   * - Capacity and availability tracking
   */
  @Get('services')
  @Roles(UserRole.DAYCARE_ADMIN, UserRole.SHELTER_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get service offerings',
    description:
      'Returns service list with pricing, availability, and performance metrics',
  })
  @ApiQuery({
    name: 'category',
    enum: ['daycare', 'grooming', 'training', 'boarding'],
    required: false,
    description: 'Filter by service category',
  })
  @ApiQuery({
    name: 'status',
    enum: ['active', 'inactive', 'seasonal'],
    required: false,
    description: 'Filter by service status',
  })
  @ApiResponse({
    status: 200,
    description: 'Services retrieved successfully',
  })
  async getServices(
    @CurrentUser() user: any,
    @Query() query: GetServicesDto,
  ) {
    this.logger.log(
      `Services requested by user ${user.id} for business ${user.businessId}`,
    );
    return this.businessDashboardService.getServices(user.businessId, query);
  }

  /**
   * 📅 Get Service Bookings
   *
   * Returns booking list with schedule and calendar view.
   *
   * Features:
   * - Filter by status, date range, service
   * - Calendar view with occupancy rates
   * - Customer and pet information
   * - Check-in/check-out tracking
   */
  @Get('bookings')
  @Roles(UserRole.DAYCARE_ADMIN, UserRole.SHELTER_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get service bookings',
    description:
      'Returns booking list with filtering, calendar view, and occupancy tracking',
  })
  @ApiQuery({
    name: 'status',
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    required: false,
    description: 'Filter by booking status',
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
    description: 'Bookings retrieved successfully',
  })
  async getBookings(
    @CurrentUser() user: any,
    @Query() query: GetBusinessBookingsDto,
  ) {
    this.logger.log(
      `Bookings requested by user ${user.id} for business ${user.businessId}`,
    );
    return this.businessDashboardService.getBookings(user.businessId, query);
  }

  /**
   * 👥 Get Customer List
   *
   * Returns customer list with pet information and history.
   *
   * Features:
   * - Search by customer or pet name
   * - Filter by active bookings
   * - Sort by name, last visit, total spent
   * - Booking history and financials
   */
  @Get('customers')
  @Roles(UserRole.DAYCARE_ADMIN, UserRole.SHELTER_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get customer list',
    description:
      'Returns customer list with pet profiles, booking history, and financial metrics',
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: false,
    description: 'Search by customer or pet name',
  })
  @ApiQuery({
    name: 'hasActiveBookings',
    type: Boolean,
    required: false,
    description: 'Filter customers with active bookings',
  })
  @ApiResponse({
    status: 200,
    description: 'Customers retrieved successfully',
  })
  async getCustomers(
    @CurrentUser() user: any,
    @Query() query: GetCustomersDto,
  ) {
    this.logger.log(
      `Customers requested by user ${user.id} for business ${user.businessId}`,
    );
    return this.businessDashboardService.getCustomers(user.businessId, query);
  }

  /**
   * 💰 Get Revenue Analytics
   *
   * Returns revenue analytics with payment tracking.
   *
   * Features:
   * - Daily/weekly/monthly aggregation
   * - Revenue breakdown by service
   * - Payment method analysis
   * - Pending payments tracking
   */
  @Get('revenue')
  @Roles(UserRole.DAYCARE_ADMIN, UserRole.SHELTER_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get revenue analytics',
    description:
      'Returns revenue analytics with time-series data and payment tracking',
  })
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly'],
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
  async getRevenue(
    @CurrentUser() user: any,
    @Query() query: GetBusinessRevenueDto,
  ) {
    this.logger.log(
      `Revenue analytics requested by user ${user.id} for business ${user.businessId}`,
    );
    return this.businessDashboardService.getRevenue(user.businessId, query);
  }
}
