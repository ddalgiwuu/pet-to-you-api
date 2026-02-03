import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  SensitiveRateLimit,
  ReadRateLimit,
  PublicRateLimit,
} from '../../../core/security/decorators/rate-limit.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InsuranceService } from '../services/insurance.service';
import { AutoClaimSuggestionsService } from '../services/auto-claim-suggestions.service';
import { ComparePoliciesDto } from '../dto/compare-policies.dto';
import { SubmitClaimDto } from '../dto/submit-claim.dto';
import { SubscribePolicyDto } from '../dto/subscribe-policy.dto';
import { UpdateClaimStatusDto } from '../dto/update-claim-status.dto';
import { ClaimStatus } from '../entities/insurance-claim.entity';
import { AuthRequest } from '../../../common/types/auth-request.type';

/**
 * 보험 컨트롤러
 *
 * 엔드포인트:
 * - GET    /insurance/policies/compare - 보험 정책 비교
 * - GET    /insurance/policies/recommend/:petId - 반려동물 기반 추천
 * - POST   /insurance/subscribe - 보험 가입
 * - POST   /insurance/claims - 청구 제출
 * - GET    /insurance/claims - 사용자 청구 목록
 * - GET    /insurance/claims/:id - 청구 상세 조회
 * - PUT    /insurance/claims/:id/status - 청구 상태 업데이트
 * - GET    /insurance/stats/processing - 청구 처리 성능 통계
 */
@ApiTags('Insurance')
@Controller('insurance')
// @UseGuards(JwtAuthGuard) // TODO: 인증 가드 추가
export class InsuranceController {
  constructor(
    private readonly insuranceService: InsuranceService,
    private readonly autoClaimSuggestionsService: AutoClaimSuggestionsService,
  ) {}

  // ============================================================
  // 정책 비교 및 추천
  // ============================================================

