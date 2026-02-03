# Notifications Module - Installation Guide

Complete installation guide for the Pet to You notification system.

## Prerequisites

- Node.js 18+
- MongoDB (for notification logs and templates)
- Firebase project (for push notifications)
- Email provider (SMTP or SendGrid)
- Korean SMS provider (Naver Cloud or Kakao)

## Installation Steps

### 1. Install Required Dependencies

```bash
npm install --save \
  nodemailer \
  @types/nodemailer \
  firebase-admin \
  axios \
  @nestjs/schedule \
  @nestjs/event-emitter
```

### 2. Firebase Setup (Push Notifications)

1. Create a Firebase project at https://console.firebase.google.com
2. Go to Project Settings > Service Accounts
3. Click "Generate New Private Key"
4. Save the JSON file as `firebase-adminsdk.json`
5. Set environment variable:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/firebase-adminsdk.json
```

### 3. Email Provider Setup

#### Option A: SMTP (Gmail, Naver, etc.)

For Gmail, generate an App Password:
1. Go to Google Account > Security
2. Enable 2-Step Verification
3. Generate App Password for "Mail"
4. Use the generated password in `.env`

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM_ADDRESS=noreply@pet-to-you.com
```

#### Option B: SendGrid

1. Sign up at https://sendgrid.com
2. Create an API key with Mail Send permissions
3. Configure environment:

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@pet-to-you.com
```

### 4. Korean SMS Setup

#### Option A: Naver Cloud Platform

1. Sign up at https://www.ncloud.com
2. Go to Services > Simple & Easy Notification Service
3. Create SMS service and get credentials
4. Configure environment:

```env
SMS_PROVIDER=naver_cloud
NAVER_CLOUD_SMS_SERVICE_ID=ncp:sms:kr:123456789:service-id
NAVER_CLOUD_ACCESS_KEY=your-access-key
NAVER_CLOUD_SECRET_KEY=your-secret-key
SMS_FROM_NUMBER=+821012345678
```

#### Option B: Kakao Alimtalk

1. Register business at https://center-pf.kakao.com
2. Create templates and get approval
3. Get API credentials from Kakao Developers
4. Configure environment:

```env
SMS_PROVIDER=kakao_alimtalk
KAKAO_API_KEY=your-kakao-api-key
KAKAO_SENDER_KEY=your-sender-key
SMS_FROM_NUMBER=+821012345678
```

### 5. Encryption Key for Phone Numbers

Generate a secure 32-character encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to `.env`:

```env
ENCRYPTION_KEY=your-generated-32-char-key
```

### 6. MongoDB Indexes

The module automatically creates indexes, but you can manually create them for better performance:

```javascript
// Connect to MongoDB
use pet_to_you;

// Notification Templates Indexes
db.notification_templates.createIndex({ templateId: 1 }, { unique: true });
db.notification_templates.createIndex({ type: 1, category: 1 });
db.notification_templates.createIndex({ isActive: 1 });

// Notification Logs Indexes
db.notification_logs.createIndex({ notificationId: 1 }, { unique: true });
db.notification_logs.createIndex({ userId: 1, createdAt: -1 });
db.notification_logs.createIndex({ templateId: 1, status: 1 });
db.notification_logs.createIndex({ type: 1, status: 1, createdAt: -1 });
db.notification_logs.createIndex({ status: 1, nextRetryAt: 1 });

// TTL Index (auto-delete after 30 days)
db.notification_logs.createIndex(
  { createdAt: 1 },
  {
    expireAfterSeconds: 2592000,
    partialFilterExpression: {
      status: { $in: ["sent", "delivered"] }
    }
  }
);
```

### 7. Seed Notification Templates

Create initial templates in MongoDB:

```typescript
// src/database/seeds/seed-notification-templates.ts
import { notificationTemplatesSeed } from '../../modules/notifications/seeds/notification-templates.seed';

export async function seedNotificationTemplates(connection) {
  const collection = connection.collection('notification_templates');
  
  for (const template of notificationTemplatesSeed) {
    await collection.updateOne(
      { templateId: template.templateId },
      { $set: template },
      { upsert: true }
    );
  }
  
  console.log('✅ Notification templates seeded');
}
```

Run the seed:

```bash
npm run seed
```

### 8. Register Module in App

Update `src/app.module.ts`:

```typescript
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    // ... other imports
    NotificationsModule,
  ],
})
export class AppModule {}
```

### 9. Test Configuration

Verify email configuration:

```typescript
import { EmailService } from './modules/notifications/services/email.service';

