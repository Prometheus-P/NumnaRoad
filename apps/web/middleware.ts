import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  getClientIP,
  RateLimitPresets,
} from '@/lib/rate-limit';

/**
 * Middleware for rate limiting and request logging
 */
export function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;

  // Skip rate limiting for static files and non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Skip rate limiting for health check
  if (pathname === '/api/health') {
    return NextResponse.next();
  }

  // Get client IP
  const clientIP = getClientIP(request);

  // Determine rate limit config based on endpoint
  let config = RateLimitPresets.api;
  if (pathname.startsWith('/api/webhooks/')) {
    config = RateLimitPresets.webhook;
  } else if (pathname.startsWith('/api/checkout/')) {
    config = RateLimitPresets.strict;
  }

  // Create rate limit key
  const rateLimitKey = `${clientIP}:${pathname}`;

  // Check rate limit
  const result = checkRateLimit(rateLimitKey, config);

  // If rate limited, return 429
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests',
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfter),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetTime),
        },
      }
    );
  }

  // Add rate limit headers to response
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.resetTime));

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
