/**
 * Hospital Dashboard Controller
 * API endpoints for hospital staff operations
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  SensitiveRateLimit,
  StandardRateLimit,
  ReadRateLimit,
  CriticalRateLimit,
} from '../../../core/security/decorators/rate-limit.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { HospitalUserGuard, RequireHospitalRole } from '../guards/hospital-user.guard';
import { HospitalDashboardService } from '../services/hospital-dashboard.service';
import { HospitalUserRole } from '../entities/hospital-user.entity';
import {
  HospitalCreateMedicalRecordDto,
  HospitalUpdateMedicalRecordDto,
} from '../dto/create-medical-record.dto';

/**
 * 🏥 Hospital Dashboard Controller
 *
 * Endpoints for hospital staff:
 * - View completed bookings
 * - Create/update medical records
 * - Track claims and payments
 * - Upload documents
 *
 * Authentication:
 * - JWT authentication required
 * - Hospital staff verification
 * - Role-based access control
 */
@ApiTags('Hospital Dashboard')
@ApiBearerAuth()
@Controller('hospitals/:hospitalId/dashboard')
@UseGuards(JwtAuthGuard, HospitalUserGuard)
export class HospitalDashboardController {
  constructor(
    private readonly dashboardService: HospitalDashboardService,
  ) {}

  // ============================================================
  // Booking Management (3 endpoints)
  // ============================================================

