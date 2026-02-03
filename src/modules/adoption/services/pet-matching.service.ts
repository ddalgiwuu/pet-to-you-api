import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PetListing } from '../entities/pet-listing.entity';
import { PetListingSearch, PetListingSearchDocument } from '../schemas/pet-listing-search.schema';
import { PetSpecies, PetSize } from '../../pets/entities/pet.entity';
import { EnergyLevel } from '../entities/pet-listing.entity';

export interface UserPreferences {
  species?: PetSpecies[];
  size?: PetSize[];
  ageRange?: { min?: number; max?: number };
  energyLevel?: EnergyLevel[];
  goodWithKids?: boolean;
  goodWithPets?: boolean;
  hasYard?: boolean;
  homeType?: 'apartment' | 'house' | 'farm';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  maxAdoptionFee?: number;
  location?: { latitude: number; longitude: number; maxDistance?: number };
  specialNeedsOk?: boolean;
}

export interface MatchResult {
  listing: PetListing;
  matchScore: number;
  matchReasons: string[];
  warnings?: string[];
}

@Injectable()
export class PetMatchingService {
  private readonly logger = new Logger(PetMatchingService.name);

  constructor(
    @InjectRepository(PetListing)
    private readonly petListingRepository: Repository<PetListing>,
    @InjectModel(PetListingSearch.name)
    private readonly petListingSearchModel: Model<PetListingSearchDocument>,
  ) {}

  /**
   * Find pet listings matching user preferences with AI-based scoring
   */
  async findMatches(
    preferences: UserPreferences,
    limit: number = 20,
  ): Promise<MatchResult[]> {
    try {
      // Build MongoDB query for fast filtering
      const searchFilters: any = {};

      if (preferences.species?.length) {
        searchFilters.species = { $in: preferences.species };
      }

      if (preferences.size?.length) {
        searchFilters.size = { $in: preferences.size };
      }

      if (preferences.ageRange) {
        if (preferences.ageRange.min !== undefined || preferences.ageRange.max !== undefined) {
          searchFilters.estimatedAgeYears = {};
          if (preferences.ageRange.min !== undefined) {
            searchFilters.estimatedAgeYears.$gte = preferences.ageRange.min;
          }
          if (preferences.ageRange.max !== undefined) {
            searchFilters.estimatedAgeYears.$lte = preferences.ageRange.max;
          }
        }
      }

      if (preferences.energyLevel?.length) {
        searchFilters.energyLevel = { $in: preferences.energyLevel };
      }

      if (preferences.goodWithKids !== undefined) {
        searchFilters.goodWithKids = preferences.goodWithKids;
      }

      if (preferences.goodWithPets !== undefined) {
        searchFilters.$and = [
          { goodWithDogs: preferences.goodWithPets },
          { goodWithCats: preferences.goodWithPets },
        ];
      }

      if (preferences.specialNeedsOk === false) {
        searchFilters.hasSpecialNeeds = false;
      }

      if (preferences.maxAdoptionFee !== undefined) {
        searchFilters.$or = [
          { adoptionFee: { $lte: preferences.maxAdoptionFee } },
          { adoptionFee: null },
        ];
      }

      // Location-based search
      if (preferences.location) {
        const maxDistance = preferences.location.maxDistance || 50000; // 50km default

        searchFilters['location.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [preferences.location.longitude, preferences.location.latitude],
            },
            $maxDistance: maxDistance,
          },
        };
      }

      // Only show available listings from verified shelters
      searchFilters.adoptionStatus = 'available';
      searchFilters.isActive = true;
      searchFilters.shelterVerified = true;
      searchFilters.shelterTrustScore = { $gte: 0.5 }; // Minimum trust score

      // Fetch candidates from MongoDB
      const searchResults = await this.petListingSearchModel
        .find(searchFilters)
        .sort({ popularityScore: -1, isUrgent: -1 })
        .limit(limit * 2) // Fetch more for scoring
        .exec();

      // Get full listings from PostgreSQL
      const listingIds = searchResults.map((r) => r.listingId);
      const listings = await this.petListingRepository.find({
        where: { id: { $in: listingIds } as any },
        relations: ['shelter'],
      });

      // Calculate match scores
      const matches: MatchResult[] = listings.map((listing) => {
        const { score, reasons, warnings } = this.calculateMatchScore(listing, preferences);

        return {
          listing,
          matchScore: score,
          matchReasons: reasons,
          warnings,
        };
      });

      // Sort by match score and return top results
      matches.sort((a, b) => b.matchScore - a.matchScore);

