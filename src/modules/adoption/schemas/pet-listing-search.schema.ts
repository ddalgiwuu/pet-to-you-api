import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PetSpecies, PetGender, PetSize } from '../../pets/entities/pet.entity';
import { AdoptionStatus, HealthStatus, EnergyLevel } from '../entities/pet-listing.entity';

export type PetListingSearchDocument = PetListingSearch & Document;

/**
 * MongoDB schema for pet listing search and faceted filtering
 * Optimized for fast search and filtering operations
 */
@Schema({
  collection: 'pet_listing_search',
  timestamps: true,
  autoIndex: true,
})
export class PetListingSearch {
  @Prop({ required: true, unique: true, index: true })
  listingId: string; // Reference to PetListing.id in PostgreSQL

  // ============================================================
  // Basic Search Fields
  // ============================================================

  @Prop({ required: true, index: true })
  name: string;

  @Prop({ required: true, enum: PetSpecies, index: true })
  species: PetSpecies;

  @Prop({ index: true })
  breed?: string;

  @Prop({ required: true, enum: PetGender, index: true })
  gender: PetGender;

  @Prop({ index: true })
  estimatedAgeYears?: number;

  @Prop({ enum: PetSize, index: true })
  size?: PetSize;

  @Prop()
  weight?: number;

  @Prop({ index: true })
  color?: string;

  // ============================================================
  // Shelter Information (Denormalized for Performance)
  // ============================================================

  @Prop({ required: true, index: true })
  shelterId: string;

  @Prop({ required: true })
  shelterName: string;

  @Prop({ required: true, index: true })
  shelterCity: string;

  @Prop({ required: true, index: true })
  shelterDistrict: string;

  @Prop({ type: Number, index: true })
  shelterTrustScore: number; // 0.00 - 1.00

  @Prop({ default: false })
  shelterVerified: boolean;

  // ============================================================
  // Location (GeoJSON for Geo-queries)
  // ============================================================

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      // Note: 2dsphere index is defined at schema level
    },
  })
  location?: {
    type: string;
    coordinates: number[];
  };

  // ============================================================
  // Health & Status
  // ============================================================

  @Prop({ required: true, enum: HealthStatus, index: true })
  healthStatus: HealthStatus;

  @Prop({ default: false, index: true })
  isNeutered: boolean;

  @Prop({ default: false, index: true })
  isVaccinated: boolean;

  @Prop({ type: [String] })
  allergies?: string[];

  @Prop({ type: [String] })
  chronicConditions?: string[];

  @Prop({ default: false, index: true })
  hasSpecialNeeds: boolean;

  // ============================================================
  // Personality & Behavior
  // ============================================================

  @Prop({ required: true, enum: EnergyLevel, index: true })
  energyLevel: EnergyLevel;

  @Prop({ type: [String] })
  temperamentTraits?: string[];

  @Prop({ default: true, index: true })
  goodWithKids: boolean;

  @Prop({ default: true, index: true })
  goodWithDogs: boolean;

  @Prop({ default: true, index: true })
  goodWithCats: boolean;

  @Prop({ default: false, index: true })
  needsExperiencedOwner: boolean;

  @Prop({ default: false, index: true })
  mustBeOnlyPet: boolean;

  // ============================================================
  // Adoption Information
  // ============================================================

  @Prop({ required: true, enum: AdoptionStatus, index: true })
  adoptionStatus: AdoptionStatus;

  @Prop({ type: Number })
  adoptionFee?: number;

  @Prop({ default: true })
  requiresHomeVisit: boolean;

  @Prop({ type: [String] })
  adoptionRequirements?: string[];

  // ============================================================
  // Search & Discovery
  // ============================================================

  @Prop({ index: 'text' })
  searchText?: string; // Combined text for full-text search (breed, personality, description)

  @Prop({ default: false, index: true })
  isUrgent: boolean;

  @Prop({ default: false, index: true })
  isFeatured: boolean;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  favoriteCount: number;

  @Prop({ default: 0 })
  applicationCount: number;

  // ============================================================
  // Media
  // ============================================================

  @Prop()
  primaryPhotoUrl?: string;

  @Prop({ type: [String] })
  photoUrls?: string[];

  @Prop({ type: [String] })
  videoUrls?: string[];

  // ============================================================
  // Rescue Information
  // ============================================================

  @Prop({ required: true })
  rescueDate: Date;

  @Prop({ index: true })
  daysSinceRescue?: number; // Calculated field for sorting

  @Prop()
  rescueLocation?: string;

  // ============================================================
  // Scoring & Ranking
  // ============================================================

  @Prop({ default: 50, index: true })
  popularityScore: number; // Based on views, favorites, applications

  @Prop({ default: 0 })
  urgencyScore: number; // Higher for urgent cases

  @Prop({ type: Object })
  matchingScores?: {
    familyFriendly?: number; // 0-100
    apartmentSuitable?: number;
    firstTimeOwner?: number;
    activeLifestyle?: number;
  };

  // ============================================================
  // Metadata
  // ============================================================

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date })
  lastUpdated?: Date;

  @Prop({ type: Date })
  createdAt?: Date;
}

