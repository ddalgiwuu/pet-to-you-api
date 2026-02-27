import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BookingsController } from './controllers/bookings.controller';
import { BookingsService } from './services/bookings.service';
import { SlotCalculatorService } from './services/slot-calculator.service';
import { Booking } from './entities/booking.entity';
import { Hospital } from '../hospitals/entities/hospital.entity';
import { User } from '../users/entities/user.entity';
import { Pet } from '../pets/entities/pet.entity';
import { CacheModule } from '../../core/cache/cache.module';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Hospital, User, Pet]),
    CacheModule,
    AuditModule,
    EventEmitterModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, SlotCalculatorService],
  exports: [BookingsService, SlotCalculatorService],
})
export class BookingsModule {}
