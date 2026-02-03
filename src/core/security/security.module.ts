/**
 * Security Module
 * Centralized security services and utilities
 *
 * ⭐ SECURITY ENHANCEMENTS: CRT-001, CRT-002, CRT-003, HIGH-003
 */

import { Module, Global } from '@nestjs/common';
import { CostValidatorService } from './validators/cost-validator';

/**
 * 🔒 Security Module
 *
 * Provides:
 * - Cost validation (fraud prevention)
 * - Rate limiting decorators
 * - Input sanitization
 * - Data masking utilities
 *
 * Usage:
 * Import SecurityModule in feature modules that need security services
 */
@Global()
@Module({
  providers: [CostValidatorService],
  exports: [CostValidatorService],
})
export class SecurityModule {}
