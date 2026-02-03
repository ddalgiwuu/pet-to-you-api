# Payment Module - Toss Payments Integration

Complete payment processing system with Toss Payments integration for the Pet to You platform.

## Features

- ✅ Payment creation and checkout URL generation
- ✅ Secure webhook handling with signature verification
- ✅ Full and partial refund processing
- ✅ Payment history and audit trail
- ✅ PCI-DSS compliant (no sensitive card data storage)
- ✅ Idempotency for duplicate payment prevention
- ✅ Multiple payment methods (card, transfer, virtual account, mobile)
- ✅ Transaction logging for compliance and debugging
- ✅ Async webhook processing
- ✅ Payment status caching (1-minute TTL)

## Architecture

```
payments/
├── entities/
│   ├── payment.entity.ts              # Main payment record
│   └── payment-transaction.entity.ts  # Audit trail for all transactions
├── services/
│   ├── payments.service.ts            # Business logic layer
│   └── toss-payments.service.ts       # Toss Payments API integration
├── controllers/
│   └── payments.controller.ts         # REST API endpoints
├── dto/
│   ├── create-payment.dto.ts          # Payment request DTO
│   ├── confirm-payment.dto.ts         # Payment confirmation DTO
│   └── refund-payment.dto.ts          # Refund request DTO
└── interfaces/
    └── toss-payments.interface.ts     # Toss Payments API types
```

## Environment Variables

Add these to your `.env` file:

```bash
# Toss Payments Configuration
TOSS_PAYMENTS_BASE_URL=https://api.tosspayments.com
TOSS_PAYMENTS_SECRET_KEY=your_secret_key_here
TOSS_PAYMENTS_CLIENT_KEY=your_client_key_here
TOSS_PAYMENTS_WEBHOOK_SECRET=your_webhook_secret_here

# Application Base URL (for success/fail callbacks)
APP_BASE_URL=http://localhost:3000
```

## API Endpoints

### 1. Request Payment

Create a payment request and get checkout URL.

```http
POST /payments/request
Content-Type: application/json

{
  "userId": "uuid",
  "resourceType": "booking",
  "resourceId": "uuid",
  "amount": 50000,
  "paymentMethod": "card",
  "customerName": "홍길동",
  "customerEmail": "hong@example.com",
  "customerMobilePhone": "01012345678",
  "description": "병원 예약 결제"
}
```

**Response:**
```json
{
  "payment": {
    "id": "uuid",
    "paymentNumber": "PAY-20240117-1234",
    "amount": 50000,
    "status": "pending",
    "orderId": "ORD-1737120000000-ABC123"
  },
  "checkoutUrl": "https://checkout.tosspayments.com/..."
}
```

### 2. Confirm Payment

Confirm payment after user completes checkout.

```http
POST /payments/confirm
Content-Type: application/json

{
  "paymentKey": "toss_payment_key",
  "orderId": "ORD-1737120000000-ABC123",
  "amount": 50000
}
```

### 3. Process Refund

Request full or partial refund.

```http
POST /payments/:paymentId/refund
Content-Type: application/json

{
  "refundReason": "고객 요청",
  "refundAmount": 25000,  // Optional (omit for full refund)
  "refundReceiveAccount": {  // Required for virtual account
    "bank": "국민은행",
    "accountNumber": "123456789012",
    "holderName": "홍길동"
  }
}
```

### 4. Get Payment Details

```http
GET /payments/:paymentId
```

### 5. Get Payment History

```http
GET /payments?userId=uuid&page=1&limit=20
```

### 6. Get Transaction History

```http
GET /payments/:paymentId/transactions
```

### 7. Webhook Handler

```http
POST /payments/webhook
Headers:
  toss-signature: signature_from_toss

Body: (Raw JSON from Toss Payments)
```

## Payment Flow

### Successful Payment Flow

```
1. User requests payment
   ↓
2. System creates Payment record (status: pending)
   ↓
3. Toss Payments generates checkout URL
   ↓
4. User completes payment on Toss checkout page
   ↓
5. Toss redirects to successUrl
   ↓
6. System confirms payment (status: completed)
   ↓
7. Toss sends webhook notification
   ↓
8. System updates payment record
```

### Refund Flow

```
1. Admin/User requests refund
   ↓
2. System validates refund eligibility
   ↓
3. Call Toss Payments cancel API
   ↓
4. Update payment status (refunded/partial_refunded)
   ↓
5. Create transaction log
```

## Payment Methods

### Card Payment
```typescript
{
  paymentMethod: PaymentMethod.CARD
}
```

### Bank Transfer
```typescript
{
  paymentMethod: PaymentMethod.TRANSFER
}
```

