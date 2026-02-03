import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsuranceController } from './controllers/insurance.controller';
import { InsuranceService } from './services/insurance.service';
import { AutoClaimGeneratorService } from './services/auto-claim-generator.service';
import { AutoClaimSuggestionsService } from './services/auto-claim-suggestions.service';
import { InsurancePolicy } from './entities/insurance-policy.entity';
import { InsuranceClaim } from './entities/insurance-claim.entity';
import { UserInsurance } from './entities/user-insurance.entity';
import { AutoClaimSuggestion } from './entities/auto-claim-suggestion.entity';
import { Pet } from '../pets/entities/pet.entity';
import { HealthNote } from '../medical-records/entities/health-note.entity';
import { EncryptionModule } from '../../core/encryption/encryption.module';
import { CacheModule } from '../../core/cache/cache.module';
import { AuditModule } from '../../core/audit/audit.module';
import { AutoClaimListener } from './listeners/auto-claim.listener';

/**
 * 보험 모듈
 *
 * 기능:
 * - 보험 정책 비교 (5대 보험사)
 * - AI 기반 보험 추천
 * - 보험 가입 관리
 * - 암호화된 청구 처리
 * - 청구 상태 추적
 * - 지급액 계산
 *
 * 성능 최적화:
 * - 정책 비교 결과 24시간 캐싱
 * - 복합 인덱스: (policyId, status, submittedAt)
 * - 비동기 청구 처리 큐 (TODO)
 *
 * 보안:
 * - 청구 상세 정보 암호화
 * - 모든 청구 작업 감사 로그
 * - 보험업법 준수
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      InsurancePolicy,
      InsuranceClaim,
      UserInsurance,
      AutoClaimSuggestion,
      Pet,
      HealthNote,
    ]),
    EncryptionModule,
    CacheModule,
    AuditModule,
  ],
  controllers: [InsuranceController],
  providers: [
    InsuranceService,
    AutoClaimGeneratorService,
    AutoClaimSuggestionsService,
    AutoClaimListener,
  ],
  exports: [
    InsuranceService,
    AutoClaimGeneratorService,
    AutoClaimSuggestionsService,
  ],
})
export class InsuranceModule {}
