import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  TossPaymentRequest,
  TossPaymentResponse,
  TossPaymentConfirmRequest,
  TossPaymentCancelRequest,
  TossCancelResponse,
  TossErrorResponse,
  TossPaymentStatusResponse,
  TossWebhookPayload,
} from '../interfaces/toss-payments.interface';

/**
 * Toss Payments Service
 *
 * Handles all interactions with Toss Payments REST API v1
 * - Payment requests (generate checkout URL)
 * - Payment confirmations (webhook handling)
 * - Payment cancellations
 * - Payment status checks
 * - Refund processing
 */
@Injectable()
export class TossPaymentsService {
  private readonly logger = new Logger(TossPaymentsService.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly clientKey: string;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('TOSS_PAYMENTS_BASE_URL', 'https://api.tosspayments.com');
    this.secretKey = this.configService.get<string>('TOSS_PAYMENTS_SECRET_KEY') ?? '';
    this.clientKey = this.configService.get<string>('TOSS_PAYMENTS_CLIENT_KEY') ?? '';
    this.webhookSecret = this.configService.get<string>('TOSS_PAYMENTS_WEBHOOK_SECRET') ?? '';

    if (!this.secretKey || !this.clientKey) {
      this.logger.error('Toss Payments credentials not configured');
    }
  }

