import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { Hospital } from '../../hospitals/entities/hospital.entity';
import { CacheService } from '../../../core/cache/cache.service';
import { AvailableSlotDto } from '../dto/get-available-slots.dto';

interface TimeSlot {
  start: Date;
  end: Date;
}

@Injectable()
export class SlotCalculatorService {
  private readonly logger = new Logger(SlotCalculatorService.name);
  private readonly SLOT_CACHE_TTL = 300; // 5 minutes
  private readonly BUFFER_MINUTES = 5; // Buffer time between bookings

  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Hospital)
    private hospitalRepository: Repository<Hospital>,
    private cacheService: CacheService,
  ) {}

  /**
   * 📅 Calculate available time slots for a hospital on a given date
   *
   * @param hospitalId - Hospital ID
   * @param date - Date to check (YYYY-MM-DD)
   * @param durationMinutes - Booking duration in minutes
   * @returns Array of available slots
   */
  async getAvailableSlots(
    hospitalId: string,
    date: string,
    durationMinutes: number = 30,
  ): Promise<AvailableSlotDto[]> {
    // Check cache first
    const cacheKey = `slots:${hospitalId}:${date}:${durationMinutes}`;
    const cached = await this.cacheService.get<AvailableSlotDto[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    // Get hospital operating hours
    const hospital = await this.hospitalRepository.findOne({
      where: { id: hospitalId, isDeleted: false },
    });

    if (!hospital) {
      throw new Error('Hospital not found');
    }

    // Parse date and get day of week
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Get operating hours for this day
    const operatingHours = hospital.operatingHours?.[dayOfWeek];
    if (!operatingHours || !operatingHours.isOpen) {
      return []; // Hospital is closed on this day
    }

    // Check if it's a Korean holiday
    if (this.isKoreanHoliday(targetDate) || hospital.holidays?.includes(date)) {
      return []; // Hospital is closed on holidays
    }

    // Generate all possible slots based on operating hours
    const allSlots = this.generateTimeSlots(
      targetDate,
      operatingHours.openTime,
      operatingHours.closeTime,
      operatingHours.breakTime?.startTime,
      operatingHours.breakTime?.endTime,
      durationMinutes,
    );

    // Get existing bookings for this day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await this.bookingRepository.find({
      where: {
        hospitalId,
        startDateTime: Between(startOfDay, endOfDay),
        status: Between(BookingStatus.PENDING, BookingStatus.CONFIRMED), // Exclude cancelled/no-show
      },
      select: ['startDateTime', 'endDateTime'],
    });

    // Check availability for each slot
    const availableSlots = allSlots.map((slot) => {
      const isAvailable = this.isSlotAvailable(slot, existingBookings);
      return {
        startTime: slot.start.toISOString(),
        endTime: slot.end.toISOString(),
        available: isAvailable,
        ...((!isAvailable && { reason: '예약 마감' })),
      };
    });

    // Cache the results
    await this.cacheService.set(cacheKey, availableSlots, this.SLOT_CACHE_TTL);

    return availableSlots;
  }

  /**
   * 🕐 Generate time slots based on operating hours
   */
  private generateTimeSlots(
    date: Date,
    openTime: string, // "09:00"
    closeTime: string, // "18:00"
    breakStart?: string, // "12:00"
    breakEnd?: string, // "13:00"
    durationMinutes: number = 30,
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];

    // Parse operating hours
    const [openHour, openMinute] = openTime.split(':').map(Number);
    const [closeHour, closeMinute] = closeTime.split(':').map(Number);

    // Create date objects for open and close times
    const openDateTime = new Date(date);
    openDateTime.setHours(openHour, openMinute, 0, 0);

    const closeDateTime = new Date(date);
    closeDateTime.setHours(closeHour, closeMinute, 0, 0);

    // Parse break times if provided
    let breakStartDateTime: Date | null = null;
    let breakEndDateTime: Date | null = null;

    if (breakStart && breakEnd) {
      const [breakStartHour, breakStartMinute] = breakStart.split(':').map(Number);
      const [breakEndHour, breakEndMinute] = breakEnd.split(':').map(Number);

      breakStartDateTime = new Date(date);
      breakStartDateTime.setHours(breakStartHour, breakStartMinute, 0, 0);

      breakEndDateTime = new Date(date);
      breakEndDateTime.setHours(breakEndHour, breakEndMinute, 0, 0);
    }

    // Generate slots
    let currentTime = new Date(openDateTime);

    while (currentTime < closeDateTime) {
      const slotEnd = new Date(currentTime);
      slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

      // Check if slot fits before closing time
      if (slotEnd <= closeDateTime) {
        // Check if slot overlaps with break time
        const overlapsBreak =
          breakStartDateTime &&
          breakEndDateTime &&
          ((currentTime >= breakStartDateTime && currentTime < breakEndDateTime) ||
            (slotEnd > breakStartDateTime && slotEnd <= breakEndDateTime) ||
            (currentTime <= breakStartDateTime && slotEnd >= breakEndDateTime));

        if (!overlapsBreak) {
          slots.push({
            start: new Date(currentTime),
            end: new Date(slotEnd),
          });
        }
      }

      // Move to next slot (with buffer time)
      currentTime.setMinutes(currentTime.getMinutes() + durationMinutes + this.BUFFER_MINUTES);
    }

    return slots;
  }

  /**
   * ✅ Check if a time slot is available
   */
  private isSlotAvailable(slot: TimeSlot, existingBookings: Booking[]): boolean {
    for (const booking of existingBookings) {
      const bookingStart = new Date(booking.startDateTime);
      const bookingEnd = new Date(booking.endDateTime);

      // Check for overlap
      if (
        (slot.start >= bookingStart && slot.start < bookingEnd) ||
        (slot.end > bookingStart && slot.end <= bookingEnd) ||
        (slot.start <= bookingStart && slot.end >= bookingEnd)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * 🇰🇷 Check if date is a Korean public holiday
   *
   * TODO: Integrate with external holiday API or maintain a holiday calendar
   * Current implementation checks for common fixed holidays
   */
  private isKoreanHoliday(date: Date): boolean {
    const month = date.getMonth() + 1; // 0-indexed
    const day = date.getDate();

    // Fixed holidays
    const fixedHolidays = [
      { month: 1, day: 1 }, // New Year's Day
      { month: 3, day: 1 }, // Independence Movement Day
      { month: 5, day: 5 }, // Children's Day
      { month: 6, day: 6 }, // Memorial Day
      { month: 8, day: 15 }, // Liberation Day
      { month: 10, day: 3 }, // National Foundation Day
      { month: 10, day: 9 }, // Hangul Day
      { month: 12, day: 25 }, // Christmas
    ];

    return fixedHolidays.some((holiday) => holiday.month === month && holiday.day === day);

    // TODO: Add lunar calendar holidays (Seollal, Chuseok)
  }

  /**
   * 🔄 Invalidate slot cache for a specific hospital and date
   */
  async invalidateSlotCache(hospitalId: string, date: string): Promise<void> {
    // Invalidate for all common durations
    const durations = [15, 30, 45, 60];
    for (const duration of durations) {
      const cacheKey = `slots:${hospitalId}:${date}:${duration}`;
      await this.cacheService.del(cacheKey);
    }
    this.logger.debug(`Invalidated slot cache for ${hospitalId} on ${date}`);
  }
}
