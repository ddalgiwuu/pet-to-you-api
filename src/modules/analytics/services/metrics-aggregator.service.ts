import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { 
  HospitalMetrics, 
  HospitalMetricsDocument 
} from '../schemas/hospital-metrics.schema';
import { 
  PlatformMetrics, 
  PlatformMetricsDocument 
} from '../schemas/platform-metrics.schema';
import { 
  UserEvent, 
  UserEventDocument,
  EventType 
} from '../schemas/user-event.schema';

/**
 * Service responsible for pre-computing daily metrics
 * Runs as a cron job to materialize views for fast dashboard queries
 */
@Injectable()
export class MetricsAggregatorService {
  private readonly logger = new Logger(MetricsAggregatorService.name);

  constructor(
    @InjectModel(UserEvent.name)
    private userEventModel: Model<UserEventDocument>,
    @InjectModel(HospitalMetrics.name)
    private hospitalMetricsModel: Model<HospitalMetricsDocument>,
    @InjectModel(PlatformMetrics.name)
    private platformMetricsModel: Model<PlatformMetricsDocument>,
  ) {}

  /**
   * Cron job: Run daily at 1 AM to compute previous day's metrics
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async aggregateDailyMetrics() {
    this.logger.log('Starting daily metrics aggregation...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    try {
      // Aggregate platform-wide metrics
      await this.aggregatePlatformMetrics(yesterday, today);

      // Aggregate hospital metrics
      await this.aggregateHospitalMetrics(yesterday, today);

      this.logger.log('Daily metrics aggregation completed successfully');
    } catch (error) {
      this.logger.error('Failed to aggregate daily metrics', error.stack);
    }
  }

  /**
   * Aggregate platform-wide metrics for a specific date
   */
  private async aggregatePlatformMetrics(startDate: Date, endDate: Date) {
    const pipeline = [
      {
        $match: {
          timestamp: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $facet: {
          // User metrics
          userMetrics: [
            {
              $match: {
                eventType: { $in: [EventType.PAGE_VIEW, EventType.LOGIN] },
              },
            },
            {
              $group: {
                _id: null,
                dau: { $addToSet: '$userId' },
                totalSessions: { $addToSet: '$sessionId' },
              },
            },
          ],
          // Booking metrics
          bookingMetrics: [
            {
              $match: {
                eventType: { $in: [EventType.BOOKING_CREATED, EventType.BOOKING_CANCELLED, EventType.PAYMENT_COMPLETED] },
              },
            },
            {
              $group: {
                _id: '$eventType',
                count: { $sum: 1 },
                totalValue: { $sum: { $ifNull: ['$eventProperties.bookingValue', 0] } },
              },
            },
          ],
          // Conversion funnel
          conversionFunnel: [
            {
              $group: {
                _id: '$eventType',
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ];

    const result = await this.userEventModel.aggregate(pipeline).exec();

    if (result.length > 0) {
      const metrics = result[0];

      const platformMetrics = {
        date: startDate,
        dau: metrics.userMetrics[0]?.dau?.length || 0,
        totalBookings: this.extractBookingCount(metrics.bookingMetrics, EventType.BOOKING_CREATED),
        completedBookings: this.extractBookingCount(metrics.bookingMetrics, EventType.PAYMENT_COMPLETED),
        cancelledBookings: this.extractBookingCount(metrics.bookingMetrics, EventType.BOOKING_CANCELLED),
        totalRevenue: this.extractBookingRevenue(metrics.bookingMetrics, EventType.PAYMENT_COMPLETED),
        conversionFunnel: this.buildConversionFunnel(metrics.conversionFunnel),
        lastUpdated: new Date(),
      };

      await this.platformMetricsModel.findOneAndUpdate(
        { date: startDate },
        platformMetrics,
        { upsert: true },
      );
    }
  }

  /**
   * Aggregate hospital-specific metrics for a date
   */
  private async aggregateHospitalMetrics(startDate: Date, endDate: Date) {
    // Group events by hospital and aggregate
    const pipeline = [
      {
        $match: {
          timestamp: { $gte: startDate, $lt: endDate },
          'eventProperties.hospitalId': { $exists: true },
        },
      },
      {
        $group: {
          _id: '$eventProperties.hospitalId',
          totalBookings: {
            $sum: { $cond: [{ $eq: ['$eventType', EventType.BOOKING_CREATED] }, 1, 0] },
          },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$eventType', EventType.PAYMENT_COMPLETED] }, 1, 0] },
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$eventType', EventType.BOOKING_CANCELLED] }, 1, 0] },
          },
          dailyRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$eventType', EventType.PAYMENT_COMPLETED] },
                { $ifNull: ['$eventProperties.amount', 0] },
                0,
              ],
            },
          },
          totalReviews: {
            $sum: { $cond: [{ $eq: ['$eventType', EventType.REVIEW_SUBMITTED] }, 1, 0] },
          },
        },
      },
    ];

    const hospitalData = await this.userEventModel.aggregate(pipeline).exec();

    // Update metrics for each hospital
    for (const data of hospitalData) {
      const metrics: Partial<HospitalMetrics> = {
        hospitalId: data._id,
        date: startDate,
        dailyRevenue: data.dailyRevenue,
        totalBookings: data.totalBookings,
        completedBookings: data.completedBookings,
        cancelledBookings: data.cancelledBookings,
        cancellationRate: data.totalBookings 
          ? (data.cancelledBookings / data.totalBookings) * 100 
          : 0,
        averageBookingValue: data.completedBookings 
          ? data.dailyRevenue / data.completedBookings 
          : 0,
        totalReviews: data.totalReviews,
        lastUpdated: new Date(),
      };

      await this.hospitalMetricsModel.findOneAndUpdate(
        { hospitalId: data._id, date: startDate },
        metrics,
        { upsert: true },
      );
    }
  }

  /**
   * Helper: Extract booking count by event type
   */
  private extractBookingCount(bookingMetrics: any[], eventType: EventType): number {
    const metric = bookingMetrics.find(m => m._id === eventType);
    return metric?.count || 0;
  }

  /**
   * Helper: Extract booking revenue by event type
   */
  private extractBookingRevenue(bookingMetrics: any[], eventType: EventType): number {
    const metric = bookingMetrics.find(m => m._id === eventType);
    return metric?.totalValue || 0;
  }

  /**
   * Helper: Build conversion funnel from event counts
   */
  private buildConversionFunnel(funnelData: any[]) {
    const getCount = (eventType: string) => {
      const event = funnelData.find(e => e._id === eventType);
      return event?.count || 0;
    };

    const landingPageViews = getCount(EventType.PAGE_VIEW);
    const searchPerformed = getCount(EventType.SEARCH_PERFORMED);
    const bookingInitiated = getCount(EventType.BOOKING_CREATED);
    const bookingCompleted = getCount(EventType.PAYMENT_COMPLETED);

    return {
      landingPageViews,
      searchPerformed,
      listingViewed: 0, // Would need additional tracking
      bookingInitiated,
      bookingCompleted,
      conversionRate: landingPageViews 
        ? (bookingCompleted / landingPageViews) * 100 
        : 0,
    };
  }
}
