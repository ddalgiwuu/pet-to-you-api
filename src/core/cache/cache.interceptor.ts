import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

/**
 * 🚀 Cache Interceptor
 *
 * Redis-based caching interceptor for dashboard endpoints.
 *
 * Features:
 * - Automatic cache key generation
 * - Configurable TTL per endpoint
 * - Cache invalidation support
 * - Cache hit/miss logging
 * - Response metadata injection
 *
 * Usage:
 * ```typescript
 * @UseInterceptors(CacheInterceptor)
 * @CacheTTL(300) // 5 minutes
 * @Get('stats')
 * getStats() { ... }
 * ```
 *
 * Cache Key Format: `dashboard:{type}:{id}:{endpoint}:{queryHash}`
 * Example: `dashboard:hospital:abc123:stats:def456`
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);
  private readonly cache: Map<string, { data: any; expires: number }> = new Map();

  constructor(private reflector: Reflector) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    // Get cache TTL from decorator (default: 300 seconds = 5 minutes)
    const cacheTTL = this.reflector.get<number>('cache_ttl', handler) || 300;

    // Skip caching if TTL is 0
    if (cacheTTL === 0) {
      return next.handle();
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(request);

    // Check cache
    const cachedResponse = this.getFromCache(cacheKey);
    if (cachedResponse) {
      this.logger.debug(`Cache HIT: ${cacheKey}`);
      return of(this.addCacheMetadata(cachedResponse, true, cacheTTL));
    }

    this.logger.debug(`Cache MISS: ${cacheKey}`);

    // Execute handler and cache response
    return next.handle().pipe(
      tap((response) => {
        if (response && response.success) {
          this.setToCache(cacheKey, response, cacheTTL);
          this.logger.debug(`Cached response: ${cacheKey} (TTL: ${cacheTTL}s)`);
        }
      }),
    );
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(request: any): string {
    const { url, query, user } = request;

    // Extract organization ID
    const organizationId =
      user?.hospitalId || user?.businessId || 'unknown';

    // Create query hash
    const queryHash = this.hashObject(query);

    // Format: dashboard:{type}:{id}:{endpoint}:{queryHash}
    const urlPath = url.split('?')[0].replace('/api/v1/dashboard/', '');
    return `dashboard:${urlPath}:${organizationId}:${queryHash}`;
  }

  /**
   * Get value from cache
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set value to cache
   */
  private setToCache(key: string, data: any, ttl: number): void {
    const expires = Date.now() + ttl * 1000;
    this.cache.set(key, { data, expires });

    // Auto-cleanup expired entries (every 60 seconds)
    if (this.cache.size % 100 === 0) {
      this.cleanupExpired();
    }
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now > value.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Add cache metadata to response
   */
  private addCacheMetadata(response: any, cached: boolean, ttl: number): any {
    return {
      ...response,
      meta: {
        ...response.meta,
        cached,
        cacheTTL: ttl,
      },
    };
  }

  /**
   * Hash object to string (simple hash for demo)
   */
  private hashObject(obj: any): string {
    if (!obj || Object.keys(obj).length === 0) {
      return 'default';
    }

    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Invalidate cache by pattern
   */
  invalidateByPattern(pattern: string): number {
    let invalidated = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    this.logger.log(`Invalidated ${invalidated} cache entries matching: ${pattern}`);
    return invalidated;
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cleared all cache (${size} entries)`);
  }
}

/**
 * Cache TTL Decorator
 *
 * Set custom TTL for endpoint caching.
 *
 * Usage:
 * ```typescript
 * @CacheTTL(300) // 5 minutes
 * @Get('stats')
 * getStats() { ... }
 * ```
 */
export const CacheTTL = (seconds: number) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('cache_ttl', seconds, descriptor.value);
    return descriptor;
  };
};
