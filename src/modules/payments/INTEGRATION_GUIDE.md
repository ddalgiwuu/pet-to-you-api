# Payment Module Integration Guide

Complete guide for integrating the Payment module with your booking, daycare, insurance, and other services.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Module Registration](#module-registration)
3. [Service Integration](#service-integration)
4. [Frontend Integration](#frontend-integration)
5. [Webhook Setup](#webhook-setup)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)

## Quick Start

### 1. Environment Setup

Copy the environment variables template:

```bash
cp .env.payments.example .env
```

Update `.env` with your Toss Payments credentials:

```bash
TOSS_PAYMENTS_SECRET_KEY=test_sk_your_key_here
TOSS_PAYMENTS_CLIENT_KEY=test_ck_your_key_here
TOSS_PAYMENTS_WEBHOOK_SECRET=your_webhook_secret
APP_BASE_URL=http://localhost:3000
```

### 2. Run Migration

```bash
npm run migration:run
```

### 3. Register Module

In `src/app.module.ts`:

```typescript
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    // ... other modules
    PaymentsModule,
  ],
})
export class AppModule {}
```

### 4. Test API

```bash
# Start server
npm run start:dev

# Test payment request
curl -X POST http://localhost:3000/payments/request \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "resourceType": "booking",
    "resourceId": "your-booking-id",
    "amount": 50000,
    "paymentMethod": "card",
    "customerName": "홍길동"
  }'
```

## Module Registration

### Import PaymentsModule

```typescript
// src/modules/booking/booking.module.ts
import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  // ...
})
export class BookingModule {}
```

## Service Integration

### Booking Service Integration

```typescript
// src/modules/booking/services/bookings.service.ts
import { Injectable } from '@nestjs/common';
import { PaymentsService } from '../../payments/services/payments.service';
import { PaymentMethod } from '../../payments/entities/payment.entity';

@Injectable()
export class BookingsService {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  async createBookingWithPayment(
    userId: string,
    bookingData: CreateBookingDto,
  ) {
    // 1. Create booking
    const booking = await this.bookingRepository.save({
      userId,
      ...bookingData,
      status: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
    });

    // 2. Create payment request
    const { payment, checkoutUrl } = await this.paymentsService.createPayment({
      userId,
      resourceType: 'booking',
      resourceId: booking.id,
      amount: bookingData.estimatedPrice,
      paymentMethod: PaymentMethod.CARD,
      customerName: bookingData.customerName,
      customerEmail: bookingData.customerEmail,
      description: `${booking.type} 예약 결제`,
    });

    // 3. Update booking with payment info
    booking.paymentId = payment.id;
    await this.bookingRepository.save(booking);

    return {
      booking,
      payment,
      checkoutUrl,
    };
  }

  async confirmBookingPayment(paymentId: string) {
    // 1. Get payment
    const payment = await this.paymentsService.getPaymentById(paymentId);

    // 2. Find booking
    const booking = await this.bookingRepository.findOne({
      where: { id: payment.resourceId },
    });

    // 3. Update booking status
    booking.status = BookingStatus.CONFIRMED;
    booking.paymentStatus = PaymentStatus.PAID;
    booking.paidAt = payment.completedAt;

    await this.bookingRepository.save(booking);

    return booking;
  }

  async refundBooking(bookingId: string, refundReason: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking.paymentId) {
      throw new BadRequestException('No payment found for this booking');
    }

    // Calculate refund percentage based on cancellation time
    const refundPercentage = booking.getRefundPercentage();
    const refundAmount = Math.floor(
      (booking.finalPrice * refundPercentage) / 100
    );

    // Process refund
    const payment = await this.paymentsService.refundPayment(
      booking.paymentId,
      {
        refundReason,
        refundAmount,
      }
    );

    // Update booking
    booking.status = BookingStatus.CANCELLED;
    booking.paymentStatus = PaymentStatus.REFUNDED;
    booking.cancelledAt = new Date();
    booking.cancellationReason = refundReason;

    await this.bookingRepository.save(booking);

    return { booking, payment };
  }
}
```

### Insurance Service Integration

```typescript
// src/modules/insurance/services/insurance.service.ts
import { Injectable } from '@nestjs/common';
import { PaymentsService } from '../../payments/services/payments.service';
import { PaymentMethod } from '../../payments/entities/payment.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class InsuranceService {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  async subscribeToInsurance(
    userId: string,
    subscriptionData: CreateSubscriptionDto,
  ) {
    // 1. Create insurance subscription
    const subscription = await this.subscriptionRepository.save({
      userId,
      ...subscriptionData,
      status: SubscriptionStatus.PENDING,
    });

    // 2. Create initial payment
    const { payment, checkoutUrl } = await this.paymentsService.createPayment({
      userId,
      resourceType: 'insurance_subscription',
      resourceId: subscription.id,
      amount: subscriptionData.monthlyPremium,
      paymentMethod: PaymentMethod.CARD,
      description: `${subscriptionData.planName} 보험료 (1개월)`,
    });

    subscription.paymentId = payment.id;
    await this.subscriptionRepository.save(subscription);

    return { subscription, payment, checkoutUrl };
  }

  // Recurring billing (monthly)
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async processMonthlyBilling() {
    const activeSubscriptions = await this.subscriptionRepository.find({
      where: { status: SubscriptionStatus.ACTIVE },
    });

    for (const subscription of activeSubscriptions) {
      try {
        const { payment } = await this.paymentsService.createPayment({
          userId: subscription.userId,
          resourceType: 'insurance_subscription',
          resourceId: subscription.id,
          amount: subscription.monthlyPremium,
          paymentMethod: PaymentMethod.CARD,
          description: `${subscription.planName} 보험료 (월 정기결제)`,
        });

        this.logger.log(
          `Recurring payment created for subscription ${subscription.id}`
        );
      } catch (error) {
        this.logger.error(
          `Failed to process recurring payment for ${subscription.id}`,
          error.stack
        );
        // Handle payment failure (send notification, suspend subscription, etc.)
      }
    }
  }
}
```

### Daycare Service Integration

```typescript
// src/modules/daycare/services/daycare.service.ts
import { Injectable } from '@nestjs/common';
import { PaymentsService } from '../../payments/services/payments.service';

@Injectable()
export class DaycareService {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  async createDaycareReservation(
    userId: string,
    reservationData: CreateReservationDto,
  ) {
    const reservation = await this.reservationRepository.save({
      userId,
      ...reservationData,
      status: ReservationStatus.PENDING,
    });

    const { payment, checkoutUrl } = await this.paymentsService.createPayment({
      userId,
      resourceType: 'daycare_reservation',
      resourceId: reservation.id,
      amount: reservationData.totalPrice,
      paymentMethod: PaymentMethod.CARD,
      description: '유치원 예약 결제',
    });

    return { reservation, payment, checkoutUrl };
  }
}
```

## Frontend Integration

### React/Next.js Example

```typescript
// hooks/usePayment.ts
import { useState } from 'react';
import axios from 'axios';

export function usePayment() {
  const [loading, setLoading] = useState(false);

  const requestPayment = async (paymentData: {
    userId: string;
    resourceType: string;
    resourceId: string;
    amount: number;
    paymentMethod: string;
    customerName: string;
  }) => {
    setLoading(true);

    try {
      const response = await axios.post('/payments/request', paymentData);

      const { checkoutUrl } = response.data;

      // Redirect to Toss Payments checkout
      window.location.href = checkoutUrl;

      return response.data;
    } catch (error) {
      console.error('Payment request failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { requestPayment, loading };
}

// components/BookingPayment.tsx
import { usePayment } from '../hooks/usePayment';

export function BookingPayment({ booking, user }) {
  const { requestPayment, loading } = usePayment();

  const handlePayment = async () => {
    await requestPayment({
      userId: user.id,
      resourceType: 'booking',
      resourceId: booking.id,
      amount: booking.estimatedPrice,
      paymentMethod: 'card',
      customerName: user.name,
    });
  };

  return (
    <button onClick={handlePayment} disabled={loading}>
      {loading ? '결제 준비 중...' : '결제하기'}
    </button>
  );
}
```

### Payment Success/Fail Handlers

```typescript
// pages/payments/success.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function PaymentSuccess() {
  const router = useRouter();
  const { paymentKey, orderId, amount } = router.query;

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        await axios.post('/payments/confirm', {
          paymentKey,
          orderId,
          amount: Number(amount),
        });

        // Redirect to booking confirmation page
        router.push('/bookings/confirmation');
      } catch (error) {
        console.error('Payment confirmation failed:', error);
        router.push('/payments/fail');
      }
    };

    if (paymentKey && orderId && amount) {
      confirmPayment();
    }
  }, [paymentKey, orderId, amount]);

  return <div>결제를 확인하는 중...</div>;
}

// pages/payments/fail.tsx
export default function PaymentFail() {
  const router = useRouter();
  const { code, message } = router.query;

  return (
    <div>
      <h1>결제 실패</h1>
      <p>에러 코드: {code}</p>
      <p>에러 메시지: {message}</p>
      <button onClick={() => router.push('/bookings')}>
        다시 시도
      </button>
    </div>
  );
}
```

## Webhook Setup

### 1. Configure Webhook URL

In Toss Payments Dashboard:
- URL: `https://your-domain.com/payments/webhook`
- Method: POST
- Enable signature verification

### 2. Test Webhook Locally

Use ngrok for local testing:

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3000

# Copy the HTTPS URL and configure in Toss Payments Dashboard
# Example: https://abc123.ngrok.io/payments/webhook
```

### 3. Webhook Handler

The webhook handler is already implemented in `payments.controller.ts`. It will:
- Verify webhook signature
- Update payment status
- Log transaction
- Return success response

### 4. Test Webhook

```bash
# Simulate webhook (replace with your test signature)
curl -X POST http://localhost:3000/payments/webhook \
  -H "Content-Type: application/json" \
  -H "toss-signature: your_test_signature" \
  -d '{
    "eventType": "PAYMENT_STATUS_CHANGED",
    "createdAt": "2024-01-17T10:00:00Z",
    "data": {
      "mId": "test_mid",
      "paymentKey": "test_payment_key",
      "orderId": "ORD-123",
      "status": "DONE",
      "totalAmount": 50000,
      "approvedAt": "2024-01-17T10:00:00Z"
    }
  }'
```

## Testing

### Unit Tests

```typescript
// src/modules/payments/services/payments.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { TossPaymentsService } from './toss-payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let tossService: TossPaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: TossPaymentsService,
          useValue: {
            requestPayment: jest.fn(),
            confirmPayment: jest.fn(),
            cancelPayment: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    tossService = module.get<TossPaymentsService>(TossPaymentsService);
  });

  describe('createPayment', () => {
    it('should create payment and return checkout URL', async () => {
      const mockResponse = {
        payment: { id: 'test-id' },
        checkoutUrl: 'https://checkout.test',
      };

      jest.spyOn(tossService, 'requestPayment').mockResolvedValue(mockResponse);

      const result = await service.createPayment({
        userId: 'user-id',
        resourceType: 'booking',
        resourceId: 'booking-id',
        amount: 50000,
        paymentMethod: PaymentMethod.CARD,
      });

      expect(result).toEqual(mockResponse);
    });
  });
});
```

### Integration Tests

```typescript
// test/payments.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Payments (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/payments/request (POST)', () => {
    return request(app.getHttpServer())
      .post('/payments/request')
      .send({
        userId: 'test-user-id',
        resourceType: 'booking',
        resourceId: 'test-booking-id',
        amount: 50000,
        paymentMethod: 'card',
        customerName: '테스트',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('payment');
        expect(res.body).toHaveProperty('checkoutUrl');
      });
  });
});
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] Update to production Toss Payments credentials
- [ ] Configure production webhook URL with HTTPS
- [ ] Enable webhook signature verification
- [ ] Set up database connection pooling
- [ ] Configure Redis for caching
- [ ] Enable rate limiting
- [ ] Set up monitoring (Sentry, DataDog, etc.)
- [ ] Configure backup payment gateway
- [ ] Test all payment flows
- [ ] Set up alerts for payment failures
- [ ] Review security settings
- [ ] Enable audit logging
- [ ] Test refund scenarios
- [ ] Configure CORS for frontend

### Environment Variables (Production)

```bash
# Production Toss Payments
TOSS_PAYMENTS_SECRET_KEY=live_sk_your_production_key
TOSS_PAYMENTS_CLIENT_KEY=live_ck_your_production_key
TOSS_PAYMENTS_WEBHOOK_SECRET=your_production_webhook_secret

# Production URLs
APP_BASE_URL=https://your-production-domain.com

# Enable production mode
NODE_ENV=production
PAYMENT_TEST_MODE=false

# Security
WEBHOOK_SIGNATURE_VERIFICATION=true
```

### Monitoring

```typescript
// Set up payment metrics
import { Counter, Histogram } from 'prom-client';

const paymentCounter = new Counter({
  name: 'payments_total',
  help: 'Total number of payments',
  labelNames: ['status', 'method'],
});

const paymentDuration = new Histogram({
  name: 'payment_duration_seconds',
  help: 'Payment processing duration',
});
```

## Support

- Toss Payments Documentation: https://docs.tosspayments.com
- API Reference: https://docs.tosspayments.com/reference
- Developer Center: https://developers.tosspayments.com