      return matches.slice(0, limit);
    } catch (error) {
      this.logger.error(`Failed to find matches: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate match score between pet listing and user preferences
   * Returns score (0-100) and reasoning
   */
  private calculateMatchScore(
    listing: PetListing,
    preferences: UserPreferences,
  ): {
    score: number;
    reasons: string[];
    warnings: string[];
  } {
    let score = 50; // Base score
    const reasons: string[] = [];
    const warnings: string[] = [];

    // === CRITICAL COMPATIBILITY CHECKS (Can reduce score significantly) ===

    // Kids compatibility
    if (preferences.goodWithKids === true && !listing.goodWithKids) {
      score -= 30;
      warnings.push('이 동물은 아이들과 잘 어울리지 못할 수 있습니다');
    } else if (preferences.goodWithKids === true && listing.goodWithKids) {
      score += 15;
      reasons.push('아이들과 잘 지냄');
    }

    // Pet compatibility
    if (preferences.goodWithPets === true) {
      if (!listing.goodWithDogs || !listing.goodWithCats) {
        score -= 20;
        warnings.push('이 동물은 다른 반려동물과 잘 어울리지 못할 수 있습니다');
      } else {
        score += 10;
        reasons.push('다른 반려동물과 잘 지냄');
      }
    }

    // Experience level match
    if (listing.needsExperiencedOwner && preferences.experienceLevel === 'beginner') {
      score -= 40;
      warnings.push('이 동물은 경험 있는 주인이 필요합니다');
    } else if (!listing.needsExperiencedOwner && preferences.experienceLevel === 'beginner') {
      score += 10;
      reasons.push('초보자에게 적합');
    }

    // === HOME ENVIRONMENT MATCH ===

    // Home size and yard
    if (
      listing.size === PetSize.EXTRA_LARGE &&
      preferences.homeType === 'apartment' &&
      !preferences.hasYard
    ) {
      score -= 25;
      warnings.push('대형견은 넓은 공간이 필요합니다');
    }

    if (listing.energyLevel === EnergyLevel.VERY_HIGH && !preferences.hasYard) {
      score -= 15;
      warnings.push('활동량이 높은 동물입니다. 충분한 운동 시간이 필요합니다');
    } else if (listing.energyLevel === EnergyLevel.LOW && preferences.homeType === 'farm') {
      score += 5;
      reasons.push('조용한 성격으로 안정적인 환경에 적합');
    }

    // === POSITIVE MATCHES ===

    // Species preference match
    if (preferences.species?.includes(listing.species)) {
      score += 10;
      reasons.push('선호하는 종');
    }

    // Size preference match
    if (listing.size && preferences.size?.includes(listing.size)) {
      score += 8;
      reasons.push('선호하는 크기');
    }

    // Energy level match
    if (preferences.energyLevel?.includes(listing.energyLevel)) {
      score += 8;
      reasons.push('선호하는 활동량');
    }

    // Age preference match
    const age = listing.getApproximateAge();
    if (age && preferences.ageRange) {
      const { min, max } = preferences.ageRange;
      if ((min === undefined || age >= min) && (max === undefined || age <= max)) {
        score += 5;
        reasons.push('선호하는 나이대');
      }
    }

    // === ADOPTION FEE ===

    if (preferences.maxAdoptionFee !== undefined) {
      if (!listing.adoptionFee || listing.adoptionFee <= preferences.maxAdoptionFee) {
        score += 5;
        reasons.push('예산 내 입양비');
      } else {
        score -= 10;
        warnings.push('입양비가 예산을 초과합니다');
      }
    }

    // === SPECIAL CONSIDERATIONS ===

    // Special needs
    if (listing.hasSpecialNeeds && !preferences.specialNeedsOk) {
      score -= 15;
      warnings.push('특별 관리가 필요합니다');
    } else if (listing.hasSpecialNeeds && preferences.specialNeedsOk) {
      score += 10;
      reasons.push('특별 관리 제공 가능');
    }

    // Urgency boost
    if (listing.isUrgent) {
      score += 5;
      reasons.push('긴급 입양 필요');
    }

    // === SHELTER TRUST FACTOR ===

    if (listing.shelter) {
      if (listing.shelter.trustScore >= 0.8) {
        score += 10;
        reasons.push('신뢰도 높은 보호소');
      } else if (listing.shelter.trustScore < 0.5) {
        score -= 15;
        warnings.push('보호소 신뢰도 낮음');
      }
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    return { score, reasons, warnings };
  }

  /**
   * Get recommended pets for first-time owners
   */
  async getBeginnerFriendlyPets(
    location?: { latitude: number; longitude: number },
    limit: number = 10,
  ): Promise<MatchResult[]> {
    const preferences: UserPreferences = {
      experienceLevel: 'beginner',
      energyLevel: [EnergyLevel.LOW, EnergyLevel.MODERATE],
      location,
    };

    return this.findMatches(preferences, limit);
  }

  /**
   * Get family-friendly pets
   */
  async getFamilyFriendlyPets(
    location?: { latitude: number; longitude: number },
    limit: number = 10,
  ): Promise<MatchResult[]> {
    const preferences: UserPreferences = {
      goodWithKids: true,
      experienceLevel: 'beginner',
      location,
    };

    return this.findMatches(preferences, limit);
  }

  /**
   * Get urgent adoption listings
   */
  async getUrgentAdoptions(limit: number = 20): Promise<PetListing[]> {
    const searchResults = await this.petListingSearchModel
      .find({
        isUrgent: true,
        adoptionStatus: 'available',
        isActive: true,
        shelterVerified: true,
      })
      .sort({ urgencyScore: -1, daysSinceRescue: -1 })
      .limit(limit)
      .exec();

    const listingIds = searchResults.map((r) => r.listingId);

    return this.petListingRepository.find({
      where: { id: { $in: listingIds } as any },
      relations: ['shelter'],
    });
  }
}
