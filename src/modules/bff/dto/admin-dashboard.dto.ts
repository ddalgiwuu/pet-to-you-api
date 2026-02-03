import { IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum AdminTimeRangeEnum {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

/**
 * Query parameters for admin dashboard
 */
export class AdminDashboardQueryDto {
  @IsOptional()
  @IsEnum(AdminTimeRangeEnum)
  timeRange?: AdminTimeRangeEnum = AdminTimeRangeEnum.MONTH;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}

/**
 * Admin dashboard overview response
 */
export interface AdminDashboardResponseDto {
  platformOverview: {
    activeUsers: {
      total: number;
      consumers: number;
      hospitals: number;
      shelters: number;
      daycares: number;
      mau: number; // Monthly Active Users
      dauMauRatio: number; // DAU/MAU ratio
      trend: number; // percentage change
    };

    revenue: {
      total: number;
      trend: number;
      byCategory: {
        bookings: number;
        insurance: number;
        adoptions: number;
        other: number;
      };
      transactionVolume: number;
      averageTransactionValue: number;
    };

    activeHospitals: {
      total: number;
      verified: number;
      pending: number;
      suspended: number;
      topPerformers: Array<{
        id: string;
        name: string;
        revenue: number;
        bookingCount: number;
        rating: number;
      }>;
    };

    systemHealth: {
      uptime: number; // percentage
      apiLatency: number; // ms
      errorRate: number; // percentage
      activeConnections: number;
    };
  };

  pendingVerifications: {
    hospitals: {
      count: number;
      items: Array<{
        id: string;
        name: string;
        submittedAt: Date;
        location: string;
        documentsProvided: string[];
        priority: 'high' | 'medium' | 'low';
      }>;
    };

    shelters: {
      count: number;
      items: Array<{
        id: string;
        name: string;
        submittedAt: Date;
        location: string;
        documentsProvided: string[];
      }>;
    };

    daycares: {
      count: number;
      items: Array<{
        id: string;
        name: string;
        submittedAt: Date;
        location: string;
        documentsProvided: string[];
      }>;
    };
  };

  securityAlerts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    recentAlerts: Array<{
      id: string;
      type: 'fraud' | 'breach' | 'suspicious_activity' | 'policy_violation';
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      timestamp: Date;
      status: 'new' | 'investigating' | 'resolved';
      affectedUsers?: number;
    }>;
  };

  auditLogSummary: {
    totalEvents: number;
    criticalEvents: number;
    recentEvents: Array<{
      id: string;
      action: string;
      userId: string;
      userName: string;
      ipAddress: string;
      timestamp: Date;
      resource: string;
      status: 'success' | 'failure';
    }>;
  };

  userManagement: {
    newRegistrations: {
      today: number;
      week: number;
      month: number;
      trend: number;
    };
    activeSupport: {
      openTickets: number;
      avgResponseTime: number; // hours
      satisfactionScore: number;
    };
    accountActions: {
      suspensions: number;
      deletions: number;
      verifications: number;
    };
  };

  contentModeration: {
    pendingReviews: number;
    flaggedContent: Array<{
      id: string;
      type: 'review' | 'post' | 'comment' | 'profile';
      contentPreview: string;
      reportedBy: number; // number of reports
      reason: string;
      createdAt: Date;
      priority: 'high' | 'medium' | 'low';
    }>;
    autoModerated: number; // items auto-hidden
  };

  financials: {
    platformFees: {
      collected: number;
      pending: number;
      trend: number;
    };
    payouts: {
      processed: number;
      pending: number;
      failed: number;
    };
    refunds: {
      issued: number;
      totalAmount: number;
    };
  };
}
