import { IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum TimeRangeEnum {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

/**
 * Query parameters for hospital dashboard
 */
export class HospitalDashboardQueryDto {
  @IsOptional()
  @IsEnum(TimeRangeEnum)
  timeRange?: TimeRangeEnum = TimeRangeEnum.TODAY;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * Hospital dashboard overview response
 */
export interface HospitalDashboardResponseDto {
  todaysBookings: {
    total: number;
    completed: number;
    inProgress: number;
    upcoming: number;
    cancelled: number;
    bookings: Array<{
      id: string;
      appointmentTime: Date;
      patientName: string;
      petName: string;
      petType: string;
      serviceName: string;
      status: string;
      contactNumber: string;
      notes?: string;
      estimatedDuration: number;
    }>;
  };

  revenue: {
    today: {
      total: number;
      byPaymentMethod: Record<string, number>;
      transactionCount: number;
    };
    week: {
      total: number;
      trend: number; // percentage change from previous week
      dailyBreakdown: Array<{ date: string; amount: number }>;
    };
    month: {
      total: number;
      trend: number;
      byService: Array<{ serviceName: string; amount: number; count: number }>;
    };
  };

  upcomingAppointments: {
    nextHour: number;
    next3Hours: number;
    today: number;
    tomorrow: number;
    appointments: Array<{
      id: string;
      appointmentTime: Date;
      patientName: string;
      petName: string;
      serviceName: string;
      duration: number;
    }>;
  };

  recentReviews: {
    averageRating: number;
    totalReviews: number;
    reviews: Array<{
      id: string;
      rating: number;
      comment: string;
      patientName: string;
      createdAt: Date;
      serviceName: string;
    }>;
  };

  performance: {
    utilizationRate: number; // percentage of time slots filled
    avgWaitTime: number; // minutes
    avgServiceTime: number; // minutes
    patientSatisfaction: number; // average rating
    repeatPatientRate: number; // percentage
  };

  staffSchedules: Array<{
    staffId: string;
    staffName: string;
    role: string;
    scheduleToday: Array<{
      startTime: string;
      endTime: string;
      assignedBookings: number;
    }>;
    availability: 'available' | 'busy' | 'offline';
  }>;

  alerts: Array<{
    type: 'booking' | 'review' | 'payment' | 'system';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: Date;
  }>;
}
