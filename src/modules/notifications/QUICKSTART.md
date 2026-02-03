# Notifications Module - Quick Start Guide

Get the notification system running in 15 minutes.

## Prerequisites Check

```bash
# Verify Node.js version
node --version  # Should be 18+

# Verify MongoDB is running
mongosh --eval "db.version()"

# Verify dependencies installed
npm list nodemailer firebase-admin axios
```

## Step 1: Environment Setup (5 minutes)

Copy this template to your `.env` file:

```env
# Email (Use Gmail for quick testing)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-16-char-app-password
EMAIL_FROM_ADDRESS=noreply@pet-to-you.com

# SMS (Optional for initial testing)
SMS_PROVIDER=naver_cloud
SMS_FROM_NUMBER=+821012345678

# Push (Optional for initial testing)
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-adminsdk.json

# Security (Generate with: openssl rand -hex 32)
ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### Get Gmail App Password
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Search for "App passwords"
4. Create password for "Mail"
5. Copy 16-character password to `.env`

## Step 2: Seed Templates (2 minutes)

```bash
# Create seed script
cat > seed-notifications.js << 'EOF'
const mongoose = require('mongoose');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pet_to_you');
  
  const template = {
    templateId: 'test_email',
    name: 'Test Email',
    type: 'email',
    category: 'general',
    subject: 'Test Email',
    body: 'Hello {{name}}, this is a test!',
    subjectKo: '테스트 이메일',
    bodyKo: '{{name}}님, 테스트입니다!',
    requiredVariables: ['name'],
    isActive: true,
    priority: 5,
  };
  
  await mongoose.connection.collection('notification_templates').updateOne(
    { templateId: 'test_email' },
    { $set: template },
    { upsert: true }
  );
  
  console.log('✅ Template seeded');
  process.exit(0);
}

seed();
EOF

# Run seed
node seed-notifications.js
```

## Step 3: Test Email (3 minutes)

Create test file `test-notification.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NotificationService } from './modules/notifications/services/notification.service';

async function test() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const notificationService = app.get(NotificationService);

  try {
    console.log('📧 Sending test email...');
    
    await notificationService.sendNotification({
      templateId: 'test_email',
      userId: 'test-user-123',
      email: 'your-email@example.com', // Change this!
      variables: {
        name: 'Test User',
      },
      preferences: {
        email: true,
        sms: false,
        push: false,
      },
    });

    console.log('✅ Email sent! Check your inbox.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await app.close();
}

test();
```

Run test:

```bash
npx ts-node test-notification.ts
```

## Step 4: Verify in MongoDB (2 minutes)

```bash
mongosh pet_to_you

# Check template
db.notification_templates.findOne({ templateId: 'test_email' })

# Check logs
db.notification_logs.find().sort({ createdAt: -1 }).limit(5).pretty()
```

Expected output:
```javascript
{
  notificationId: 'EMAIL-1705567890-abc123',
  templateId: 'test_email',
  type: 'email',
  status: 'sent',
  recipientEmail: 'your-email@example.com',
  sentAt: ISODate("2024-01-17T10:30:00.000Z")
}
```

## Step 5: Integrate with Events (3 minutes)

In your booking service:

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class BookingService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createBooking(data: CreateBookingDto) {
    // Your booking logic here...
    const booking = await this.bookingRepository.save(newBooking);

    // Emit event (notification sent automatically!)
    this.eventEmitter.emit('booking.created', {
      bookingId: booking.id,
      userId: user.id,
      userEmail: user.email,
      userPhone: user.phoneNumber,
      bookingNumber: booking.bookingNumber,
      hospitalName: hospital.name,
      serviceName: service.name,
      appointmentDate: booking.appointmentDate,
      appointmentTime: booking.appointmentTime,
      petName: pet.name,
      amount: booking.totalAmount,
    });

    return booking;
  }
}
```

That's it! Notifications now work automatically on booking events.

## Common Issues & Fixes

### "SMTP connection failed"
```bash
# Test SMTP manually
node -e "
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: { user: 'your@gmail.com', pass: 'your-app-password' }
});
transport.verify().then(console.log).catch(console.error);
"
```

### "Template not found"
```bash
# Verify template exists
mongosh pet_to_you --eval "db.notification_templates.find({}, {templateId:1})"
```

### "Cannot find module 'nodemailer'"
```bash
npm install --save nodemailer @types/nodemailer
```

## Production Templates

Load production templates:

```bash
# Copy seed file
cp src/modules/notifications/seeds/notification-templates.seed.ts seed-prod.ts

# Modify to load all templates
node -e "
const { notificationTemplatesSeed } = require('./seed-prod');
const mongoose = require('mongoose');

async function loadAll() {
  await mongoose.connect('mongodb://localhost:27017/pet_to_you');
  for (const t of notificationTemplatesSeed) {
    await mongoose.connection.collection('notification_templates')
      .updateOne({ templateId: t.templateId }, { $set: t }, { upsert: true });
    console.log('✅', t.templateId);
  }
  process.exit(0);
}
loadAll();
"
```

## Next Steps

1. **Add more templates** in `notification-templates.seed.ts`
2. **Configure SMS** provider (Naver Cloud or Kakao)
3. **Set up Firebase** for push notifications
4. **Monitor logs** in MongoDB
5. **Set up alerting** for failed notifications
6. **Customize templates** for your brand

## Development Tips

### Test Email Templates
```typescript
// In controller or service
@Get('test-email/:templateId')
async testTemplate(@Param('templateId') templateId: string) {
  return this.emailService.sendTemplateEmail(
    templateId,
    'test-user',
    'test@example.com',
    { /* sample variables */ }
  );
}
```

### Monitor Delivery Status
```typescript
// Get stats
const stats = await notificationService.getNotificationStats('booking_confirmation');
console.log(`Sent: ${stats.sent}, Delivered: ${stats.delivered}, Failed: ${stats.failed}`);
```

### Manual Retry
```bash
# Trigger retry job manually
curl http://localhost:3000/api/v1/notifications/retry
```

## Resources

- **Full Documentation**: `/src/modules/notifications/README.md`
- **Installation Guide**: `/src/modules/notifications/INSTALL.md`
- **Architecture**: `/src/modules/notifications/SUMMARY.md`

## Support

Need help? Check these in order:
1. Error logs in console
2. MongoDB notification_logs collection
3. Email provider dashboard
4. This guide's "Common Issues" section
5. Full documentation in README.md

---

**Quick Start Completed!** 🎉

Your notification system is now running. Test it by triggering a booking creation or payment event.