export const PetListingSearchSchema = SchemaFactory.createForClass(PetListingSearch);

// ============================================================
// Indexes for Optimized Queries
// ============================================================

PetListingSearchSchema.index({ species: 1, adoptionStatus: 1, shelterCity: 1 });
PetListingSearchSchema.index({ size: 1, energyLevel: 1, goodWithKids: 1 });
PetListingSearchSchema.index({ shelterTrustScore: -1, popularityScore: -1 });
PetListingSearchSchema.index({ adoptionStatus: 1, isUrgent: -1, createdAt: -1 });
PetListingSearchSchema.index({ estimatedAgeYears: 1, species: 1 });
PetListingSearchSchema.index({ adoptionFee: 1, adoptionStatus: 1 });
PetListingSearchSchema.index({ hasSpecialNeeds: 1, healthStatus: 1 });

// Compound index for faceted search
PetListingSearchSchema.index({
  species: 1,
  size: 1,
  gender: 1,
  adoptionStatus: 1,
  shelterCity: 1,
});

// Text search index
PetListingSearchSchema.index({ searchText: 'text' });

// Geospatial index for location-based queries
PetListingSearchSchema.index({ 'location.coordinates': '2dsphere' });

// TTL index for auto-cleanup of inactive listings (optional)
// PetListingSearchSchema.index({ lastUpdated: 1 }, { expireAfterSeconds: 31536000 }); // 1 year

// ============================================================
// Helper Methods
// ============================================================

PetListingSearchSchema.methods.calculatePopularityScore = function (): number {
  const viewWeight = 0.3;
  const favoriteWeight = 0.4;
  const applicationWeight = 0.3;

  // Normalize to 0-100 scale
  const normalizedViews = Math.min(this.viewCount / 100, 1) * 100;
  const normalizedFavorites = Math.min(this.favoriteCount / 50, 1) * 100;
  const normalizedApplications = Math.min(this.applicationCount / 10, 1) * 100;

  return (
    normalizedViews * viewWeight +
    normalizedFavorites * favoriteWeight +
    normalizedApplications * applicationWeight
  );
};

PetListingSearchSchema.methods.calculateUrgencyScore = function (): number {
  let score = 0;

  if (this.isUrgent) score += 50;
  if (this.daysSinceRescue > 180) score += 30; // Long stay
  if (this.hasSpecialNeeds) score += 20;
  if (this.healthStatus === HealthStatus.NEEDS_TREATMENT) score += 40;

  return Math.min(score, 100);
};

