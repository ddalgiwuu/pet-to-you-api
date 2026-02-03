/**
 * Cost Validation Decorator
 * Validates cost amounts against coverage type limits
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { isCostReasonable } from '../security-config.constants';

@ValidatorConstraint({ name: 'isValidCost', async: false })
@Injectable()
export class IsValidCostConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    if (typeof value !== 'number') {
      return false;
    }

    // Get coverage type from DTO
    const [coverageTypeField] = args.constraints;
    const coverageType = (args.object as any)[coverageTypeField] || 'GENERAL';

    const result = isCostReasonable(value, coverageType);

    return result.valid;
  }

  defaultMessage(args: ValidationArguments): string {
    const value = args.value;
    const [coverageTypeField] = args.constraints;
    const coverageType = (args.object as any)[coverageTypeField] || 'GENERAL';

    const result = isCostReasonable(value, coverageType);

    return result.reason || 'Cost amount is not valid for this coverage type';
  }
}

/**
 * Decorator for cost validation
 *
 * @param coverageTypeField - Name of the field containing coverage type
 * @param validationOptions - Additional validation options
 *
 * @example
 * class CreateClaimDto {
 *   @IsString()
 *   claimType: string; // 'SURGERY', 'GENERAL', etc.
 *
 *   @IsValidCost('claimType')
 *   totalClaimAmount: number;
 * }
 */
export function IsValidCost(
  coverageTypeField: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [coverageTypeField],
      validator: IsValidCostConstraint,
    });
  };
}

/**
 * Simple max cost decorator without coverage type dependency
 */
export function MaxCost(maxAmount: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'maxCost',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `Cost amount cannot exceed ₩${maxAmount.toLocaleString('ko-KR')}`,
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          return typeof value === 'number' && value <= maxAmount;
        },
      },
    });
  };
}

/**
 * Cost reasonability check (no coverage type required)
 * Uses default limits for general medical costs
 */
export function IsReasonableCost(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isReasonableCost',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: 'Cost amount is unreasonable (₩1,000 - ₩10,000,000)',
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          if (typeof value !== 'number') return false;

          // General reasonable range
          return value >= 1000 && value <= 10_000_000;
        },
      },
    });
  };
}
