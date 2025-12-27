/**
 * Simple in-memory rate limiter
 * For production with multiple instances, use Redis
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup(): void {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    Array.from(rateLimitStore.entries()).forEach(([key, entry]) => {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    });
  }, CLEANUP_INTERVAL);

  // Allow the process to exit even with the timer running
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Check if a request should be rate limited
 * @param key Unique identifier (e.g., IP address)
 * @param config Rate limit configuration
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  startCleanup();

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No existing entry or entry has expired
  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.interval;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }

  // Entry exists and is still valid
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  // Increment count
  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Preset rate limit configurations
 */
export const RateLimitPresets: Record<string, RateLimitConfig> = {
  // Webhook endpoints: 100 requests per minute
  webhook: {
    interval: 60 * 1000,
    maxRequests: 100,
  },
  // API endpoints: 60 requests per minute
  api: {
    interval: 60 * 1000,
    maxRequests: 60,
  },
  // Strict rate limit: 10 requests per minute
  strict: {
    interval: 60 * 1000,
    maxRequests: 10,
  },
};

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

// =============================================================================
// Provider Rate Limit Tracking
// =============================================================================

/**
 * Parsed rate limit info from provider response headers
 */
export interface ProviderRateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp in seconds
  retryAfter?: number; // Seconds until rate limit resets
}

/**
 * Parse rate limit headers from Airalo API responses
 */
export function parseAiraloRateLimitHeaders(headers: Headers): ProviderRateLimitInfo | null {
  const limit = headers.get('X-RateLimit-Limit');
  const remaining = headers.get('X-RateLimit-Remaining');
  const reset = headers.get('X-RateLimit-Reset');
  const retryAfter = headers.get('Retry-After');

  if (!limit || !remaining) {
    return null;
  }

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    resetAt: reset ? parseInt(reset, 10) : Math.floor(Date.now() / 1000) + 60,
    retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
  };
}

/**
 * Provider rate limit state tracker
 */
interface ProviderRateLimitState {
  endpoint: string;
  remaining: number;
  resetAt: number;
  lastUpdated: number;
}

const providerRateLimitStore = new Map<string, ProviderRateLimitState>();

/**
 * Update rate limit state from API response
 */
export function updateProviderRateLimitState(
  provider: string,
  endpoint: string,
  info: ProviderRateLimitInfo
): void {
  const key = `${provider}:${endpoint}`;
  providerRateLimitStore.set(key, {
    endpoint,
    remaining: info.remaining,
    resetAt: info.resetAt,
    lastUpdated: Date.now(),
  });
}

/**
 * Check if we should delay before making a request
 * Returns delay in milliseconds, or 0 if no delay needed
 */
export function getProviderRateLimitDelay(
  provider: string,
  endpoint: string
): number {
  const key = `${provider}:${endpoint}`;
  const state = providerRateLimitStore.get(key);

  if (!state) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000);

  // If reset time has passed, no delay needed
  if (now >= state.resetAt) {
    return 0;
  }

  // If we have remaining requests, no delay needed
  if (state.remaining > 0) {
    return 0;
  }

  // Calculate delay until reset
  const delaySeconds = state.resetAt - now;
  return delaySeconds * 1000;
}

/**
 * Get current rate limit status for monitoring
 */
export function getProviderRateLimitStatus(provider: string): ProviderRateLimitState[] {
  const states: ProviderRateLimitState[] = [];

  providerRateLimitStore.forEach((state, key) => {
    if (key.startsWith(`${provider}:`)) {
      states.push(state);
    }
  });

  return states;
}

/**
 * Airalo-specific rate limits per endpoint (requests per minute)
 */
export const AiraloRateLimits: Record<string, number> = {
  token: 5,       // 5 requests per minute
  packages: 40,   // 40 requests per minute
  orders: 40,     // 40 requests per minute
  sims: 40,       // 40 requests per minute
  usage: 96,      // 96 requests per day per SIM (special case)
};
