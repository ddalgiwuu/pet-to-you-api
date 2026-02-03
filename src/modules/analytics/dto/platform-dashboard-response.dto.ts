import { ApiProperty } from '@nestjs/swagger';

class UserMetrics {
  @ApiProperty()
  mau: number;

  @ApiProperty()
  dau: number;

  @ApiProperty()
  newUsers: number;

  @ApiProperty()
  returningUsers: number;

  @ApiProperty()
  retentionRates: {
    day1: number;
    day7: number;
    day30: number;
  };

  @ApiProperty()
  averageSessionDuration: number;

  @ApiProperty()
  averageSessionsPerUser: number;

  @ApiProperty({ type: [Object] })
  trend: Array<{ date: string; mau: number; dau: number }>;
}

class RevenueMetrics {
  @ApiProperty()
  total: number;

  @ApiProperty()
  gmv: number;

  @ApiProperty()
  platformFees: number;

  @ApiProperty()
  byService: {
    hospital: number;
    daycare: number;
    adoption: number;
    insurance: number;
  };

  @ApiProperty({ type: [Object] })
  trend: Array<{ date: string; revenue: number; gmv: number }>;
}

class BookingMetrics {
  @ApiProperty()
  total: number;

  @ApiProperty()
  completed: number;

  @ApiProperty()
  cancelled: number;

  @ApiProperty()
  averageValue: number;

  @ApiProperty({ type: [Object] })
  trend: Array<{ date: string; count: number }>;
}

class ConversionFunnel {
  @ApiProperty()
  landingPageViews: number;

  @ApiProperty()
  searchPerformed: number;

  @ApiProperty()
  listingViewed: number;

  @ApiProperty()
  bookingInitiated: number;

  @ApiProperty()
  bookingCompleted: number;

  @ApiProperty()
  conversionRate: number;

  @ApiProperty({ type: [Object] })
  stepConversionRates: Array<{ step: string; rate: number }>;
}

class GeographicData {
  @ApiProperty()
  city: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  revenue: number;
}

class ProviderMetrics {
  @ApiProperty()
  totalHospitals: number;

  @ApiProperty()
  totalDaycares: number;

  @ApiProperty()
  totalShelters: number;

  @ApiProperty()
  activeProviders: number;

  @ApiProperty({ type: [Object] })
  topPerformers: Array<{
    providerId: string;
    name: string;
    type: string;
    revenue: number;
    bookings: number;
    rating: number;
  }>;
}

class CohortAnalysis {
  @ApiProperty()
  cohort: string; // e.g., "2024-01"

  @ApiProperty()
  size: number;

  @ApiProperty({ type: [Number] })
  retention: number[]; // [week0, week1, week2, ...]
}

export class PlatformDashboardResponseDto {
  @ApiProperty()
  period: {
    start: Date;
    end: Date;
    range: string;
  };

  @ApiProperty({ type: UserMetrics })
  users: UserMetrics;

  @ApiProperty({ type: RevenueMetrics })
  revenue: RevenueMetrics;

  @ApiProperty({ type: BookingMetrics })
  bookings: BookingMetrics;

  @ApiProperty({ type: ConversionFunnel })
  conversionFunnel: ConversionFunnel;

  @ApiProperty({ type: [GeographicData] })
  topCities: GeographicData[];

  @ApiProperty({ type: ProviderMetrics })
  providers: ProviderMetrics;

  @ApiProperty({ type: [CohortAnalysis] })
  cohortAnalysis: CohortAnalysis[];

  @ApiProperty()
  performance: {
    averageResponseTime: number;
    errorRate: number;
  };
}