// In a test file or controller
constructor(private emailService: EmailService) {}

async testEmail() {
  const isConnected = await this.emailService.verifyConnection();
  console.log('Email configured:', isConnected);
}
```

Send a test notification:

```typescript
await this.notificationService.sendNotification({
  templateId: 'verification_code',
  userId: 'test-user-id',
  email: 'test@example.com',
  phone: '+821012345678',
  variables: {
    code: '123456',
    expiryMinutes: '5',
  },
});
```

## Environment Variables Reference

Complete `.env` configuration:

```env
# ============================================================
# Email Configuration
# ============================================================
EMAIL_PROVIDER=smtp                    # smtp | sendgrid
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM_ADDRESS=noreply@pet-to-you.com

# SendGrid (Alternative)
# SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxx

# ============================================================
# SMS Configuration
# ============================================================
SMS_PROVIDER=naver_cloud               # naver_cloud | kakao_alimtalk

# Naver Cloud Platform
NAVER_CLOUD_SMS_SERVICE_ID=ncp:sms:kr:123456789:service-id
NAVER_CLOUD_ACCESS_KEY=your-access-key
NAVER_CLOUD_SECRET_KEY=your-secret-key
SMS_FROM_NUMBER=+821012345678

# Kakao Alimtalk (Alternative)
# KAKAO_API_KEY=your-kakao-api-key
# KAKAO_SENDER_KEY=your-sender-key

# ============================================================
# Push Notifications (Firebase)
# ============================================================
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/firebase-adminsdk.json

# ============================================================
# Security
# ============================================================
ENCRYPTION_KEY=your-32-char-encryption-key-here

# ============================================================
# MongoDB
# ============================================================
MONGODB_URI=mongodb://localhost:27017/pet_to_you
```

## Troubleshooting

### Email Not Sending

1. **Check SMTP credentials**: Verify username/password
2. **Check firewall**: Ensure port 587 is open
3. **Check logs**: Look for error messages in console
4. **Test connection**:
   ```typescript
   await emailService.verifyConnection();
   ```

### SMS Not Sending

1. **Verify phone format**: Must be +82XXXXXXXXXX
2. **Check provider credentials**: Access key, secret key
3. **Check sender number**: Must be registered with provider
4. **Review provider dashboard**: Check quota and errors

### Push Notifications Not Working

1. **Verify Firebase credentials**: Check service account JSON
2. **Check device token**: Must be valid FCM token
3. **Test with Firebase Console**: Send test notification
4. **Check app configuration**: Ensure FCM is properly integrated

### Rate Limiting Issues

1. **Check template config**: `maxSendsPerHour`, `maxSendsPerDay`
2. **Adjust cooldown**: `cooldownMinutes` setting
3. **Review logs**: Check for rate limit warnings
4. **Monitor stats**:
   ```typescript
   await notificationService.getNotificationStats(templateId);
   ```

## Production Checklist

- [ ] Environment variables configured
- [ ] Firebase service account JSON secured
- [ ] SMTP/SendGrid credentials tested
- [ ] Korean SMS provider verified
- [ ] Encryption key generated and secured
- [ ] MongoDB indexes created
- [ ] Templates seeded and tested
- [ ] Rate limits configured appropriately
- [ ] Retry mechanism tested
- [ ] Cron jobs scheduled
- [ ] Monitoring and alerting setup
- [ ] Error logging configured
- [ ] Backup strategy for templates
- [ ] User notification preferences implemented

## Performance Tips

1. **Use batch notifications** for multiple recipients
2. **Enable template caching** in production
3. **Configure proper TTL** for log cleanup
4. **Monitor queue depth** and processing time
5. **Use priority** to ensure critical notifications are sent first
6. **Implement circuit breaker** for external provider failures
7. **Cache frequently used templates** in Redis

## Security Recommendations

1. **Rotate encryption keys** periodically
2. **Use environment-specific credentials** (dev/staging/prod)
3. **Implement webhook signature verification** for callbacks
4. **Never log sensitive data** (phone numbers, emails)
5. **Use HTTPS** for all external API calls
6. **Implement IP whitelisting** for webhook endpoints
7. **Regular security audits** of notification content

## Support

For issues or questions:
- Email: dev@pet-to-you.com
- Documentation: /src/modules/notifications/README.md
- GitHub Issues: https://github.com/pet-to-you/issues
