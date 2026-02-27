import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BookingsService } from '../services/bookings.service';
import { SlotCalculatorService } from '../services/slot-calculator.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { UpdateBookingDto } from '../dto/update-booking.dto';
import { GetAvailableSlotsDto, AvailableSlotDto } from '../dto/get-available-slots.dto';
import { BookingFilterDto } from '../dto/booking-filter.dto';
import { RejectBookingDto } from '../dto/reject-booking.dto';
import { Booking } from '../entities/booking.entity';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/user.entity';

/**
 * Booking Management Controller
 *
 * Endpoints:
 * - POST   /bookings                    - Create new booking (user)
 * - GET    /bookings                    - List user's bookings with filters
 * - GET    /bookings/:id                - Get booking details
 * - PATCH  /bookings/:id/cancel         - Cancel booking
 * - GET    /bookings/slots/available    - Get available time slots
 * - PATCH  /bookings/:id/confirm        - Confirm booking (hospital staff only)
 * - PATCH  /bookings/:id/reject         - Reject booking (hospital staff only)
 */
@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly slotCalculatorService: SlotCalculatorService,
  ) {}

  /**
   * Create new booking with distributed locking
   *
   * @access Authenticated user
   * @features - Distributed locking to prevent double-booking
   *           - Slot availability validation
   *           - Operating hours validation
   *           - Automatic booking number generation
   *           - Audit logging
   *
   * @example
   * POST /bookings
   * {
   *   "petId": "550e8400-e29b-41d4-a716-446655440000",
   *   "resourceType": "hospital",
   *   "resourceId": "660e8400-e29b-41d4-a716-446655440000",
   *   "type": "consultation",
   *   "startDateTime": "2024-01-20T14:00:00.000Z",
   *   "durationMinutes": 30,
   *   "notes": "강아지가 최근 식욕이 없어요",
   *   "services": ["일반진료", "예방접종"],
   *   "estimatedPrice": 50000
   * }
   */
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '예약 생성' })
  @ApiResponse({
    status: 201,
    description: 'Booking created successfully',
    type: Booking,
  })
  @ApiResponse({ status: 400, description: 'Invalid booking time or operating hours' })
  @ApiResponse({ status: 404, description: 'Hospital or pet not found' })
  @ApiResponse({ status: 409, description: 'Time slot already booked or currently being booked' })
  async create(@Body() createDto: CreateBookingDto, @CurrentUser() user: any): Promise<Booking> {
    return this.bookingsService.create(createDto, user.id);
  }

  /**
   * Get user's bookings with filters and pagination
   *
   * @access Authenticated user
   * @features - Filtering by status, type, payment status, hospital, pet, date range
   *           - Pagination support
   *           - Relations (hospital, pet) included
   *
   * @example
   * GET /bookings?status=confirmed&page=1&limit=20
   * GET /bookings?startDate=2024-01-01&endDate=2024-01-31&hospitalId=...
   */
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '예약 목록 조회 (필터 및 페이지네이션)' })
  @ApiResponse({
    status: 200,
    description: 'Bookings list with pagination',
    schema: {
      properties: {
        bookings: { type: 'array', items: { $ref: '#/components/schemas/Booking' } },
        total: { type: 'number', example: 42 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
        totalPages: { type: 'number', example: 3 },
      },
    },
  })
  async findAll(
    @Query() filters: BookingFilterDto,
    @CurrentUser() user: any,
  ): Promise<{
    bookings: Booking[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.bookingsService.findAll(user.id, filters);
  }

  /**
   * Get available time slots for a hospital on a specific date
   *
   * @access Public
   * @features - Redis caching (5-minute TTL)
   *           - Operating hours validation
   *           - Break time handling
   *           - Korean holiday detection
   *           - Buffer time between bookings
   *
   * @example
   * GET /bookings/slots/available?hospitalId=660e8400...&date=2024-01-20&durationMinutes=30
   */
  @Get('slots/available')
  @ApiOperation({ summary: '병원 예약 가능 시간대 조회' })
  @ApiQuery({ name: 'hospitalId', type: String, description: '병원 ID' })
  @ApiQuery({ name: 'date', type: String, description: '조회 날짜 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'durationMinutes', type: Number, required: false, description: '예약 시간 (분)' })
  @ApiResponse({
    status: 200,
    description: 'Available time slots',
    type: [AvailableSlotDto],
  })
  async getAvailableSlots(@Query() dto: GetAvailableSlotsDto): Promise<AvailableSlotDto[]> {
    return this.slotCalculatorService.getAvailableSlots(
      dto.hospitalId,
      dto.date,
      dto.durationMinutes || 30,
    );
  }

  /**
   * Get booking details
   *
   * @access Authenticated user (owner only)
   * @features - Relations (hospital, pet) included
   *
   * @example
   * GET /bookings/550e8400-e29b-41d4-a716-446655440000
   */
  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '예약 상세 조회' })
  @ApiResponse({
    status: 200,
    description: 'Booking details',
    type: Booking,
  })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any): Promise<Booking> {
    return this.bookingsService.findOne(id, user.id);
  }

  /**
   * Cancel booking with automatic refund calculation
   *
   * @access Authenticated user (owner only)
   * @features - Cancellation time validation (2 hours before)
   *           - Automatic refund calculation (100%/50%/0%)
   *           - Slot cache invalidation
   *           - Audit logging
   *
   * @example
   * PATCH /bookings/550e8400-e29b-41d4-a716-446655440000/cancel
   * { "reason": "일정이 변경되어 취소합니다" }
   */
  @Patch(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '예약 취소' })
  @ApiResponse({
    status: 200,
    description: 'Booking cancelled successfully',
    type: Booking,
  })
  @ApiResponse({ status: 400, description: 'Booking cannot be cancelled (too late or already completed)' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ): Promise<Booking> {
    return this.bookingsService.cancel(id, user.id, reason);
  }

  /**
   * Confirm booking (hospital staff only)
   *
   * @access Hospital staff only (HOSPITAL_ADMIN, HOSPITAL_STAFF)
   * @features - Status transition: pending → confirmed
   *           - Confirmation notification to user
   *           - Audit logging
   *
   * @example
   * PATCH /bookings/550e8400-e29b-41d4-a716-446655440000/confirm
   */
  @Patch(':id/confirm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_STAFF)
  @ApiOperation({ summary: '예약 확정 (병원 스태프 전용)' })
  @ApiResponse({
    status: 200,
    description: 'Booking confirmed successfully',
    type: Booking,
  })
  @ApiResponse({ status: 400, description: 'Only pending bookings can be confirmed' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async confirm(@Param('id') id: string, @CurrentUser() user: any): Promise<Booking> {
    return this.bookingsService.confirm(id, user.id);
  }

  /**
   * Reject booking (hospital staff only)
   */
  @Patch(':id/reject')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_STAFF)
  @ApiOperation({ summary: '예약 거절 (병원 스태프 전용)' })
  @ApiResponse({ status: 200, description: 'Booking rejected successfully', type: Booking })
  @ApiResponse({ status: 400, description: 'Only pending bookings can be rejected' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectBookingDto,
    @CurrentUser() user: any,
  ): Promise<Booking> {
    return this.bookingsService.reject(id, user.id, dto.reason);
  }
}