  @Get('policies/compare')
  @PublicRateLimit() // ⭐ SECURITY FIX: CRT-003 - 100 requests/min
  @ApiOperation({
    summary: '보험 정책 비교',
    description: '5대 보험사의 보험 정책을 비교하고 AI 추천을 제공합니다. 결과는 24시간 캐싱됩니다.',
  })
  @ApiResponse({
    status: 200,
    description: '정책 비교 결과',
    schema: {
      example: {
        totalPolicies: 5,
        recommendations: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            company: 'samsung_fire',
            companyName: '삼성화재',
            policyName: '펫보험 프리미엄',
            monthlyPremium: 45000,
            maxCoveragePerYear: 10000000,
            coveragePercentage: 80,
            aiScore: 87.5,
          },
        ],
        searchCriteria: {
          species: 'dog',
          ageMonths: 24,
          breed: '말티즈',
        },
        generatedAt: '2024-01-17T12:00:00Z',
      },
    },
  })
  async comparePolicies(@Query() dto: ComparePoliciesDto) {
    return this.insuranceService.comparePolicies(dto);
  }

  @Get('policies/recommend/:petId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '반려동물 기반 보험 추천',
    description: '반려동물의 정보(나이, 품종, 건강 상태)를 기반으로 최적의 보험을 추천합니다.',
  })
  @ApiParam({
    name: 'petId',
    description: '반려동물 ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: '추천 보험 정책',
  })
  @ApiResponse({
    status: 404,
    description: '반려동물을 찾을 수 없음',
  })
  async recommendPolicyForPet(@Param('petId') petId: string) {
    return this.insuranceService.recommendPolicyForPet(petId);
  }

  // ============================================================
  // 보험 가입
  // ============================================================

  @Post('subscribe')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '보험 가입',
    description: '선택한 정책으로 반려동물 보험에 가입합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '보험 가입 성공',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174002',
        subscriptionNumber: 'SUB-2024-000001',
        status: 'pending',
        policyId: '123e4567-e89b-12d3-a456-426614174000',
        petId: '123e4567-e89b-12d3-a456-426614174001',
        startDate: '2024-02-01',
        endDate: '2025-02-01',
        totalPremium: 50000,
        paymentCycle: 'monthly',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '반려동물이 가입 조건을 충족하지 않음',
  })
  @ApiResponse({
    status: 404,
    description: '정책 또는 반려동물을 찾을 수 없음',
  })
  async subscribePolicy(@Request() req: AuthRequest, @Body() dto: SubscribePolicyDto) {
    const userId = req.user?.id || 'test-user-id'; // TODO: 실제 인증 후 사용자 ID 가져오기
    return this.insuranceService.subscribePolicy(userId, dto);
  }

  // ============================================================
  // 청구 관리
  // ============================================================

  @Post('claims')
  @ApiBearerAuth()
  @SensitiveRateLimit() // ⭐ SECURITY FIX: CRT-003 - 5 requests/min
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '보험 청구 제출',
    description: '의료 기록과 함께 보험 청구를 제출합니다. 민감한 정보는 암호화되어 저장됩니다.',
  })
  @ApiResponse({
    status: 201,
    description: '청구 제출 성공',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174003',
        claimNumber: 'CLM-2024-000001',
        status: 'submitted',
        claimType: 'surgery',
        totalClaimAmount: 1500000,
        submittedAt: '2024-01-17T12:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '대기 기간이 경과하지 않음',
  })
  @ApiResponse({
    status: 404,
    description: '활성 보험 가입 정보를 찾을 수 없음',
  })
  async submitClaim(@Request() req: AuthRequest, @Body() dto: SubmitClaimDto) {
    const userId = req.user?.id || 'test-user-id'; // TODO: 실제 인증 후 사용자 ID 가져오기
    return this.insuranceService.submitClaim(userId, dto);
  }

  @Get('claims')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '사용자 청구 목록 조회',
    description: '현재 사용자의 모든 보험 청구 내역을 조회합니다.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ClaimStatus,
    description: '청구 상태 필터',
    example: 'approved',
  })
  @ApiResponse({
    status: 200,
    description: '청구 목록',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          claimNumber: 'CLM-2024-000001',
          status: 'approved',
          claimType: 'surgery',
          totalClaimAmount: 1500000,
          approvedAmount: 1200000,
          payoutAmount: 960000,
          submittedAt: '2024-01-17T12:00:00Z',
          processingTimeMinutes: 2,
        },
      ],
    },
  })
  async getUserClaims(
    @Request() req: AuthRequest,
    @Query('status') status?: ClaimStatus,
  ) {
    const userId = req.user?.id || 'test-user-id'; // TODO: 실제 인증 후 사용자 ID 가져오기
    return this.insuranceService.getUserClaims(userId, status);
  }

  @Get('claims/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '청구 상세 조회',
    description: '특정 청구의 상세 정보를 조회합니다. 암호화된 민감 정보는 복호화되어 반환됩니다.',
  })
  @ApiParam({
    name: 'id',
    description: '청구 ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @ApiResponse({
    status: 200,
    description: '청구 상세 정보',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174003',
        claimNumber: 'CLM-2024-000001',
        status: 'approved',
        claimDetails: {
          diagnosis: '슬개골 탈구 (Patellar Luxation)',
          treatment: '슬개골 정복술 및 재활 치료',
          hospitalName: '서울동물병원',
          veterinarianName: '김동물 수의사',
        },
        totalClaimAmount: 1500000,
        approvedAmount: 1200000,
        payoutAmount: 960000,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '청구를 찾을 수 없음',
  })
  async getClaimDetails(@Param('id') id: string, @Request() req: AuthRequest) {
    const userId = req.user?.id || 'test-user-id'; // TODO: 실제 인증 후 사용자 ID 가져오기
    return this.insuranceService.getClaimDetails(id, userId);
  }

  @Put('claims/:id/status')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '청구 상태 업데이트 (관리자)',
    description: '보험 청구의 상태를 업데이트합니다. 관리자 권한이 필요합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '청구 ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @ApiResponse({
    status: 200,
    description: '청구 상태 업데이트 성공',
  })
  @ApiResponse({
    status: 404,
    description: '청구를 찾을 수 없음',
  })
  async updateClaimStatus(
    @Param('id') id: string,
    @Body() dto: UpdateClaimStatusDto,
    @Request() req: AuthRequest,
  ) {
    const performedBy = req.user?.id || 'admin'; // TODO: 실제 인증 후 사용자 ID 가져오기
    return this.insuranceService.updateClaimStatus(id, dto, performedBy);
  }

  // ============================================================
  // 자동 청구 제안 (Auto-Claim Suggestions) ⭐
  // ============================================================

  @Get('claims/auto-suggestions')
  @ApiBearerAuth()
  @ReadRateLimit() // ⭐ SECURITY FIX: CRT-003 - 30 requests/min
  @ApiOperation({
    summary: '자동 청구 제안 목록',
    description: 'AI가 분석한 자동 청구 제안 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '자동 청구 제안 목록',
    schema: {
      example: [
        {
          id: 'suggestion-123',
          medicalRecordId: 'record-123',
          estimatedClaimAmount: 207000,
          confidence: 0.92,
          isEligible: true,
          status: 'pending',
        },
      ],
    },
  })
  async getAutoClaimSuggestions(@Request() req: AuthRequest) {
    const userId = req.user?.id || 'test-user-id';
    return this.autoClaimSuggestionsService.getUserSuggestions(userId);
  }

  @Get('claims/auto-suggestions/:suggestionId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '자동 청구 제안 상세',
    description: 'AI가 분석한 자동 청구 제안의 상세 정보를 조회합니다.',
  })
  @ApiParam({ name: 'suggestionId', description: 'Suggestion ID' })
  @ApiResponse({
    status: 200,
    description: '자동 청구 제안 상세',
  })
  @ApiResponse({
    status: 404,
    description: '제안을 찾을 수 없음',
  })
  async getAutoClaimSuggestion(
    @Param('suggestionId') suggestionId: string,
    @Request() req: AuthRequest,
  ) {
    const userId = req.user?.id || 'test-user-id';
    return this.autoClaimSuggestionsService.getSuggestionById(suggestionId, userId);
  }

  // ============================================================
  // 통계 및 성능
  // ============================================================

  @Get('stats/processing')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '청구 처리 성능 통계',
    description: '청구 처리 시간 및 성능 개선 통계를 조회합니다. (목표: 30분 → 3분)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: '시작 날짜',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: '종료 날짜',
    example: '2024-01-31',
  })
  @ApiResponse({
    status: 200,
    description: '처리 성능 통계',
    schema: {
      example: {
        totalClaims: 1000,
        fastProcessed: 950,
        fastProcessingRate: 95.0,
        avgProcessingTime: 2.5,
        targetProcessingTime: 3,
        improvement: 91.67,
      },
    },
  })
  async getProcessingStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.insuranceService.getProcessingStats(start, end);
  }
}
