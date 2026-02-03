import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Entities & Schemas
import {
  NotificationTemplate,
  NotificationTemplateSchema,
} from './entities/notification-template.entity';
import {
  NotificationLog,
  NotificationLogSchema,
} from './schemas/notification-log.schema';

// Services
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { PushService } from './services/push.service';
import { NotificationService } from './services/notification.service';

// Listeners
import { BookingListener } from './listeners/booking.listener';
import { PaymentListener } from './listeners/payment.listener';
import { AdoptionListener } from './listeners/adoption.listener';

// Queue Processor
import { NotificationProcessor } from './queue/notification.processor';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
    MongooseModule.forFeature([
      { name: NotificationTemplate.name, schema: NotificationTemplateSchema },
      { name: NotificationLog.name, schema: NotificationLogSchema },
    ]),
  ],
  providers: [
    // Services
    EmailService,
    SmsService,
    PushService,
    NotificationService,

    // Listeners
    BookingListener,
    PaymentListener,
    AdoptionListener,

    // Queue Processor
    NotificationProcessor,
  ],
  exports: [
    EmailService,
    SmsService,
    PushService,
    NotificationService,
  ],
})
export class NotificationsModule {}
