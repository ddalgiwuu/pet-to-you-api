import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { EncryptionService } from '../../../core/encryption/encryption.service';
import { AuditService } from '../../../core/audit/audit.service';
import { AuditAction } from '../../../core/audit/entities/audit-log.entity';
import { User } from '../../../modules/users/entities/user.entity';
import { Pet } from '../../../modules/pets/entities/pet.entity';
import { Booking } from '../../booking/entities/booking.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { HealthNote } from '../../medical-records/entities/health-note.entity';
import { VaccinationRecord } from '../../medical-records/entities/vaccination-record.entity';
import { Review } from '../../community/entities/review.entity';
import * as archiver from 'archiver';
import { Readable } from 'stream';

/**
 * 📦 Data Export Service
 *
 * PIPA Article 35: Right to Data Portability
 * - Users can request export of all their personal data
 * - Data must be provided in structured, machine-readable format
 * - Export must include all data categories
 *
 * Features:
 * - Export user profile, pets, bookings, payments, medical records
 * - Decrypt sensitive data for export
 * - Generate downloadable archive (ZIP)
 * - Audit log all exports (compliance requirement)
 * - Support JSON and CSV formats
 *
 * Security:
 * - Verify user identity before export
 * - Rate limiting (max 3 exports per day)
 * - Temporary download links (24-hour expiry)
 * - Comprehensive audit trail
 */
