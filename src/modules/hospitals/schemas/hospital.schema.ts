import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HospitalSearchDocument = HospitalSearch & Document;

/**
 * 🗺️ MongoDB Schema for Geospatial Search
 *
 * Purpose: Enable fast location-based hospital search
 * - 2dsphere index for geospatial queries
 * - Denormalized data from PostgreSQL for read performance
 * - Updated via CDC (Change Data Capture) or sync jobs
 *
 * Use Cases:
 * - "Find hospitals within 5km of my location"
 * - "Find emergency hospitals near me"
 * - "Search hospitals by name + location"
 */
@Schema({
  collection: 'hospitals',
  timestamps: true,
})
export class HospitalSearch {
  @Prop({ required: true, unique: true })
  id: string; // PostgreSQL hospital.id

  @Prop({ required: true, index: true })
  name: string;

  @Prop({ index: true })
  nameEnglish?: string;

  @Prop({ required: true, index: true })
  type: string; // HospitalType enum

  @Prop({ required: true, index: true })
  status: string; // HospitalStatus enum

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
   * - $near: Find nearest hospitals
   * - $geoWithin: Find hospitals within polygon/circle
   * - $geoIntersects: Check if hospital intersects with area
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
    // Note: 2dsphere index is defined at schema level (line 211)
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

  @Prop()
  isVerified: boolean;

  // ============================================================
  // Operating Hours & Availability
  // ============================================================

  @Prop({ type: Object })
  operatingHours: Record<string, any>;

  @Prop()
  is24Hours: boolean;

  @Prop([String])
  holidays?: string[];

  @Prop()
  isCurrentlyOpen: boolean; // Computed field (updated periodically)

  // ============================================================
  // Services & Features
  // ============================================================

  @Prop({ type: [String], index: true })
  services: string[]; // 진료 과목

  @Prop([String])
  specialties?: string[]; // 전문 분야

  @Prop([String])
  supportedSpecies?: string[]; // 진료 가능 동물

  @Prop()
  hasParking: boolean;

  @Prop({ index: true })
  hasEmergency: boolean; // Index for emergency hospital search

  @Prop()
  hasGrooming: boolean;

  @Prop()
  hasHotel: boolean;

  @Prop()
  acceptsInsurance: boolean;

  // ============================================================
  // Ratings & Statistics
  // ============================================================

  @Prop({ index: true })
  averageRating: number;

  @Prop()
  totalReviews: number;

  @Prop()
  totalBookings: number;

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

  // ============================================================
  // Metadata
  // ============================================================

  @Prop()
  isDeleted: boolean;

  @Prop()
  lastSyncedAt: Date; // When synced from PostgreSQL
}

export const HospitalSearchSchema = SchemaFactory.createForClass(HospitalSearch);

// ============================================================
// Indexes
// ============================================================

HospitalSearchSchema.index({ location: '2dsphere' }); // Geospatial queries
HospitalSearchSchema.index({ name: 'text', description: 'text' }); // Full-text search
HospitalSearchSchema.index({ status: 1, type: 1 }); // Compound index for filtering
HospitalSearchSchema.index({ sido: 1, sigungu: 1 }); // Location-based filtering
HospitalSearchSchema.index({ hasEmergency: 1, isCurrentlyOpen: 1 }); // Emergency hospital search
HospitalSearchSchema.index({ averageRating: -1 }); // Sort by rating
