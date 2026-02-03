import { Test, TestingModule } from '@nestjs/testing';
import { ConsumerController } from '../controllers/consumer.controller';
import { AggregationService } from '../services/aggregation.service';
import { CacheService } from '../../../core/cache/cache.service';

describe('ConsumerController', () => {
  let controller: ConsumerController;
  let aggregationService: AggregationService;
  let cacheService: CacheService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  } as any;

  const mockRequest = {
    user: mockUser,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsumerController],
      providers: [
        AggregationService,
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ConsumerController>(ConsumerController);
    aggregationService = module.get<AggregationService>(AggregationService);
    cacheService = module.get<CacheService>(CacheService);
  });

  describe('getHomeScreen', () => {
    it('should return aggregated home screen data', async () => {
      const query = {
        limit: 5,
        latitude: 37.5,
        longitude: 127.0,
        radius: 10,
      };

      const mockResponse = {
        upcomingBookings: {
          total: 2,
          bookings: [],
        },
        petHealthReminders: [],
        nearbyHospitals: [],
        adoptionRecommendations: [],
        insuranceRecommendations: [],
        promotions: [],
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(cacheService, 'set').mockResolvedValue();
      jest.spyOn(aggregationService, 'executeParallel').mockResolvedValue({
        data: mockResponse,
        errors: [],
      });

      const result = await controller.getHomeScreen(mockRequest, query);

      expect(result).toHaveProperty('upcomingBookings');
      expect(result).toHaveProperty('petHealthReminders');
      expect(result).toHaveProperty('nearbyHospitals');
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should use cached data when available', async () => {
      const query = { limit: 5 };
      const cachedData = {
        upcomingBookings: { total: 0, bookings: [] },
        petHealthReminders: [],
        nearbyHospitals: [],
        adoptionRecommendations: [],
        insuranceRecommendations: [],
        promotions: [],
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(cachedData);
      const executeSpy = jest.spyOn(aggregationService, 'executeParallel');

      const result = await controller.getHomeScreen(mockRequest, query);

      expect(result).toEqual(cachedData);
      expect(executeSpy).not.toHaveBeenCalled();
    });

    it('should handle partial failures gracefully', async () => {
      const query = { limit: 5 };

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(aggregationService, 'executeParallel').mockResolvedValue({
        data: {
          upcomingBookings: { total: 1, bookings: [] },
          petHealthReminders: null, // Failed
          nearbyHospitals: [],
          adoptionRecommendations: [],
          insuranceRecommendations: [],
          promotions: [],
        },
        errors: [
          {
            service: 'petHealthReminders',
            error: 'Service timeout',
            fallback: null,
          },
        ],
      });

      const result = await controller.getHomeScreen(mockRequest, query);

      expect(result.upcomingBookings).toBeDefined();
      expect(result.petHealthReminders).toBeNull();
    });
  });

  describe('search', () => {
    it('should return aggregated search results', async () => {
      const query = {
        query: 'veterinary',
        latitude: 37.5,
        longitude: 127.0,
        radius: 20,
        page: 1,
        limit: 10,
      };

      const mockResults = {
        results: [],
        aggregations: {
          totalResults: 0,
          byType: { hospitals: 0, daycares: 0, shelters: 0 },
          avgRating: 0,
          priceRange: { min: 0, max: 0, avg: 0 },
          availableSpecialties: [],
        },
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);

      const result = await controller.search(query);

      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('aggregations');
      expect(result).toHaveProperty('pagination');
    });
  });

  describe('getPetProfile', () => {
    it('should return comprehensive pet profile', async () => {
      const petId = 'pet-123';

      const mockProfile = {
        pet: {
          id: petId,
          name: 'Max',
          type: 'dog',
          breed: 'Golden Retriever',
          gender: 'male',
          birthDate: new Date('2020-01-01'),
          age: 4,
          weight: 30,
          ownerId: mockUser.id,
          ownerName: 'Test User',
        },
        healthSummary: {
          vaccinations: {
            upToDate: true,
            total: 5,
            overdue: 0,
            upcoming: [],
          },
          chronicConditions: [],
          allergies: [],
          currentMedications: [],
        },
        medicalTimeline: [],
        upcomingAppointments: [],
        insuranceInfo: null,
        statistics: {
          totalVisits: 10,
          totalVaccinations: 5,
          totalSpent: 5000,
          healthScore: 85,
        },
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(aggregationService, 'executeParallel').mockResolvedValue({
        data: mockProfile,
        errors: [],
      });

      const result = await controller.getPetProfile(petId, mockRequest);

      expect(result.pet.id).toBe(petId);
      expect(result).toHaveProperty('healthSummary');
      expect(result).toHaveProperty('medicalTimeline');
      expect(result).toHaveProperty('statistics');
    });
  });

  describe('performance', () => {
    it('should complete home screen aggregation within SLA', async () => {
      const query = { limit: 5 };
      const startTime = Date.now();

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(aggregationService, 'executeParallel').mockResolvedValue({
        data: {
          upcomingBookings: { total: 0, bookings: [] },
          petHealthReminders: [],
          nearbyHospitals: [],
          adoptionRecommendations: [],
          insuranceRecommendations: [],
          promotions: [],
        },
        errors: [],
      });

      await controller.getHomeScreen(mockRequest, query);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});
