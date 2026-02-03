/**
 * Cost Validation Service
 * Prevents fraudulent claims with unreasonable costs
 *
 * ⭐ SECURITY FIX: HIGH-003
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * Cost limits by procedure type (KRW)
 */
export const CostLimits = {
  emergency: { min: 50000, max: 5000000, typical: 300000 },
  surgery: { min: 200000, max: 10000000, typical: 1500000 },
  hospitalization: { min: 100000, max: 3000000, typical: 500000 },
  general: { min: 20000, max: 500000, typical: 80000 },
  dental: { min: 50000, max: 1000000, typical: 200000 },
  diagnostic: { min: 30000, max: 500000, typical: 100000 },
  chronic: { min: 50000, max: 800000, typical: 150000 },
  vaccination: { min: 20000, max: 100000, typical: 40000 },
} as const;

/**
 * Daily limits
 */
export const DailyLimits = {
  maxClaimsPerDay: 3,
  maxTotalAmountPerDay: 10000000, // ₩10M
  maxClaimsPerPet: 2,
} as const;

@Injectable()
export class CostValidatorService {
  private readonly logger = new Logger(CostValidatorService.name);

  /**
   * Validate cost is reasonable
   */
  validateCost(
    procedureType: string,
    actualCost: number,
  ): { isValid: boolean; reason?: string; requiresManualReview?: boolean } {
    const limits = CostLimits[procedureType as keyof typeof CostLimits] || CostLimits.general;

    if (actualCost < limits.min) {
      return { isValid: false, reason: `Cost too low for ${procedureType}` };
    }

    if (actualCost > limits.max) {
      return { isValid: false, reason: `Cost too high for ${procedureType}` };
    }

    if (actualCost > limits.typical * 1.5) {
      return {
        isValid: true,
        requiresManualReview: true,
        reason: 'Cost higher than typical - requires verification',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate breakdown matches total
   */
  validateCostBreakdown(
    costBreakdown: any,
    actualCost: number,
    tolerance: number = 100,
  ): { isValid: boolean; reason?: string } {
    const total =
      (costBreakdown.consultation || 0) +
      (costBreakdown.procedures || 0) +
      (costBreakdown.medication || 0) +
      (costBreakdown.hospitalization || 0) +
      (costBreakdown.diagnosticTests || 0) +
      (costBreakdown.supplies || 0) +
      (costBreakdown.other || 0);

    const difference = Math.abs(total - actualCost);

    if (difference > tolerance) {
      return { isValid: false, reason: 'Cost breakdown mismatch' };
    }

    return { isValid: true };
  }

  /**
   * Detect suspicious patterns
   */
  detectSuspiciousPatterns(
    costBreakdown: any,
    actualCost: number,
  ): { isSuspicious: boolean; flags: string[] } {
    const flags: string[] = [];

    // Round numbers
    if (actualCost % 100000 === 0 && actualCost > 100000) {
      flags.push('ROUND_NUMBER');
    }

    // Single item dominates
    const items = Object.values(costBreakdown).filter((v: any) => v > 0) as number[];
    if (items.length > 0) {
      const maxItem = Math.max(...items);
      if (maxItem > actualCost * 0.9) {
        flags.push('SINGLE_ITEM_DOMINANT');
      }
    }

    // Too many zeros
    const zeroCount = Object.values(costBreakdown).filter((v) => v === 0).length;
    if (zeroCount >= 5) {
      flags.push('TOO_MANY_ZEROS');
    }

    return {
      isSuspicious: flags.length >= 2,
      flags,
    };
  }
}
