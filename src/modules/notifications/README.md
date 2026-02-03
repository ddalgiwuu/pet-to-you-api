# Notifications Module

Comprehensive notification system supporting Email, SMS, and Push notifications for Pet to You ecosystem.

## Features

### 🔔 Multi-Channel Notifications
- **Email**: NodeMailer/SendGrid integration with HTML templates
- **SMS**: Naver Cloud Platform & Kakao Alimtalk for Korean market
- **Push**: Firebase Cloud Messaging (FCM) for mobile apps

### 📝 Template Management
- Reusable notification templates with variable substitution
- Korean localization support
- Rate limiting and cooldown protection
- Template statistics tracking

### 📊 Delivery Tracking
- Comprehensive notification logs
- Delivery status monitoring
- Retry mechanism with exponential backoff
- TTL-based auto-cleanup (30 days)

### 🎯 Event-Driven Architecture
- Booking lifecycle notifications
- Payment transaction alerts
- Adoption application updates
- Medical record reminders

### ⚡ Optimizations
- Async queue processing with cron jobs
- Batch notification support
- Rate limiting per user/template
- Template result caching

## Architecture

```
notifications/
├── entities/
│   └── notification-template.entity.ts    # Template schema
├── schemas/
│   └── notification-log.schema.ts         # Delivery log schema
├── services/
│   ├── email.service.ts                   # Email sending logic
│   ├── sms.service.ts                     # SMS/Kakao integration
│   ├── push.service.ts                    # FCM push notifications
│   └── notification.service.ts            # Orchestration service
├── listeners/
│   ├── booking.listener.ts                # Booking event handlers
│   ├── payment.listener.ts                # Payment event handlers
│   └── adoption.listener.ts               # Adoption event handlers
├── queue/
│   └── notification.processor.ts          # Cron jobs & retry logic
├── dto/
│   ├── create-template.dto.ts
│   └── send-notification.dto.ts
└── notifications.module.ts
```

## Environment Variables

```env
# Email Configuration
EMAIL_PROVIDER=smtp                    # smtp | sendgrid
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM_ADDRESS=noreply@pet-to-you.com

# SendGrid (Alternative)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxx

# SMS Configuration (Naver Cloud)
SMS_PROVIDER=naver_cloud               # naver_cloud | kakao_alimtalk
NAVER_CLOUD_SMS_SERVICE_ID=ncp:sms:kr:123456789:service-id
NAVER_CLOUD_ACCESS_KEY=your-access-key
NAVER_CLOUD_SECRET_KEY=your-secret-key
SMS_FROM_NUMBER=+821012345678

# Kakao Alimtalk
KAKAO_API_KEY=your-kakao-api-key
KAKAO_SENDER_KEY=your-sender-key

# Push Notifications (Firebase)
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/firebase-adminsdk.json

# Security
ENCRYPTION_KEY=your-32-char-encryption-key
```

## Usage Examples

### 1. Send Notification by User Preference

```typescript
import { NotificationService } from './notifications/services/notification.service';

// Inject service
constructor(
  private readonly notificationService: NotificationService,
) {}

// Send multi-channel notification
await this.notificationService.sendNotification({
  templateId: 'booking_confirmation',
  userId: user.id,
  email: user.email,
  phone: user.phoneNumber,
  deviceToken: user.fcmToken,
  variables: {
    bookingNumber: 'BOOK-12345',
    hospitalName: 'Seoul Pet Hospital',
    appointmentDate: '2024-01-20',
    petName: '복돌이',
    amount: 50000,
  },
  preferences: {
    email: true,
    sms: true,
    push: true,
  },
  priority: 2, // 1 (highest) to 10 (lowest)
});
```

### 2. Emit Events (Auto-triggers Notifications)

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

constructor(private readonly eventEmitter: EventEmitter2) {}

// Booking created event
this.eventEmitter.emit('booking.created', {
  bookingId: booking.id,
  userId: user.id,
  userEmail: user.email,
  userPhone: user.phoneNumber,
  deviceToken: user.fcmToken,
  bookingNumber: booking.bookingNumber,
  hospitalName: hospital.name,
  serviceName: service.name,
  appointmentDate: booking.appointmentDate,
  appointmentTime: booking.appointmentTime,
  petName: pet.name,
  amount: booking.totalAmount,
});

// Payment completed event
this.eventEmitter.emit('payment.completed', {
  paymentId: payment.id,
  userId: user.id,
  userEmail: user.email,
  userPhone: user.phoneNumber,
  paymentNumber: payment.paymentNumber,
  amount: payment.amount,
  paymentMethod: payment.paymentMethod,
  transactionDate: payment.completedAt,
  receiptUrl: payment.receiptUrl,
});
```

### 3. Send Email Directly

```typescript
import { EmailService } from './notifications/services/email.service';

