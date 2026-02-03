import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DaycareCenter, DaycareStatus, VerificationStatus } from '../entities/daycare-center.entity';
import { DaycareReservation, ReservationStatus, PaymentStatus } from '../entities/daycare-reservation.entity';
import { DaycareSearch, DaycareSearchDocument } from '../schemas/daycare-search.schema';
import { CreateDaycareDto } from '../dto/create-daycare.dto';
import {
  SearchDaycareDto,
  SearchDaycareResponseDto,
  SortBy,
} from '../dto/search-daycare.dto';
import {
  CreateReservationDto,
  UpdateReservationDto,
  CancelReservationDto,
  CheckInDto,
  CheckOutDto,
  AddActivityDto,
  AddReviewDto,
} from '../dto/create-reservation.dto';

@Injectable()
export class DaycareService {
  private readonly logger = new Logger(DaycareService.name);

  constructor(
    @InjectRepository(DaycareCenter)
    private daycareRepository: Repository<DaycareCenter>,
    @InjectRepository(DaycareReservation)
    private reservationRepository: Repository<DaycareReservation>,
    @InjectModel(DaycareSearch.name)
    private daycareSearchModel: Model<DaycareSearchDocument>,
  ) {}

  // ============================================================
  // Daycare Center Management
  // ============================================================

  /**
   * 🏢 Create new daycare center
   */
  async createCenter(createDto: CreateDaycareDto, userId: string): Promise<DaycareCenter> {
    // Check for duplicate business registration number
    const existing = await this.daycareRepository.findOne({
      where: { businessRegistrationNumber: createDto.businessRegistrationNumber },
    });

    if (existing) {
      throw new ConflictException('Daycare center with this business registration number already exists');
    }

    // Create center in PostgreSQL
    const center = this.daycareRepository.create({
      ...createDto,
      status: DaycareStatus.PENDING_VERIFICATION,
      verificationStatus: VerificationStatus.NOT_VERIFIED,
    });

    const saved = await this.daycareRepository.save(center);

    // Sync to MongoDB for geospatial search
    await this.syncToMongoDb(saved);

    this.logger.log(`Daycare center created: ${saved.name} (${saved.id})`);
    return saved;
  }