@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);
  private readonly MAX_EXPORTS_PER_DAY = 3;

  constructor(
    private encryptionService: EncryptionService,
    private auditService: AuditService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Pet)
    private petRepository: Repository<Pet>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(HealthNote)
    private healthNoteRepository: Repository<HealthNote>,
    @InjectRepository(VaccinationRecord)
    private vaccinationRepository: Repository<VaccinationRecord>,
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
  ) {}

  /**
   * 📤 Export all user personal data
   *
   * PIPA Compliance:
   * - Article 35: Data portability right
   * - Article 36: Data access right
   *
   * Process:
   * 1. Verify user identity
   * 2. Check rate limits
   * 3. Collect all user data
   * 4. Decrypt sensitive fields
   * 5. Format as JSON/CSV
   * 6. Create downloadable archive
   * 7. Audit log the export
   *
   * @param userId - User requesting data export
   * @param format - Export format (json or csv)
   * @param ipAddress - Request IP address
   * @param userAgent - Request user agent
   * @returns Archive buffer and metadata
   */
  async exportUserData(
    userId: string,
    format: 'json' | 'csv',
    ipAddress: string,
    userAgent: string,
  ): Promise<{
    archive: Buffer;
    filename: string;
    size: number;
  }> {
    this.logger.log(`Starting data export for user ${userId}, format: ${format}`);

    // 1. Verify user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // 2. Check rate limits
    await this.checkExportRateLimit(userId);

    try {
      // 3. Collect all data
      const exportData = await this.collectUserData(userId);

      // 4. Format data
      const formattedData =
        format === 'json'
          ? this.formatAsJSON(exportData)
          : this.formatAsCSV(exportData);

      // 5. Create archive
      const { archive, size } = await this.createArchive(formattedData, format);

      // 6. Audit log
      await this.auditService.log({
        userId,
        action: AuditAction.DATA_EXPORT,
        resource: 'user_data',
        resourceId: userId,
        purpose: 'User requested data portability (PIPA Article 35)',
        legalBasis: 'PIPA Article 35 - Right to Data Portability',
        ipAddress,
        userAgent,
        metadata: {
          format,
          dataCategories: Object.keys(exportData),
          archiveSize: size,
        },
      });

      this.logger.log(
        `Data export completed for user ${userId}, size: ${size} bytes`,
      );

      return {
        archive,
        filename: `pet-to-you-data-export-${userId}-${Date.now()}.zip`,
        size,
      };
    } catch (error) {
      this.logger.error(`Data export failed for user ${userId}:`, error);

      // Audit log failure
      await this.auditService.log({
        userId,
        action: AuditAction.DATA_EXPORT_FAILED,
        resource: 'user_data',
        resourceId: userId,
        purpose: 'Data export attempt failed',
        legalBasis: 'PIPA Article 35',
        ipAddress,
        userAgent,
        metadata: {
          error: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * 📊 Collect all user data from all modules
   *
   * Data Categories (PIPA compliance):
   * 1. User Profile (name, email, phone, address)
   * 2. Pets (pet details, photos)
   * 3. Bookings (daycare, hospital appointments)
   * 4. Payments (transaction history)
   * 5. Medical Records (health notes, vaccinations - decrypted)
   * 6. Reviews (user reviews and ratings)
   * 7. Audit Logs (access history)
   *
   * @param userId - User ID
   * @returns Complete user data object
   */
  private async collectUserData(userId: string): Promise<{
    userProfile: any;
    pets: any[];
    bookings: any[];
    payments: any[];
    medicalRecords: any[];
    vaccinations: any[];
    reviews: any[];
    auditLogs: any[];
  }> {
    this.logger.debug(`Collecting data for user ${userId}`);

    // Fetch all data in parallel for performance
    const [
      userProfile,
      pets,
      bookings,
      payments,
      medicalRecords,
      vaccinations,
      reviews,
      auditLogs,
    ] = await Promise.all([
      this.getUserProfile(userId),
      this.getUserPets(userId),
      this.getUserBookings(userId),
      this.getUserPayments(userId),
      this.getUserMedicalRecords(userId),
      this.getUserVaccinations(userId),
      this.getUserReviews(userId),
      this.getUserAuditLogs(userId),
    ]);

    return {
      userProfile,
      pets,
      bookings,
      payments,
      medicalRecords,
      vaccinations,
      reviews,
      auditLogs,
    };
  }

  /**
   * 👤 Get user profile data
   */
  private async getUserProfile(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'email',
        'name',
        'phoneNumber',
        'profileImageUrl',
        'role',
        'status',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phoneNumber: user.phoneNumber,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
      status: user.status,
      accountCreatedAt: user.createdAt,
      lastUpdatedAt: user.updatedAt,
    };
  }

  /**
   * 🐕 Get all pets owned by user
   */
  private async getUserPets(userId: string): Promise<any[]> {
    const pets = await this.petRepository.find({
      where: { ownerId: userId, isDeleted: false },
      relations: ['breed'],
    });

    return pets.map((pet) => ({
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      dateOfBirth: pet.dateOfBirth,
      gender: pet.gender,
      weight: pet.weight,
      isNeutered: pet.isNeutered,
      microchipNumber: pet.microchipNumber,
      specialNeeds: pet.specialNeeds,
      photoUrls: pet.photoUrls,
      createdAt: pet.createdAt,
    }));
  }

  /**
   * 📅 Get all bookings (daycare, hospital)
   */
  private async getUserBookings(userId: string): Promise<any[]> {
    const bookings = await this.bookingRepository.find({
      where: { userId },
      relations: ['pet', 'daycare', 'hospital'],
      order: { createdAt: 'DESC' },
    });

    return bookings.map((booking) => ({
      id: booking.id,
      type: booking.type,
      pet: booking.pet?.name,
      facility: booking.hospital?.name,
      startDate: booking.startDateTime,
      endDate: booking.endDateTime,
      status: booking.status,
      totalAmount: booking.finalPrice,
      notes: booking.notes,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    }));
  }

  /**
   * 💳 Get payment history
   */
  private async getUserPayments(userId: string): Promise<any[]> {
    const payments = await this.paymentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      description: payment.description,
      createdAt: payment.createdAt,
    }));
  }

  /**
   * 🏥 Get medical records (decrypted)
   *
   * CRITICAL: Decrypt diagnosis, treatment, prescription
   * 의료법 compliance: 10-year retention requirement
   */
  private async getUserMedicalRecords(userId: string): Promise<any[]> {
    const healthNotes = await this.healthNoteRepository.find({
      where: { pet: { ownerId: userId }, isDeleted: false },
      relations: ['pet'],
      order: { visitDate: 'DESC' },
    });

    // Decrypt all medical records
    const decrypted = await Promise.all(
      healthNotes.map(async (note) => {
        const [diagnosis, treatment, prescription] = await Promise.all([
          this.encryptionService.decrypt(note.diagnosisEncrypted),
          this.encryptionService.decrypt(note.treatmentEncrypted),
          note.prescriptionEncrypted
            ? this.encryptionService.decrypt(note.prescriptionEncrypted)
            : null,
        ]);

        return {
          id: note.id,
          petName: note.pet.name,
          hospitalName: note.hospitalName,
          veterinarianName: note.veterinarianName,
          visitDate: note.visitDate,
          visitReason: note.visitReason,
          diagnosis, // Decrypted
          treatment, // Decrypted
          prescription, // Decrypted
          followUpDate: note.nextAppointmentDate,
          cost: note.totalCost,
          notes: note.notes,
          createdAt: note.createdAt,
        };
      }),
    );

    return decrypted;
  }

  /**
   * 💉 Get vaccination records
   */
  private async getUserVaccinations(userId: string): Promise<any[]> {
    const vaccinations = await this.vaccinationRepository.find({
      where: { pet: { ownerId: userId }, isDeleted: false },
      relations: ['pet'],
      order: { vaccinationDate: 'DESC' },
    });

    return vaccinations.map((vac) => ({
      id: vac.id,
      petName: vac.pet.name,
      vaccineName: vac.vaccineName,
      vaccinationDate: vac.vaccinationDate,
      nextDueDate: vac.nextDueDate,
      batchNumber: vac.batchNumber,
      veterinarianName: vac.veterinarianName,
      clinicName: vac.hospitalName,
      notes: vac.notes,
      reminderEnabled: vac.reminderEnabled,
    }));
  }

  /**
   * ⭐ Get user reviews
   */
  private async getUserReviews(userId: string): Promise<any[]> {
    const reviews = await this.reviewRepository.find({
      where: { userId },
      relations: ['daycareCenter', 'hospital'],
      order: { createdAt: 'DESC' },
    });

    return reviews.map((review) => ({
      id: review.id,
      facilityType: review.daycareCenter ? 'daycare' : 'hospital',
      facilityName: review.daycareCenter?.name || review.hospital?.name,
      rating: review.rating,
      content: review.content,
      createdAt: review.createdAt,
    }));
  }

  /**
   * 📜 Get user audit logs (recent 1000 entries)
   */
  private async getUserAuditLogs(userId: string): Promise<any[]> {
    const logs = await this.auditService.getLogsForUser(userId, 1000);

    return logs.map((log) => ({
      timestamp: log.timestamp,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      purpose: log.purpose,
      legalBasis: log.legalBasis,
      ipAddress: log.ipAddress,
    }));
  }

  /**
   * 📄 Format data as JSON
   */
  private formatAsJSON(data: any): { [filename: string]: string } {
    const files: { [filename: string]: string } = {};

    files['user-profile.json'] = JSON.stringify(data.userProfile, null, 2);
    files['pets.json'] = JSON.stringify(data.pets, null, 2);
    files['bookings.json'] = JSON.stringify(data.bookings, null, 2);
    files['payments.json'] = JSON.stringify(data.payments, null, 2);
    files['medical-records.json'] = JSON.stringify(
      data.medicalRecords,
      null,
      2,
    );
    files['vaccinations.json'] = JSON.stringify(data.vaccinations, null, 2);
    files['reviews.json'] = JSON.stringify(data.reviews, null, 2);
    files['audit-logs.json'] = JSON.stringify(data.auditLogs, null, 2);

    return files;
  }

  /**
   * 📊 Format data as CSV
   */
  private formatAsCSV(data: any): { [filename: string]: string } {
    const files: { [filename: string]: string } = {};

    // Helper function to convert array to CSV
    const arrayToCSV = (arr: any[]): string => {
      if (arr.length === 0) return '';

      const headers = Object.keys(arr[0]);
      const csvRows = [
        headers.join(','),
        ...arr.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              // Escape commas and quotes
              if (value === null || value === undefined) return '';
              const escaped = String(value).replace(/"/g, '""');
              return `"${escaped}"`;
            })
            .join(','),
        ),
      ];

      return csvRows.join('\n');
    };

    files['user-profile.csv'] = arrayToCSV([data.userProfile]);
    files['pets.csv'] = arrayToCSV(data.pets);
    files['bookings.csv'] = arrayToCSV(data.bookings);
    files['payments.csv'] = arrayToCSV(data.payments);
    files['medical-records.csv'] = arrayToCSV(data.medicalRecords);
    files['vaccinations.csv'] = arrayToCSV(data.vaccinations);
    files['reviews.csv'] = arrayToCSV(data.reviews);
    files['audit-logs.csv'] = arrayToCSV(data.auditLogs);

    return files;
  }

  /**
   * 🗜️ Create ZIP archive
   */
  private async createArchive(
    files: { [filename: string]: string },
    format: string,
  ): Promise<{ archive: Buffer; size: number }> {
    return new Promise((resolve, reject) => {
      const archive = archiver.default('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ archive: buffer, size: buffer.length });
      });
      archive.on('error', reject);

      // Add files to archive
      for (const [filename, content] of Object.entries(files)) {
        archive.append(content, { name: filename });
      }

      // Add README
      const readme = this.generateReadme(format);
      archive.append(readme, { name: 'README.txt' });

      archive.finalize();
    });
  }

  /**
   * 📖 Generate README for export archive
   */
  private generateReadme(format: string): string {
    return `
Pet-to-You Data Export
======================

Export Date: ${new Date().toISOString()}
Format: ${format.toUpperCase()}

This archive contains all your personal data from Pet-to-You.

Files Included:
- user-profile.${format}: Your account information
- pets.${format}: Your registered pets
- bookings.${format}: Your booking history
- payments.${format}: Your payment transactions
- medical-records.${format}: Pet medical records (decrypted)
- vaccinations.${format}: Vaccination records
- reviews.${format}: Your reviews and ratings
- audit-logs.${format}: Access logs (recent 1000 entries)

Legal Basis:
This export is provided under PIPA (개인정보보호법) Article 35 - Right to Data Portability.

Medical Records Retention:
Medical records are retained for 10 years as required by 의료법 (Medical Act).

Questions?
Contact: support@pet-to-you.com
`;
  }

  /**
   * ⏱️ Check export rate limit
   *
   * PIPA allows reasonable limitations to prevent abuse
   * Limit: 3 exports per day per user
   */
  private async checkExportRateLimit(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exportCount = await this.auditService['auditRepository'].count({
      where: {
        userId,
        action: AuditAction.DATA_EXPORT,
        timestamp: MoreThanOrEqual(today),
      },
    });

    if (exportCount >= this.MAX_EXPORTS_PER_DAY) {
      throw new ForbiddenException(
        `You have reached the maximum number of data exports (${this.MAX_EXPORTS_PER_DAY}) for today. Please try again tomorrow.`,
      );
    }
  }
}