PetListingSearchSchema.methods.calculateDaysSinceRescue = function (): number {
  const today = new Date();
  const rescue = new Date(this.rescueDate);
  const diffTime = Math.abs(today.getTime() - rescue.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ============================================================
// Static Methods for Search Queries
// ============================================================

/**
 * Faceted search with multiple filters
 */
PetListingSearchSchema.statics.facetedSearch = function (filters: {
  species?: PetSpecies[];
  size?: PetSize[];
  gender?: PetGender[];
  ageRange?: { min?: number; max?: number };
  city?: string;
  district?: string;
  goodWithKids?: boolean;
  goodWithPets?: boolean;
  specialNeeds?: boolean;
  energyLevel?: EnergyLevel[];
  minTrustScore?: number;
  maxAdoptionFee?: number;
  searchText?: string;
  location?: { longitude: number; latitude: number; maxDistance: number }; // meters
  limit?: number;
  skip?: number;
  sortBy?: 'newest' | 'popularity' | 'urgency' | 'distance';
}) {
  const query: any = { adoptionStatus: AdoptionStatus.AVAILABLE, isActive: true };

  if (filters.species?.length) {
    query.species = { $in: filters.species };
  }

  if (filters.size?.length) {
    query.size = { $in: filters.size };
  }

  if (filters.gender?.length) {
    query.gender = { $in: filters.gender };
  }

  if (filters.ageRange) {
    if (filters.ageRange.min !== undefined || filters.ageRange.max !== undefined) {
      query.estimatedAgeYears = {};
      if (filters.ageRange.min !== undefined) {
        query.estimatedAgeYears.$gte = filters.ageRange.min;
      }
      if (filters.ageRange.max !== undefined) {
        query.estimatedAgeYears.$lte = filters.ageRange.max;
      }
    }
  }

  if (filters.city) {
    query.shelterCity = filters.city;
  }

  if (filters.district) {
    query.shelterDistrict = filters.district;
  }

  if (filters.goodWithKids !== undefined) {
    query.goodWithKids = filters.goodWithKids;
  }

  if (filters.goodWithPets !== undefined) {
    query.$and = [{ goodWithDogs: filters.goodWithPets }, { goodWithCats: filters.goodWithPets }];
  }

  if (filters.specialNeeds !== undefined) {
    query.hasSpecialNeeds = filters.specialNeeds;
  }

  if (filters.energyLevel?.length) {
    query.energyLevel = { $in: filters.energyLevel };
  }

  if (filters.minTrustScore !== undefined) {
    query.shelterTrustScore = { $gte: filters.minTrustScore };
  }

  if (filters.maxAdoptionFee !== undefined) {
    query.$or = [
      { adoptionFee: { $lte: filters.maxAdoptionFee } },
      { adoptionFee: null },
      { adoptionFee: { $exists: false } },
    ];
  }

  if (filters.searchText) {
    query.$text = { $search: filters.searchText };
  }

  if (filters.location) {
    query['location.coordinates'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [filters.location.longitude, filters.location.latitude],
        },
        $maxDistance: filters.location.maxDistance,
      },
    };
  }

  let sortOption: any = { createdAt: -1 }; // Default: newest first

  switch (filters.sortBy) {
    case 'popularity':
      sortOption = { popularityScore: -1, createdAt: -1 };
      break;
    case 'urgency':
      sortOption = { isUrgent: -1, urgencyScore: -1, daysSinceRescue: -1 };
      break;
    case 'distance':
      // Distance sorting is handled automatically with $near
      break;
    case 'newest':
    default:
      sortOption = { createdAt: -1 };
  }

  return this.find(query)
    .sort(sortOption)
    .limit(filters.limit || 20)
    .skip(filters.skip || 0);
};

/**
 * Get aggregated facet counts for filtering UI
 */
PetListingSearchSchema.statics.getFacetCounts = function (baseQuery: any = {}) {
  const query = { ...baseQuery, adoptionStatus: AdoptionStatus.AVAILABLE, isActive: true };

  return this.aggregate([
    { $match: query },
    {
      $facet: {
        speciesCounts: [{ $group: { _id: '$species', count: { $sum: 1 } } }],
        sizeCounts: [{ $group: { _id: '$size', count: { $sum: 1 } } }],
        genderCounts: [{ $group: { _id: '$gender', count: { $sum: 1 } } }],
        cityCounts: [{ $group: { _id: '$shelterCity', count: { $sum: 1 } } }],
        energyLevelCounts: [{ $group: { _id: '$energyLevel', count: { $sum: 1 } } }],
        specialNeedsCounts: [{ $group: { _id: '$hasSpecialNeeds', count: { $sum: 1 } } }],
        ageRanges: [
          {
            $bucket: {
              groupBy: '$estimatedAgeYears',
              boundaries: [0, 1, 3, 7, 12, 100],
              default: 'Unknown',
              output: { count: { $sum: 1 } },
            },
          },
        ],
      },
    },
  ]);
};