  /**
   * Request Payment (Generate Payment URL)
   *
   * Creates a payment request and returns checkout URL for user to complete payment
   */
  async requestPayment(request: TossPaymentRequest): Promise<TossPaymentResponse> {
    try {
      this.logger.log(`Requesting payment for order: ${request.orderId}`);

      const response = await fetch(`${this.baseUrl}/v1/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.getBasicAuthHeader()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        this.handleTossError(data as TossErrorResponse);
      }

      this.logger.log(`Payment requested successfully: ${data.paymentKey}`);
      return data as TossPaymentResponse;
    } catch (error) {
      this.logger.error(`Failed to request payment: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to request payment');
    }
  }

  /**
   * Confirm Payment
   *
   * Confirms a payment after user completes checkout
   * This is typically called from webhook or success callback
   */
  async confirmPayment(request: TossPaymentConfirmRequest): Promise<TossPaymentResponse> {
    try {
      this.logger.log(`Confirming payment: ${request.paymentKey}`);

      const response = await fetch(`${this.baseUrl}/v1/payments/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.getBasicAuthHeader()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        this.handleTossError(data as TossErrorResponse);
      }

      this.logger.log(`Payment confirmed successfully: ${data.paymentKey}`);
      return data as TossPaymentResponse;
    } catch (error) {
      this.logger.error(`Failed to confirm payment: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to confirm payment');
    }
  }

  /**
   * Cancel Payment (Full or Partial)
   *
   * Cancels a payment or issues a refund
   */
  async cancelPayment(request: TossPaymentCancelRequest): Promise<TossCancelResponse> {
    try {
      this.logger.log(`Cancelling payment: ${request.paymentKey}`);

      const response = await fetch(`${this.baseUrl}/v1/payments/${request.paymentKey}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.getBasicAuthHeader()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancelReason: request.cancelReason,
          cancelAmount: request.cancelAmount,
          refundReceiveAccount: request.refundReceiveAccount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.handleTossError(data as TossErrorResponse);
      }

      this.logger.log(`Payment cancelled successfully: ${data.paymentKey}`);
      return data as TossCancelResponse;
    } catch (error) {
      this.logger.error(`Failed to cancel payment: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to cancel payment');
    }
  }

  /**
   * Get Payment Status
   *
   * Retrieves current payment status from Toss Payments
   */
  async getPaymentStatus(paymentKey: string): Promise<TossPaymentStatusResponse> {
    try {
      this.logger.log(`Getting payment status: ${paymentKey}`);

      const response = await fetch(`${this.baseUrl}/v1/payments/${paymentKey}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${this.getBasicAuthHeader()}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        this.handleTossError(data as TossErrorResponse);
      }

      return data as TossPaymentStatusResponse;
    } catch (error) {
      this.logger.error(`Failed to get payment status: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to get payment status');
    }
  }

  /**
   * Get Payment by Order ID
   *
   * Retrieves payment details using merchant order ID
   */
  async getPaymentByOrderId(orderId: string): Promise<TossPaymentStatusResponse> {
    try {
      this.logger.log(`Getting payment by order ID: ${orderId}`);

      const response = await fetch(`${this.baseUrl}/v1/payments/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${this.getBasicAuthHeader()}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        this.handleTossError(data as TossErrorResponse);
      }

      return data as TossPaymentStatusResponse;
    } catch (error) {
      this.logger.error(`Failed to get payment by order ID: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to get payment by order ID');
    }
  }

  /**
   * Verify Webhook Signature
   *
   * Validates webhook authenticity using HMAC signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Parse Webhook Payload
   *
   * Parses and validates webhook payload from Toss Payments
   */
  parseWebhookPayload(rawPayload: string): TossWebhookPayload {
    try {
      return JSON.parse(rawPayload) as TossWebhookPayload;
    } catch (error) {
      this.logger.error(`Failed to parse webhook payload: ${error.message}`);
      throw new BadRequestException('Invalid webhook payload');
    }
  }

  /**
   * Generate Idempotency Key
   *
   * Creates a unique key for idempotent payment requests
   */
  generateIdempotencyKey(orderId: string): string {
    return `${orderId}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate Order ID
   *
   * Creates a unique order ID for payment tracking
   */
  generateOrderId(prefix: string = 'ORD'): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Get Basic Auth Header
   *
   * Encodes secret key for Toss Payments authentication
   */
  private getBasicAuthHeader(): string {
    return Buffer.from(`${this.secretKey}:`).toString('base64');
  }

  /**
   * Handle Toss Error Response
   *
   * Converts Toss Payments error into application exception
   */
  private handleTossError(error: TossErrorResponse): never {
    this.logger.error(`Toss Payments Error - Code: ${error.code}, Message: ${error.message}`);

    const errorMessages: Record<string, string> = {
      'INVALID_REQUEST': '잘못된 요청입니다',
      'NOT_FOUND_PAYMENT': '결제 정보를 찾을 수 없습니다',
      'ALREADY_PROCESSED_PAYMENT': '이미 처리된 결제입니다',
      'PROVIDER_ERROR': '결제 처리 중 오류가 발생했습니다',
      'EXCEED_MAX_CARD_INSTALLMENT_PLAN': '할부 개월 수가 초과되었습니다',
      'INVALID_API_KEY': 'API 키가 유효하지 않습니다',
      'COMMON_ERROR': '일시적인 오류가 발생했습니다',
    };

    const message = errorMessages[error.code] || error.message || '결제 처리 중 오류가 발생했습니다';

    throw new BadRequestException({
      message,
      code: error.code,
      originalMessage: error.message,
    });
  }

  /**
   * Sanitize Payment Data (PCI-DSS Compliance)
   *
   * Removes sensitive payment information before logging/storage
   */
  sanitizePaymentData(data: any): any {
    const sanitized = { ...data };

    // Remove sensitive fields
    const sensitiveFields = [
      'cardNumber',
      'cardCvc',
      'cardPassword',
      'customerBirthday',
      'accountPassword',
    ];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        delete sanitized[field];
      }
    });

    // Mask card number if present
    if (sanitized.card?.number) {
      sanitized.card.number = this.maskCardNumber(sanitized.card.number);
    }

    return sanitized;
  }

  /**
   * Mask Card Number (PCI-DSS Compliance)
   *
   * Masks all but last 4 digits of card number
   */
  private maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 4) {
      return '****';
    }

    const lastFour = cardNumber.slice(-4);
    const masked = '*'.repeat(cardNumber.length - 4);
    return masked + lastFour;
  }
}