### Virtual Account
```typescript
{
  paymentMethod: PaymentMethod.VIRTUAL_ACCOUNT
}
```

### Mobile Payment
```typescript
{
  paymentMethod: PaymentMethod.MOBILE
}
```

## Security Features

### PCI-DSS Compliance
- ❌ Never stores full card numbers
- ❌ Never stores CVV/CVC
- ✅ Stores only last 4 digits (masked)
- ✅ Stores only non-sensitive card metadata

### Webhook Security
- ✅ HMAC signature verification
- ✅ Timing-safe comparison
- ✅ IP address logging
- ✅ Replay attack prevention

### Idempotency
- ✅ Unique idempotency keys
- ✅ Duplicate payment prevention
- ✅ Safe retry mechanism

## Database Schema

### Payments Table

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  payment_number VARCHAR(30) UNIQUE,
  amount INTEGER,
  currency ENUM('KRW'),
  payment_method ENUM('card', 'transfer', 'virtual_account', 'mobile'),
  provider ENUM('toss_payments'),
  transaction_id VARCHAR(200) UNIQUE,
  order_id VARCHAR(200) UNIQUE,
  status ENUM(...),
  -- Card info (PCI-DSS compliant)
  card_company VARCHAR(50),
  card_last_four_digits VARCHAR(10),
  card_type VARCHAR(20),
  -- Refund info
  refunded_amount INTEGER DEFAULT 0,
  refund_reason TEXT,
  -- Timestamps
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_payments_user_status ON payments(user_id, status, created_at);
CREATE INDEX idx_payments_resource ON payments(resource_type, resource_id);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
```

### Payment Transactions Table

```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  payment_id UUID REFERENCES payments(id),
  type ENUM(...),
  status ENUM('success', 'failed', 'pending'),
  request_data JSONB,
  response_data JSONB,
  processing_time_ms INTEGER,
  created_at TIMESTAMP
);

-- Index for audit queries
CREATE INDEX idx_payment_transactions_payment ON payment_transactions(payment_id, created_at);
```

## Optimization Features

### Caching Strategy
```typescript
// Payment status cached for 1 minute
@Cacheable({ ttl: 60 })
async getPaymentStatus(paymentKey: string) {
  return this.tossPaymentsService.getPaymentStatus(paymentKey);
}
```

### Async Webhook Processing
```typescript
// Webhooks processed asynchronously
@Queue('payment-webhooks')
async processWebhook(payload: TossWebhookPayload) {
  // Non-blocking processing
}
```

### Database Indexes
- User + Status + Created (payment history queries)
- Resource Type + Resource ID (resource-specific queries)
- Transaction ID (Toss Payments lookup)
- Payment ID + Created (transaction history)

## Error Handling

### Toss Payments Errors

```typescript
{
  code: 'INVALID_REQUEST',
  message: '잘못된 요청입니다'
}
```

Common error codes:
- `INVALID_REQUEST`: Invalid request parameters
- `NOT_FOUND_PAYMENT`: Payment not found
- `ALREADY_PROCESSED_PAYMENT`: Payment already processed
- `PROVIDER_ERROR`: Payment provider error
- `EXCEED_MAX_CARD_INSTALLMENT_PLAN`: Installment limit exceeded

### Application Errors

```typescript
throw new BadRequestException({
  message: 'Payment cannot be refunded',
  code: 'REFUND_NOT_ALLOWED',
  originalMessage: 'Original error from Toss'
});
```

## Testing

### Test Payment Request

```bash
curl -X POST http://localhost:3000/payments/request \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid",
    "resourceType": "booking",
    "resourceId": "uuid",
    "amount": 50000,
    "paymentMethod": "card",
    "customerName": "홍길동"
  }'
```

### Webhook Testing

Use Toss Payments test credentials and webhook simulator.

## Monitoring

### Key Metrics
- Payment success rate
- Average processing time
- Refund rate
- Webhook failure rate
- Transaction volume

### Logging
```typescript
this.logger.log(`Payment created: ${payment.id}`);
this.logger.error(`Payment failed: ${error.message}`, error.stack);
```

## Production Checklist

- [ ] Configure production Toss Payments credentials
- [ ] Set up SSL/TLS for webhook endpoint
- [ ] Configure webhook retry policy
- [ ] Set up monitoring and alerts
- [ ] Enable payment status caching
- [ ] Configure rate limiting
- [ ] Set up database connection pooling
- [ ] Enable audit logging
- [ ] Test webhook signature verification
- [ ] Configure backup payment gateway

## Support

For issues or questions:
- Toss Payments Docs: https://docs.tosspayments.com
- API Reference: https://docs.tosspayments.com/reference
- Support: https://toss.im/support
