import { ApiProperty } from '@nestjs/swagger';

class RevenueBreakdown {
  @ApiProperty()
  consultation: number;

  @ApiProperty()
  surgery: number;

  @ApiProperty()
  vaccination: number;

  @ApiProperty()
  grooming: number;

  @ApiProperty()
  boarding: number;

  @ApiProperty()
  emergency: number;

  @ApiProperty()
  other: number;
}

class BookingStats {
  @ApiProperty()
  total: number;

  @ApiProperty()
  completed: number;

  @ApiProperty()
  cancelled: number;

  @ApiProperty()
  noShow: number;

  @ApiProperty()
  cancellationRate: number;

  @ApiProperty()
  averageValue: number;
}

class PatientDemographics {
  @ApiProperty()
  total: number;

  @ApiProperty()
  new: number;

  @ApiProperty()
  returning: number;

  @ApiProperty({ type: Object })
  bySpecies: Record<string, number>;

  @ApiProperty({ type: Object })
  byAge: {
    young: number;
    adult: number;
    senior: number;
  };
}

class ServiceStats {
  @ApiProperty()
  serviceName: string;

  @ApiProperty()
  bookingCount: number;

  @ApiProperty()
  revenue: number;

  @ApiProperty({ required: false })
  averageRating?: number;
}

class PeakHour {
  @ApiProperty()
  hour: number;

  @ApiProperty()
  bookingCount: number;

  @ApiProperty()
  revenue: number;
}

class RatingStats {
  @ApiProperty()
  average: number;

  @ApiProperty()
  total: number;

  @ApiProperty({ type: Object })
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

class StaffPerformance {
  @ApiProperty()
  staffId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  appointmentsHandled: number;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  revenue: number;
}

export class HospitalDashboardResponseDto {
  @ApiProperty()
  hospitalId: string;

  @ApiProperty()
  period: {
    start: Date;
    end: Date;
    range: string;
  };

  @ApiProperty({ type: Object })
  revenue: {
    daily: number;
    weekly: number;
    monthly: number;
    breakdown: RevenueBreakdown;
    trend: Array<{ date: string; amount: number }>;
  };

  @ApiProperty({ type: BookingStats })
  bookings: BookingStats;

  @ApiProperty({ type: PatientDemographics })
  patients: PatientDemographics;

  @ApiProperty({ type: [ServiceStats] })
  popularServices: ServiceStats[];

  @ApiProperty({ type: [PeakHour] })
  peakHours: PeakHour[];

  @ApiProperty({ type: RatingStats })
  ratings: RatingStats;

  @ApiProperty({ type: [StaffPerformance] })
  staffPerformance: StaffPerformance[];

  @ApiProperty()
  operationalMetrics: {
    averageWaitTime: number;
    utilizationRate: number;
    repeatCustomerRate: number;
  };
}
