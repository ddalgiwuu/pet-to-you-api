import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shelter, ShelterVerificationStatus } from '../entities/shelter.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Service for verifying shelter business registration
 * Integrates with Korean government business verification API
 */
@Injectable()
export class ShelterVerificationService {
  private readonly logger = new Logger(ShelterVerificationService.name);

  constructor(
    @InjectRepository(Shelter)
    private readonly shelterRepository: Repository<Shelter>,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Verify shelter business registration with government API
   * Uses Korean National Tax Service business verification API
   */
  async verifyBusinessRegistration(
    businessRegistrationNumber: string,
  ): Promise<{
    isValid: boolean;
    businessName?: string;
    representativeName?: string;
    details?: any;
  }> {
    try {
      // Validate format (10 digits)
      if (!/^\d{10}$/.test(businessRegistrationNumber)) {
        throw new BadRequestException('Invalid business registration number format');
      }

      // TODO: Integrate with actual Korean government API
      // Example: https://www.hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml
      // For now, using mock verification

      const apiUrl = process.env.BUSINESS_VERIFICATION_API_URL;
      const apiKey = process.env.BUSINESS_VERIFICATION_API_KEY;

      if (!apiUrl || !apiKey) {
        this.logger.warn('Business verification API not configured, using mock verification');
        return this.mockBusinessVerification(businessRegistrationNumber);
      }

      // Real API call
      const response = await firstValueFrom(
        this.httpService.post(
          apiUrl,
          {
            businesses: [
              {
                b_no: businessRegistrationNumber,
              },
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
          },
        ),
      );

      const data = response.data;

      // Parse response based on API structure
      // Adjust this based on actual API response format
      if (data && data.data && data.data.length > 0) {
        const business = data.data[0];

        return {
          isValid: business.valid === '01', // '01' = valid
          businessName: business.company || business.trade_name,
          representativeName: business.representative || business.ceo_name,
          details: business,
        };
      }

      return {
        isValid: false,
      };
    } catch (error) {
      this.logger.error(`Business verification failed: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to verify business registration');
    }
  }

  /**
   * Mock business verification for development/testing
   */
  private mockBusinessVerification(businessRegistrationNumber: string): {
    isValid: boolean;
    businessName?: string;
    representativeName?: string;
    details?: any;
  } {
    // Simple validation: last digit check (Luhn-like algorithm for Korean business numbers)
    const valid = this.validateBusinessNumberChecksum(businessRegistrationNumber);

    if (valid) {
      return {
        isValid: true,
        businessName: '테스트 보호소',
        representativeName: '김대표',
        details: {
          status: 'active',
          registrationDate: '2020-01-01',
        },
      };
    }

    return {
      isValid: false,
    };
  }

  /**
   * Validate business registration number checksum
   * Korean business registration numbers have a checksum digit
   */
  private validateBusinessNumberChecksum(number: string): boolean {
    if (number.length !== 10) return false;

    const digits = number.split('').map(Number);
    const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * weights[i];
    }

    // Add special calculation for 9th digit
    sum += Math.floor((digits[8] * 5) / 10);

    const checkDigit = (10 - (sum % 10)) % 10;

    return checkDigit === digits[9];
  }

  /**
   * Verify shelter and update verification status
   */
  async verifyShelter(
    shelterId: string,
    verifiedBy: string,
  ): Promise<Shelter> {
    const shelter = await this.shelterRepository.findOne({
      where: { id: shelterId },
    });

    if (!shelter) {
      throw new BadRequestException('Shelter not found');
    }

    try {
      // Verify business registration
      const verification = await this.verifyBusinessRegistration(
        shelter.businessRegistrationNumber,
      );

      if (!verification.isValid) {
        // Mark as rejected
        shelter.verificationStatus = ShelterVerificationStatus.REJECTED;
        shelter.verificationNotes = 'Business registration verification failed';

        await this.shelterRepository.save(shelter);
        throw new BadRequestException('Business registration is not valid');
      }

      // Update shelter with verification data
      shelter.verificationStatus = ShelterVerificationStatus.VERIFIED;
      shelter.verifiedAt = new Date();
      shelter.verifiedBy = verifiedBy;
      shelter.businessName = verification.businessName || shelter.businessName;
      shelter.representativeName = verification.representativeName || shelter.representativeName;
      shelter.governmentVerificationData = {
        apiResponse: verification.details,
        verifiedAt: new Date(),
        isValid: true,
      };

      // Update trust score
      shelter.updateTrustScore();

      await this.shelterRepository.save(shelter);

      this.logger.log(`Shelter ${shelterId} verified successfully`);

      return shelter;
    } catch (error) {
      this.logger.error(`Shelter verification failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Flag shelter for suspicious activity
   */
  async flagShelterForSuspiciousActivity(
    shelterId: string,
    reason: string,
    details?: string,
  ): Promise<void> {
    const shelter = await this.shelterRepository.findOne({
      where: { id: shelterId },
    });

    if (!shelter) {
      throw new BadRequestException('Shelter not found');
    }

    // Initialize fraud flags if not exist
    if (!shelter.fraudFlags) {
      shelter.fraudFlags = {};
    }

    // Set appropriate flags based on reason
    switch (reason) {
      case 'high_return_rate':
        shelter.fraudFlags.highReturnRate = true;
        break;
      case 'suspicious_pattern':
        shelter.fraudFlags.suspiciousPattern = true;
        break;
      case 'multiple_complaints':
        shelter.fraudFlags.multipleComplaints = true;
        break;
      case 'verification_issues':
        shelter.fraudFlags.verificationIssues = true;
        break;
    }

    shelter.fraudFlags.flaggedAt = new Date();
    shelter.fraudFlags.details = details || reason;

    // Update trust score
    shelter.updateTrustScore();

    await this.shelterRepository.save(shelter);

    this.logger.warn(`Shelter ${shelterId} flagged for ${reason}`);
  }

  /**
   * Suspend shelter
   */
  async suspendShelter(
    shelterId: string,
    reason: string,
    suspendedBy: string,
  ): Promise<void> {
    const shelter = await this.shelterRepository.findOne({
      where: { id: shelterId },
    });

    if (!shelter) {
      throw new BadRequestException('Shelter not found');
    }

    shelter.verificationStatus = ShelterVerificationStatus.SUSPENDED;
    shelter.isActive = false;
    shelter.suspensionCount += 1;
    shelter.lastSuspensionDate = new Date();
    shelter.verificationNotes = reason;

    // Update trust score
    shelter.updateTrustScore();

    await this.shelterRepository.save(shelter);

    this.logger.warn(`Shelter ${shelterId} suspended by ${suspendedBy}: ${reason}`);
  }

  /**
   * Reactivate suspended shelter
   */
  async reactivateShelter(
    shelterId: string,
    reactivatedBy: string,
  ): Promise<Shelter> {
    const shelter = await this.shelterRepository.findOne({
      where: { id: shelterId },
    });

    if (!shelter) {
      throw new BadRequestException('Shelter not found');
    }

    if (shelter.verificationStatus !== ShelterVerificationStatus.SUSPENDED) {
      throw new BadRequestException('Shelter is not suspended');
    }

    shelter.verificationStatus = ShelterVerificationStatus.VERIFIED;
    shelter.isActive = true;
    shelter.verificationNotes = `Reactivated by ${reactivatedBy}`;

    // Update trust score
    shelter.updateTrustScore();

    await this.shelterRepository.save(shelter);

    this.logger.log(`Shelter ${shelterId} reactivated by ${reactivatedBy}`);

    return shelter;
  }

  /**
   * Record adoption outcome and update metrics
   */
  async recordAdoptionOutcome(
    shelterId: string,
    wasSuccessful: boolean,
    adoptionDays: number,
  ): Promise<void> {
    const shelter = await this.shelterRepository.findOne({
      where: { id: shelterId },
    });

    if (!shelter) {
      throw new BadRequestException('Shelter not found');
    }

    shelter.totalAdoptions += 1;

    if (wasSuccessful) {
      shelter.successfulAdoptions += 1;
    } else {
      shelter.returnedAdoptions += 1;
    }

    // Update average adoption days
    const currentAvg = shelter.averageAdoptionDays || 0;
    const currentTotal = shelter.totalAdoptions - 1;
    shelter.averageAdoptionDays =
      (currentAvg * currentTotal + adoptionDays) / shelter.totalAdoptions;

    // Update success rate
    shelter.updateAdoptionSuccessRate();

    // Update trust score
    shelter.updateTrustScore();

    // Check for suspicious patterns
    if (shelter.hasSuspiciousPattern()) {
      await this.flagShelterForSuspiciousActivity(
        shelterId,
        'suspicious_pattern',
        'Automatic flag: Low success rate or high complaint count detected',
      );
    }

    await this.shelterRepository.save(shelter);
  }

  /**
   * Add complaint to shelter history
   */
  async addComplaint(
    shelterId: string,
    complaint: {
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    },
  ): Promise<void> {
    const shelter = await this.shelterRepository.findOne({
      where: { id: shelterId },
    });

    if (!shelter) {
      throw new BadRequestException('Shelter not found');
    }

    // Initialize complaint history if not exist
    if (!shelter.complaintHistory) {
      shelter.complaintHistory = [];
    }

    // Add new complaint
    shelter.complaintHistory.push({
      id: `complaint_${Date.now()}`,
      date: new Date(),
      type: complaint.type,
      description: complaint.description,
      status: 'pending',
      severity: complaint.severity,
    });

    shelter.complaintCount += 1;

    // Auto-flag for multiple complaints
    if (shelter.complaintCount >= 5) {
      await this.flagShelterForSuspiciousActivity(
        shelterId,
        'multiple_complaints',
        `${shelter.complaintCount} complaints received`,
      );
    }

    // Auto-suspend for critical complaints
    if (complaint.severity === 'critical') {
      await this.suspendShelter(
        shelterId,
        `Critical complaint: ${complaint.description}`,
        'system',
      );
    }

    // Update trust score
    shelter.updateTrustScore();

    await this.shelterRepository.save(shelter);

    this.logger.warn(
      `Complaint added to shelter ${shelterId}: ${complaint.type} (${complaint.severity})`,
    );
  }
}
