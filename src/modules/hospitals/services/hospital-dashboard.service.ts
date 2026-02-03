/**
 * Hospital Dashboard Service
 * Business logic for hospital staff operations
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Booking } from '../../booking/entities/booking.entity';
import { HealthNote } from '../../medical-records/entities/health-note.entity';
import { InsuranceClaim } from '../../insurance/entities/insurance-claim.entity';
import { HospitalPayment, HospitalPaymentStatus } from '../../payments/entities/hospital-payment.entity';
import { HospitalUser } from '../entities/hospital-user.entity';
import { EncryptionService } from '../../../core/encryption/encryption.service';
import { AuditService } from '../../../core/audit/audit.service';
import { AuditAction } from '../../../core/audit/entities/audit-log.entity';
import { CostValidatorService } from '../../../core/security/validators/cost-validator';
import {
  HospitalCreateMedicalRecordDto,
  HospitalUpdateMedicalRecordDto,
} from '../dto/create-medical-record.dto';
import {
  MedicalRecordCreatedEvent,
  MedicalRecordUpdatedEvent,
  EventNames,
} from '../../../core/events/event-types';

@Injectable()
export class HospitalDashboardService {
  private readonly logger = new Logger(HospitalDashboardService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(HealthNote)
    private readonly healthNoteRepository: Repository<HealthNote>,
    @InjectRepository(InsuranceClaim)
    private readonly claimRepository: Repository<InsuranceClaim>,
    @InjectRepository(HospitalPayment)
    private readonly paymentRepository: Repository<HospitalPayment>,
    private readonly encryptionService: EncryptionService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly costValidator: CostValidatorService,
  ) {}

  // ============================================================
  // Booking Management
  // ============================================================

  /**
   * Get completed bookings without medical records
   */
  async getCompletedBookings(hospitalId: string) {
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.pet', 'pet')
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoin('health_notes', 'hn', 'hn.booking_id = booking.id')
      .where('booking.hospital_id = :hospitalId', { hospitalId })
      .andWhere('booking.status = :status', { status: 'completed' })
      .andWhere('hn.id IS NULL') // No medical record yet
      .orderBy('booking.date', 'DESC')
      .addOrderBy('booking.time', 'DESC')
      .limit(50)
      .getMany();

    return bookings;
  }

  /**
   * Get dashboard statistics
   */
  async getStatistics(hospitalId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayBookings,
      completedPendingRecords,
      unsettledClaims,
      thisMonthRevenue,
    ] = await Promise.all([
      // Today's bookings
      this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.hospital_id = :hospitalId', { hospitalId })
        .andWhere('DATE(booking.date) = :date', { date: today.toISOString().split('T')[0] })
        .getCount(),

      // Completed bookings without records
      this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('health_notes', 'hn', 'hn.booking_id = booking.id')
        .where('booking.hospital_id = :hospitalId', { hospitalId })
        .andWhere('booking.status = :status', { status: 'completed' })
        .andWhere('hn.id IS NULL')
        .getCount(),

      // Unsettled claims
      this.paymentRepository.count({
        where: {
          hospitalId,
          status: HospitalPaymentStatus.PENDING,
        },
      }),

      // This month's revenue
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(payment.amount), 0)', 'total')
        .where('payment.hospital_id = :hospitalId', { hospitalId })
        .andWhere('payment.status = :status', { status: 'completed' })
        .andWhere('EXTRACT(MONTH FROM payment.completed_at) = :month', {
          month: new Date().getMonth() + 1,
        })
        .andWhere('EXTRACT(YEAR FROM payment.completed_at) = :year', {
          year: new Date().getFullYear(),
        })
        .getRawOne()
        .then((result) => parseInt(result.total) || 0),
    ]);

    return {
      todayBookings,
      completedPendingRecords,
      unsettledClaims,
      thisMonthRevenue,
      statisticsDate: new Date().toISOString(),
    };
  }

  // ============================================================
  // Medical Records
  // ============================================================

  /**
   * Create medical record from hospital dashboard
   */
  async createMedicalRecord(
    hospitalId: string,
    hospitalUserId: string,
    createDto: HospitalCreateMedicalRecordDto,
  ): Promise<HealthNote> {
    try {
      // 1. Verify booking exists and belongs to hospital
      const booking = await this.bookingRepository.findOne({
        where: {
          id: createDto.bookingId,
          hospitalId,
        },
        relations: ['pet', 'user'],
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.status !== 'completed') {
        throw new BadRequestException('Booking must be completed first');
      }

      // 2. Check if medical record already exists
      const existing = await this.healthNoteRepository.findOne({
        where: { bookingId: createDto.bookingId },
      });

      if (existing) {
        throw new BadRequestException(
          'Medical record already exists for this booking',
        );
      }

      // 3. Encrypt sensitive fields
      const [diagnosisEncrypted, treatmentEncrypted, prescriptionEncrypted] =
        await Promise.all([
          this.encryptionService.encrypt(createDto.diagnosis),
          this.encryptionService.encrypt(createDto.treatment),
          createDto.prescription
            ? this.encryptionService.encrypt(createDto.prescription)
            : null,
        ]);

      // 4. Calculate total cost
      const totalCost =
        (createDto.costBreakdown.consultation || 0) +
        (createDto.costBreakdown.procedures || 0) +
        (createDto.costBreakdown.medication || 0) +
        (createDto.costBreakdown.hospitalization || 0) +
        (createDto.costBreakdown.diagnosticTests || 0) +
        (createDto.costBreakdown.supplies || 0) +
        (createDto.costBreakdown.other || 0);

      // ⭐ SECURITY FIX: HIGH-003 - Validate costs
      // 1. Validate breakdown matches total
      const breakdownValidation = this.costValidator.validateCostBreakdown(
        createDto.costBreakdown,
        createDto.actualCost,
        100,
      );

      if (!breakdownValidation.isValid) {
        this.logger.warn(`Cost breakdown validation failed: ${breakdownValidation.reason}`);
        throw new BadRequestException(breakdownValidation.reason);
      }

      // 2. Validate cost is reasonable for visit type
      const costValidation = this.costValidator.validateCost(
        createDto.visitType,
        createDto.actualCost,
      );

      if (!costValidation.isValid) {
        this.logger.warn(`Cost validation failed: ${costValidation.reason}`);
        throw new BadRequestException(costValidation.reason);
      }

      // 3. Detect suspicious patterns
      const suspiciousCheck = this.costValidator.detectSuspiciousPatterns(
        createDto.costBreakdown,
        createDto.actualCost,
      );

      if (suspiciousCheck.isSuspicious) {
        this.logger.warn(
          `Suspicious cost pattern detected: ${suspiciousCheck.flags.join(', ')}`,
        );
        // Log for review but don't block (might be legitimate)
      }

      // 4. Flag for manual review if cost is unusually high
      const requiresManualReview = costValidation.requiresManualReview || suspiciousCheck.isSuspicious;

      // 5. Create health note
      const healthNote = this.healthNoteRepository.create({
        petId: createDto.petId,
        bookingId: createDto.bookingId,
        hospitalId,
        visitDate: createDto.visitDate,
        visitReason: createDto.visitReason,
        visitType: createDto.visitType,
        diagnosisEncrypted,
        treatmentEncrypted,
        prescriptionEncrypted: prescriptionEncrypted || undefined,
        veterinarianName: createDto.veterinarianName,
        veterinarianLicense: createDto.veterinarianLicense,
        hospitalName: booking.hospital?.name || 'Unknown Hospital',

        // Cost information
        actualCost: createDto.actualCost,
        costBreakdown: createDto.costBreakdown,
        serviceItems: createDto.serviceItems,
        totalCost,

        // Payment information
        payment: createDto.payment,
        paymentMethod: createDto.payment.paymentMethod,

        // Documents
        documents: createDto.documents,

        // Metadata
        notes: createDto.notes,
        procedureCode: createDto.procedureCode,
        diagnosisCode: createDto.diagnosisCode,
        createdBy: 'hospital_staff',
        recordStatus: 'completed',
        isEmergency: createDto.visitType === '응급',
      } as any);

      const saveResult = await this.healthNoteRepository.save(healthNote);
      const savedNote: any = Array.isArray(saveResult) ? saveResult[0] : saveResult;

      // 6. Audit log
      await this.auditService.log({
        userId: hospitalUserId,
        action: AuditAction.CREATE_MEDICAL_RECORD,
        resource: 'HealthNote',
        resourceId: savedNote?.id || 'unknown',
        purpose: 'Hospital staff creating medical record',
        legalBasis: 'Medical treatment documentation - 의료법 Article 22',
        ipAddress: '127.0.0.1', // TODO: Get from request context
        userAgent: 'Hospital Dashboard',
      });

      // 7. Emit event for auto-claim generation ⭐
      this.eventEmitter.emit(
        EventNames.MEDICAL_RECORD_CREATED,
        new MedicalRecordCreatedEvent(
          savedNote?.id || '',
          savedNote?.petId || createDto.petId,
          booking.userId,
          hospitalId,
          savedNote?.actualCost,
          savedNote?.documents && savedNote.documents.length > 0,
        ),
      );

      this.logger.log(
        `Hospital medical record created: ${savedNote?.id} for booking: ${createDto.bookingId}`,
      );

      return savedNote as HealthNote;
    } catch (error) {
      this.logger.error('Failed to create hospital medical record:', error);
      throw error;
    }
  }

  /**
   * Update medical record (restricted)
   */
  async updateMedicalRecord(
    hospitalId: string,
    hospitalUserId: string,
    recordId: string,
    updateDto: HospitalUpdateMedicalRecordDto,
  ): Promise<HealthNote> {
    try {
      // 1. Fetch record
      const record = await this.healthNoteRepository.findOne({
        where: { id: recordId, hospitalId },
      });

      if (!record) {
        throw new NotFoundException('Medical record not found');
      }

      // 2. Check if editable
      if (record.claimStatus && record.claimStatus !== 'draft') {
        throw new ForbiddenException(
          'Cannot edit record with submitted claim',
        );
      }

      // 3. Track changes
      const costChanged =
        updateDto.actualCost !== undefined &&
        updateDto.actualCost !== record.actualCost;
      const documentsAdded =
        updateDto.documents &&
        updateDto.documents.length > (record.documents?.length || 0);

      // 4. Recalculate total if cost breakdown changed
      let totalCost = record.totalCost;
      if (updateDto.costBreakdown) {
        totalCost =
          (updateDto.costBreakdown.consultation || 0) +
          (updateDto.costBreakdown.procedures || 0) +
          (updateDto.costBreakdown.medication || 0) +
          (updateDto.costBreakdown.hospitalization || 0) +
          (updateDto.costBreakdown.diagnosticTests || 0) +
          (updateDto.costBreakdown.supplies || 0) +
          (updateDto.costBreakdown.other || 0);
      }

      // 5. Build update data (only include provided fields)
      const updateData: any = {};

      if (updateDto.actualCost !== undefined) updateData.actualCost = updateDto.actualCost;
      if (updateDto.costBreakdown !== undefined) updateData.costBreakdown = updateDto.costBreakdown;
      if (updateDto.serviceItems !== undefined) updateData.serviceItems = updateDto.serviceItems;
      if (updateDto.payment !== undefined) updateData.payment = updateDto.payment;
      if (updateDto.documents !== undefined) updateData.documents = updateDto.documents;
      if (updateDto.notes !== undefined) updateData.notes = updateDto.notes;
      if (totalCost !== record.totalCost) updateData.totalCost = totalCost;

      // Update record
      await this.healthNoteRepository.update(recordId, updateData);

      // Re-fetch updated record
      const updated = await this.healthNoteRepository.findOne({
        where: { id: recordId },
      });

      if (!updated) {
        throw new NotFoundException('Failed to retrieve updated record');
      }

      // 6. Audit log
      await this.auditService.log({
        userId: hospitalUserId,
        action: AuditAction.UPDATE_MEDICAL_RECORD,
        resource: 'HealthNote',
        resourceId: recordId,
        purpose: 'Hospital staff updating medical record',
        legalBasis: 'Medical treatment documentation update - 의료법 Article 22',
        ipAddress: '127.0.0.1', // TODO: Get from request context
        userAgent: 'Hospital Dashboard',
      });

      // 7. Emit update event if significant changes
      if (costChanged || documentsAdded) {
        this.eventEmitter.emit(
          EventNames.MEDICAL_RECORD_UPDATED,
          new MedicalRecordUpdatedEvent(
            recordId,
            record.petId,
            (record.pet as any)?.userId || (record.pet as any)?.ownerId || 'unknown',
            costChanged,
            documentsAdded || false,
          ),
        );
      }

      this.logger.log(`Hospital medical record updated: ${recordId}`);

      return updated as HealthNote;
    } catch (error) {
      this.logger.error('Failed to update hospital medical record:', error);
      throw error;
    }
  }

  /**
   * Get medical records for hospital
   */
  async getMedicalRecords(
    hospitalId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
      limit?: number;
    },
  ) {
    const query = this.healthNoteRepository
      .createQueryBuilder('hn')
      .leftJoinAndSelect('hn.pet', 'pet')
      .where('hn.hospital_id = :hospitalId', { hospitalId })
      .andWhere('hn.is_deleted = :isDeleted', { isDeleted: false });

    if (options?.startDate) {
      query.andWhere('hn.visit_date >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options?.endDate) {
      query.andWhere('hn.visit_date <= :endDate', { endDate: options.endDate });
    }

    if (options?.status) {
      query.andWhere('hn.record_status = :status', { status: options.status });
    }

    query.orderBy('hn.visit_date', 'DESC').limit(options?.limit || 50);

    const records = await query.getMany();

    // Decrypt sensitive fields
    for (const record of records) {
      if (record.diagnosisEncrypted) {
        record.diagnosis = await this.encryptionService.decrypt(
          record.diagnosisEncrypted,
        );
      }
      if (record.treatmentEncrypted) {
        record.treatment = await this.encryptionService.decrypt(
          record.treatmentEncrypted,
        );
      }
    }

    return records;
  }

  /**
   * Get claims for hospital
   */
  async getClaims(hospitalId: string, status?: string) {
    const query = this.claimRepository
      .createQueryBuilder('claim')
      .leftJoinAndSelect('claim.policy', 'policy')
      .leftJoinAndSelect('claim.pet', 'pet')
      .where('claim.hospital_id = :hospitalId', { hospitalId });

    if (status) {
      query.andWhere('claim.status = :status', { status });
    }

    query.orderBy('claim.created_at', 'DESC').limit(100);

    return query.getMany();
  }

  /**
   * Get payments for hospital
   */
  async getPayments(hospitalId: string, status?: string) {
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.claim', 'claim')
      .where('payment.hospital_id = :hospitalId', { hospitalId });

    if (status) {
      query.andWhere('payment.status = :status', { status });
    }

    query.orderBy('payment.created_at', 'DESC').limit(100);

    return query.getMany();
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(hospitalId: string, paymentId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, hospitalId },
      relations: ['claim', 'hospital'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }
}
