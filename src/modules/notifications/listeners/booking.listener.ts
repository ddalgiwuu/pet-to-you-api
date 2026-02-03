import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../services/notification.service';

export interface BookingCreatedEvent {
  bookingId: string;
  userId: string;
  userEmail: string;
  userPhone: string;
  deviceToken?: string;
  bookingNumber: string;
  hospitalName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  petName: string;
  amount: number;
}

export interface BookingConfirmedEvent extends BookingCreatedEvent {
  confirmationNumber: string;
}

export interface BookingCancelledEvent {
  bookingId: string;
  userId: string;
  userEmail: string;
  userPhone: string;
  deviceToken?: string;
  bookingNumber: string;
  hospitalName: string;
  cancellationReason: string;
}

export interface BookingReminderEvent {
  bookingId: string;
  userId: string;
  userEmail: string;
  userPhone: string;
  deviceToken?: string;
  petName: string;
  hospitalName: string;
  appointmentDate: string;
  appointmentTime: string;
}

@Injectable()
export class BookingListener {
  private readonly logger = new Logger(BookingListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Handle booking created event
   */
  @OnEvent('booking.created')
  async handleBookingCreated(event: BookingCreatedEvent) {
    try {
      this.logger.log(`Handling booking.created event: ${event.bookingId}`);

      await this.notificationService.sendNotification({
        templateId: 'booking_created',
        userId: event.userId,
        email: event.userEmail,
        phone: event.userPhone,
        deviceToken: event.deviceToken,
        variables: {
          bookingNumber: event.bookingNumber,
          hospitalName: event.hospitalName,
          serviceName: event.serviceName,
          appointmentDate: event.appointmentDate,
          appointmentTime: event.appointmentTime,
          petName: event.petName,
          amount: event.amount.toLocaleString('ko-KR'),
        },
        priority: 3, // High priority
      });

      this.logger.log(
        `Sent booking created notification for: ${event.bookingId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle booking.created event: ${event.bookingId}`,
        error.stack,
      );
    }
  }

  /**
   * Handle booking confirmed event
   */
  @OnEvent('booking.confirmed')
  async handleBookingConfirmed(event: BookingConfirmedEvent) {
    try {
      this.logger.log(`Handling booking.confirmed event: ${event.bookingId}`);

      await this.notificationService.sendNotification({
        templateId: 'booking_confirmation',
        userId: event.userId,
        email: event.userEmail,
        phone: event.userPhone,
        deviceToken: event.deviceToken,
        variables: {
          bookingNumber: event.bookingNumber,
          confirmationNumber: event.confirmationNumber,
          hospitalName: event.hospitalName,
          serviceName: event.serviceName,
          appointmentDate: event.appointmentDate,
          appointmentTime: event.appointmentTime,
          petName: event.petName,
        },
        priority: 2, // Very high priority
      });

      this.logger.log(
        `Sent booking confirmation notification for: ${event.bookingId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle booking.confirmed event: ${event.bookingId}`,
        error.stack,
      );
    }
  }

  /**
   * Handle booking cancelled event
   */
  @OnEvent('booking.cancelled')
  async handleBookingCancelled(event: BookingCancelledEvent) {
    try {
      this.logger.log(`Handling booking.cancelled event: ${event.bookingId}`);

      await this.notificationService.sendNotification({
        templateId: 'booking_cancelled',
        userId: event.userId,
        email: event.userEmail,
        phone: event.userPhone,
        deviceToken: event.deviceToken,
        variables: {
          bookingNumber: event.bookingNumber,
          hospitalName: event.hospitalName,
          cancellationReason: event.cancellationReason,
        },
        priority: 3,
      });

      this.logger.log(
        `Sent booking cancellation notification for: ${event.bookingId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle booking.cancelled event: ${event.bookingId}`,
        error.stack,
      );
    }
  }

  /**
   * Handle booking reminder event
   */
  @OnEvent('booking.reminder')
  async handleBookingReminder(event: BookingReminderEvent) {
    try {
      this.logger.log(`Handling booking.reminder event: ${event.bookingId}`);

      await this.notificationService.sendNotification({
        templateId: 'booking_reminder',
        userId: event.userId,
        email: event.userEmail,
        phone: event.userPhone,
        deviceToken: event.deviceToken,
        variables: {
          petName: event.petName,
          hospitalName: event.hospitalName,
          appointmentDate: event.appointmentDate,
          appointmentTime: event.appointmentTime,
        },
        priority: 2,
      });

      this.logger.log(
        `Sent booking reminder notification for: ${event.bookingId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle booking.reminder event: ${event.bookingId}`,
        error.stack,
      );
    }
  }
}
