import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { AggregationService } from '../services/aggregation.service';
import {
  ConsumerHomeQueryDto,
  ConsumerHomeResponseDto,
} from '../dto/consumer-home.dto';
import { SearchQueryDto, SearchResponseDto } from '../dto/search.dto';
import { PetProfileResponseDto } from '../dto/pet-profile.dto';
import { AuthRequest } from '../../../common/types/auth-request.type';

/**
 * BFF Controller for Consumer Mobile App
 * Aggregates multiple backend services into optimized endpoints
 */
@Controller('bff/consumer')
@UseGuards(JwtAuthGuard)
export class ConsumerController {
  private readonly logger = new Logger(ConsumerController.name);

  constructor(
    private readonly aggregationService: AggregationService,
    // Inject required services
    // private readonly bookingsService: BookingsService,
    // private readonly hospitalsService: HospitalService,
    // private readonly petsService: PetsService,
    // private readonly adoptionService: AdoptionService,
    // private readonly insuranceService: InsuranceService,
  ) {}

  /**
   * Get aggregated home screen data
   * Single API call replaces 5-6 individual requests
   */
  @Get('home')
  async getHomeScreen(
    @Request() req: AuthRequest,
    @Query() query: ConsumerHomeQueryDto,
  ): Promise<ConsumerHomeResponseDto> {
    const userId = req.user.id;
    const cacheKey = this.aggregationService.generateCacheKey('consumer:home', {
      userId,
      ...query,
    });

    const result = await this.aggregationService.getOrCache(
      cacheKey,
      async () => {
        // Execute all queries in parallel
        const { data, errors } = await this.aggregationService.executeParallel({
          upcomingBookings: async () => {
            // TODO: Call bookingsService.findUpcoming(userId, { limit: query.limit })
            return {
              total: 0,
              bookings: [],
            };
          },

          petHealthReminders: async () => {
            // TODO: Call petsService.getHealthReminders(userId)
            return [];
          },

          nearbyHospitals: async () => {
            if (!query.latitude || !query.longitude) return [];

            // TODO: Call hospitalsService.findNearby({
            //   latitude: query.latitude,
            //   longitude: query.longitude,
            //   radius: query.radius,
            //   limit: query.limit,
            // })
            return [];
          },

          adoptionRecommendations: async () => {
            // TODO: Call adoptionService.getRecommendations(userId, {
            //   limit: query.limit,
            // })
            return [];
          },

          insuranceRecommendations: async () => {
            // TODO: Call insuranceService.getRecommendations(userId)
            return [];
          },

          promotions: async () => {
            // TODO: Call promotionsService.getActive(userId)
            return [];
          },
        });

        if (errors.length > 0) {
          this.logger.warn(
            `Partial failures in home screen aggregation: ${errors.map((e) => e.service).join(', ')}`,
          );
        }

        return data as ConsumerHomeResponseDto;
      },
      300, // 5 minute cache
    );

    return result.data;
  }

  /**
   * Aggregated search with combined data
   * Returns hospitals + reviews + availability in single call
   */
  @Get('search')
  async search(
    @Query() query: SearchQueryDto,
  ): Promise<SearchResponseDto> {
    const cacheKey = this.aggregationService.generateCacheKey(
      'consumer:search',
      query,
    );

    const result = await this.aggregationService.getOrCache(
      cacheKey,
      async () => {
        // TODO: Implement search aggregation
        // 1. Search hospitals/daycares/shelters based on query
        // 2. Fetch reviews for results
        // 3. Check availability
        // 4. Calculate distances if location provided
        // 5. Sort and paginate

        const mockResponse: SearchResponseDto = {
          results: [],
          aggregations: {
            totalResults: 0,
            byType: {
              hospitals: 0,
              daycares: 0,
              shelters: 0,
            },
            avgRating: 0,
            priceRange: {
              min: 0,
              max: 0,
              avg: 0,
            },
            availableSpecialties: [],
          },
          pagination: {
            page: query.page || 1,
            limit: query.limit || 10,
            total: 0,
            totalPages: 0,
          },
        };

        return mockResponse;
      },
      600, // 10 minute cache for search results
    );

    return result.data;
  }

