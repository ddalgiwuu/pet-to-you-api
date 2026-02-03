# Payment Module - Quick Reference Card

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Setup environment
cp .env.payments.example .env
# Edit .env with your Toss Payments credentials

# 2. Run migration
npm run migration:run

# 3. Start server
npm run start:dev

# 4. Test
curl -X POST http://localhost:3000/payments/request \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-id","resourceType":"booking","resourceId":"test-id","amount":50000,"paymentMethod":"card","customerName":"테스트"}'
```

## 📋 Common Use Cases

### 1. Create Payment for Booking

```typescript
import { PaymentsService } from '@/modules/payments/services/payments.service';
import { PaymentMethod } from '@/modules/payments/entities/payment.entity';

// Inject service
constructor(private paymentsService: PaymentsService) {}

// Create payment
const { payment, checkoutUrl } = await this.paymentsService.createPayment({
  userId: user.id,
  resourceType: 'booking',
  resourceId: booking.id,
  amount: booking.estimatedPrice,
  paymentMethod: PaymentMethod.CARD,
  customerName: user.name,
  customerEmail: user.email,
  description: '병원 예약 결제',
});

// Redirect user to checkout
return { checkoutUrl };
```

### 2. Confirm Payment (After Checkout)

```typescript
// In success callback handler
const payment = await this.paymentsService.confirmPayment({
  paymentKey: req.query.paymentKey,
  orderId: req.query.orderId,
  amount: Number(req.query.amount),
});

// Update booking status
booking.status = BookingStatus.CONFIRMED;
booking.paymentStatus = PaymentStatus.PAID;
```

### 3. Process Refund

```typescript
const payment = await this.paymentsService.refundPayment(
  paymentId,
  {
    refundReason: '고객 요청',
    refundAmount: 25000, // Optional (omit for full refund)
  }
);

// Update booking status
booking.status = BookingStatus.CANCELLED;
booking.paymentStatus = PaymentStatus.REFUNDED;
```

### 4. Get Payment History

```typescript
const { payments, total } = await this.paymentsService.getUserPaymentHistory(
  userId,
  page,
  limit
);
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/request` | Create payment |
| POST | `/payments/confirm` | Confirm payment |
| POST | `/payments/webhook` | Handle webhook |
| POST | `/payments/:id/refund` | Process refund |
| GET | `/payments/:id` | Get payment |
| GET | `/payments` | Get history |
| GET | `/payments/:id/transactions` | Get audit trail |

## 💳 Payment Methods

```typescript
enum PaymentMethod {
  CARD = 'card',                    // 신용/체크카드
  TRANSFER = 'transfer',            // 계좌이체
  VIRTUAL_ACCOUNT = 'virtual_account', // 가상계좌
  MOBILE = 'mobile',                // 휴대폰 결제
}
```

## 📊 Payment Status Flow

```
PENDING → READY → IN_PROGRESS → COMPLETED
                              ↓
                           REFUNDED / PARTIAL_REFUNDED
```

## 🔒 Security Checklist

- ✅ Never log card numbers or CVV
- ✅ Always verify webhook signatures
- ✅ Use HTTPS in production
- ✅ Rotate webhook secrets regularly
- ✅ Enable idempotency for all requests
- ✅ Log IP addresses for audit

## 🐛 Common Issues

### Issue: "Payment not found"
**Solution:** Check orderId matches between request and confirm

### Issue: "Webhook signature verification failed"
**Solution:** Verify TOSS_PAYMENTS_WEBHOOK_SECRET is correct

### Issue: "Amount mismatch"
**Solution:** Ensure amount in confirm matches original payment

### Issue: "Refund not allowed"
**Solution:** Check payment.canBeRefunded() returns true

## 📞 Error Codes

| Code | Message | Solution |
|------|---------|----------|
| INVALID_REQUEST | 잘못된 요청 | Check request parameters |
| NOT_FOUND_PAYMENT | 결제 없음 | Verify paymentKey/orderId |
| ALREADY_PROCESSED_PAYMENT | 이미 처리됨 | Check payment status |
| PROVIDER_ERROR | 결제 오류 | Check Toss Payments status |

## 🔗 Essential Links

- **Toss Payments Dashboard:** https://developers.tosspayments.com
- **API Docs:** https://docs.tosspayments.com/reference
- **Test Cards:** https://docs.tosspayments.com/guides/test-mode
- **Webhook Guide:** https://docs.tosspayments.com/guides/webhook

## 💡 Pro Tips

1. **Use Test Mode:** Always use test credentials during development
2. **Enable Webhooks:** Set up webhooks for reliable payment confirmation
3. **Cache Status:** Implement Redis caching for payment status (1min TTL)
4. **Idempotency:** Always use unique idempotency keys for payment requests
5. **Logging:** Log all payment operations for debugging
6. **Monitoring:** Track payment success rate and processing time

## 📦 Module Integration

```typescript
// app.module.ts
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [PaymentsModule],
})
export class AppModule {}

// booking.module.ts
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
})
export class BookingModule {}
```

## 🧪 Testing

```bash
# Unit tests
npm run test -- payments

# E2E tests
npm run test:e2e -- payments

# Coverage
npm run test:cov
```

## 🎯 Performance Tips

1. **Use Indexes:** Already optimized with composite indexes
2. **Cache Results:** Implement Redis for frequently accessed data
3. **Async Webhooks:** Process webhooks asynchronously with queues
4. **Connection Pool:** Configure database connection pooling
5. **Rate Limiting:** Implement rate limiting for API endpoints

## 📝 Environment Variables

```bash
# Required
TOSS_PAYMENTS_SECRET_KEY=test_sk_*
TOSS_PAYMENTS_CLIENT_KEY=test_ck_*
TOSS_PAYMENTS_WEBHOOK_SECRET=random_32_chars
APP_BASE_URL=http://localhost:3000

# Optional
PAYMENT_CACHE_TTL=60
WEBHOOK_MAX_RETRIES=3
PAYMENT_MIN_AMOUNT=100
```

## 🎨 Frontend Integration Example

```typescript
// React Hook
import { useState } from 'react';

export function usePayment() {
  const [loading, setLoading] = useState(false);

  const requestPayment = async (data) => {
    setLoading(true);
    const res = await fetch('/payments/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const { checkoutUrl } = await res.json();
    window.location.href = checkoutUrl;
  };

  return { requestPayment, loading };
}
```

## 🔧 Troubleshooting Commands

```bash
# Check migration status
npm run typeorm migration:show

# Rollback migration
npm run migration:revert

# Check logs
tail -f logs/payment.log

# Test webhook locally (with ngrok)
ngrok http 3000
```

## 📊 Monitoring Queries

```sql
-- Payment success rate
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM payments
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Average processing time
SELECT AVG(processing_time_ms) as avg_time_ms
FROM payment_transactions
WHERE type = 'payment_confirmation'
AND created_at > NOW() - INTERVAL '24 hours';

-- Failed payments
SELECT id, failure_reason, created_at
FROM payments
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

---

**Need Help?** Check README.md or INTEGRATION_GUIDE.md for detailed documentation.
