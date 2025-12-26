import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

/**
 * Authentication utilities for API routes
 */

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * Get authenticated admin PocketBase client
 * Uses admin credentials from environment
 */
export async function getAdminPocketBase(): Promise<PocketBase> {
  const pb = new PocketBase(
    process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
  );

  await pb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  );

  return pb;
}

/**
 * Verify user authentication from request
 * @param request NextRequest with Authorization header
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const pb = new PocketBase(
      process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
    );

    // Validate token by attempting to refresh auth
    pb.authStore.save(token, null);

    // Verify the token is valid by making a request
    const user = await pb.collection('users').authRefresh();

    return {
      success: true,
      user: {
        id: user.record.id,
        email: user.record.email,
        isAdmin: user.record.isAdmin ?? false,
      },
    };
  } catch {
    return { success: false, error: 'Invalid or expired token' };
  }
}

/**
 * Verify admin authentication
 * @param request NextRequest with Authorization header
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AuthResult> {
  const result = await verifyAuth(request);

  if (!result.success) {
    return result;
  }

  if (!result.user?.isAdmin) {
    return { success: false, error: 'Admin access required' };
  }

  return result;
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  );
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  );
}

/**
 * Verify API key authentication (for internal services)
 * @param request NextRequest with X-API-Key header
 */
export function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) {
    console.warn('INTERNAL_API_KEY not configured');
    return false;
  }

  return apiKey === expectedKey;
}
