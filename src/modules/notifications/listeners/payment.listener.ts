import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';

export interface PaymentCompletedEvent {
  paymentId: string;
  userId: string;
  userEmail: string;
  userPhone: string;
  deviceToken?: string;
  paymentNumber: string;
  amount: number;
  paymentMethod: string;
  transactionDate: string;
  approvalNumber?: string;
  receiptUrl?: string;
}

export interface PaymentFailedEvent {
  paymentId: string;
  userId: string;
  userEmail: string;
  userPhone: string;
  deviceToken?: string;
  paymentNumber: string;
  amount: number;
  failureReason: string;
}

export interface PaymentRefundedEvent {
  paymentId: string;
  userId: string;
  userEmail: string;
  userPhone: string;
  deviceToken?: string;
  paymentNumber: string;
  refundAmount: number;
  refundReason: string;
  refundDate: string;
}

@Injectable()
export class PaymentListener {
  private readonly logger = new Logger(PaymentListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Handle payment completed event
   */
  @OnEvent('payment.completed')
  async handlePaymentCompleted(event: PaymentCompletedEvent) {
    try {
      this.logger.log(`Handling payment.completed event: ${event.paymentId}`);

      await this.notificationService.sendNotification({
        templateId: 'payment_receipt',
        userId: event.userId,
        email: event.userEmail,
        phone: event.userPhone,
        deviceToken: event.deviceToken,
        variables: {
          paymentNumber: event.paymentNumber,
          amount: event.amount.toLocaleString('ko-KR'),
          paymentMethod: this.translatePaymentMethod(event.paymentMethod),
          transactionDate: event.transactionDate,
          approvalNumber: event.approvalNumber || 'N/A',
          receiptUrl: event.receiptUrl || '',
        },
        priority: 2, // Very high priority
      });

      this.logger.log(
        `Sent payment receipt notification for: ${event.paymentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle payment.completed event: ${event.paymentId}`,
        error.stack,
      );
    }
  }

  /**
   * Handle payment failed event
   */
  @OnEvent('payment.failed')
  async handlePaymentFailed(event: PaymentFailedEvent) {
    try {
      this.logger.log(`Handling payment.failed event: ${event.paymentId}`);

      await this.notificationService.sendNotification({
        templateId: 'payment_failed',
        userId: event.userId,
        email: event.userEmail,
        phone: event.userPhone,
        deviceToken: event.deviceToken,
        variables: {
          paymentNumber: event.paymentNumber,
          amount: event.amount.toLocaleString('ko-KR'),
          failureReason: event.failureReason,
        },
        priority: 3, // High priority
      });

      this.logger.log(
        `Sent payment failure notification for: ${event.paymentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle payment.failed event: ${event.paymentId}`,
        error.stack,
      );
    }
  }

  /**
   * Handle payment refunded event
   */
  @OnEvent('payment.refunded')
  async handlePaymentRefunded(event: PaymentRefundedEvent) {
    try {
      this.logger.log(`Handling payment.refunded event: ${event.paymentId}`);

      await this.notificationService.sendNotification({
        templateId: 'payment_refunded',
        userId: event.userId,
        email: event.userEmail,
        phone: event.userPhone,
        deviceToken: event.deviceToken,
        variables: {
          paymentNumber: event.paymentNumber,
          refundAmount: event.refundAmount.toLocaleString('ko-KR'),
          refundReason: event.refundReason,
          refundDate: event.refundDate,
        },
        priority: 3,
      });

      this.logger.log(
        `Sent payment refund notification for: ${event.paymentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle payment.refunded event: ${event.paymentId}`,
        error.stack,
      );
    }
  }

  /**
   * Translate payment method to Korean
   */
  private translatePaymentMethod(method: string): string {
    const translations: Record<string, string> = {
      card: '신용/체크카드',
      transfer: '계좌이체',
      virtual_account: '가상계좌',
      mobile: '휴대폰 결제',
    };

    return translations[method] || method;
  }
}
