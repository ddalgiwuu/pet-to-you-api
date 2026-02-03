import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DaycareSearchDocument = DaycareSearch & Document;

/**
 * 🗺️ MongoDB Schema for Geospatial Daycare Search
 *
 * Purpose: Enable fast location-based daycare center search
 * - 2dsphere index for geospatial queries
 * - Denormalized data from PostgreSQL for read performance
 * - Updated via CDC (Change Data Capture) or sync jobs
 *
 * Use Cases:
 * - "Find daycare centers within 5km of my location"
 * - "Find daycare centers with available capacity"
 * - "Search by service type + location"
 * - "Filter by price range and rating"
 */
@Schema({
  collection: 'daycare_search',
  timestamps: true,
})
export class DaycareSearch {
  @Prop({ required: true, unique: true })
  id: string; // PostgreSQL daycare_center.id

  @Prop({ required: true, index: true })
  name: string;

  @Prop({ index: true })
  nameEnglish?: string;

  @Prop({ required: true, index: true })
  status: string; // DaycareStatus enum

  @Prop()
  description?: string;

  // ============================================================
  // Geospatial Fields (2dsphere index)
  // ============================================================

  /**
   * 📍 GeoJSON Point for 2dsphere index
   *
   * Format: { type: 'Point', coordinates: [longitude, latitude] }
   * ⚠️ Note: GeoJSON uses [longitude, latitude] order (NOT latitude first!)
   *
   * Supported Queries:
   * - $near: Find nearest daycare centers
   * - $geoWithin: Find centers within polygon/circle
   * - $geoIntersects: Check if center intersects with area
   */
  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
    // Note: 2dsphere index is defined at schema level
  })
  location: {
    type: 'Point';
    coordinates: number[]; // [longitude, latitude]
  };

  @Prop()
  latitude: number;

  @Prop()
  longitude: number;

  // ============================================================
  // Address (for search and display)
  // ============================================================

  @Prop({ index: true })
  sido: string; // 시/도

  @Prop({ index: true })
  sigungu: string; // 시/군/구

  @Prop()
  dong?: string; // 동/읍/면

  @Prop()
  roadAddress: string;

  @Prop()
  fullAddress: string; // Denormalized for search

  // ============================================================
  // Contact & Business Info
  // ============================================================

  @Prop({ required: true })
  phoneNumber: string;

  @Prop()
  emergencyPhoneNumber?: string;

  @Prop()
  email?: string;

  @Prop()
  websiteUrl?: string;

  @Prop({ required: true, unique: true })
  businessRegistrationNumber: string;

  @Prop({ index: true })
  verificationStatus: string; // VerificationStatus enum

  @Prop()
  isOcrVerified: boolean;

  @Prop()
  isGovernmentCertified: boolean;

  // ============================================================
  // Operating Hours & Availability
  // ============================================================

  @Prop({ type: Object })
  operatingHours: Record<string, any>;

  @Prop([String])
  holidays?: string[];

  @Prop()
  isCurrentlyOpen: boolean; // Computed field (updated periodically)

  // ============================================================
  // Services & Pricing
  // ============================================================

  @Prop({ type: [String], index: true })
  serviceTypes: string[]; // DaycareServiceType enum values

  @Prop({ type: Object })
  pricingStructure: {
    hourly?: {
      pricePerHour: number;
      minimumHours: number;
    };
    daily?: {
      pricePerDay: number;
    };
    monthly?: {
      pricePerMonth: number;
      daysPerWeek: number;
    };
    overnight?: {
      pricePerNight: number;
    };
  };

  @Prop({ index: true })
  minPricePerDay: number; // Computed for price range filtering

  @Prop({ index: true })
  maxPricePerDay: number; // Computed for price range filtering

  // ============================================================
  // Capacity & Availability
  // ============================================================

  @Prop({ required: true })
  maxCapacityPerDay: number;

  @Prop({ default: 0 })
  currentOccupancy: number;

  @Prop({ index: true })
  hasAvailableCapacity: boolean; // Computed field

  @Prop([String])
  acceptedSpecies?: string[];

  @Prop([String])
  restrictedBreeds?: string[];

  // ============================================================
  // Facilities & Features
  // ============================================================

  @Prop()
  indoorAreaSqm?: number;

  @Prop()
  outdoorAreaSqm?: number;

  @Prop([String])
  facilities?: string[];

  @Prop([String])
  equipment?: string[];

  @Prop({ index: true })
  hasCctv: boolean;

  @Prop({ index: true })
  hasLiveCam: boolean;

  @Prop()
  liveCamUrl?: string;

  @Prop({ index: true })
  hasParking: boolean;

  @Prop({ index: true })
  hasPickupService: boolean;

  // ============================================================
  // Staff & Safety
  // ============================================================

  @Prop()
  totalStaff: number;

  @Prop()
  certifiedTrainers: number;

  @Prop([String])
  staffCertifications?: string[];

  @Prop({ index: true })
  hasLiabilityInsurance: boolean;

  @Prop()
  insuranceProvider?: string;

  @Prop({ index: true })
  hasVetOnCall: boolean;

  // ============================================================
  // Activity Reports
  // ============================================================

  @Prop({ index: true })
  providesDailyReport: boolean;

  @Prop([String])
  reportIncludes?: string[];

  // ============================================================
  // Payment & Policy
  // ============================================================

  @Prop([String])
  acceptedPaymentMethods?: string[];

  // ============================================================
  // Ratings & Statistics
  // ============================================================

  @Prop({ index: true })
  averageRating: number;

  @Prop()
  totalReviews: number;

  @Prop()
  totalReservations: number;

  @Prop()
  viewCount: number;

  @Prop()
  bookmarkCount: number;

  // ============================================================
  // Media
  // ============================================================

  @Prop()
  logoUrl?: string;

  @Prop([String])
  photoUrls?: string[];

  @Prop([String])
  videoUrls?: string[];

  // ============================================================
  // Metadata
  // ============================================================

  @Prop()
  isDeleted: boolean;

  @Prop()
  lastSyncedAt: Date; // When synced from PostgreSQL
}

export const DaycareSearchSchema = SchemaFactory.createForClass(DaycareSearch);

// ============================================================
// Indexes for Optimal Query Performance
// ============================================================

// Geospatial queries
DaycareSearchSchema.index({ location: '2dsphere' });

// Full-text search
DaycareSearchSchema.index({ name: 'text', description: 'text' });

// Compound indexes for common filter combinations
DaycareSearchSchema.index({ status: 1, verificationStatus: 1 });
DaycareSearchSchema.index({ sido: 1, sigungu: 1 });
DaycareSearchSchema.index({ hasAvailableCapacity: 1, isCurrentlyOpen: 1 });
DaycareSearchSchema.index({ averageRating: -1, totalReviews: -1 }); // Sort by rating

// Service and price filtering
DaycareSearchSchema.index({ serviceTypes: 1 });
DaycareSearchSchema.index({ minPricePerDay: 1, maxPricePerDay: 1 });

// Feature-based filtering
DaycareSearchSchema.index({ hasCctv: 1, hasLiveCam: 1, hasPickupService: 1 });
DaycareSearchSchema.index({ hasLiabilityInsurance: 1, hasVetOnCall: 1 });
DaycareSearchSchema.index({ providesDailyReport: 1 });
