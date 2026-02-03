/**
 * Insurance Module Exports
 *
 * 한국 애완동물 보험 모듈
 * - 5대 보험사 정책 비교
 * - AI 기반 추천
 * - 암호화된 청구 처리
 * - 빠른 처리 시간 (목표: 30분 → 3분)
 */

// Module
export { InsuranceModule } from './insurance.module';

// Entities
export { InsurancePolicy, InsuranceCompany, CoverageType, PolicyStatus } from './entities/insurance-policy.entity';
export { InsuranceClaim, ClaimStatus, ClaimType, DocumentVerificationStatus } from './entities/insurance-claim.entity';
export { UserInsurance, SubscriptionStatus, PaymentStatus, PaymentCycle } from './entities/user-insurance.entity';

// DTOs
export { ComparePoliciesDto, PetSpeciesForInsurance } from './dto/compare-policies.dto';
export { SubmitClaimDto } from './dto/submit-claim.dto';
export { SubscribePolicyDto } from './dto/subscribe-policy.dto';
export { UpdateClaimStatusDto } from './dto/update-claim-status.dto';

// Services
export { InsuranceService } from './services/insurance.service';

// Controllers
export { InsuranceController } from './controllers/insurance.controller';
