import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HospitalMetricsDocument = HospitalMetrics & Document;

@Schema({ 
  collection: 'hospital_metrics',
  timestamps: true 
})
export class HospitalMetrics {
  @Prop({ required: true, index: true })
  hospitalId: string;

  @Prop({ required: true, type: Date })
  date: Date;

  // Revenue Metrics
  @Prop({ required: true, default: 0 })
  dailyRevenue: number;

  @Prop({ required: true, default: 0 })
  weeklyRevenue: number;

  @Prop({ required: true, default: 0 })
  monthlyRevenue: number;

  @Prop({ type: Object, default: {} })
  revenueByService: {
    consultation?: number;
    surgery?: number;
    vaccination?: number;
    grooming?: number;
    boarding?: number;
    emergency?: number;
    other?: number;
  };

  // Booking Statistics
  @Prop({ required: true, default: 0 })
  totalBookings: number;

  @Prop({ required: true, default: 0 })
  completedBookings: number;

  @Prop({ required: true, default: 0 })
  cancelledBookings: number;

  @Prop({ required: true, default: 0 })
  noShowBookings: number;

  @Prop({ required: true, default: 0 })
  cancellationRate: number; // percentage

  @Prop({ required: true, default: 0 })
  averageBookingValue: number;

  // Patient Demographics
  @Prop({ type: Object, default: {} })
  patientDemographics: {
    totalPatients?: number;
    newPatients?: number;
    returningPatients?: number;
    bySpecies?: Record<string, number>; // { dog: 45, cat: 30, ... }
    byAge?: {
      young?: number; // 0-2 years
      adult?: number; // 2-7 years
      senior?: number; // 7+ years
    };
  };

  // Popular Services
  @Prop({ type: [Object], default: [] })
  popularServices: Array<{
    serviceName: string;
    bookingCount: number;
    revenue: number;
    averageRating?: number;
  }>;

  // Peak Hours Analysis
  @Prop({ type: [Object], default: [] })
  peakHours: Array<{
    hour: number; // 0-23
    bookingCount: number;
    revenue: number;
  }>;

  // Review & Rating Metrics
  @Prop({ required: true, default: 0 })
  averageRating: number;

  @Prop({ required: true, default: 0 })
  totalReviews: number;

  @Prop({ type: Object, default: {} })
  ratingDistribution: {
    5?: number;
    4?: number;
    3?: number;
    2?: number;
    1?: number;
  };

  // Staff Performance
  @Prop({ type: [Object], default: [] })
  staffPerformance: Array<{
    staffId: string;
    name: string;
    appointmentsHandled: number;
    averageRating: number;
    revenue: number;
  }>;

  // Operational Metrics
  @Prop({ required: true, default: 0 })
  averageWaitTime: number; // in minutes

  @Prop({ required: true, default: 0 })
  utilizationRate: number; // percentage of capacity used

  @Prop({ required: true, default: 0 })
  repeatCustomerRate: number; // percentage

  @Prop({ type: Date, default: Date.now })
  lastUpdated: Date;
}

export const HospitalMetricsSchema = SchemaFactory.createForClass(HospitalMetrics);

// Compound indexes for efficient queries
HospitalMetricsSchema.index({ hospitalId: 1, date: -1 });
HospitalMetricsSchema.index({ date: -1, hospitalId: 1 });
HospitalMetricsSchema.index({ hospitalId: 1, lastUpdated: -1 });
