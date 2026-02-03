import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PetMatchingService, UserPreferences } from '../services/pet-matching.service';
import { AdoptionWorkflowService } from '../services/adoption-workflow.service';
import { ShelterVerificationService } from '../services/shelter-verification.service';
import { CreateAdoptionApplicationDto } from '../dto/create-adoption-application.dto';

@ApiTags('Adoption')
@Controller('adoption')
export class AdoptionController {
  constructor(
    private readonly petMatchingService: PetMatchingService,
    private readonly adoptionWorkflowService: AdoptionWorkflowService,
    private readonly shelterVerificationService: ShelterVerificationService,
  ) {}

  // ============================================================
  // Pet Matching & Search
  // ============================================================

  @Get('match')
  @ApiOperation({ summary: 'Find pets matching user preferences' })
  @ApiResponse({ status: 200, description: 'Returns matched pet listings' })
  async findMatches(
    @Query('species') species?: string,
    @Query('size') size?: string,
    @Query('ageMin') ageMin?: number,
    @Query('ageMax') ageMax?: number,
    @Query('goodWithKids') goodWithKids?: boolean,
    @Query('goodWithPets') goodWithPets?: boolean,
    @Query('energyLevel') energyLevel?: string,
    @Query('maxFee') maxFee?: number,
    @Query('lat') latitude?: number,
    @Query('lng') longitude?: number,
    @Query('maxDistance') maxDistance?: number,
    @Query('experienceLevel') experienceLevel?: string,
    @Query('homeType') homeType?: string,
    @Query('hasYard') hasYard?: boolean,
    @Query('limit') limit?: number,
  ) {
    const preferences: UserPreferences = {
      species: species ? species.split(',') as any : undefined,
      size: size ? size.split(',') as any : undefined,
      ageRange: ageMin !== undefined || ageMax !== undefined
        ? { min: ageMin, max: ageMax }
        : undefined,
      goodWithKids,
      goodWithPets,
      energyLevel: energyLevel ? energyLevel.split(',') as any : undefined,
      maxAdoptionFee: maxFee,
      location: latitude && longitude
        ? { latitude, longitude, maxDistance: maxDistance || 50000 }
        : undefined,
      experienceLevel: experienceLevel as any,
      homeType: homeType as any,
      hasYard,
    };

    return this.petMatchingService.findMatches(preferences, limit || 20);
  }

  @Get('beginner-friendly')
  @ApiOperation({ summary: 'Get beginner-friendly pets' })
  @ApiResponse({ status: 200, description: 'Returns beginner-friendly pet listings' })
  async getBeginnerFriendlyPets(
    @Query('lat') latitude?: number,
    @Query('lng') longitude?: number,
    @Query('limit') limit?: number,
  ) {
    const location = latitude && longitude ? { latitude, longitude } : undefined;
    return this.petMatchingService.getBeginnerFriendlyPets(location, limit || 10);
  }

  @Get('family-friendly')
  @ApiOperation({ summary: 'Get family-friendly pets' })
  @ApiResponse({ status: 200, description: 'Returns family-friendly pet listings' })
  async getFamilyFriendlyPets(
    @Query('lat') latitude?: number,
    @Query('lng') longitude?: number,
    @Query('limit') limit?: number,
  ) {
    const location = latitude && longitude ? { latitude, longitude } : undefined;
    return this.petMatchingService.getFamilyFriendlyPets(location, limit || 10);
  }

  @Get('urgent')
  @ApiOperation({ summary: 'Get urgent adoption listings' })
  @ApiResponse({ status: 200, description: 'Returns urgent adoption listings' })
  async getUrgentAdoptions(@Query('limit') limit?: number) {
    return this.petMatchingService.getUrgentAdoptions(limit || 20);
  }

  // ============================================================
  // Adoption Applications
  // ============================================================

  @Post('applications')
  @ApiOperation({ summary: 'Submit adoption application' })
  @ApiResponse({ status: 201, description: 'Application submitted successfully' })
  @ApiBearerAuth()
  async submitApplication(@Body() createDto: CreateAdoptionApplicationDto) {
    return this.adoptionWorkflowService.submitApplication(createDto);
  }

  @Put('applications/:id/review')
  @ApiOperation({ summary: 'Review adoption application' })
  @ApiResponse({ status: 200, description: 'Application reviewed successfully' })
  @ApiBearerAuth()
  async reviewApplication(
    @Param('id') id: string,
    @Body() reviewData: {
      reviewedBy: string;
      decision: 'approve' | 'reject';
      notes?: string;
    },
  ) {
    return this.adoptionWorkflowService.reviewApplication(
      id,
      reviewData.reviewedBy,
      reviewData.decision,
      reviewData.notes,
    );
  }

  @Put('applications/:id/interview')
  @ApiOperation({ summary: 'Schedule interview' })
  @ApiResponse({ status: 200, description: 'Interview scheduled successfully' })
  @ApiBearerAuth()
  async scheduleInterview(
    @Param('id') id: string,
    @Body() data: { interviewDate: Date },
  ) {
    return this.adoptionWorkflowService.scheduleInterview(id, data.interviewDate);
  }

