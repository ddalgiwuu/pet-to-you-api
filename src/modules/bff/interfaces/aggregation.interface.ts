/**
 * Shared interfaces for BFF aggregation responses
 */

export interface AggregatedResponse<T> {
  data: T;
  timestamp: Date;
  cached: boolean;
  cacheExpiry?: Date;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ErrorDetail {
  service: string;
  error: string;
  fallback?: any;
}

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
}
