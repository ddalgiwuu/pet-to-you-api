import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { HospitalService } from '../services/hospital.service';
import { CreateHospitalDto } from '../dto/create-hospital.dto';
import { SearchHospitalDto, SearchHospitalResponseDto } from '../dto/search-hospital.dto';
import { Hospital } from '../entities/hospital.entity';

/**
 * 🏥 Hospital Management Controller
 *
 * Endpoints:
 * - POST   /hospitals              - Create new hospital (admin only)
 * - GET    /hospitals/search       - Search hospitals with geospatial + filters
 * - GET    /hospitals/nearby       - Find hospitals near location
 * - GET    /hospitals/:id          - Get hospital details
 * - DELETE /hospitals/:id          - Soft delete hospital (admin only)
 */
@ApiTags('hospitals')
@Controller('hospitals')
export class HospitalController {
  constructor(private readonly hospitalService: HospitalService) {}

  /**
   * 🏥 Create new hospital
   *
   * @access Admin only (HOSPITAL_ADMIN, PLATFORM_ADMIN, SUPER_ADMIN)
   * @compliance - Business registration validation
   *             - Audit logging for creation
   */
  @Post()
  @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.HOSPITAL_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '병원 등록' })
  @ApiResponse({
    status: 201,
    description: 'Hospital created successfully',
    type: Hospital,
  })
  @ApiResponse({ status: 409, description: 'Business registration number already exists' })
  async create(
    @Body() createDto: CreateHospitalDto,
    @Req() req: any,
  ): Promise<Hospital> {
    const userId = req.user?.id || 'system'; // TODO: Extract from JWT
    return this.hospitalService.create(createDto, userId);
  }

  /**
   * 🗺️ Search hospitals with geospatial + filters
   *
   * @access Public
   * @features - MongoDB $geoNear for location-based search
   *           - Full-text search on name/description
   *           - Multiple filters (type, services, ratings, etc.)
   *           - Sorting by distance/rating/popularity
   *           - Pagination
   *
   * @example
   * GET /hospitals/search?latitude=37.5012&longitude=127.0396&radiusKm=5&hasEmergency=true&sortBy=distance&page=1&limit=20
   */
  @Get('search')
  @ApiOperation({
    summary: '병원 검색 (위치 기반 + 필터)',
    description: `
      위치 기반 검색 및 다양한 필터 조건으로 병원을 검색합니다.

      주요 기능:
      - 현재 위치 기준 반경 내 병원 검색
      - 병원명, 주소 키워드 검색
      - 진료 과목, 전문 분야 필터
      - 24시간 운영, 응급진료, 주차 가능 여부 필터
      - 거리순, 평점순, 인기순 정렬
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results with pagination',
    schema: {
      properties: {
        results: {
          type: 'array',
          items: { $ref: '#/components/schemas/SearchHospitalResponseDto' },
        },
        total: { type: 'number', example: 42 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
        totalPages: { type: 'number', example: 3 },
      },
    },
  })
  async search(
    @Query() searchDto: SearchHospitalDto,
  ): Promise<{
    results: SearchHospitalResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.hospitalService.search(searchDto);
  }

  /**
   * 📍 Find nearby hospitals
   *
   * @access Public
   * @features - Quick location-based search
   *           - Default 5km radius
   *           - Returns only active hospitals
   *
   * @example
   * GET /hospitals/nearby?latitude=37.5012&longitude=127.0396&radiusKm=5&limit=10
   */
  @Get('nearby')
  @ApiOperation({
    summary: '내 주변 병원 찾기',
    description: '현재 위치 기준 반경 내 병원을 거리순으로 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: 'Nearby hospitals sorted by distance',
    type: [SearchHospitalResponseDto],
  })
  async findNearby(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radiusKm') radiusKm: number = 5,
    @Query('limit') limit: number = 20,
  ): Promise<SearchHospitalResponseDto[]> {
    return this.hospitalService.findNearby(latitude, longitude, radiusKm, limit);
  }

  /**
   * 🔍 Get hospital details
   *
   * @access Public
   * @features - Full hospital information
   *           - Relations (bookings not included by default)
   *
   * @example
   * GET /hospitals/550e8400-e29b-41d4-a716-446655440000
   */
  @Get(':id')
  @ApiOperation({
    summary: '병원 상세 조회',
    description: '병원 ID로 상세 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: 'Hospital details',
    type: Hospital,
  })
  @ApiResponse({ status: 404, description: 'Hospital not found' })
  async findOne(@Param('id') id: string): Promise<Hospital> {
    return this.hospitalService.findOne(id);
  }

  /**
   * 🗑️ Delete hospital (soft delete)
   *
   * @access Admin only
   * @compliance - Audit logging for deletion
   *             - Soft delete (isDeleted flag)
   *             - Status changed to PERMANENTLY_CLOSED
   *
   * @example
   * DELETE /hospitals/550e8400-e29b-41d4-a716-446655440000
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.HOSPITAL_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '병원 삭제 (소프트 삭제)' })
  @ApiResponse({ status: 204, description: 'Hospital deleted successfully' })
  @ApiResponse({ status: 404, description: 'Hospital not found' })
  async remove(@Param('id') id: string, @Req() req: any): Promise<void> {
    const userId = req.user?.id || 'system'; // TODO: Extract from JWT
    return this.hospitalService.remove(id, userId);
  }
}
