import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Booking, BookingStatus, PaymentStatus } from '../entities/booking.entity';
import { Hospital } from '../../hospitals/entities/hospital.entity';
import { User } from '../../users/entities/user.entity';
import { Pet } from '../../pets/entities/pet.entity';
import { CacheService } from '../../../core/cache/cache.service';
import { AuditService } from '../../../core/audit/audit.service';
import { AuditAction } from '../../../core/audit/entities/audit-log.entity';
import { SlotCalculatorService } from './slot-calculator.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { UpdateBookingDto } from '../dto/update-booking.dto';
import { BookingFilterDto } from '../dto/booking-filter.dto';
import * as crypto from 'crypto';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  private readonly LOCK_TIMEOUT = 30; // 30 seconds
  private readonly MAX_LOCK_RETRIES = 3;

  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Hospital)
    private hospitalRepository: Repository<Hospital>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,
    private cacheService: CacheService,
    private auditService: AuditService,
    private slotCalculatorService: SlotCalculatorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 📝 Create new booking with distributed locking
   *
   * Prevents double-booking using Redis distributed locks:
   * 1. Acquire lock for time slot
   * 2. Check slot availability
   * 3. Create booking
   * 4. Release lock
   *
   * @param createDto - Booking creation data
   * @param userId - User ID creating the booking
   * @returns Created booking
   */
  async create(createDto: CreateBookingDto, userId: string): Promise<Booking> {
    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate pet exists and belongs to user
    const pet = await this.petRepository.findOne({
      where: { id: createDto.petId, ownerId: userId, isDeleted: false },
    });
    if (!pet) {
      throw new NotFoundException('Pet not found or does not belong to you');
    }

    // Validate resource (hospital) exists
    const hospital = await this.hospitalRepository.findOne({
      where: { id: createDto.resourceId, isDeleted: false },
    });
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }

    // Parse start time
    const startDateTime = new Date(createDto.startDateTime);
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + createDto.durationMinutes);

    // Validate booking time is in the future
    const now = new Date();
    if (startDateTime <= now) {
      throw new BadRequestException('Booking time must be in the future');
    }

    // Validate booking is within operating hours
    await this.validateOperatingHours(hospital, startDateTime, endDateTime);

    // Acquire distributed lock
    const lockKey = this.generateLockKey(createDto.resourceId, startDateTime);
    const lockAcquired = await this.acquireLock(lockKey);

    if (!lockAcquired) {
      throw new ConflictException('This time slot is currently being booked. Please try again.');
    }

    try {
      // Double-check slot availability within lock
      await this.validateSlotAvailability(createDto.resourceId, startDateTime, endDateTime);

      // Generate unique booking number
      const bookingNumber = await this.generateBookingNumber();

      // Create booking
      const booking = this.bookingRepository.create({
        userId,
        petId: createDto.petId,
        resourceType: createDto.resourceType,
        resourceId: createDto.resourceId,
        hospitalId: createDto.resourceType === 'hospital' ? createDto.resourceId : undefined,
        bookingNumber,
        type: createDto.type,
        startDateTime,
        endDateTime,
        durationMinutes: createDto.durationMinutes,
        status: BookingStatus.PENDING,
        notes: createDto.notes,
        services: createDto.services,
        estimatedPrice: createDto.estimatedPrice || 0,
        finalPrice: 0,
        paymentStatus: PaymentStatus.PENDING,
        lockKey,
        lockExpiresAt: new Date(Date.now() + this.LOCK_TIMEOUT * 1000),
      });

      const savedBooking = await this.bookingRepository.save(booking);

      // Invalidate slot cache
      const dateStr = startDateTime.toISOString().split('T')[0];
      await this.slotCalculatorService.invalidateSlotCache(createDto.resourceId, dateStr);

      // Audit log
      await this.auditService.log({
        userId,
        action: AuditAction.CREATE_USER, // Using existing enum value
        resource: 'booking',
        resourceId: savedBooking.id,
        purpose: '예약 생성',
        legalBasis: 'User consent',
        ipAddress: '0.0.0.0', // Should be injected from request
        userAgent: 'system',
        metadata: {
          bookingNumber,
          hospitalId: createDto.resourceId,
          startDateTime: startDateTime.toISOString(),
        },
      });

      this.logger.log(`Booking created: ${bookingNumber} for user ${userId}`);

      return savedBooking;
    } finally {
      // Always release lock
      await this.releaseLock(lockKey);
    }
  }

  /**
   * 📋 Get user's bookings with filters and pagination
   */
  async findAll(
    userId: string,
    filters: BookingFilterDto,
  ): Promise<{
    bookings: Booking[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { status, type, paymentStatus, hospitalId, petId, startDate, endDate } = filters;
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.hospital', 'hospital')
      .leftJoinAndSelect('booking.pet', 'pet')
      .where('booking.userId = :userId', { userId })
      .andWhere('booking.isDeleted = :isDeleted', { isDeleted: false });

    // Apply filters
    if (status) {
      queryBuilder.andWhere('booking.status = :status', { status });
    }
    if (type) {
      queryBuilder.andWhere('booking.type = :type', { type });
    }
    if (paymentStatus) {
      queryBuilder.andWhere('booking.paymentStatus = :paymentStatus', { paymentStatus });
    }
    if (hospitalId) {
      queryBuilder.andWhere('booking.hospitalId = :hospitalId', { hospitalId });
    }
    if (petId) {
      queryBuilder.andWhere('booking.petId = :petId', { petId });
    }
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      queryBuilder.andWhere('booking.startDateTime BETWEEN :start AND :end', { start, end });
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Sorting (newest first)
    queryBuilder.orderBy('booking.startDateTime', 'DESC');

    const [bookings, total] = await queryBuilder.getManyAndCount();

    return {
      bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 🔍 Get booking by ID
   */
  async findOne(id: string, userId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id, userId, isDeleted: false },
      relations: ['hospital', 'pet'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  /**
   * ❌ Cancel booking with refund calculation
   */
  async cancel(id: string, userId: string, reason?: string): Promise<Booking> {
    const booking = await this.findOne(id, userId);

    // Check if booking can be cancelled
    if (!booking.canBeCancelled()) {
      throw new BadRequestException('Booking cannot be cancelled');
    }

    // Calculate refund percentage
    const refundPercentage = booking.getRefundPercentage();

    // Update booking status
    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason;

    // Handle refund if payment was made
    if (booking.paymentStatus === PaymentStatus.PAID && refundPercentage > 0) {
      // TODO: Integrate with payment gateway for refund
      this.logger.log(
        `Refund ${refundPercentage}% for booking ${booking.bookingNumber}: ${(booking.finalPrice * refundPercentage) / 100}원`,
      );
    }

    const updated = await this.bookingRepository.save(booking);

    // Invalidate slot cache
    const dateStr = booking.startDateTime.toISOString().split('T')[0];
    await this.slotCalculatorService.invalidateSlotCache(booking.resourceId, dateStr);

    // Audit log
    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE_USER, // Using existing enum value
      resource: 'booking',
      resourceId: id,
      purpose: '예약 취소',
      legalBasis: 'User consent',
      ipAddress: '0.0.0.0',
      userAgent: 'system',
      metadata: {
        reason,
        refundPercentage,
      },
    });

    this.logger.log(`Booking cancelled: ${booking.bookingNumber}`);

    return updated;
  }

  /**
   * ✅ Confirm booking (hospital staff only)
   */
  async confirm(id: string, staffUserId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['hospital', 'pet', 'user'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be confirmed');
    }

    // Update status
    booking.status = BookingStatus.CONFIRMED;
    booking.confirmedAt = new Date();

    const updated = await this.bookingRepository.save(booking);

    this.eventEmitter.emit('booking.confirmed', {
      bookingId: updated.id,
      bookingNumber: updated.bookingNumber,
      userId: updated.userId,
      deviceToken: updated.user?.deviceToken,
    });

    // Audit log
    await this.auditService.log({
      userId: staffUserId,
      action: AuditAction.UPDATE_USER, // Using existing enum value
      resource: 'booking',
      resourceId: id,
      purpose: '예약 확정',
      legalBasis: 'Business operation',
      ipAddress: '0.0.0.0',
      userAgent: 'system',
      metadata: {
        bookingNumber: booking.bookingNumber,
        userId: booking.userId,
      },
    });

    this.logger.log(`Booking confirmed: ${booking.bookingNumber} by staff ${staffUserId}`);

    return updated;
  }

  /**
   * ❌ Reject booking (hospital staff only)
   * PENDING → CANCELLED with reason
   */
  async reject(id: string, staffUserId: string, reason: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['hospital', 'pet', 'user'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be rejected');
    }
    booking.status = BookingStatus.CANCELLED;
    booking.cancellationReason = reason;
    const updated = await this.bookingRepository.save(booking);
    this.eventEmitter.emit('booking.cancelled', {
      bookingId: updated.id,
      bookingNumber: updated.bookingNumber,
      userId: updated.userId,
      deviceToken: updated.user?.deviceToken,
      reason,
    });
    return updated;
  }

  /**
   * 🔒 Acquire distributed lock using Redis SET NX EX
   */
  private async acquireLock(lockKey: string, retries: number = 0): Promise<boolean> {
    try {
      const redis = this.cacheService.getClient();

      // Try to set lock with expiration
      const result = await redis.set(lockKey, '1', 'EX', this.LOCK_TIMEOUT, 'NX');

      if (result === 'OK') {
        this.logger.debug(`Lock acquired: ${lockKey}`);
        return true;
      }

      // Lock already exists, retry if within retry limit
      if (retries < this.MAX_LOCK_RETRIES) {
        await this.sleep(100 * (retries + 1)); // Exponential backoff
        return this.acquireLock(lockKey, retries + 1);
      }

      this.logger.warn(`Failed to acquire lock after ${this.MAX_LOCK_RETRIES} retries: ${lockKey}`);
      return false;
    } catch (error) {
      this.logger.error(`Error acquiring lock: ${lockKey}`, error);
      return false;
    }
  }

  /**
   * 🔓 Release distributed lock
   */
  private async releaseLock(lockKey: string): Promise<void> {
    try {
      await this.cacheService.del(lockKey);
      this.logger.debug(`Lock released: ${lockKey}`);
    } catch (error) {
      this.logger.error(`Error releasing lock: ${lockKey}`, error);
    }
  }

  /**
   * 🔑 Generate lock key for time slot
   */
  private generateLockKey(resourceId: string, startDateTime: Date): string {
    const timestamp = startDateTime.toISOString();
    return `booking:lock:${resourceId}:${timestamp}`;
  }

  /**
   * 🔢 Generate unique booking number
   */
  private async generateBookingNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `BOK-${dateStr}-${randomStr}`;
  }

  /**
   * ✅ Validate slot availability
   */
  private async validateSlotAvailability(
    resourceId: string,
    startDateTime: Date,
    endDateTime: Date,
  ): Promise<void> {
    const conflictingBooking = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.resourceId = :resourceId', { resourceId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
      })
      .andWhere(
        '(booking.startDateTime < :endDateTime AND booking.endDateTime > :startDateTime)',
        {
          startDateTime,
          endDateTime,
        },
      )
      .getOne();

    if (conflictingBooking) {
      throw new ConflictException('This time slot is already booked');
    }
  }

  /**
   * 🕐 Validate booking is within operating hours
   */
  private async validateOperatingHours(
    hospital: Hospital,
    startDateTime: Date,
    endDateTime: Date,
  ): Promise<void> {
    const dayOfWeek = startDateTime
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase();
    const operatingHours = hospital.operatingHours?.[dayOfWeek];

    if (!operatingHours || !operatingHours.isOpen) {
      throw new BadRequestException(`Hospital is closed on ${dayOfWeek}`);
    }

    const bookingStartTime = `${startDateTime.getHours().toString().padStart(2, '0')}:${startDateTime.getMinutes().toString().padStart(2, '0')}`;
    const bookingEndTime = `${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`;

    if (
      bookingStartTime < operatingHours.openTime ||
      bookingEndTime > operatingHours.closeTime
    ) {
      throw new BadRequestException(
        `Booking time must be within operating hours: ${operatingHours.openTime} - ${operatingHours.closeTime}`,
      );
    }

    // Check break time
    if (operatingHours.breakTime) {
      const breakStart = operatingHours.breakTime.startTime;
      const breakEnd = operatingHours.breakTime.endTime;
      if (
        (bookingStartTime >= breakStart && bookingStartTime < breakEnd) ||
        (bookingEndTime > breakStart && bookingEndTime <= breakEnd)
      ) {
        throw new BadRequestException(
          `Booking time cannot overlap with break time: ${breakStart} - ${breakEnd}`,
        );
      }
    }
  }

  /**
   * 💤 Sleep helper for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