  @Get('bookings')
  @ApiOperation({
    summary: 'Get completed bookings without medical records',
    description: 'Fetch list of completed bookings that need medical record creation',
  })
  @ApiParam({ name: 'hospitalId', description: 'Hospital ID' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  async getCompletedBookings(@Param('hospitalId') hospitalId: string) {
    return this.dashboardService.getCompletedBookings(hospitalId);
  }

  @Patch('bookings/:bookingId/complete')
  @ApiOperation({
    summary: 'Mark booking as completed',
    description: 'Update booking status to completed after treatment',
  })
  @ApiParam({ name: 'hospitalId', description: 'Hospital ID' })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking marked as completed' })
  async completeBooking(
    @Param('hospitalId') hospitalId: string,
    @Param('bookingId') bookingId: string,
    @Request() req: any,
  ) {
    // TODO: Implement booking completion logic
    return { message: 'Booking completed', bookingId };
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description: 'Fetch statistics for hospital dashboard (today\'s bookings, pending records, revenue)',
  })
  @ApiParam({ name: 'hospitalId', description: 'Hospital ID' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(@Param('hospitalId') hospitalId: string) {
    return this.dashboardService.getStatistics(hospitalId);
  }

  // ============================================================
  // Medical Records (4 endpoints)
  // ============================================================

  @Post('medical-records')
  @UseGuards(RequireHospitalRole(HospitalUserRole.STAFF, HospitalUserRole.ADMIN, HospitalUserRole.OWNER))
  @SensitiveRateLimit() // ⭐ SECURITY FIX: CRT-003 - 5 requests/min
  @ApiOperation({
    summary: 'Create medical record',
    description: 'Create medical record from hospital dashboard with cost and documents',
  })
  @ApiParam({ name: 'hospitalId', description: 'Hospital ID' })
  @ApiResponse({ status: 201, description: 'Medical record created successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @HttpCode(HttpStatus.CREATED)
  async createMedicalRecord(
    @Param('hospitalId') hospitalId: string,
    @Body() createDto: HospitalCreateMedicalRecordDto,
    @Request() req: any,
  ) {
    return this.dashboardService.createMedicalRecord(
      hospitalId,
      req.hospitalUser.id,
      createDto,
    );
  }

  @Put('medical-records/:recordId')
  @UseGuards(RequireHospitalRole(HospitalUserRole.STAFF, HospitalUserRole.ADMIN, HospitalUserRole.OWNER))
  @ApiOperation({
    summary: 'Update medical record',
    description: 'Update medical record (restricted if claim submitted)',
  })
  @ApiParam({ name: 'hospitalId', description: 'Hospital ID' })
  @ApiParam({ name: 'recordId', description: 'Medical record ID' })
  @ApiResponse({ status: 200, description: 'Medical record updated successfully' })
  async updateMedicalRecord(
    @Param('hospitalId') hospitalId: string,
    @Param('recordId') recordId: string,
    @Body() updateDto: HospitalUpdateMedicalRecordDto,
    @Request() req: any,
  ) {
    return this.dashboardService.updateMedicalRecord(
      hospitalId,
      req.hospitalUser.id,
      recordId,
      updateDto,
    );
  }

  @Get('medical-records')
  @ApiOperation({
    summary: 'Get medical records for hospital',
    description: 'Fetch medical records created by this hospital',
  })
  @ApiParam({ name: 'hospitalId', description: 'Hospital ID' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'completed', 'billed', 'settled'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Medical records retrieved successfully' })
  async getMedicalRecords(
    @Param('hospitalId') hospitalId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    return this.dashboardService.getMedicalRecords(hospitalId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('medical-records/:recordId')
  @ApiOperation({
    summary: 'Get medical record by ID',
    description: 'Fetch single medical record details',
  })
  @ApiParam({ name: 'hospitalId', description: 'Hospital ID' })
  @ApiParam({ name: 'recordId', description: 'Medical record ID' })
  @ApiResponse({ status: 200, description: 'Medical record retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Medical record not found' })
  async getMedicalRecordById(
    @Param('hospitalId') hospitalId: string,
    @Param('recordId') recordId: string,
  ) {
    // TODO: Implement single record fetch with hospital verification
    return { message: 'Get medical record details', recordId };
  }

  // ============================================================
  // Claims & Payments (5 endpoints)
  // ============================================================

  @Get('claims')
  @ApiOperation({
    summary: 'Get claims for hospital',
    description: 'Fetch insurance claims related to this hospital',
  })
  @ApiParam({ name: 'hospitalId', description: 'Hospital ID' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'submitted', 'reviewing', 'approved', 'rejected', 'paid'] })
  @ApiResponse({ status: 200, description: 'Claims retrieved successfully' })
  async getClaims(
    @Param('hospitalId') hospitalId: string,
    @Query('status') status?: string,
  ) {
    return this.dashboardService.getClaims(hospitalId, status);
  }

  @Get('claims/:claimId')
  @ApiOperation({
    summary: 'Get claim details',
    description: 'Fetch single claim details (read-only for hospitals)',
  })
  @ApiParam({ name: 'hospitalId', description: 'Hospital ID' })
  @ApiParam({ name: 'claimId', description: 'Claim ID' })
  @ApiResponse({ status: 200, description: 'Claim retrieved successfully' })
  async getClaimById(
    @Param('hospitalId') hospitalId: string,
    @Param('claimId') claimId: string,
  ) {
    // TODO: Implement claim fetch with hospital verification
    return { message: 'Get claim details', claimId };
  }

  @Get('payments')
  @ReadRateLimit() // ⭐ SECURITY FIX: CRT-003 - 30 requests/min
  @ApiOperation({
    summary: 'Get payment settlements for hospital',
    description: 'Fetch payment settlements from insurance companies',
  })
  @ApiParam({ name: 'hospitalId', description: 'Hospital ID' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'processing', 'completed', 'failed'] })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async getPayments(
    @Param('hospitalId') hospitalId: string,
    @Query('status') status?: string,
  ) {
    return this.dashboardService.getPayments(hospitalId, status);
  }

  @Get('payments/:paymentId')
  @ApiOperation({
    summary: 'Get payment details',
    description: 'Fetch single payment settlement details',
  })
  @ApiParam({ name: 'hospitalId', description: 'Hospital ID' })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  async getPaymentById(
    @Param('hospitalId') hospitalId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.dashboardService.getPaymentById(hospitalId, paymentId);
  }

  @Post('documents/upload')
  @UseGuards(RequireHospitalRole(HospitalUserRole.STAFF, HospitalUserRole.ADMIN, HospitalUserRole.OWNER))
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload medical documents',
    description: 'Upload receipts, diagnoses, X-rays, etc. to S3',
  })
  @ApiParam({ name: 'hospitalId', description: 'Hospital ID' })
  @ApiResponse({ status: 201, description: 'Documents uploaded successfully' })
  @HttpCode(HttpStatus.CREATED)
  async uploadDocuments(
    @Param('hospitalId') hospitalId: string,
    @UploadedFiles() files: any[],
    @Request() req: any,
  ) {
    // TODO: Implement S3 upload logic
    const uploadedDocs = files.map((file) => ({
      id: `doc-${Date.now()}-${Math.random()}`,
      type: 'photo',
      name: file.originalname,
      uri: `https://s3.amazonaws.com/pet-to-you/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.hospitalUser.id,
    }));

    return { documents: uploadedDocs };
  }
}
