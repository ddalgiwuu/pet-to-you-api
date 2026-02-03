import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hospital, HospitalStatus } from '../entities/hospital.entity';
import { HospitalSearch, HospitalSearchDocument } from '../schemas/hospital.schema';
import { CreateHospitalDto } from '../dto/create-hospital.dto';
import { SearchHospitalDto, SearchHospitalResponseDto } from '../dto/search-hospital.dto';
import { AuditService } from '../../../core/audit/audit.service';
import { AuditAction } from '../../../core/audit/entities/audit-log.entity';

@Injectable()
export class HospitalService {
  private readonly logger = new Logger(HospitalService.name);

  constructor(
    @InjectRepository(Hospital)
    private hospitalRepository: Repository<Hospital>,
    @InjectModel(HospitalSearch.name)
    private hospitalSearchModel: Model<HospitalSearchDocument>,
    private auditService: AuditService,
  ) {}

  /**
   * 🏥 Create new hospital
   */
  async create(createDto: CreateHospitalDto, userId: string): Promise<Hospital> {
    // Check for duplicate business registration number
    const existing = await this.hospitalRepository.findOne({
      where: { businessRegistrationNumber: createDto.businessRegistrationNumber },
    });

    if (existing) {
      throw new ConflictException('Hospital with this business registration number already exists');
    }

    // Create hospital in PostgreSQL
    const hospital = this.hospitalRepository.create({
      ...createDto,
      status: HospitalStatus.PENDING_VERIFICATION,
      pricingInfo: createDto.pricingInfo as any, // Type assertion for DeepPartial compatibility
    });

    const saved = await this.hospitalRepository.save(hospital);

    // Sync to MongoDB for geospatial search
    await this.syncToMongoDb(saved);

    // Audit log
    await this.auditService.log({
      userId,
      action: AuditAction.CREATE,
      resource: 'hospital',
      resourceId: saved.id,
      purpose: '병원 등록',
      legalBasis: 'Business operation',
      ipAddress: '0.0.0.0', // Should be injected from request
      userAgent: 'system',
    });

    this.logger.log(`Hospital created: ${saved.name} (${saved.id})`);
    return saved;
  }

  /**
   * 🗺️ Geospatial search for hospitals
   */
  async search(searchDto: SearchHospitalDto): Promise<{
    results: SearchHospitalResponseDto[];
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
    if (searchDto.type) filters.type = searchDto.type;
    if (searchDto.sido) filters.sido = searchDto.sido;
    if (searchDto.sigungu) filters.sigungu = searchDto.sigungu;
    if (searchDto.is24Hours !== undefined) filters.is24Hours = searchDto.is24Hours;
    if (searchDto.hasEmergency !== undefined) filters.hasEmergency = searchDto.hasEmergency;
    if (searchDto.hasParking !== undefined) filters.hasParking = searchDto.hasParking;
    if (searchDto.acceptsInsurance !== undefined) filters.acceptsInsurance = searchDto.acceptsInsurance;
    if (searchDto.openNow !== undefined) filters.isCurrentlyOpen = searchDto.openNow;
    if (searchDto.minRating) filters.averageRating = { $gte: searchDto.minRating };
    if (searchDto.species) filters.supportedSpecies = searchDto.species;
    if (searchDto.services?.length) filters.services = { $all: searchDto.services };
    if (searchDto.specialties?.length) filters.specialties = { $all: searchDto.specialties };

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
      case 'distance':
        if (latitude && longitude) {
          sortStage.distanceMeters = 1;
        } else {
          sortStage.createdAt = -1;
        }
        break;
      case 'rating':
        sortStage.averageRating = -1;
        break;
      case 'reviews':
        sortStage.totalReviews = -1;
        break;
      case 'popularity':
        pipeline.push({
          $addFields: {
            popularityScore: {
              $add: ['$viewCount', { $multiply: ['$bookmarkCount', 2] }],
            },
          },
        });
        sortStage.popularityScore = -1;
        break;
      case 'recent':
        sortStage.createdAt = -1;
        break;
    }
    pipeline.push({ $sort: sortStage });

