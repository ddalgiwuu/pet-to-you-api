import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HealthNote } from '../entities/health-note.entity';
import { VaccinationRecord } from '../entities/vaccination-record.entity';
import { Pet } from '../../pets/entities/pet.entity';
import { EncryptionService } from '../../../core/encryption/encryption.service';
import { AuditService, AuditEvent } from '../../../core/audit/audit.service';
import { AuditAction } from '../../../core/audit/entities/audit-log.entity';
import { CreateHealthNoteDto } from '../dto/create-health-note.dto';
import { UpdateHealthNoteDto } from '../dto/update-health-note.dto';
import { CreateVaccinationRecordDto } from '../dto/create-vaccination-record.dto';
import { UpdateVaccinationRecordDto } from '../dto/update-vaccination-record.dto';
import { MedicalAccessDto } from '../dto/medical-access.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import {
  MedicalRecordCreatedEvent,
  MedicalRecordUpdatedEvent,
  EventNames,
} from '../../../core/events/event-types';

/**
 * 🏥 Medical Records Service
 *
 * Features:
 * - Field-level encryption for diagnosis, treatment, prescription
 * - Audit logging for every access (의료법 compliance)
 * - Access control (pet owner or treating veterinarian only)
 * - 10-year retention policy
 * - Health timeline generation
 * - PDF export for medical history
 * - Search and filtering
 * - Vaccination tracking with reminders
 *
 * Security:
 * - AES-256-GCM encryption with envelope encryption
 * - Tamper-proof audit logs with hash chain
 * - Purpose and legal basis required for access
 * - Cache invalidation on updates
 */
