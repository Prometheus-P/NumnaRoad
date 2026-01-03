/**
 * Next.js Middleware
 *
 * Handles:
 * - Correlation ID generation/propagation for tracing
 * - CORS headers for API routes
 * - Admin API authentication
 * - i18n routing
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import {
  checkRateLimit,
  rateLimitExceededResponse,
  addRateLimitHeaders,
} from './lib/rate-limit';

// =============================================================================
// Correlation ID Configuration
// =============================================================================

const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Generate a correlation ID (simplified UUID without external dependency).
 * For middleware, we avoid importing uuid to keep bundle size small.
 */
function generateCorrelationId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create correlation ID from request.
 */
function getOrCreateCorrelationId(request: NextRequest): string {
  const existing = request.headers.get(CORRELATION_ID_HEADER);
  return existing || generateCorrelationId();
}

// =============================================================================
// CORS Configuration
// =============================================================================

/**
 * Get allowed origins based on environment.
 * Uses environment variable or defaults based on NODE_ENV.
 */
function getAllowedOrigins(): string[] {
  const customOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (customOrigins) {
    return customOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
  }

  if (process.env.NODE_ENV === 'production') {
    return [
      'https://numnaroad.com',
      'https://www.numnaroad.com',
      'https://admin.numnaroad.com',
    ];
  }

  return [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
}

/**
 * Check if an origin is allowed.
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

/**
 * Get CORS headers for a given origin.
 */
function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-API-Key',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Allow-Credentials': 'true',
  };

  // Only set Allow-Origin if origin is allowed
  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

/**
 * Add CORS headers to a response.
 */
function addCorsHeaders(
  response: NextResponse,
  origin: string | null,
  isWebhook: boolean,
  correlationId?: string
): NextResponse {
  if (isWebhook) {
    // Webhooks allow any origin (they're secured by signatures)
    response.headers.set('Access-Control-Allow-Origin', '*');
  } else if (origin && isOriginAllowed(origin)) {
    const headers = getCorsHeaders(origin);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  // Add Vary header for proper caching
  response.headers.set('Vary', 'Origin');

  // Add correlation ID header
  if (correlationId) {
    response.headers.set(CORRELATION_ID_HEADER, correlationId);
  }

  return response;
}

// =============================================================================
// i18n Middleware
// =============================================================================

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
});

// =============================================================================
// Path Configuration
// =============================================================================

// Admin API paths that don't require authentication
const PUBLIC_ADMIN_PATHS = [
  '/api/admin/auth/login',
  '/api/admin/auth/verify',
];

// Webhook paths (secured by other mechanisms like signatures)
const WEBHOOK_PATHS = [
  '/api/webhooks/',
  '/api/cron/',
];

// =============================================================================
// Middleware
// =============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');
  const method = request.method;
  const isApiRoute = pathname.startsWith('/api/');
  const isWebhookRoute = WEBHOOK_PATHS.some(p => pathname.startsWith(p));

  // Generate or extract correlation ID for all API requests
  const correlationId = isApiRoute ? getOrCreateCorrelationId(request) : undefined;

  // Handle preflight OPTIONS requests for API routes
  if (isApiRoute && method === 'OPTIONS') {
    const headers = getCorsHeaders(origin);

    // Webhooks allow any origin
    if (isWebhookRoute) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          ...headers,
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // For other API routes, use configured origins
    if (!origin || !isOriginAllowed(origin)) {
      const defaultOrigin = getAllowedOrigins()[0] || '';
      return new NextResponse(null, {
        status: 204,
        headers: {
          ...headers,
          'Access-Control-Allow-Origin': defaultOrigin,
        },
      });
    }

    return new NextResponse(null, {
      status: 204,
      headers,
    });
  }

  // Skip additional middleware for webhooks and cron jobs (secured by signature/API keys)
  if (isWebhookRoute) {
    const response = NextResponse.next();
    // Pass correlation ID to route handler via header
    if (correlationId) {
      response.headers.set(CORRELATION_ID_HEADER, correlationId);
    }
    return addCorsHeaders(response, origin, true, correlationId);
  }

  // Admin API protection
  if (pathname.startsWith('/api/admin/')) {
    // Allow public paths (still apply rate limiting)
    if (PUBLIC_ADMIN_PATHS.some(p => pathname.startsWith(p))) {
      // Apply stricter rate limiting to auth endpoints (prevent brute force)
      const rateLimitResult = checkRateLimit(request, {
        limit: 20, // 20 requests per minute for auth endpoints
        keyPrefix: 'auth',
      });

      if (!rateLimitResult.success) {
        const response = rateLimitExceededResponse(rateLimitResult);
        return addCorsHeaders(response, origin, false, correlationId);
      }

      const response = NextResponse.next();
      addRateLimitHeaders(response, rateLimitResult);
      if (correlationId) {
        response.headers.set(CORRELATION_ID_HEADER, correlationId);
      }
      return addCorsHeaders(response, origin, false, correlationId);
    }

    // Check for authentication token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const cookie = request.cookies.get('pb_admin_auth')?.value;

    if (!token && !cookie) {
      const response = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      return addCorsHeaders(response, origin, false, correlationId);
    }

    // Apply rate limiting for authenticated admin requests
    const rateLimitResult = checkRateLimit(request, {
      limit: 100, // 100 requests per minute
      keyPrefix: 'admin',
    });

    if (!rateLimitResult.success) {
      const response = rateLimitExceededResponse(rateLimitResult);
      return addCorsHeaders(response, origin, false, correlationId);
    }

    // Pass token and correlation ID to route handler via headers
    const response = NextResponse.next();
    if (token) {
      response.headers.set('x-admin-token', token);
    }
    if (correlationId) {
      response.headers.set(CORRELATION_ID_HEADER, correlationId);
    }
    addRateLimitHeaders(response, rateLimitResult);
    return addCorsHeaders(response, origin, false, correlationId);
  }

  // Other API routes - just add CORS headers and correlation ID
  if (isApiRoute) {
    const response = NextResponse.next();
    if (correlationId) {
      response.headers.set(CORRELATION_ID_HEADER, correlationId);
    }
    return addCorsHeaders(response, origin, false, correlationId);
  }

  // i18n routing for frontend pages
  if (!pathname.startsWith('/_next/')) {
    return intlMiddleware(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // i18n paths
    '/',
    '/(ko|en)/:path*',
    // All API paths (for CORS and auth protection)
    '/api/:path*',
  ],
};
