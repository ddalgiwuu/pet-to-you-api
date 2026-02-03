import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DaycareService } from '../services/daycare.service';
import { CreateDaycareDto } from '../dto/create-daycare.dto';
import { SearchDaycareDto } from '../dto/search-daycare.dto';
import {
  CreateReservationDto,
  UpdateReservationDto,
  CancelReservationDto,
  CheckInDto,
  CheckOutDto,
  AddActivityDto,
  AddReviewDto,
} from '../dto/create-reservation.dto';

@ApiTags('Daycare')
@Controller('daycare')
export class DaycareController {
  constructor(private readonly daycareService: DaycareService) {}

  // ============================================================
  // Daycare Center Management
  // ============================================================

  @Post('centers')
  @ApiOperation({ summary: 'Create new daycare center' })
  @ApiResponse({ status: 201, description: 'Daycare center created successfully' })
  @ApiResponse({ status: 409, description: 'Business registration number already exists' })
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  async createCenter(
    @Body() createDto: CreateDaycareDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'system'; // Replace with actual user from JWT
    return this.daycareService.createCenter(createDto, userId);
  }

  @Get('centers/search')
  @ApiOperation({ summary: 'Search daycare centers with geospatial filtering' })
  @ApiResponse({ status: 200, description: 'Search results returned successfully' })
  @HttpCode(HttpStatus.OK)
  async search(@Query() searchDto: SearchDaycareDto) {
    return this.daycareService.search(searchDto);
  }

  @Get('centers/nearby')
  @ApiOperation({ summary: 'Find nearby daycare centers' })
  @ApiQuery({ name: 'latitude', required: true, type: Number })
  @ApiQuery({ name: 'longitude', required: true, type: Number })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Nearby centers returned successfully' })
  @HttpCode(HttpStatus.OK)
  async findNearby(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radiusKm') radiusKm?: number,
    @Query('limit') limit?: number,
  ) {
    return this.daycareService.findNearby(
      Number(latitude),
      Number(longitude),
      radiusKm ? Number(radiusKm) : 5,
      limit ? Number(limit) : 20,
    );
  }

  @Get('centers/:id')
  @ApiOperation({ summary: 'Get daycare center by ID' })
  @ApiParam({ name: 'id', description: 'Daycare center ID' })
  @ApiResponse({ status: 200, description: 'Daycare center found' })
  @ApiResponse({ status: 404, description: 'Daycare center not found' })
  async findOne(@Param('id') id: string) {
    return this.daycareService.findOne(id);
  }

  @Post('centers/:id/verify')
  @ApiOperation({ summary: 'Verify daycare center (OCR or Government API)' })
  @ApiParam({ name: 'id', description: 'Daycare center ID' })
  @ApiResponse({ status: 200, description: 'Daycare center verified successfully' })
  @ApiResponse({ status: 404, description: 'Daycare center not found' })
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin', 'verifier')
  // @ApiBearerAuth()
  async verifyCenter(
    @Param('id') id: string,
    @Body()
    body: {
      verificationType: 'ocr' | 'government';
      metadata?: any;
    },
  ) {
    return this.daycareService.verifyCenter(
      id,
      body.verificationType,
      body.metadata,
    );
  }

  // ============================================================
  // Reservation Management
  // ============================================================

  @Post('reservations')
  @ApiOperation({ summary: 'Create new daycare reservation' })
  @ApiResponse({ status: 201, description: 'Reservation created successfully' })
  @ApiResponse({ status: 400, description: 'Daycare center is fully booked' })
  @ApiResponse({ status: 404, description: 'Daycare center not found' })
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  async createReservation(
    @Body() createDto: CreateReservationDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'system'; // Replace with actual user from JWT
    return this.daycareService.createReservation(createDto, userId);
  }

  @Put('reservations/:id')
  @ApiOperation({ summary: 'Update reservation' })
  @ApiParam({ name: 'id', description: 'Reservation ID' })
  @ApiResponse({ status: 200, description: 'Reservation updated successfully' })
  @ApiResponse({ status: 400, description: 'Reservation cannot be modified' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  async updateReservation(
    @Param('id') id: string,
    @Body() updateDto: UpdateReservationDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'system';
    return this.daycareService.updateReservation(id, updateDto, userId);
  }

  @Post('reservations/:id/cancel')
  @ApiOperation({ summary: 'Cancel reservation' })
  @ApiParam({ name: 'id', description: 'Reservation ID' })
  @ApiResponse({ status: 200, description: 'Reservation cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Reservation cannot be cancelled' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  @HttpCode(HttpStatus.OK)
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  async cancelReservation(
    @Param('id') id: string,
    @Body() cancelDto: CancelReservationDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'system';
    return this.daycareService.cancelReservation(id, cancelDto, userId);
  }

  @Post('reservations/:id/check-in')
  @ApiOperation({ summary: 'Check-in to daycare' })
  @ApiParam({ name: 'id', description: 'Reservation ID' })
  @ApiResponse({ status: 200, description: 'Checked in successfully' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  @HttpCode(HttpStatus.OK)
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  async checkIn(
    @Param('id') id: string,
    @Body() checkInDto: CheckInDto,
  ) {
    return this.daycareService.checkIn(id, checkInDto);
  }

  @Post('reservations/:id/check-out')
  @ApiOperation({ summary: 'Check-out from daycare' })
  @ApiParam({ name: 'id', description: 'Reservation ID' })
  @ApiResponse({ status: 200, description: 'Checked out successfully' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  @HttpCode(HttpStatus.OK)
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  async checkOut(
    @Param('id') id: string,
    @Body() checkOutDto: CheckOutDto,
  ) {
    return this.daycareService.checkOut(id, checkOutDto);
  }

  @Post('reservations/:id/activities')
  @ApiOperation({ summary: 'Add activity to daily report' })
  @ApiParam({ name: 'id', description: 'Reservation ID' })
  @ApiResponse({ status: 201, description: 'Activity added successfully' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  async addActivity(
    @Param('id') id: string,
    @Body() activityDto: AddActivityDto,
  ) {
    return this.daycareService.addActivity(id, activityDto);
  }

  @Post('reservations/:id/review')
  @ApiOperation({ summary: 'Add review for completed reservation' })
  @ApiParam({ name: 'id', description: 'Reservation ID' })
  @ApiResponse({ status: 201, description: 'Review added successfully' })
  @ApiResponse({ status: 400, description: 'Can only review completed reservations' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  async addReview(
    @Param('id') id: string,
    @Body() reviewDto: AddReviewDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || 'system';
    return this.daycareService.addReview(id, reviewDto, userId);
  }
}