await this.emailService.sendEmail({
  to: 'user@example.com',
  subject: '테스트 이메일',
  body: '본문 내용입니다.',
  htmlBody: '<h1>HTML 본문</h1><p>내용</p>',
});
```

### 4. Send SMS with Korean Format

```typescript
import { SmsService } from './notifications/services/sms.service';

await this.smsService.sendTemplateSms(
  'booking_reminder',
  userId,
  '+821012345678', // Auto-normalized to 82 format
  {
    petName: '복돌이',
    hospitalName: '서울 동물병원',
    appointmentDate: '2024-01-20',
    appointmentTime: '14:00',
  },
);
```

### 5. Send Push Notification

```typescript
import { PushService } from './notifications/services/push.service';

await this.pushService.sendPush({
  deviceToken: 'fcm-token-abc123',
  title: '예약 확인',
  body: '복돌이의 예약이 확인되었습니다.',
  data: { bookingId: 'BOOK-123' },
  badge: 1,
});
```

## Template Variables

### Booking Templates
- `{{bookingNumber}}`: Booking number
- `{{hospitalName}}`: Hospital name
- `{{serviceName}}`: Service name
- `{{appointmentDate}}`: Appointment date
- `{{appointmentTime}}`: Appointment time
- `{{petName}}`: Pet name
- `{{amount}}`: Total amount

### Payment Templates
- `{{paymentNumber}}`: Payment number
- `{{amount}}`: Payment amount
- `{{paymentMethod}}`: Payment method
- `{{transactionDate}}`: Transaction date
- `{{approvalNumber}}`: Approval number
- `{{receiptUrl}}`: Receipt URL

### Adoption Templates
- `{{applicationNumber}}`: Application number
- `{{petName}}`: Pet name
- `{{petType}}`: Pet type
- `{{approvalDate}}`: Approval date
- `{{rejectionReason}}`: Rejection reason

## Rate Limiting

Templates support built-in rate limiting:

```typescript
// In template configuration
maxSendsPerHour: 10,      // Max 10 notifications per hour per user
maxSendsPerDay: 50,       // Max 50 notifications per day per user
cooldownMinutes: 5,       // Min 5 minutes between same template
```

## Retry Mechanism

Failed notifications are automatically retried with exponential backoff:

- **Retry 1**: After 1 minute
- **Retry 2**: After 5 minutes
- **Retry 3**: After 15 minutes
- **Max Retries**: 3 attempts

## Cron Jobs

Automated tasks run periodically:

- **Every minute**: Process scheduled notifications
- **Every 5 minutes**: Retry failed notifications
- **Every hour**: Send booking reminders (24h before)
- **Daily at 2 AM**: Clean up old logs (30+ days)
- **Daily at 9 AM**: Send health reminders
- **Weekly on Monday at 8 AM**: Generate statistics report

## Security Features

- **Phone Number Encryption**: All phone numbers encrypted using AES-256
- **PCI-DSS Compliance**: No sensitive card data stored
- **Rate Limiting**: Prevent notification spam
- **Webhook Signature Verification**: Validate provider callbacks
- **Audit Trail**: IP address and user agent tracking

## Performance Optimizations

1. **Template Caching**: Frequently used templates cached in memory
2. **Batch Processing**: Group notifications for efficient sending
3. **Async Queue**: Background job processing with Bull/Redis
4. **TTL Indexes**: Auto-expire old logs after 30 days
5. **Connection Pooling**: Reuse SMTP/HTTP connections

## Monitoring & Analytics

```typescript
// Get notification statistics
const stats = await notificationService.getNotificationStats('booking_confirmation');

// Output:
// {
//   sent: 1250,
//   delivered: 1180,
//   failed: 50,
//   bounced: 20
// }

// Get user notification history
const logs = await notificationService.getUserNotifications(userId, {
  type: NotificationType.EMAIL,
  status: NotificationStatus.SENT,
  limit: 20,
});
```

## Korean Market Integration

### Naver Cloud Platform SMS
- High deliverability in Korea
- Support for long messages (LMS)
- Delivery reports and tracking

### Kakao Alimtalk
- Official business messaging
- Template pre-approval required
- Lower cost per message
- Higher open rates

## Best Practices

1. **Always use templates** for consistency and easy updates
2. **Emit events** instead of directly calling notification services
3. **Set appropriate priorities** for urgent vs. informational notifications
4. **Monitor delivery rates** and adjust retry logic if needed
5. **Respect user preferences** - allow users to opt-out of channels
6. **Test templates** using sampleVariables before production
7. **Keep templates simple** - complex logic belongs in code, not templates

## Future Enhancements

- [ ] Webhook receivers for delivery status updates
- [ ] Advanced queue system (Bull/Redis)
- [ ] A/B testing for notification content
- [ ] Rich push notifications with images
- [ ] In-app notification center
- [ ] Notification preferences management UI
- [ ] Analytics dashboard
- [ ] Multi-language template support
