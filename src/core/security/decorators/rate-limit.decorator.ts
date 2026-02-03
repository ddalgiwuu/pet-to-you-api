/**
 * Rate Limit Decorators
 * Pre-configured rate limiters for different endpoint types
 *
 * ⭐ SECURITY FIX: CRT-003
 */

import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/**
 * Rate limit configuration constants
 */
export const RateLimits = {
  CRITICAL: { ttl: 60000, limit: 3 },        // 3 requests per minute
  SENSITIVE: { ttl: 60000, limit: 5 },       // 5 requests per minute
  STANDARD: { ttl: 60000, limit: 10 },       // 10 requests per minute
  READ: { ttl: 60000, limit: 30 },           // 30 requests per minute
  PUBLIC: { ttl: 60000, limit: 100 },        // 100 requests per minute
  DAILY: { ttl: 86400000, limit: 1000 },     // 1000 requests per day
} as const;

/**
 * 🔒 Critical Rate Limit - 3 req/min
 */
export const CriticalRateLimit = () =>
  applyDecorators(
    Throttle({ default: { ttl: RateLimits.CRITICAL.ttl, limit: RateLimits.CRITICAL.limit } }),
  );

/**
 * 🔒 Sensitive Rate Limit - 5 req/min
 */
export const SensitiveRateLimit = () =>
  applyDecorators(
    Throttle({ default: { ttl: RateLimits.SENSITIVE.ttl, limit: RateLimits.SENSITIVE.limit } }),
  );

/**
 * 🔒 Standard Rate Limit - 10 req/min
 */
export const StandardRateLimit = () =>
  applyDecorators(
    Throttle({ default: { ttl: RateLimits.STANDARD.ttl, limit: RateLimits.STANDARD.limit } }),
  );

/**
 * 🔒 Read Rate Limit - 30 req/min
 */
export const ReadRateLimit = () =>
  applyDecorators(
    Throttle({ default: { ttl: RateLimits.READ.ttl, limit: RateLimits.READ.limit } }),
  );

/**
 * 🔒 Public Rate Limit - 100 req/min
 */
export const PublicRateLimit = () =>
  applyDecorators(
    Throttle({ default: { ttl: RateLimits.PUBLIC.ttl, limit: RateLimits.PUBLIC.limit } }),
  );