  /**
   * Get comprehensive pet profile with medical timeline
   * Aggregates pet data + medical records + appointments + insurance
   */
  @Get('pets/:petId/profile')
  async getPetProfile(
    @Param('petId') petId: string,
    @Request() req: AuthRequest,
  ): Promise<PetProfileResponseDto> {
    const userId = req.user.id;
    const cacheKey = this.aggregationService.generateCacheKey('pet:profile', {
      petId,
      userId,
    });

    const result = await this.aggregationService.getOrCache(
      cacheKey,
      async () => {
        // Execute all queries in parallel
        const { data } = await this.aggregationService.executeParallel({
          pet: async () => {
            // TODO: Call petsService.findOne(petId, userId)
            return null;
          },

          healthSummary: async () => {
            // TODO: Call medicalRecordsService.getHealthSummary(petId)
            return {
              vaccinations: {
                upToDate: true,
                total: 0,
                overdue: 0,
                upcoming: [],
              },
              chronicConditions: [],
              allergies: [],
              currentMedications: [],
            };
          },

          medicalTimeline: async () => {
            // TODO: Call medicalRecordsService.getTimeline(petId)
            return [];
          },

          upcomingAppointments: async () => {
            // TODO: Call bookingsService.findByPet(petId)
            return [];
          },

          insuranceInfo: async () => {
            // TODO: Call insuranceService.findByPet(petId)
            return null;
          },

          statistics: async () => {
            // TODO: Calculate statistics from medical records
            return {
              totalVisits: 0,
              totalVaccinations: 0,
              totalSpent: 0,
              healthScore: 85,
            };
          },
        });

        return data as PetProfileResponseDto;
      },
      900, // 15 minute cache
    );

    return result.data;
  }

  /**
   * Get quick booking information
   * Returns hospital + available slots + pricing in one call
   */
  @Get('hospitals/:hospitalId/booking-info')
  async getBookingInfo(
    @Param('hospitalId') hospitalId: string,
    @Query('date') date?: string,
  ) {
    const cacheKey = this.aggregationService.generateCacheKey(
      'hospital:booking-info',
      { hospitalId, date },
    );

    const result = await this.aggregationService.getOrCache(
      cacheKey,
      async () => {
        const { data } = await this.aggregationService.executeParallel({
          hospital: async () => {
            // TODO: Call hospitalsService.findOne(hospitalId)
            return null;
          },

          availableSlots: async () => {
            // TODO: Call bookingsService.getAvailableSlots(hospitalId, date)
            return [];
          },

          services: async () => {
            // TODO: Call hospitalsService.getServices(hospitalId)
            return [];
          },

          reviews: async () => {
            // TODO: Call reviewsService.findByHospital(hospitalId, { limit: 5 })
            return {
              average: 0,
              total: 0,
              recent: [],
            };
          },
        });

        return data;
      },
      300, // 5 minute cache
    );

    return result.data;
  }

  /**
   * Get user's dashboard summary
   * Quick overview of pets, bookings, and notifications
   */
  @Get('dashboard')
  async getDashboard(@Request() req: AuthRequest) {
    const userId = req.user.id;
    const cacheKey = this.aggregationService.generateCacheKey(
      'consumer:dashboard',
      { userId },
    );

    const result = await this.aggregationService.getOrCache(
      cacheKey,
      async () => {
        const { data } = await this.aggregationService.executeParallel({
          pets: async () => {
            // TODO: Call petsService.findByUser(userId)
            return [];
          },

          upcomingBookings: async () => {
            // TODO: Call bookingsService.findUpcoming(userId, { limit: 3 })
            return [];
          },

          notifications: async () => {
            // TODO: Call notificationsService.getUnread(userId)
            return {
              unread: 0,
              recent: [],
            };
          },

          healthAlerts: async () => {
            // TODO: Call petsService.getHealthAlerts(userId)
            return [];
          },

          spendingSummary: async () => {
            // TODO: Call paymentsService.getSpendingSummary(userId)
            return {
              thisMonth: 0,
              lastMonth: 0,
              trend: 0,
            };
          },
        });

        return data;
      },
      300, // 5 minute cache
    );

    return result.data;
  }
}