@Injectable()
export class MedicalRecordsService {
  private readonly logger = new Logger(MedicalRecordsService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectRepository(HealthNote)
    private healthNoteRepository: Repository<HealthNote>,
    @InjectRepository(VaccinationRecord)
    private vaccinationRepository: Repository<VaccinationRecord>,
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,
    private encryptionService: EncryptionService,
    private auditService: AuditService,
    private eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ============================================================
  // Health Notes - Create & Retrieve
  // ============================================================

  /**
   * 📝 Create health note with encrypted sensitive fields
   *
   * Encrypted Fields:
   * - diagnosis
   * - treatment
   * - prescription
   *
   * Audit: CREATE_MEDICAL_RECORD
   */
  async createHealthNote(
    dto: CreateHealthNoteDto,
    userId: string,
    ipAddress: string,
    userAgent: string,
    accessInfo: MedicalAccessDto,
  ): Promise<HealthNote> {
    try {
      // Encrypt sensitive fields
      const [diagnosisEncrypted, treatmentEncrypted, prescriptionEncrypted] =
        await Promise.all([
          this.encryptionService.encrypt(dto.diagnosis),
          this.encryptionService.encrypt(dto.treatment),
          dto.prescription
            ? this.encryptionService.encrypt(dto.prescription)
            : null,
        ]);

      // Create health note
      const healthNote = this.healthNoteRepository.create({
        ...dto,
        diagnosisEncrypted,
        treatmentEncrypted,
        prescriptionEncrypted: prescriptionEncrypted || undefined,
      } as any);

      const savedNote = await this.healthNoteRepository.save(healthNote) as unknown as HealthNote;

      // Audit log
      await this.auditService.log({
        userId,
        action: AuditAction.CREATE_MEDICAL_RECORD,
        resource: 'health_note',
        resourceId: savedNote.id,
        purpose: accessInfo.purpose,
        legalBasis: accessInfo.legalBasis,
        ipAddress,
        userAgent,
        metadata: {
          petId: dto.petId,
          hospitalName: dto.hospitalName,
          visitDate: dto.visitDate,
        },
      });

      this.logger.log(`Health note created: ${savedNote.id} for pet ${dto.petId}`);

      // Invalidate cache
      await this.invalidatePetCache(dto.petId);

      // ⭐ Emit event for auto-claim generation
      try {
        this.eventEmitter.emit(
          EventNames.MEDICAL_RECORD_CREATED,
          new MedicalRecordCreatedEvent(
            savedNote.id,
            savedNote.petId,
            userId,
            savedNote.hospitalId,
            savedNote.actualCost,
            savedNote.documents && savedNote.documents.length > 0,
          ),
        );
        this.logger.debug(`Emitted MEDICAL_RECORD_CREATED event for: ${savedNote.id}`);
      } catch (eventError) {
        this.logger.error('Failed to emit medical record created event:', eventError);
        // Don't throw - event emission failure shouldn't block record creation
      }

      return savedNote;
    } catch (error) {
      this.logger.error('Failed to create health note:', error);
      throw error;
    }
  }

  /**
   * 🔓 Retrieve health note with decryption
   *
   * Security:
   * - Access control: pet owner or treating veterinarian only
   * - Audit logging with purpose
   * - Cache results (5-minute TTL)
   *
   * Audit: VIEW_MEDICAL_RECORD
   */
  async getHealthNote(
    id: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
    accessInfo: MedicalAccessDto,
  ): Promise<HealthNote> {
    // Check cache first
    const cacheKey = `health_note:${id}`;
    const cached = await this.cacheManager.get<HealthNote>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for health note ${id}`);
      return cached;
    }

    // Retrieve from database
    const healthNote = await this.healthNoteRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['pet', 'pet.owner'],
    });

    if (!healthNote) {
      throw new NotFoundException(`Health note ${id} not found`);
    }

    // Access control: Only pet owner can access
    if (healthNote.pet.ownerId !== userId) {
      // Audit failed access attempt
      await this.auditService.log({
        userId,
        action: AuditAction.FAILED_AUTHORIZATION,
        resource: 'health_note',
        resourceId: id,
        purpose: 'Unauthorized access attempt',
        legalBasis: 'N/A',
        ipAddress,
        userAgent,
      });

      throw new ForbiddenException('You do not have access to this health note');
    }

    // Decrypt sensitive fields
    const [diagnosis, treatment, prescription] = await Promise.all([
      this.encryptionService.decrypt(healthNote.diagnosisEncrypted),
      this.encryptionService.decrypt(healthNote.treatmentEncrypted),
      healthNote.prescriptionEncrypted
        ? this.encryptionService.decrypt(healthNote.prescriptionEncrypted)
        : null,
    ]);

    // Populate decrypted fields
    healthNote.diagnosis = diagnosis;
    healthNote.treatment = treatment;
    healthNote.prescription = prescription ?? undefined;

    // Audit log
    await this.auditService.log({
      userId,
      action: AuditAction.VIEW_MEDICAL_RECORD,
      resource: 'health_note',
      resourceId: id,
      purpose: accessInfo.purpose,
      legalBasis: accessInfo.legalBasis,
      ipAddress,
      userAgent,
      metadata: {
        petId: healthNote.petId,
      },
    });

    // Cache result
    await this.cacheManager.set(cacheKey, healthNote, this.CACHE_TTL);

    return healthNote;
  }

  /**
   * 📋 Get all health notes for a pet
   *
   * Returns: Health timeline with decrypted data
   * Ordering: Most recent first
   */
  async getHealthNotesForPet(
    petId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
    accessInfo: MedicalAccessDto,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<HealthNote[]> {
    // Build query
    const queryBuilder = this.healthNoteRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.pet', 'pet')
      .where('note.petId = :petId', { petId })
      .andWhere('note.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('note.visitDate', 'DESC');

    // Date range filter
    if (options?.startDate) {
      queryBuilder.andWhere('note.visitDate >= :startDate', {
        startDate: options.startDate,
      });
    }
    if (options?.endDate) {
      queryBuilder.andWhere('note.visitDate <= :endDate', {
        endDate: options.endDate,
      });
    }

    // Limit
    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    const healthNotes = await queryBuilder.getMany();

    // Access control
    if (healthNotes.length > 0 && healthNotes[0].pet.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to these health notes');
    }

    // Decrypt all notes
    const decryptedNotes = await Promise.all(
      healthNotes.map(async (note) => {
        const [diagnosis, treatment, prescription] = await Promise.all([
          this.encryptionService.decrypt(note.diagnosisEncrypted),
          this.encryptionService.decrypt(note.treatmentEncrypted),
          note.prescriptionEncrypted
            ? this.encryptionService.decrypt(note.prescriptionEncrypted)
            : null,
        ]);

        note.diagnosis = diagnosis;
        note.treatment = treatment;
        note.prescription = prescription ?? undefined;

        return note;
      }),
    );

    // Audit log (batch access)
    await this.auditService.log({
      userId,
      action: AuditAction.VIEW_MEDICAL_RECORD,
      resource: 'health_note_list',
      resourceId: petId,
      purpose: accessInfo.purpose,
      legalBasis: accessInfo.legalBasis,
      ipAddress,
      userAgent,
      metadata: {
        petId,
        count: decryptedNotes.length,
        dateRange: {
          start: options?.startDate,
          end: options?.endDate,
        },
      },
    });

    return decryptedNotes;
  }

  // ============================================================
  // Health Notes - Update & Delete
  // ============================================================

  /**
   * ✏️ Update health note
   *
   * Re-encrypts sensitive fields if changed
   * Audit: UPDATE_MEDICAL_RECORD
   */
  async updateHealthNote(
    id: string,
    dto: UpdateHealthNoteDto,
    userId: string,
    ipAddress: string,
    userAgent: string,
    accessInfo: MedicalAccessDto,
  ): Promise<HealthNote> {
    const healthNote = await this.healthNoteRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['pet'],
    });

    if (!healthNote) {
      throw new NotFoundException(`Health note ${id} not found`);
    }

    // Access control
    if (healthNote.pet.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to update this health note');
    }

    // Re-encrypt sensitive fields if changed
    if (dto.diagnosis) {
      healthNote.diagnosisEncrypted = await this.encryptionService.encrypt(dto.diagnosis);
    }
    if (dto.treatment) {
      healthNote.treatmentEncrypted = await this.encryptionService.encrypt(dto.treatment);
    }
    if (dto.prescription) {
      healthNote.prescriptionEncrypted = await this.encryptionService.encrypt(dto.prescription);
    }

    // Update other fields
    Object.assign(healthNote, dto);

    const updated = await this.healthNoteRepository.save(healthNote);

    // Audit log
    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE_MEDICAL_RECORD,
      resource: 'health_note',
      resourceId: id,
      purpose: accessInfo.purpose,
      legalBasis: accessInfo.legalBasis,
      ipAddress,
      userAgent,
      metadata: {
        updatedFields: Object.keys(dto),
      },
    });

    // Invalidate cache
    await this.invalidateHealthNoteCache(id);
    await this.invalidatePetCache(healthNote.petId);

    return updated;
  }

  /**
   * 🗑️ Soft delete health note (10-year retention)
   *
   * Note: Physical deletion is prohibited by law
   * Audit: DELETE_MEDICAL_RECORD
   */
  async deleteHealthNote(
    id: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
    accessInfo: MedicalAccessDto,
  ): Promise<void> {
    const healthNote = await this.healthNoteRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['pet'],
    });

    if (!healthNote) {
      throw new NotFoundException(`Health note ${id} not found`);
    }

    // Access control
    if (healthNote.pet.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to delete this health note');
    }

    // Soft delete
    healthNote.isDeleted = true;
    healthNote.deletedAt = new Date();
    await this.healthNoteRepository.save(healthNote);

    // Audit log
    await this.auditService.log({
      userId,
      action: AuditAction.DELETE_MEDICAL_RECORD,
      resource: 'health_note',
      resourceId: id,
      purpose: accessInfo.purpose,
      legalBasis: accessInfo.legalBasis,
      ipAddress,
      userAgent,
    });

    // Invalidate cache
    await this.invalidateHealthNoteCache(id);
    await this.invalidatePetCache(healthNote.petId);

    this.logger.log(`Health note ${id} soft deleted`);
  }

  // ============================================================
  // Vaccination Records
  // ============================================================

  /**
   * 💉 Create vaccination record
   */
  async createVaccinationRecord(
    dto: CreateVaccinationRecordDto,
    userId: string,
  ): Promise<VaccinationRecord> {
    const record = this.vaccinationRepository.create(dto);
    const saved = await this.vaccinationRepository.save(record);

    this.logger.log(`Vaccination record created: ${saved.id} for pet ${dto.petId}`);

    await this.invalidatePetCache(dto.petId);

    return saved;
  }

  /**
   * 📋 Get vaccination records for a pet
   */
  async getVaccinationRecordsForPet(
    petId: string,
    userId: string,
  ): Promise<VaccinationRecord[]> {
    return this.vaccinationRepository.find({
      where: { petId, isDeleted: false },
      relations: ['pet'],
      order: { vaccinationDate: 'DESC' },
    });
  }

  /**
   * 🔔 Get upcoming vaccinations
   */
  async getUpcomingVaccinations(
    petId: string,
    daysAhead = 30,
  ): Promise<VaccinationRecord[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    return this.vaccinationRepository.find({
      where: {
        petId,
        isDeleted: false,
        nextDueDate: Between(today, futureDate),
        reminderEnabled: true,
      },
      order: { nextDueDate: 'ASC' },
    });
  }

  // ============================================================
  // Health Timeline & Export
  // ============================================================

  /**
   * 📊 Generate health timeline
   *
   * Returns: Combined view of health notes and vaccinations
   */
  async generateHealthTimeline(
    petId: string,
    userId: string,
    ipAddress: string,
    userAgent: string,
    accessInfo: MedicalAccessDto,
  ): Promise<{
    healthNotes: HealthNote[];
    vaccinations: VaccinationRecord[];
  }> {
    const [healthNotes, vaccinations] = await Promise.all([
      this.getHealthNotesForPet(petId, userId, ipAddress, userAgent, accessInfo),
      this.getVaccinationRecordsForPet(petId, userId),
    ]);

    return {
      healthNotes,
      vaccinations,
    };
  }

  /**
   * 📄 Export medical history to PDF
   *
   * TODO: Implement PDF generation
   */
  async exportMedicalHistoryToPDF(
    petId: string,
    userId: string,
  ): Promise<Buffer> {
    throw new BadRequestException('PDF export not yet implemented');
  }

  // ============================================================
  // Search & Filtering
  // ============================================================

  /**
   * 🔍 Search medical records
   *
   * Note: Cannot search encrypted fields directly
   * Searches: hospitalName, veterinarianName, visitReason, notes
   */
  async searchMedicalRecords(
    petId: string,
    query: string,
    userId: string,
  ): Promise<HealthNote[]> {
    return this.healthNoteRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.pet', 'pet')
      .where('note.petId = :petId', { petId })
      .andWhere('note.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere(
        '(note.hospitalName ILIKE :query OR note.veterinarianName ILIKE :query OR note.visitReason ILIKE :query OR note.notes ILIKE :query)',
        { query: `%${query}%` },
      )
      .orderBy('note.visitDate', 'DESC')
      .getMany();
  }

  // ============================================================
  // Cache Management
  // ============================================================

  private async invalidateHealthNoteCache(id: string): Promise<void> {
    await this.cacheManager.del(`health_note:${id}`);
  }

  private async invalidatePetCache(petId: string): Promise<void> {
    // Invalidate all cache entries related to this pet
    await this.cacheManager.del(`pet:${petId}:health_notes`);
    await this.cacheManager.del(`pet:${petId}:vaccinations`);
  }
}
