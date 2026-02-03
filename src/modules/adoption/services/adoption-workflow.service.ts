import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AdoptionApplication,
  ApplicationStatus,
} from '../entities/adoption-application.entity';
import { PetListing, AdoptionStatus } from '../entities/pet-listing.entity';
import { ShelterVerificationService } from './shelter-verification.service';

/**
 * Service for managing adoption application workflow
 * Handles application lifecycle from submission to completion
 */
@Injectable()
export class AdoptionWorkflowService {
  private readonly logger = new Logger(AdoptionWorkflowService.name);

  constructor(
    @InjectRepository(AdoptionApplication)
    private readonly applicationRepository: Repository<AdoptionApplication>,
    @InjectRepository(PetListing)
    private readonly petListingRepository: Repository<PetListing>,
    private readonly shelterVerificationService: ShelterVerificationService,
  ) {}

  /**
   * Submit new adoption application
   */
  async submitApplication(
    applicationData: Partial<AdoptionApplication>,
  ): Promise<AdoptionApplication> {
    try {
      // Validate pet listing
      const petListing = await this.petListingRepository.findOne({
        where: { id: applicationData.petListingId },
        relations: ['shelter'],
      });

      if (!petListing) {
        throw new BadRequestException('Pet listing not found');
      }

      if (!petListing.isAvailableForAdoption()) {
        throw new BadRequestException('Pet is not available for adoption');
      }

      // Check shelter eligibility
      if (!petListing.shelter.canAcceptNewListings()) {
        throw new BadRequestException('Shelter cannot accept new applications');
      }

      // Create application
      const application = this.applicationRepository.create({
        ...applicationData,
        status: ApplicationStatus.SUBMITTED,
      });

      const savedApplication = await this.applicationRepository.save(application);

      // Update listing application count
      petListing.applicationCount += 1;
      await this.petListingRepository.save(petListing);

      this.logger.log(`Application ${savedApplication.id} submitted for listing ${petListing.id}`);

      return savedApplication;
    } catch (error) {
      this.logger.error(`Failed to submit application: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Review application and update status
   */
  async reviewApplication(
    applicationId: string,
    reviewedBy: string,
    decision: 'approve' | 'reject',
    notes?: string,
  ): Promise<AdoptionApplication> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['petListing', 'petListing.shelter'],
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    if (application.status !== ApplicationStatus.SUBMITTED &&
        application.status !== ApplicationStatus.UNDER_REVIEW) {
      throw new BadRequestException('Application cannot be reviewed in current status');
    }

    application.reviewedAt = new Date();
    application.reviewedBy = reviewedBy;
    application.statusNotes = notes;

    if (decision === 'approve') {
      application.status = ApplicationStatus.INTERVIEW_SCHEDULED;
    } else {
      application.status = ApplicationStatus.REJECTED;
    }

    const savedApplication = await this.applicationRepository.save(application);

    this.logger.log(
      `Application ${applicationId} ${decision}d by ${reviewedBy}`,
    );

    return savedApplication;
  }

  /**
   * Schedule interview
   */
  async scheduleInterview(
    applicationId: string,
    interviewDate: Date,
  ): Promise<AdoptionApplication> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    application.interviewScheduledAt = interviewDate;
    application.status = ApplicationStatus.INTERVIEW_SCHEDULED;

    const savedApplication = await this.applicationRepository.save(application);

    this.logger.log(`Interview scheduled for application ${applicationId}`);

    return savedApplication;
  }

  /**
   * Complete interview and record results
   */
  async completeInterview(
    applicationId: string,
    score: number,
    notes: string,
    passed: boolean,
  ): Promise<AdoptionApplication> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    application.interviewCompletedAt = new Date();
    application.interviewScore = score;
    application.interviewNotes = notes;

    if (passed) {
      application.status = ApplicationStatus.HOME_VISIT_SCHEDULED;
    } else {
      application.status = ApplicationStatus.REJECTED;
      application.statusNotes = 'Failed interview';
    }

    const savedApplication = await this.applicationRepository.save(application);

    this.logger.log(
      `Interview completed for application ${applicationId}: ${passed ? 'PASSED' : 'FAILED'}`,
    );

    return savedApplication;
  }

  /**
   * Schedule home visit
   */
  async scheduleHomeVisit(
    applicationId: string,
    visitDate: Date,
  ): Promise<AdoptionApplication> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    application.homeVisitScheduledAt = visitDate;

    const savedApplication = await this.applicationRepository.save(application);

    this.logger.log(`Home visit scheduled for application ${applicationId}`);

    return savedApplication;
  }

  /**
   * Complete home visit and record results
   */
  async completeHomeVisit(
    applicationId: string,
    passed: boolean,
    notes: string,
  ): Promise<AdoptionApplication> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    application.homeVisitCompletedAt = new Date();
    application.homeVisitPassed = passed;
    application.homeVisitNotes = notes;

    if (passed && application.canBeApproved()) {
      application.status = ApplicationStatus.APPROVED;
    } else if (!passed) {
      application.status = ApplicationStatus.REJECTED;
      application.statusNotes = 'Failed home visit';
    }

    const savedApplication = await this.applicationRepository.save(application);

    this.logger.log(
      `Home visit completed for application ${applicationId}: ${passed ? 'PASSED' : 'FAILED'}`,
    );

    return savedApplication;
  }

  /**
   * Complete adoption
   */
  async completeAdoption(
    applicationId: string,
    contractUrl?: string,
  ): Promise<AdoptionApplication> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['petListing', 'petListing.shelter'],
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    if (application.status !== ApplicationStatus.APPROVED) {
      throw new BadRequestException('Application must be approved first');
    }

    const petListing = application.petListing;

    // Update application
    application.status = ApplicationStatus.COMPLETED;
    application.adoptionCompletedAt = new Date();
    application.contractUrl = contractUrl;

    // Update pet listing
    petListing.adoptionStatus = AdoptionStatus.ADOPTED;
    petListing.adoptedAt = new Date();
    petListing.adoptedByUserId = application.userId;

    // Save both
    await this.applicationRepository.save(application);
    await this.petListingRepository.save(petListing);

    // Record adoption outcome for shelter (initial success)
    const daysSinceRescue = petListing.getDaysSinceRescue();
    await this.shelterVerificationService.recordAdoptionOutcome(
      petListing.shelterId,
      true,
      daysSinceRescue,
    );

    this.logger.log(`Adoption completed for application ${applicationId}`);

    return application;
  }

  /**
   * Record adoption return
   */
  async recordReturn(
    applicationId: string,
    returnReason: string,
  ): Promise<AdoptionApplication> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['petListing', 'petListing.shelter'],
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    if (application.status !== ApplicationStatus.COMPLETED) {
      throw new BadRequestException('Only completed adoptions can be returned');
    }

    const petListing = application.petListing;

    // Update application
    application.adoptionSuccessful = false;
    application.returnedAt = new Date();
    application.returnReason = returnReason;

    // Update pet listing (make available again)
    petListing.adoptionStatus = AdoptionStatus.AVAILABLE;
    petListing.adoptedAt = undefined;
    petListing.adoptedByUserId = undefined;

    // Save both
    await this.applicationRepository.save(application);
    await this.petListingRepository.save(petListing);

    // Update shelter metrics (mark as unsuccessful)
    const daysSinceAdoption = application.adoptionCompletedAt
      ? Math.ceil(
          (new Date().getTime() - application.adoptionCompletedAt.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    await this.shelterVerificationService.recordAdoptionOutcome(
      petListing.shelterId,
      false,
      daysSinceAdoption,
    );

    this.logger.warn(
      `Adoption return recorded for application ${applicationId}: ${returnReason}`,
    );

    return application;
  }

  /**
   * Schedule follow-up visit
   */
  async scheduleFollowUp(
    applicationId: string,
    followUpDate: Date,
  ): Promise<AdoptionApplication> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    if (!application.followUpSchedule) {
      application.followUpSchedule = [];
    }

    application.followUpSchedule.push({
      scheduledAt: followUpDate,
      status: 'pending',
    });

    const savedApplication = await this.applicationRepository.save(application);

    this.logger.log(`Follow-up scheduled for application ${applicationId}`);

    return savedApplication;
  }

  /**
   * Get application statistics
   */
  async getApplicationStats(shelterId?: string): Promise<any> {
    const queryBuilder = this.applicationRepository
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.petListing', 'listing');

    if (shelterId) {
      queryBuilder.where('listing.shelterId = :shelterId', { shelterId });
    }

    const applications = await queryBuilder.getMany();

    const stats = {
      total: applications.length,
      byStatus: {} as Record<string, number>,
      avgProcessingDays: 0,
      successRate: 0,
    };

    let totalProcessingDays = 0;
    let completedCount = 0;
    let successfulCount = 0;

    applications.forEach((app) => {
      // Count by status
      stats.byStatus[app.status] = (stats.byStatus[app.status] || 0) + 1;

      // Calculate processing time
      if (app.status === ApplicationStatus.COMPLETED || app.status === ApplicationStatus.REJECTED) {
        const created = new Date(app.createdAt);
        const completed = app.adoptionCompletedAt || app.reviewedAt || new Date();
        const days = Math.ceil(
          (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
        );
        totalProcessingDays += days;
        completedCount++;

        if (app.adoptionSuccessful === true) {
          successfulCount++;
        }
      }
    });

    stats.avgProcessingDays = completedCount > 0 ? totalProcessingDays / completedCount : 0;
    stats.successRate = completedCount > 0 ? successfulCount / completedCount : 0;

    return stats;
  }
}
