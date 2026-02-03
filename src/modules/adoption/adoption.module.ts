import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { Shelter } from './entities/shelter.entity';
import { PetListing } from './entities/pet-listing.entity';
import { AdoptionApplication } from './entities/adoption-application.entity';
import { PetListingSearch, PetListingSearchSchema } from './schemas/pet-listing-search.schema';
import { ShelterVerificationService } from './services/shelter-verification.service';
import { PetMatchingService } from './services/pet-matching.service';
import { AdoptionWorkflowService } from './services/adoption-workflow.service';

@Module({
  imports: [
    // PostgreSQL entities
    TypeOrmModule.forFeature([Shelter, PetListing, AdoptionApplication]),

    // MongoDB schemas
    MongooseModule.forFeature([
      { name: PetListingSearch.name, schema: PetListingSearchSchema },
    ]),

    // HTTP module for external API calls
    HttpModule,
  ],
  providers: [
    ShelterVerificationService,
    PetMatchingService,
    AdoptionWorkflowService,
  ],
  exports: [
    ShelterVerificationService,
    PetMatchingService,
    AdoptionWorkflowService,
  ],
})
export class AdoptionModule {}
