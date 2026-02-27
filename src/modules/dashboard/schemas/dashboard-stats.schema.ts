import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * 📊 Dashboard Stats Schema (MongoDB)
 *
 * Pre-computed statistics for fast dashboard loading.
 *
 * Features:
 * - Real-time and cached statistics
 * - Time-series data for trend analysis
 * - Revenue and booking analytics
 * - Patient/customer metrics
 *
 * Performance:
 * - Updated via scheduled jobs (every 5 minutes)
 * - Reduces load on PostgreSQL
 * - Indexed by resourceId and period
 * - TTL index for automatic cleanup
 */
@Schema({
  collection: 'dashboard_stats',
  timestamps: true,
})
export class DashboardStats extends Document {
  @Prop({ required: true, index: true })
  resourceType: 'hospital' | 'business'; // Type of organization

  @Prop({ required: true, index: true })
  resourceId: string; // Hospital or Business UUID

  @Prop({ required: true, enum: ['today', 'week', 'month', 'year'], index: true })
  period: 'today' | 'week' | 'month' | 'year';

  @Prop({ required: true, index: true })
  date: Date; // Date for this stats snapshot

  // Core Metrics
  @Prop({ type: Object, required: true })
  overview: {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    totalRevenue: number;
    averageRating: number;
    activePatients?: number; // For hospitals
    activePets?: number; // For hospitals
    totalCustomers?: number; // For businesses
    occupancyRate?: number; // For businesses with capacity
  };

  // Growth Trends (vs previous period)
  @Prop({ type: Object, required: true })
  trends: {
    appointmentsGrowth: number; // Percentage
    revenueGrowth: number; // Percentage
    patientsGrowth?: number; // For hospitals
    customersGrowth?: number; // For businesses
  };

  // Revenue Breakdown
  @Prop({ type: Object })
  revenue?: {
    byService: Array<{ serviceId: string; serviceName: string; amount: number }>;
    byPaymentMethod: Array<{ method: string; amount: number }>;
    byMonth?: Array<{ month: string; amount: number }>; // For yearly period
  };

  // Appointment Statistics
  @Prop({ type: Object })
  appointments?: {
    byStatus: Array<{ status: string; count: number }>;
    byType?: Array<{ type: string; count: number }>;
    averageBookingValue: number;
    completionRate: number;
  };

  // Patient/Customer Statistics
  @Prop({ type: Object })
  customers?: {
    newCustomers: number;
    returningCustomers: number;
    topCustomers: Array<{ userId: string; userName: string; totalSpent: number }>;
    averageLifetimeValue: number;
  };

  // Service Performance (for businesses)
  @Prop({ type: Object })
  services?: {
    topServices: Array<{ serviceId: string; serviceName: string; bookings: number; revenue: number }>;
    capacityUtilization: number;
  };

  // Review Statistics
  @Prop({ type: Object })
  reviews?: {
    totalReviews: number;
    averageRating: number;
    ratingDistribution: Array<{ rating: number; count: number }>;
    sentimentDistribution: Array<{ sentiment: string; count: number }>;
  };

  // Metadata
  @Prop({ required: true })
  computedAt: Date; // When this stats was computed

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ type: Date, expires: 2592000 }) // TTL: 30 days
  expiresAt: Date;
}

export const DashboardStatsSchema = SchemaFactory.createForClass(DashboardStats);

// Indexes
DashboardStatsSchema.index({ resourceType: 1, resourceId: 1, period: 1, date: -1 });
DashboardStatsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