  @Put('applications/:id/interview/complete')
  @ApiOperation({ summary: 'Complete interview' })
  @ApiResponse({ status: 200, description: 'Interview completed successfully' })
  @ApiBearerAuth()
  async completeInterview(
    @Param('id') id: string,
    @Body() data: {
      score: number;
      notes: string;
      passed: boolean;
    },
  ) {
    return this.adoptionWorkflowService.completeInterview(
      id,
      data.score,
      data.notes,
      data.passed,
    );
  }

  @Put('applications/:id/home-visit')
  @ApiOperation({ summary: 'Schedule home visit' })
  @ApiResponse({ status: 200, description: 'Home visit scheduled successfully' })
  @ApiBearerAuth()
  async scheduleHomeVisit(
    @Param('id') id: string,
    @Body() data: { visitDate: Date },
  ) {
    return this.adoptionWorkflowService.scheduleHomeVisit(id, data.visitDate);
  }

  @Put('applications/:id/home-visit/complete')
  @ApiOperation({ summary: 'Complete home visit' })
  @ApiResponse({ status: 200, description: 'Home visit completed successfully' })
  @ApiBearerAuth()
  async completeHomeVisit(
    @Param('id') id: string,
    @Body() data: {
      passed: boolean;
      notes: string;
    },
  ) {
    return this.adoptionWorkflowService.completeHomeVisit(id, data.passed, data.notes);
  }

  @Put('applications/:id/complete')
  @ApiOperation({ summary: 'Complete adoption' })
  @ApiResponse({ status: 200, description: 'Adoption completed successfully' })
  @ApiBearerAuth()
  async completeAdoption(
    @Param('id') id: string,
    @Body() data: { contractUrl?: string },
  ) {
    return this.adoptionWorkflowService.completeAdoption(id, data.contractUrl);
  }

  @Put('applications/:id/return')
  @ApiOperation({ summary: 'Record adoption return' })
  @ApiResponse({ status: 200, description: 'Return recorded successfully' })
  @ApiBearerAuth()
  async recordReturn(
    @Param('id') id: string,
    @Body() data: { returnReason: string },
  ) {
    return this.adoptionWorkflowService.recordReturn(id, data.returnReason);
  }

  @Get('applications/stats')
  @ApiOperation({ summary: 'Get application statistics' })
  @ApiResponse({ status: 200, description: 'Returns application statistics' })
  @ApiBearerAuth()
  async getApplicationStats(@Query('shelterId') shelterId?: string) {
    return this.adoptionWorkflowService.getApplicationStats(shelterId);
  }

  // ============================================================
  // Shelter Verification
  // ============================================================

  @Post('shelters/:id/verify')
  @ApiOperation({ summary: 'Verify shelter business registration' })
  @ApiResponse({ status: 200, description: 'Shelter verified successfully' })
  @ApiBearerAuth()
  async verifyShelter(
    @Param('id') id: string,
    @Body() data: { verifiedBy: string },
  ) {
    return this.shelterVerificationService.verifyShelter(id, data.verifiedBy);
  }

  @Post('shelters/:id/flag')
  @ApiOperation({ summary: 'Flag shelter for suspicious activity' })
  @ApiResponse({ status: 200, description: 'Shelter flagged successfully' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async flagShelter(
    @Param('id') id: string,
    @Body() data: {
      reason: string;
      details?: string;
    },
  ) {
    await this.shelterVerificationService.flagShelterForSuspiciousActivity(
      id,
      data.reason,
      data.details,
    );

    return { message: 'Shelter flagged successfully' };
  }

  @Post('shelters/:id/suspend')
  @ApiOperation({ summary: 'Suspend shelter' })
  @ApiResponse({ status: 200, description: 'Shelter suspended successfully' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async suspendShelter(
    @Param('id') id: string,
    @Body() data: {
      reason: string;
      suspendedBy: string;
    },
  ) {
    await this.shelterVerificationService.suspendShelter(
      id,
      data.reason,
      data.suspendedBy,
    );

    return { message: 'Shelter suspended successfully' };
  }

  @Post('shelters/:id/reactivate')
  @ApiOperation({ summary: 'Reactivate suspended shelter' })
  @ApiResponse({ status: 200, description: 'Shelter reactivated successfully' })
  @ApiBearerAuth()
  async reactivateShelter(
    @Param('id') id: string,
    @Body() data: { reactivatedBy: string },
  ) {
    return this.shelterVerificationService.reactivateShelter(id, data.reactivatedBy);
  }

  @Post('shelters/:id/complaint')
  @ApiOperation({ summary: 'Add complaint to shelter' })
  @ApiResponse({ status: 201, description: 'Complaint added successfully' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  async addComplaint(
    @Param('id') id: string,
    @Body() data: {
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    },
  ) {
    await this.shelterVerificationService.addComplaint(id, data);

    return { message: 'Complaint added successfully' };
  }
}
