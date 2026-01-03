import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';
import { logger } from './logger';

const ADMIN_SESSION_COOKIE = 'pb_admin_auth';

/**
 * Verify admin token from request headers
 * Returns the authenticated PocketBase instance if valid
 */
export async function verifyAdminToken(request: NextRequest): Promise<{
  valid: boolean;
  pb?: PocketBase;
  error?: string;
}> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const pb = new PocketBase(
      process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
    );

    // Load the token
    pb.authStore.save(token, null);

    if (!pb.authStore.isValid) {
      return { valid: false, error: 'Invalid token' };
    }

    // Verify with server by refreshing
    await pb.collection('_superusers').authRefresh();

    return { valid: true, pb };
  } catch {
    return { valid: false, error: 'Token expired or invalid' };
  }
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * Verify admin session from cookie
 * Returns the authenticated PocketBase instance if valid
 */
async function verifyAdminSession(): Promise<{
  valid: boolean;
  pb?: PocketBase;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE);

    if (!sessionCookie?.value) {
      return { valid: false, error: 'No session cookie' };
    }

    const pb = new PocketBase(
      process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
    );

    // Load the token from cookie
    pb.authStore.save(sessionCookie.value, null);

    if (!pb.authStore.isValid) {
      return { valid: false, error: 'Invalid session' };
    }

    // Verify with server
    await pb.collection('_superusers').authRefresh();

    return { valid: true, pb };
  } catch {
    return { valid: false, error: 'Session expired or invalid' };
  }
}

/**
 * Wrapper for admin API routes that require authentication
 *
 * SECURITY: Requires valid authentication - no anonymous fallback
 *
 * Authentication methods (in order of priority):
 * 1. Bearer token in Authorization header
 * 2. Session cookie (pb_admin_auth)
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: (pb: PocketBase) => Promise<NextResponse>
): Promise<NextResponse> {
  // First try token-based auth from header
  const authHeader = request.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const result = await verifyAdminToken(request);
    if (result.valid && result.pb) {
      return handler(result.pb);
    }
    return unauthorizedResponse(result.error);
  }

  // Try cookie-based session auth
  const sessionResult = await verifyAdminSession();
  if (sessionResult.valid && sessionResult.pb) {
    return handler(sessionResult.pb);
  }

  // No valid authentication found
  return unauthorizedResponse('Authentication required');
}

/**
 * Escape special characters in PocketBase filter values
 * Prevents filter injection attacks
 */
export function escapeFilterValue(value: string): string {
  if (!value) return '';
  // Escape double quotes and backslashes
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Verify cron job authorization
 * SECURITY: Fails closed - if CRON_SECRET is not set, all requests are rejected
 */
export function verifyCronAuth(request: NextRequest): { valid: boolean; error?: string } {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Fail closed: if CRON_SECRET is not configured, reject all requests
  if (!cronSecret) {
    logger.error('cron_secret_not_configured');
    return { valid: false, error: 'Server misconfigured' };
  }

  if (!authHeader) {
    return { valid: false, error: 'Missing authorization header' };
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return { valid: false, error: 'Invalid cron secret' };
  }

  return { valid: true };
}
