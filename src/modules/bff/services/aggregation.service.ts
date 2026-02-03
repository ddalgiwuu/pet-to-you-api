import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../../core/cache/cache.service';
import { AggregatedResponse, ErrorDetail } from '../interfaces/aggregation.interface';

/**
 * Core aggregation service for parallel data fetching and caching
 */
@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Execute multiple async operations in parallel with error handling
   * Falls back to partial results if individual operations fail
   */
  async executeParallel<T extends Record<string, any>>(
    operations: Record<keyof T, () => Promise<any>>,
    options: {
      throwOnError?: boolean;
      logErrors?: boolean;
    } = {},
  ): Promise<{ data: T; errors: ErrorDetail[] }> {
    const { throwOnError = false, logErrors = true } = options;

    const entries = Object.entries(operations);
    const errors: ErrorDetail[] = [];

    const results = await Promise.allSettled(
      entries.map(([key, fn]) => fn()),
    );

    const data = {} as T;

    results.forEach((result, index) => {
      const [key] = entries[index];

      if (result.status === 'fulfilled') {
        data[key as keyof T] = result.value;
      } else {
        const error: ErrorDetail = {
          service: key,
          error: result.reason?.message || 'Unknown error',
          fallback: null,
        };
        errors.push(error);

        if (logErrors) {
          this.logger.error(
            `Error in parallel execution for ${key}:`,
            result.reason,
          );
        }

        data[key as keyof T] = undefined as T[keyof T];
      }
    });

    if (throwOnError && errors.length > 0) {
      throw new Error(
        `Parallel execution failed: ${errors.map((e) => e.service).join(', ')}`,
      );
    }

    return { data, errors };
  }

  /**
   * Get cached data or execute function and cache the result
   */
  async getOrCache<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number,
  ): Promise<AggregatedResponse<T>> {
    const cached = await this.cacheService.get<T>(key);

    if (cached) {
      this.logger.debug(`Cache hit for key: ${key}`);
      return {
        data: cached,
        timestamp: new Date(),
        cached: true,
      };
    }

    this.logger.debug(`Cache miss for key: ${key}, executing function`);
    const data = await fn();

    await this.cacheService.set(key, data, ttl);

    return {
      data,
      timestamp: new Date(),
      cached: false,
      cacheExpiry: new Date(Date.now() + ttl * 1000),
    };
  }

  /**
   * Batch get or cache multiple operations
   */
  async batchGetOrCache<T extends Record<string, any>>(
    operations: Record<keyof T, { key: string; fn: () => Promise<any>; ttl: number }>,
  ): Promise<AggregatedResponse<T>> {
    const entries = Object.entries(operations);
    const results = await Promise.all(
      entries.map(([_, config]: any) =>
        this.getOrCache(config.key, config.fn, config.ttl),
      ),
    );

    const data = {} as T;
    let allCached = true;

    results.forEach((result, index) => {
      const [key] = entries[index];
      data[key as keyof T] = result.data as T[keyof T];
      if (!result.cached) allCached = false;
    });

    return {
      data,
      timestamp: new Date(),
      cached: allCached,
    };
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // Note: This requires Redis SCAN command for pattern matching
    this.logger.log(`Invalidating cache pattern: ${pattern}`);
    // Implementation depends on cache service capabilities
  }

  /**
   * Generate cache key with namespace and parameters
   */
  generateCacheKey(namespace: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);

    const paramString = JSON.stringify(sortedParams);
    return `${namespace}:${Buffer.from(paramString).toString('base64')}`;
  }

  /**
   * Denormalize related data to reduce subsequent queries
   */
  denormalizeRelations<T>(
    entities: T[],
    relations: Record<string, any[]>,
    relationKey: string,
  ): T[] {
    return entities.map((entity: any) => {
      const relationId = entity[relationKey];
      const relatedData = relations[relationId];

      return {
        ...entity,
        ...relatedData,
      };
    });
  }

  /**
   * Shape response to match frontend expectations
   */
  shapeResponse<T, R>(
    data: T,
    mapper: (data: T) => R,
  ): R {
    try {
      return mapper(data);
    } catch (error) {
      this.logger.error('Error shaping response:', error);
      throw error;
    }
  }

  /**
   * Paginate array data
   */
  paginate<T>(
    data: T[],
    page: number = 1,
    limit: number = 10,
  ): {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  } {
    const total = data.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: data.slice(start, end),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