  /**
   * 🗺️ Geospatial search for daycare centers
   */
  async search(searchDto: SearchDaycareDto): Promise<{
    results: SearchDaycareResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { latitude, longitude, radiusKm, keyword, sortBy, page, limit } = searchDto;

    // Build MongoDB aggregation pipeline
    const pipeline: any[] = [];

    // 1. Geospatial filter (if location provided)
    if (latitude && longitude && radiusKm) {
      pipeline.push({
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude], // [longitude, latitude]
          },
          distanceField: 'distanceMeters',
          maxDistance: radiusKm * 1000, // Convert km to meters
          spherical: true,
          query: { status: 'active', isDeleted: false },
        },
      });
    } else {
      // No geospatial search, regular match
      pipeline.push({
        $match: {
          status: 'active',
          isDeleted: false,
        },
      });
    }

    // 2. Text search filter
    if (keyword) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: keyword, $options: 'i' } },
            { fullAddress: { $regex: keyword, $options: 'i' } },
            { description: { $regex: keyword, $options: 'i' } },
          ],
        },
      });
    }

    // 3. Additional filters
    const filters: any = {};
    if (searchDto.sido) filters.sido = searchDto.sido;
    if (searchDto.sigungu) filters.sigungu = searchDto.sigungu;
    if (searchDto.serviceType) filters.serviceTypes = searchDto.serviceType;
    if (searchDto.openNow !== undefined) filters.isCurrentlyOpen = searchDto.openNow;
    if (searchDto.hasAvailableCapacity !== undefined) filters.hasAvailableCapacity = searchDto.hasAvailableCapacity;
    if (searchDto.hasCctv !== undefined) filters.hasCctv = searchDto.hasCctv;
    if (searchDto.hasLiveCam !== undefined) filters.hasLiveCam = searchDto.hasLiveCam;
    if (searchDto.hasPickupService !== undefined) filters.hasPickupService = searchDto.hasPickupService;
    if (searchDto.hasParking !== undefined) filters.hasParking = searchDto.hasParking;
    if (searchDto.hasLiabilityInsurance !== undefined) filters.hasLiabilityInsurance = searchDto.hasLiabilityInsurance;
    if (searchDto.providesDailyReport !== undefined) filters.providesDailyReport = searchDto.providesDailyReport;
    if (searchDto.hasVetOnCall !== undefined) filters.hasVetOnCall = searchDto.hasVetOnCall;
    if (searchDto.minRating) filters.averageRating = { $gte: searchDto.minRating };
    if (searchDto.species) filters.acceptedSpecies = searchDto.species;
    if (searchDto.verifiedOnly) {
      filters.verificationStatus = { $in: ['government_verified', 'full_verified'] };
    }

    // Price range filter
    if (searchDto.minPrice || searchDto.maxPrice) {
      const priceFilter: any = {};
      if (searchDto.minPrice) priceFilter.$gte = searchDto.minPrice;
      if (searchDto.maxPrice) priceFilter.$lte = searchDto.maxPrice;
      filters.minPricePerDay = priceFilter;
    }

    // Facilities filter
    if (searchDto.facilities?.length) {
      filters.facilities = { $all: searchDto.facilities };
    }

    if (Object.keys(filters).length > 0) {
      pipeline.push({ $match: filters });
    }

    // 4. Add computed distance field (in km)
    if (latitude && longitude) {
      pipeline.push({
        $addFields: {
          distanceKm: {
            $divide: ['$distanceMeters', 1000],
          },
        },
      });
    }

    // 5. Sorting
    const sortStage: any = {};
    switch (sortBy) {
      case SortBy.DISTANCE:
        if (latitude && longitude) {
          sortStage.distanceMeters = 1;
        } else {
          sortStage.createdAt = -1;
        }
        break;
      case SortBy.RATING:
        sortStage.averageRating = -1;
        break;
      case SortBy.REVIEWS:
        sortStage.totalReviews = -1;
        break;
      case SortBy.POPULARITY:
        pipeline.push({
          $addFields: {
            popularityScore: {
              $add: ['$viewCount', { $multiply: ['$bookmarkCount', 2] }],
            },
          },
        });
        sortStage.popularityScore = -1;
        break;
      case SortBy.PRICE_LOW:
        sortStage.minPricePerDay = 1;
        break;
      case SortBy.PRICE_HIGH:
        sortStage.minPricePerDay = -1;
        break;
      case SortBy.RECENT:
        sortStage.createdAt = -1;
        break;
    }
    pipeline.push({ $sort: sortStage });

    // 6. Pagination
    const skip = ((page ?? 1) - 1) * (limit ?? 20);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit ?? 20 });

    // 7. Project fields for response
    pipeline.push({
      $project: {
        id: 1,
        name: 1,
        fullAddress: 1,
        phoneNumber: 1,
        averageRating: 1,
        totalReviews: 1,
        distanceKm: 1,
        isCurrentlyOpen: 1,
        hasAvailableCapacity: 1,
        serviceTypes: 1,
        minPricePerDay: 1,
        verificationStatus: 1,
        hasCctv: 1,
        hasLiveCam: 1,
        hasPickupService: 1,
        logoUrl: 1,
        photoUrls: 1,
        latitude: 1,
        longitude: 1,
      },
    });

    // Execute aggregation
    const results = await this.daycareSearchModel.aggregate(pipeline).exec();

    // Get total count (without pagination)
    const countPipeline = pipeline.slice(0, -3); // Remove skip, limit, project
    countPipeline.push({ $count: 'total' });
    const countResult = await this.daycareSearchModel.aggregate(countPipeline).exec();
    const total = countResult[0]?.total || 0;

    return {
      results: results as SearchDaycareResponseDto[],
      total,
      page: page ?? 1,
      limit: limit ?? 20,
      totalPages: Math.ceil(total / (limit ?? 20)),
    };
  }

  /**
   * 📍 Find daycare centers near location
   */
  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    limit: number = 20,
  ): Promise<SearchDaycareResponseDto[]> {
    const results = await this.daycareSearchModel
      .find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: radiusKm * 1000, // Convert to meters
          },
        },
        status: 'active',
        isDeleted: false,
      })
      .limit(limit)
      .exec();

    return results.map((doc) => ({
      id: doc.id,
      name: doc.name,
      fullAddress: doc.fullAddress,
      phoneNumber: doc.phoneNumber,
      averageRating: doc.averageRating,
      totalReviews: doc.totalReviews,
      isCurrentlyOpen: doc.isCurrentlyOpen,
      hasAvailableCapacity: doc.hasAvailableCapacity,
      serviceTypes: doc.serviceTypes,
      minPricePerDay: doc.minPricePerDay,
      verificationStatus: doc.verificationStatus,
      hasCctv: doc.hasCctv,
      hasLiveCam: doc.hasLiveCam,
      hasPickupService: doc.hasPickupService,
      logoUrl: doc.logoUrl,
      photoUrls: doc.photoUrls,
      latitude: doc.latitude,
      longitude: doc.longitude,
    }));
  }

  /**
   * 🔍 Find daycare center by ID
   */
  async findOne(id: string): Promise<DaycareCenter> {
    const center = await this.daycareRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!center) {
      throw new NotFoundException(`Daycare center with ID ${id} not found`);
    }

    // Increment view count
    center.viewCount += 1;
    await this.daycareRepository.save(center);

    return center;
  }

  /**
   * ✅ Verify daycare center (OCR or Government API)
   */
  async verifyCenter(
    centerId: string,
    verificationType: 'ocr' | 'government',
    metadata?: {
      ocrProvider?: string;
      ocrConfidence?: number;
      governmentApiSource?: string;
      verifiedBy?: string;
      verificationNotes?: string;
    },
  ): Promise<DaycareCenter> {
    const center = await this.findOne(centerId);

    if (verificationType === 'ocr') {
      center.isOcrVerified = true;
      center.verificationStatus = VerificationStatus.OCR_VERIFIED;
    } else if (verificationType === 'government') {
      center.isGovernmentCertified = true;
      center.verificationStatus = VerificationStatus.GOVERNMENT_VERIFIED;
    }

    // If both verified, set to full verified
    if (center.isOcrVerified && center.isGovernmentCertified) {
      center.verificationStatus = VerificationStatus.FULL_VERIFIED;
    }

    center.verifiedAt = new Date();
    center.verificationMetadata = { ...center.verificationMetadata, ...metadata };
    center.status = DaycareStatus.ACTIVE;

    const saved = await this.daycareRepository.save(center);
    await this.syncToMongoDb(saved);

    this.logger.log(`Daycare center verified: ${center.name} (${verificationType})`);
    return saved;
  }

  // ============================================================
  // Reservation Management
  // ============================================================

  /**
   * 📅 Create new reservation
   */
  async createReservation(
    createDto: CreateReservationDto,
    userId: string,
  ): Promise<DaycareReservation> {
    const center = await this.findOne(createDto.daycareId);

    // Check capacity
    const reservationsOnDate = await this.reservationRepository.count({
      where: {
        daycareId: createDto.daycareId,
        reservationDate: createDto.reservationDate,
        status: ReservationStatus.CONFIRMED,
      },
    });

    if (reservationsOnDate >= center.maxCapacityPerDay) {
      throw new BadRequestException('Daycare center is fully booked for this date');
    }

    // Calculate pricing
    const basePrice = center.calculatePrice(
      createDto.serviceType,
      createDto.durationHours,
    );

    let additionalServicesPrice = 0;
    if (createDto.additionalServices?.length) {
      additionalServicesPrice = createDto.additionalServices.reduce(
        (sum, service) => sum + service.price * (service.quantity || 1),
        0,
      );
    }

    const totalPrice = basePrice + additionalServicesPrice;

    // Create reservation
    const reservation = this.reservationRepository.create({
      userId,
      petId: createDto.petId,
      daycareId: createDto.daycareId,
      reservationDate: createDto.reservationDate,
      checkInTime: createDto.checkInTime,
      checkOutTime: createDto.checkOutTime,
      serviceType: createDto.serviceType,
      durationHours: createDto.durationHours,
      basePrice,
      additionalServicesPrice,
      additionalServices: createDto.additionalServices,
      totalPrice,
      specialRequirements: createDto.specialRequirements,
      dietaryRestrictions: createDto.dietaryRestrictions,
      medicalConditions: createDto.medicalConditions,
      behavioralNotes: createDto.behavioralNotes,
      emergencyContactInfo: createDto.emergencyContactInfo,
      needsPickup: createDto.needsPickup || false,
      needsDropOff: createDto.needsDropOff || false,
      pickupAddress: createDto.pickupAddress,
      dropOffAddress: createDto.dropOffAddress,
      paymentMethod: createDto.paymentMethod,
      status: ReservationStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
    });

    const saved = await this.reservationRepository.save(reservation);

    // Update center occupancy
    center.currentOccupancy += 1;
    await this.daycareRepository.save(center);
    await this.syncToMongoDb(center);

    this.logger.log(`Reservation created: ${saved.id}`);
    return saved;
  }

  /**
   * 🔄 Update reservation
   */
  async updateReservation(
    reservationId: string,
    updateDto: UpdateReservationDto,
    userId: string,
  ): Promise<DaycareReservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId, userId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${reservationId} not found`);
    }

    if (!reservation.canBeCancelled()) {
      throw new BadRequestException('Reservation cannot be modified in current status');
    }

    Object.assign(reservation, updateDto);
    return await this.reservationRepository.save(reservation);
  }

  /**
   * ❌ Cancel reservation
   */
  async cancelReservation(
    reservationId: string,
    cancelDto: CancelReservationDto,
    userId: string,
  ): Promise<DaycareReservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId, userId },
      relations: ['daycareCenter'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${reservationId} not found`);
    }

    if (!reservation.canBeCancelled()) {
      throw new BadRequestException('Reservation cannot be cancelled in current status');
    }

    reservation.updateStatus(ReservationStatus.CANCELLED, cancelDto.cancellationReason, userId);
    reservation.cancelledBy = userId;
    reservation.cancellationReason = cancelDto.cancellationReason;

    const saved = await this.reservationRepository.save(reservation);

    // Update center occupancy
    const center = await this.findOne(reservation.daycareId);
    center.currentOccupancy = Math.max(0, center.currentOccupancy - 1);
    await this.daycareRepository.save(center);
    await this.syncToMongoDb(center);

    this.logger.log(`Reservation cancelled: ${reservationId}`);
    return saved;
  }

  /**
   * ✅ Check-in
   */
  async checkIn(
    reservationId: string,
    checkInDto: CheckInDto,
  ): Promise<DaycareReservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${reservationId} not found`);
    }

    reservation.updateStatus(ReservationStatus.CHECKED_IN, checkInDto.note);
    reservation.actualCheckInTime = checkInDto.actualCheckInTime || new Date();

    return await this.reservationRepository.save(reservation);
  }

  /**
   * ✅ Check-out
   */
  async checkOut(
    reservationId: string,
    checkOutDto: CheckOutDto,
  ): Promise<DaycareReservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
      relations: ['daycareCenter'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${reservationId} not found`);
    }

    reservation.updateStatus(ReservationStatus.CHECKED_OUT, checkOutDto.note);
    reservation.actualCheckOutTime = checkOutDto.actualCheckOutTime || new Date();
    reservation.status = ReservationStatus.COMPLETED;

    const saved = await this.reservationRepository.save(reservation);

    // Update center occupancy
    const center = await this.findOne(reservation.daycareId);
    center.currentOccupancy = Math.max(0, center.currentOccupancy - 1);
    await this.daycareRepository.save(center);
    await this.syncToMongoDb(center);

    return saved;
  }

  /**
   * 📝 Add activity to daily report
   */
  async addActivity(
    reservationId: string,
    activityDto: AddActivityDto,
  ): Promise<DaycareReservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${reservationId} not found`);
    }

    reservation.addActivity(activityDto);
    return await this.reservationRepository.save(reservation);
  }

  /**
   * ⭐ Add review
   */
  async addReview(
    reservationId: string,
    reviewDto: AddReviewDto,
    userId: string,
  ): Promise<DaycareReservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId, userId },
      relations: ['daycareCenter'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${reservationId} not found`);
    }

    if (!reservation.isCompleted()) {
      throw new BadRequestException('Can only review completed reservations');
    }

    reservation.rating = reviewDto.rating;
    reservation.review = reviewDto.review;
    reservation.reviewedAt = new Date();

    const saved = await this.reservationRepository.save(reservation);

    // Update center rating
    const center = await this.findOne(reservation.daycareId);
    const totalRating = center.averageRating * center.totalReviews + reviewDto.rating;
    center.totalReviews += 1;
    center.averageRating = totalRating / center.totalReviews;

    await this.daycareRepository.save(center);
    await this.syncToMongoDb(center);

    return saved;
  }

  /**
   * 🔄 Sync daycare center data to MongoDB
   */
  private async syncToMongoDb(center: DaycareCenter): Promise<void> {
    const searchData = {
      id: center.id,
      name: center.name,
      nameEnglish: center.nameEnglish,
      status: center.status,
      description: center.description,
      location: {
        type: 'Point' as const,
        coordinates: [center.longitude, center.latitude],
      },
      latitude: center.latitude,
      longitude: center.longitude,
      sido: center.sido,
      sigungu: center.sigungu,
      dong: center.dong,
      roadAddress: center.roadAddress,
      fullAddress: center.getFullAddress(),
      phoneNumber: center.phoneNumber,
      emergencyPhoneNumber: center.emergencyPhoneNumber,
      email: center.email,
      websiteUrl: center.websiteUrl,
      businessRegistrationNumber: center.businessRegistrationNumber,
      verificationStatus: center.verificationStatus,
      isOcrVerified: center.isOcrVerified,
      isGovernmentCertified: center.isGovernmentCertified,
      operatingHours: center.operatingHours,
      holidays: center.holidays,
      isCurrentlyOpen: center.isCurrentlyOpen(),
      serviceTypes: center.serviceTypes,
      pricingStructure: center.pricingStructure,
      minPricePerDay: this.calculateMinPricePerDay(center),
      maxPricePerDay: this.calculateMaxPricePerDay(center),
      maxCapacityPerDay: center.maxCapacityPerDay,
      currentOccupancy: center.currentOccupancy,
      hasAvailableCapacity: center.hasAvailableCapacity(),
      acceptedSpecies: center.acceptedSpecies,
      restrictedBreeds: center.restrictedBreeds,
      indoorAreaSqm: center.indoorAreaSqm,
      outdoorAreaSqm: center.outdoorAreaSqm,
      facilities: center.facilities,
      equipment: center.equipment,
      hasCctv: center.hasCctv,
      hasLiveCam: center.hasLiveCam,
      liveCamUrl: center.liveCamUrl,
      hasParking: center.hasParking,
      hasPickupService: center.hasPickupService,
      totalStaff: center.totalStaff,
      certifiedTrainers: center.certifiedTrainers,
      staffCertifications: center.staffCertifications,
      hasLiabilityInsurance: center.hasLiabilityInsurance,
      insuranceProvider: center.insuranceProvider,
      hasVetOnCall: center.hasVetOnCall,
      providesDailyReport: center.providesDailyReport,
      reportIncludes: center.reportIncludes,
      acceptedPaymentMethods: center.acceptedPaymentMethods,
      averageRating: center.averageRating,
      totalReviews: center.totalReviews,
      totalReservations: center.totalReservations,
      viewCount: center.viewCount,
      bookmarkCount: center.bookmarkCount,
      logoUrl: center.logoUrl,
      photoUrls: center.photoUrls,
      videoUrls: center.videoUrls,
      isDeleted: center.isDeleted,
      lastSyncedAt: new Date(),
    };

    await this.daycareSearchModel.findOneAndUpdate(
      { id: center.id },
      searchData,
      { upsert: true, new: true },
    );
  }

  /**
   * Calculate minimum price per day for search filtering
   */
  private calculateMinPricePerDay(center: DaycareCenter): number {
    const prices: number[] = [];
    if (center.pricingStructure.daily) {
      prices.push(center.pricingStructure.daily.pricePerDay);
    }
    if (center.pricingStructure.hourly) {
      prices.push(center.pricingStructure.hourly.pricePerHour * 8); // Assume 8 hours
    }
    if (center.pricingStructure.monthly) {
      prices.push(center.pricingStructure.monthly.pricePerMonth / 22); // Assume 22 working days
    }
    return prices.length > 0 ? Math.min(...prices) : 0;
  }

  /**
   * Calculate maximum price per day for search filtering
   */
  private calculateMaxPricePerDay(center: DaycareCenter): number {
    const prices: number[] = [];
    if (center.pricingStructure.daily) {
      prices.push(center.pricingStructure.daily.pricePerDay);
    }
    if (center.pricingStructure.hourly) {
      prices.push(center.pricingStructure.hourly.pricePerHour * 12); // Assume 12 hours max
    }
    if (center.pricingStructure.overnight) {
      prices.push(center.pricingStructure.overnight.pricePerNight);
    }
    return prices.length > 0 ? Math.max(...prices) : 0;
  }
}
