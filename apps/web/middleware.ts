import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
});

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for webhooks and cron jobs (secured by signature/API keys)
  if (WEBHOOK_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Admin API protection
  if (pathname.startsWith('/api/admin/')) {
    // Allow public paths
    if (PUBLIC_ADMIN_PATHS.some(p => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    // Check for authentication token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const cookie = request.cookies.get('pb_admin_auth')?.value;

    if (!token && !cookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Pass token to route handler via header
    const response = NextResponse.next();
    if (token) {
      response.headers.set('x-admin-token', token);
    }
    return response;
  }

  // i18n routing for frontend pages
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/_next/')) {
    return intlMiddleware(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // i18n paths
    '/',
    '/(ko|en)/:path*',
    // Admin API paths (for auth protection)
    '/api/admin/:path*',
  ],
};
