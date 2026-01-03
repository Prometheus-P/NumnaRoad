/**
 * Rate Limiting Module
 *
 * Provides IP-based and token-based rate limiting for API routes.
 * Uses in-memory storage (can be upgraded to Vercel KV for distributed limiting).
 *
 * Default: 100 requests per minute per IP
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

// =============================================================================
// Types
// =============================================================================

export interface RateLimitConfig {
  /** Maximum requests allowed in the interval */
  limit: number;
  /** Time window in milliseconds */
  intervalMs: number;
  /** Use token-based limiting (in addition to IP) */
  useTokenLimit?: boolean;
  /** Custom key prefix for different rate limit buckets */
  keyPrefix?: string;
}

/** Legacy config format for backward compatibility */
export interface LegacyRateLimitConfig {
  interval: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  /** Seconds until reset (for backward compatibility) */
  retryAfter: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: RateLimitConfig = {
  limit: 100,
  intervalMs: 60 * 1000, // 1 minute
  useTokenLimit: true,
  keyPrefix: 'admin',
};

/**
 * Preset configurations for common rate limiting scenarios.
 */
export const RateLimitPresets = {
  /** Default for admin API endpoints */
  admin: { interval: 60 * 1000, maxRequests: 100 },
  /** Stricter for auth endpoints (prevent brute force) */
  auth: { interval: 60 * 1000, maxRequests: 20 },
  /** For webhook endpoints */
  webhook: { interval: 60 * 1000, maxRequests: 60 },
  /** For public API endpoints */
  public: { interval: 60 * 1000, maxRequests: 30 },
  /** Very strict for sensitive operations */
  strict: { interval: 60 * 1000, maxRequests: 10 },
} as const;

// =============================================================================
// In-Memory Store
// =============================================================================

// In-memory store for rate limiting
// TODO: Replace with Vercel KV for distributed rate limiting (#99)
const store = new Map<string, RateLimitEntry>();

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

/**
 * Clean up expired entries from the store.
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();

  // Only cleanup periodically
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanup = now;

  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Extract IP address from request.
 */
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Extract token from request (for token-based limiting).
 */
function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    // Use first 16 chars of token as identifier (don't expose full token)
    const token = authHeader.replace('Bearer ', '');
    return token.substring(0, 16);
  }

  const cookie = request.cookies.get('pb_admin_auth')?.value;
  if (cookie) {
    return cookie.substring(0, 16);
  }

  return null;
}

/**
 * Generate rate limit key.
 */
function generateKey(prefix: string, identifier: string): string {
  return `ratelimit:${prefix}:${identifier}`;
}

/**
 * Check rate limit for a given key.
 */
function checkLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();

  // Cleanup expired entries periodically
  cleanupExpiredEntries();

  // Get or create entry
  let entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // Create new entry
    entry = {
      count: 1,
      resetAt: now + config.intervalMs,
    };
    store.set(key, entry);

    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: entry.resetAt,
      retryAfter: Math.ceil(config.intervalMs / 1000),
    };
  }

  // Increment count
  entry.count++;
  store.set(key, entry);

  const remaining = Math.max(0, config.limit - entry.count);
  const success = entry.count <= config.limit;
  const retryAfter = Math.max(0, Math.ceil((entry.resetAt - now) / 1000));

  return {
    success,
    limit: config.limit,
    remaining,
    reset: entry.resetAt,
    retryAfter,
  };
}

/**
 * Check rate limit by key string (legacy API for backward compatibility).
 *
 * @param key - Rate limit bucket key
 * @param config - Legacy config with interval and maxRequests
 */
export function checkRateLimitByKey(
  key: string,
  config: LegacyRateLimitConfig
): RateLimitResult {
  return checkLimit(key, {
    limit: config.maxRequests,
    intervalMs: config.interval,
  });
}

/**
 * Get client IP from request (exported for backward compatibility).
 */
export function getClientIP(request: NextRequest): string {
  return getClientIp(request);
}

/**
 * Check rate limit for a request.
 * Uses both IP and token (if available) for limiting.
 */
export function checkRateLimit(
  request: NextRequest,
  config: Partial<RateLimitConfig> = {}
): RateLimitResult {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const ip = getClientIp(request);
  const token = mergedConfig.useTokenLimit ? getToken(request) : null;

  // Check IP-based limit
  const ipKey = generateKey(mergedConfig.keyPrefix || 'default', `ip:${ip}`);
  const ipResult = checkLimit(ipKey, mergedConfig);

  if (!ipResult.success) {
    logger.warn('rate_limit_exceeded', {
      type: 'ip',
      ip,
      limit: ipResult.limit,
    });
    return ipResult;
  }

  // If token available, also check token-based limit (stricter)
  if (token) {
    const tokenKey = generateKey(mergedConfig.keyPrefix || 'default', `token:${token}`);
    const tokenResult = checkLimit(tokenKey, mergedConfig);

    if (!tokenResult.success) {
      logger.warn('rate_limit_exceeded', {
        type: 'token',
        tokenPrefix: token.substring(0, 8),
        limit: tokenResult.limit,
      });
      return tokenResult;
    }

    // Return the more restrictive result
    return tokenResult.remaining < ipResult.remaining ? tokenResult : ipResult;
  }

  return ipResult;
}

/**
 * Create rate limit response headers.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.reset / 1000).toString(),
    'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
  };
}

/**
 * Create 429 Too Many Requests response.
 */
export function rateLimitExceededResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
    },
    {
      status: 429,
      headers: getRateLimitHeaders(result),
    }
  );
}

// =============================================================================
// Middleware Helper
// =============================================================================

/**
 * Rate limit middleware wrapper for API routes.
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const rateLimitResult = checkRateLimit(request);
 *   if (!rateLimitResult.success) {
 *     return rateLimitExceededResponse(rateLimitResult);
 *   }
 *
 *   // ... handle request
 * }
 * ```
 */
export function withRateLimit(
  request: NextRequest,
  config?: Partial<RateLimitConfig>
): { limited: boolean; response?: NextResponse; result: RateLimitResult } {
  const result = checkRateLimit(request, config);

  if (!result.success) {
    return {
      limited: true,
      response: rateLimitExceededResponse(result),
      result,
    };
  }

  return {
    limited: false,
    result,
  };
}

/**
 * Add rate limit headers to a successful response.
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  const headers = getRateLimitHeaders(result);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