    // 6. Pagination
    const skip = ((page ?? 1) - 1) * (limit ?? 20);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit ?? 20 });

    // 7. Project fields for response (include all fields)
    pipeline.push({
      $project: {
        id: 1,
        name: 1,
        type: 1,
        fullAddress: 1,
        roadAddress: 1,
        phoneNumber: 1,
        averageRating: 1,
        totalReviews: 1,
        reviewCount: 1,
        distanceKm: 1,
        isCurrentlyOpen: 1,
        hasEmergency: 1,
        hasParking: 1,
        is24Hours: 1,
        hasGrooming: 1,
        hasHotel: 1,
        logoUrl: 1,
        photoUrls: 1,
        websiteUrl: 1,
        latitude: 1,
        longitude: 1,
        operatingHours: 1,
        description: 1,
        notice: 1,
        services: 1,
        supportedSpecies: 1,
        sido: 1,
        sigungu: 1,
        dong: 1,
      },
    });

    // Execute aggregation
    const results = await this.hospitalSearchModel.aggregate(pipeline).exec();

    // Get total count (without pagination)
    const countPipeline = pipeline.slice(0, -3); // Remove skip, limit, project
    countPipeline.push({ $count: 'total' });
    const countResult = await this.hospitalSearchModel.aggregate(countPipeline).exec();
    const total = countResult[0]?.total || 0;

    return {
      results: results as SearchHospitalResponseDto[],
      total,
      page: page ?? 1,
      limit: limit ?? 20,
      totalPages: Math.ceil(total / (limit ?? 20)),
    };
  }

  /**
   * 📍 Find hospitals near location (using PostgreSQL Haversine formula)
   */
  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    limit: number = 50,
  ): Promise<any[]> {
    // Haversine distance formula in SQL
    const query = `
      SELECT
        id,
        name,
        "roadAddress" as address,
        latitude,
        longitude,
        "phoneNumber" as phone,
        sido,
        sigungu,
        status,
        "is24Hours",
        "hasEmergency",
        "hasParking",
        services,
        "supportedSpecies",
        (
          6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          )
        ) AS distance
      FROM hospitals
      WHERE status = 'active'
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
      HAVING (
        6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )
      ) <= $3
      ORDER BY distance ASC
      LIMIT $4
    `;

    const result = await this.hospitalRepository.query(query, [latitude, longitude, radiusKm, limit]);

    return result;
  }

  /**
   * 🔄 Sync hospital data to MongoDB
   */
  private async syncToMongoDb(hospital: Hospital): Promise<void> {
    const searchData = {
      id: hospital.id,
      name: hospital.name,
      nameEnglish: hospital.nameEnglish,
      type: hospital.type,
      status: hospital.status,
      description: hospital.description,
      location: {
        type: 'Point' as const,
        coordinates: [hospital.longitude, hospital.latitude],
      },
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      sido: hospital.sido,
      sigungu: hospital.sigungu,
      dong: hospital.dong,
      roadAddress: hospital.roadAddress,
      fullAddress: hospital.getFullAddress(),
      phoneNumber: hospital.phoneNumber,
      emergencyPhoneNumber: hospital.emergencyPhoneNumber,
      email: hospital.email,
      websiteUrl: hospital.websiteUrl,
      businessRegistrationNumber: hospital.businessRegistrationNumber,
      isVerified: hospital.isVerified,
      operatingHours: hospital.operatingHours,
      is24Hours: hospital.is24Hours,
      holidays: hospital.holidays,
      isCurrentlyOpen: hospital.isCurrentlyOpen(),
      services: hospital.services,
      specialties: hospital.specialties,
      supportedSpecies: hospital.supportedSpecies,
      hasParking: hospital.hasParking,
      hasEmergency: hospital.hasEmergency,
      hasGrooming: hospital.hasGrooming,
      hasHotel: hospital.hasHotel,
      acceptsInsurance: hospital.acceptsInsurance,
      averageRating: hospital.averageRating,
      totalReviews: hospital.totalReviews,
      totalBookings: hospital.totalBookings,
      viewCount: hospital.viewCount,
      bookmarkCount: hospital.bookmarkCount,
      logoUrl: hospital.logoUrl,
      photoUrls: hospital.photoUrls,
      isDeleted: hospital.isDeleted,
      lastSyncedAt: new Date(),
    };

    await this.hospitalSearchModel.findOneAndUpdate(
      { id: hospital.id },
      searchData,
      { upsert: true, new: true },
    );
  }

  /**
   * 🔍 Find hospital by ID
   */
  async findOne(id: string): Promise<any> {
    // Search in MongoDB first (where geospatial data is stored)
    const mongoHospital = await this.hospitalSearchModel.findById(id).exec();

    if (!mongoHospital) {
      throw new NotFoundException(`Hospital with ID ${id} not found`);
    }

    // Return MongoDB document with transformed data
    return {
      _id: mongoHospital._id,
      name: mongoHospital.name,
      type: mongoHospital.type,
      latitude: mongoHospital.location.coordinates[1],
      longitude: mongoHospital.location.coordinates[0],
      fullAddress: mongoHospital.fullAddress,
      roadAddress: mongoHospital.roadAddress,
      phoneNumber: mongoHospital.phoneNumber,
      operatingHours: mongoHospital.operatingHours,
      services: mongoHospital.services,
      hasParking: mongoHospital.hasParking,
      hasEmergency: mongoHospital.hasEmergency,
      is24Hours: mongoHospital.is24Hours,
      averageRating: mongoHospital.averageRating,
      reviewCount: mongoHospital.viewCount || 0, // MongoDB schema has viewCount
      isCurrentlyOpen: mongoHospital.isCurrentlyOpen,
      description: mongoHospital.description,
    };
  }

  /**
   * 🗑️ Soft delete hospital
   */
  async remove(id: string, userId: string): Promise<void> {
    const hospital = await this.findOne(id);

    hospital.isDeleted = true;
    hospital.deletedAt = new Date();
    hospital.status = HospitalStatus.PERMANENTLY_CLOSED;

    await this.hospitalRepository.save(hospital);
    await this.syncToMongoDb(hospital);

    // Audit log
    await this.auditService.log({
      userId,
      action: AuditAction.DELETE,
      resource: 'hospital',
      resourceId: id,
      purpose: '병원 삭제',
      legalBasis: 'Business operation',
      ipAddress: '0.0.0.0',
      userAgent: 'system',
    });

    this.logger.log(`Hospital deleted: ${id}`);
  }

  /**
   * 🔍 Find hospitals by region (sido/sigungu)
   */
  async findByRegion(sido: string, sigungu?: string, limit: number = 100): Promise<Hospital[]> {
    const query = this.hospitalRepository
      .createQueryBuilder('hospital')
      .where('hospital.sido = :sido', { sido })
      .andWhere('hospital.status = :status', { status: HospitalStatus.ACTIVE });

    if (sigungu) {
      query.andWhere('hospital.sigungu = :sigungu', { sigungu });
    }

    return query
      .orderBy('hospital.name', 'ASC')
      .take(limit)
      .getMany();
  }
}
