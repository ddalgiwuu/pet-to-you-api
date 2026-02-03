import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { 
  UserEvent, 
  UserEventDocument,
  EventType 
} from '../schemas/user-event.schema';
import { 
  HospitalMetrics, 
  HospitalMetricsDocument 
} from '../schemas/hospital-metrics.schema';
import { 
  PlatformMetrics, 
  PlatformMetricsDocument 
} from '../schemas/platform-metrics.schema';
import { 
  TrackEventDto,
  AnalyticsQueryDto,
  TimeRange,
  HospitalDashboardResponseDto,
  PlatformDashboardResponseDto,
} from '../dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(UserEvent.name)
    private userEventModel: Model<UserEventDocument>,
    @InjectModel(HospitalMetrics.name)
    private hospitalMetricsModel: Model<HospitalMetricsDocument>,
    @InjectModel(PlatformMetrics.name)
    private platformMetricsModel: Model<PlatformMetricsDocument>,
  ) {}

  /**
   * Track user event (for real-time event collection)
   */
  async trackEvent(dto: TrackEventDto): Promise<void> {
    const event = new this.userEventModel({
      ...dto,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    });

    await event.save();
  }

  /**
   * Get Hospital Dashboard Analytics
   */
  async getHospitalDashboard(
    hospitalId: string,
    query: AnalyticsQueryDto,
  ): Promise<HospitalDashboardResponseDto> {
    const { startDate, endDate } = this.getDateRange(query);

    // Fetch pre-computed metrics from materialized collection
    const metrics = await this.hospitalMetricsModel
      .find({
        hospitalId,
        date: { $gte: startDate, $lte: endDate },
      })
      .sort({ date: -1 })
      .lean()
      .exec();

    if (!metrics.length) {
      throw new NotFoundException(`No analytics data found for hospital ${hospitalId}`);
    }

    // Aggregate metrics across the date range
    const aggregated = this.aggregateHospitalMetrics(metrics);

    return {
      hospitalId,
      period: {
        start: startDate,
        end: endDate,
        range: query.timeRange ?? 'week',
      },
      revenue: {
        daily: this.calculateAverage(metrics, 'dailyRevenue'),
        weekly: this.calculateAverage(metrics, 'weeklyRevenue'),
        monthly: this.calculateAverage(metrics, 'monthlyRevenue'),
        breakdown: this.mergeRevenueBreakdown(metrics),
        trend: this.buildRevenueTrend(metrics),
      },
      bookings: {
        total: this.sum(metrics, 'totalBookings'),
        completed: this.sum(metrics, 'completedBookings'),
        cancelled: this.sum(metrics, 'cancelledBookings'),
        noShow: this.sum(metrics, 'noShowBookings'),
        cancellationRate: this.calculateAverage(metrics, 'cancellationRate'),
        averageValue: this.calculateAverage(metrics, 'averageBookingValue'),
      },
      patients: this.mergePatientDemographics(metrics),
      popularServices: this.mergePopularServices(metrics),
      peakHours: this.mergePeakHours(metrics),
      ratings: {
        average: this.calculateAverage(metrics, 'averageRating'),
        total: this.sum(metrics, 'totalReviews'),
        distribution: this.mergeRatingDistribution(metrics),
      },
      staffPerformance: this.mergeStaffPerformance(metrics),
      operationalMetrics: {
        averageWaitTime: this.calculateAverage(metrics, 'averageWaitTime'),
        utilizationRate: this.calculateAverage(metrics, 'utilizationRate'),
        repeatCustomerRate: this.calculateAverage(metrics, 'repeatCustomerRate'),
      },
    };
  }

  /**
   * Get Platform Overview Dashboard
   */
  async getPlatformOverview(
    query: AnalyticsQueryDto,
  ): Promise<PlatformDashboardResponseDto> {
    const { startDate, endDate } = this.getDateRange(query);

    const metrics = await this.platformMetricsModel
      .find({
        date: { $gte: startDate, $lte: endDate },
      })
      .sort({ date: -1 })
      .lean()
      .exec();

    if (!metrics.length) {
      throw new NotFoundException('No platform metrics data found');
    }

    return {
      period: {
        start: startDate,
        end: endDate,
        range: query.timeRange ?? 'week',
      },
      users: {
        mau: this.calculateAverage(metrics, 'mau'),
        dau: this.calculateAverage(metrics, 'dau'),
        newUsers: this.sum(metrics, 'newUsers'),
        returningUsers: this.sum(metrics, 'returningUsers'),
        retentionRates: this.mergeRetentionRates(metrics),
        averageSessionDuration: this.calculateAverage(metrics, 'averageSessionDuration'),
        averageSessionsPerUser: this.calculateAverage(metrics, 'averageSessionsPerUser'),
        trend: this.buildUserTrend(metrics),
      },
      revenue: {
        total: this.sum(metrics, 'totalRevenue'),
        gmv: this.sum(metrics, 'gmv'),
        platformFees: this.sum(metrics, 'platformFees'),
        byService: this.mergeRevenueByService(metrics),
        trend: this.buildRevenueTrendPlatform(metrics),
      },
      bookings: {
        total: this.sum(metrics, 'totalBookings'),
        completed: this.sum(metrics, 'completedBookings'),
        cancelled: this.sum(metrics, 'cancelledBookings'),
        averageValue: this.calculateAverage(metrics, 'averageBookingValue'),
        trend: this.buildBookingTrend(metrics),
      },
      conversionFunnel: this.mergeConversionFunnel(metrics),
      topCities: this.mergeTopCities(metrics),
      providers: await this.getProviderMetrics(),
      cohortAnalysis: await this.getCohortAnalysis(startDate, endDate),
      performance: {
        averageResponseTime: this.calculateAverage(metrics, 'averageResponseTime'),
        errorRate: this.calculateAverage(metrics, 'errorRate'),
      },
    };
  }

  /**
   * Get Platform Revenue Analytics
   */
  async getPlatformRevenue(query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const pipeline = [
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalRevenue' },
          totalGMV: { $sum: '$gmv' },
          totalPlatformFees: { $sum: '$platformFees' },
          avgDailyRevenue: { $avg: '$totalRevenue' },
          revenueByService: {
            $push: '$revenueByService',
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalRevenue: 1,
          totalGMV: 1,
          totalPlatformFees: 1,
          avgDailyRevenue: 1,
          revenueByService: {
            hospital: { $sum: '$revenueByService.hospital' },
            daycare: { $sum: '$revenueByService.daycare' },
            adoption: { $sum: '$revenueByService.adoption' },
            insurance: { $sum: '$revenueByService.insurance' },
          },
        },
      },
    ];

    const result = await this.platformMetricsModel.aggregate(pipeline).exec();
    return result[0] || {};
  }

  /**
   * Get Platform User Analytics
   */
  async getPlatformUsers(query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const pipeline = [
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          avgMAU: { $avg: '$mau' },
          avgDAU: { $avg: '$dau' },
          totalNewUsers: { $sum: '$newUsers' },
          totalReturningUsers: { $sum: '$returningUsers' },
          avgSessionDuration: { $avg: '$averageSessionDuration' },
          avgSessionsPerUser: { $avg: '$averageSessionsPerUser' },
        },
      },
      {
        $project: {
          _id: 0,
          mau: { $round: ['$avgMAU', 0] },
          dau: { $round: ['$avgDAU', 0] },
          newUsers: '$totalNewUsers',
          returningUsers: '$totalReturningUsers',
          averageSessionDuration: { $round: ['$avgSessionDuration', 0] },
          averageSessionsPerUser: { $round: ['$avgSessionsPerUser', 2] },
        },
      },
    ];

    const result = await this.platformMetricsModel.aggregate(pipeline).exec();
    return result[0] || {};
  }

  /**
   * Get Conversion Funnel Analytics
   */
  async getConversionFunnel(query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

    const metrics = await this.platformMetricsModel
      .find({
        date: { $gte: startDate, $lte: endDate },
      })
      .select('conversionFunnel')
      .lean()
      .exec();

    return this.mergeConversionFunnel(metrics);
  }

  // ============================================
  // HELPER METHODS FOR AGGREGATION
  // ============================================

  private getDateRange(query: AnalyticsQueryDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now.setHours(23, 59, 59, 999));

    if (query.timeRange === TimeRange.CUSTOM && query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
    } else {
      switch (query.timeRange) {
        case TimeRange.DAY:
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case TimeRange.WEEK:
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case TimeRange.MONTH:
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case TimeRange.QUARTER:
          startDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case TimeRange.YEAR:
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 7));
      }
    }

    return { startDate, endDate };
  }

  private sum(metrics: any[], field: string): number {
    return metrics.reduce((acc, m) => acc + (m[field] || 0), 0);
  }

  private calculateAverage(metrics: any[], field: string): number {
    if (!metrics.length) return 0;
    const sum = this.sum(metrics, field);
    return Math.round((sum / metrics.length) * 100) / 100;
  }

  private aggregateHospitalMetrics(metrics: any[]) {
    // Implementation for complex aggregations
    return metrics;
  }

  private mergeRevenueBreakdown(metrics: any[]) {
    const breakdown = {
      consultation: 0,
      surgery: 0,
      vaccination: 0,
      grooming: 0,
      boarding: 0,
      emergency: 0,
      other: 0,
    };

    metrics.forEach(m => {
      if (m.revenueByService) {
        Object.keys(breakdown).forEach((key: string) => {
          breakdown[key as keyof typeof breakdown] += m.revenueByService[key] || 0;
        });
      }
    });

    return breakdown;
  }

  private buildRevenueTrend(metrics: any[]) {
    return metrics.map(m => ({
      date: m.date.toISOString().split('T')[0],
      amount: m.dailyRevenue || 0,
    }));
  }

  private mergePatientDemographics(metrics: any[]) {
    const demographics = {
      total: 0,
      new: 0,
      returning: 0,
      bySpecies: {} as Record<string, number>,
      byAge: { young: 0, adult: 0, senior: 0 },
    };

    metrics.forEach(m => {
      if (m.patientDemographics) {
        demographics.total += m.patientDemographics.totalPatients || 0;
        demographics.new += m.patientDemographics.newPatients || 0;
        demographics.returning += m.patientDemographics.returningPatients || 0;

        if (m.patientDemographics.bySpecies) {
          Object.entries(m.patientDemographics.bySpecies).forEach(([species, count]) => {
            demographics.bySpecies[species] = (demographics.bySpecies[species] || 0) + (count as number);
          });
        }

        if (m.patientDemographics.byAge) {
          demographics.byAge.young += m.patientDemographics.byAge.young || 0;
          demographics.byAge.adult += m.patientDemographics.byAge.adult || 0;
          demographics.byAge.senior += m.patientDemographics.byAge.senior || 0;
        }
      }
    });

    return demographics;
  }

  private mergePopularServices(metrics: any[]) {
    const servicesMap = new Map();

    metrics.forEach(m => {
      m.popularServices?.forEach((service: any) => {
        if (servicesMap.has(service.serviceName)) {
          const existing = servicesMap.get(service.serviceName);
          existing.bookingCount += service.bookingCount;
          existing.revenue += service.revenue;
        } else {
          servicesMap.set(service.serviceName, { ...service });
        }
      });
    });

    return Array.from(servicesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  private mergePeakHours(metrics: any[]) {
    const hoursMap = new Map();

    metrics.forEach(m => {
      m.peakHours?.forEach((hour: any) => {
        if (hoursMap.has(hour.hour)) {
          const existing = hoursMap.get(hour.hour);
          existing.bookingCount += hour.bookingCount;
          existing.revenue += hour.revenue;
        } else {
          hoursMap.set(hour.hour, { ...hour });
        }
      });
    });

    return Array.from(hoursMap.values()).sort((a, b) => a.hour - b.hour);
  }

  private mergeRatingDistribution(metrics: any[]) {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    metrics.forEach(m => {
      if (m.ratingDistribution) {
        Object.keys(distribution).forEach((key: string) => {
          const numKey = parseInt(key) as 1 | 2 | 3 | 4 | 5;
          distribution[numKey] += m.ratingDistribution[key] || 0;
        });
      }
    });

    return distribution;
  }

  private mergeStaffPerformance(metrics: any[]) {
    const staffMap = new Map();

    metrics.forEach(m => {
      m.staffPerformance?.forEach((staff: any) => {
        if (staffMap.has(staff.staffId)) {
          const existing = staffMap.get(staff.staffId);
          existing.appointmentsHandled += staff.appointmentsHandled;
          existing.revenue += staff.revenue;
        } else {
          staffMap.set(staff.staffId, { ...staff });
        }
      });
    });

    return Array.from(staffMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  private mergeRetentionRates(metrics: any[]) {
    const retention = { day1: 0, day7: 0, day30: 0 };
    let count = 0;

    metrics.forEach(m => {
      if (m.retentionRates) {
        retention.day1 += m.retentionRates.day1 || 0;
        retention.day7 += m.retentionRates.day7 || 0;
        retention.day30 += m.retentionRates.day30 || 0;
        count++;
      }
    });

    return {
      day1: count ? Math.round((retention.day1 / count) * 100) / 100 : 0,
      day7: count ? Math.round((retention.day7 / count) * 100) / 100 : 0,
      day30: count ? Math.round((retention.day30 / count) * 100) / 100 : 0,
    };
  }

  private buildUserTrend(metrics: any[]) {
    return metrics.map(m => ({
      date: m.date.toISOString().split('T')[0],
      mau: m.mau || 0,
      dau: m.dau || 0,
    }));
  }

  private mergeRevenueByService(metrics: any[]) {
    const byService = {
      hospital: 0,
      daycare: 0,
      adoption: 0,
      insurance: 0,
    };

    metrics.forEach(m => {
      if (m.revenueByService) {
        Object.keys(byService).forEach((key: string) => {
          byService[key as keyof typeof byService] += m.revenueByService[key] || 0;
        });
      }
    });

    return byService;
  }

  private buildRevenueTrendPlatform(metrics: any[]) {
    return metrics.map(m => ({
      date: m.date.toISOString().split('T')[0],
      revenue: m.totalRevenue || 0,
      gmv: m.gmv || 0,
    }));
  }

  private buildBookingTrend(metrics: any[]) {
    return metrics.map(m => ({
      date: m.date.toISOString().split('T')[0],
      count: m.totalBookings || 0,
    }));
  }

  private mergeConversionFunnel(metrics: any[]) {
    const funnel = {
      landingPageViews: 0,
      searchPerformed: 0,
      listingViewed: 0,
      bookingInitiated: 0,
      bookingCompleted: 0,
      conversionRate: 0,
      stepConversionRates: [] as Array<{ step: string; rate: number }>,
    };

    metrics.forEach(m => {
      if (m.conversionFunnel) {
        funnel.landingPageViews += m.conversionFunnel.landingPageViews || 0;
        funnel.searchPerformed += m.conversionFunnel.searchPerformed || 0;
        funnel.listingViewed += m.conversionFunnel.listingViewed || 0;
        funnel.bookingInitiated += m.conversionFunnel.bookingInitiated || 0;
        funnel.bookingCompleted += m.conversionFunnel.bookingCompleted || 0;
      }
    });

    funnel.conversionRate = funnel.landingPageViews 
      ? Math.round((funnel.bookingCompleted / funnel.landingPageViews) * 10000) / 100 
      : 0;

    funnel.stepConversionRates = [
      { step: 'Landing → Search', rate: this.calcRate(funnel.searchPerformed, funnel.landingPageViews) },
      { step: 'Search → Listing', rate: this.calcRate(funnel.listingViewed, funnel.searchPerformed) },
      { step: 'Listing → Booking', rate: this.calcRate(funnel.bookingInitiated, funnel.listingViewed) },
      { step: 'Booking → Completed', rate: this.calcRate(funnel.bookingCompleted, funnel.bookingInitiated) },
    ];

    return funnel;
  }

  private calcRate(numerator: number, denominator: number): number {
    return denominator ? Math.round((numerator / denominator) * 10000) / 100 : 0;
  }

  private mergeTopCities(metrics: any[]) {
    const citiesMap = new Map();

    metrics.forEach(m => {
      m.topCities?.forEach((city: any) => {
        if (citiesMap.has(city.city)) {
          const existing = citiesMap.get(city.city);
          existing.count += city.count;
          existing.revenue += city.revenue;
        } else {
          citiesMap.set(city.city, { ...city });
        }
      });
    });

    return Array.from(citiesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  private async getProviderMetrics() {
    // This would query the actual provider data
    // Placeholder implementation
    return {
      totalHospitals: 0,
      totalDaycares: 0,
      totalShelters: 0,
      activeProviders: 0,
      topPerformers: [],
    };
  }

  private async getCohortAnalysis(startDate: Date, endDate: Date) {
    // Complex cohort analysis implementation
    // Placeholder for now
    return [];
  }
}
