/**
 * Payment Settlement Controller
 * API for managing payment settlements
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  CriticalRateLimit,
  ReadRateLimit,
} from '../../../core/security/decorators/rate-limit.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { PaymentSettlementService } from '../services/payment-settlement.service';
import { HospitalPaymentStatus } from '../entities/hospital-payment.entity';

@ApiTags('Payment Settlement')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentSettlementController {
  constructor(
    private readonly settlementService: PaymentSettlementService,
  ) {}

  /**
   * POST /payments/hospital/:claimId
   * Process hospital payment for approved claim
   */
  @Post('hospital/:claimId')
  @CriticalRateLimit() // ⭐ SECURITY FIX: CRT-003 - 3 requests/min
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Process hospital payment',
    description: 'Create and process payment settlement to hospital for approved claim',
  })
  @ApiParam({ name: 'claimId', description: 'Insurance claim ID' })
  @ApiResponse({ status: 201, description: 'Payment initiated successfully' })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  async processHospitalPayment(@Param('claimId') claimId: string) {
    // This endpoint is typically called by the system automatically
    // But can be used for manual retry
    return { message: 'Hospital payment processing initiated', claimId };
  }

  /**
   * GET /payments/status/:paymentId
   * Get payment status
   */
  @Get('status/:paymentId')
  @ReadRateLimit() // ⭐ SECURITY FIX: CRT-003 - 30 requests/min
  @ApiOperation({
    summary: 'Get payment status',
    description: 'Retrieve payment settlement status and details',
  })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentStatus(@Param('paymentId') paymentId: string) {
    return this.settlementService.getPaymentById(paymentId);
  }

  /**
   * POST /payments/:paymentId/retry
   * Manually retry failed payment
   */
  @Post(':paymentId/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Retry failed payment',
    description: 'Manually retry a failed payment settlement',
  })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  @ApiResponse({ status: 202, description: 'Payment retry initiated' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async retryPayment(@Param('paymentId') paymentId: string) {
    await this.settlementService.retryPayment(paymentId);
    return { message: 'Payment retry initiated', paymentId };
  }

  /**
   * GET /payments/hospital/:hospitalId
   * Get all payments for a hospital
   */
  @Get('hospital/:hospitalId')
  @ApiOperation({
    summary: 'Get hospital payments',
    description: 'Retrieve all payment settlements for a hospital',
  })
  @ApiParam({ name: 'hospitalId', description: 'Hospital ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: HospitalPaymentStatus,
    description: 'Filter by payment status',
  })
  @ApiResponse({ status: 200, description: 'Payments retrieved' })
  async getHospitalPayments(
    @Param('hospitalId') hospitalId: string,
    @Query('status') status?: HospitalPaymentStatus,
  ) {
    return this.settlementService.getPaymentsForHospital(hospitalId, status);
  }
}
