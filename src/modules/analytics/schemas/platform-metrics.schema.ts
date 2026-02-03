import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlatformMetricsDocument = PlatformMetrics & Document;

@Schema({ 
  collection: 'platform_metrics',
  timestamps: true 
})
export class PlatformMetrics {
  @Prop({ required: true, unique: true, type: Date })
  date: Date;

  // User Metrics
  @Prop({ required: true, default: 0 })
  mau: number; // Monthly Active Users

  @Prop({ required: true, default: 0 })
  dau: number; // Daily Active Users

  @Prop({ required: true, default: 0 })
  newUsers: number;

  @Prop({ required: true, default: 0 })
  returningUsers: number;

  // Engagement Metrics
  @Prop({ type: Object, default: {} })
  retentionRates: {
    day1?: number;
    day7?: number;
    day30?: number;
  };

  @Prop({ required: true, default: 0 })
  averageSessionDuration: number; // in seconds

  @Prop({ required: true, default: 0 })
  averageSessionsPerUser: number;

  // Revenue Metrics
  @Prop({ required: true, default: 0 })
  totalRevenue: number;

  @Prop({ required: true, default: 0 })
  gmv: number; // Gross Merchandise Value

  @Prop({ required: true, default: 0 })
  platformFees: number;

  @Prop({ type: Object, default: {} })
  revenueByService: {
    hospital?: number;
    daycare?: number;
    adoption?: number;
    insurance?: number;
  };

  // Booking Metrics
  @Prop({ required: true, default: 0 })
  totalBookings: number;

  @Prop({ required: true, default: 0 })
  completedBookings: number;

  @Prop({ required: true, default: 0 })
  cancelledBookings: number;

  @Prop({ required: true, default: 0 })
  averageBookingValue: number;

  // Conversion Funnel
  @Prop({ type: Object, default: {} })
  conversionFunnel: {
    landingPageViews?: number;
    searchPerformed?: number;
    listingViewed?: number;
    bookingInitiated?: number;
    bookingCompleted?: number;
    conversionRate?: number;
  };

  // Geographic Distribution
  @Prop({ type: [Object], default: [] })
  topCities: Array<{ city: string; count: number; revenue: number }>;

  // Provider Metrics
  @Prop({ type: Object, default: {} })
  providerStats: {
    totalHospitals?: number;
    totalDaycares?: number;
    totalShelters?: number;
    activeProviders?: number;
  };

  // Performance Metrics
  @Prop({ required: true, default: 0 })
  averageResponseTime: number; // in milliseconds

  @Prop({ required: true, default: 0 })
  errorRate: number; // percentage

  @Prop({ type: Date, default: Date.now })
  lastUpdated: Date;
}

export const PlatformMetricsSchema = SchemaFactory.createForClass(PlatformMetrics);

// Indexes
PlatformMetricsSchema.index({ date: -1 });
PlatformMetricsSchema.index({ lastUpdated: -1 });
