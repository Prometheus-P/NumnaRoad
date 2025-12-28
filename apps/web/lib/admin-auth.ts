import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

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
 * Wrapper for admin API routes that require authentication
 * Falls back to server-side admin auth for internal calls (e.g., from dashboard)
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

  // For requests without auth header (e.g., from browser with cookies),
  // use server-side admin credentials
  // This allows the dashboard to work without passing tokens in every request
  try {
    const pb = new PocketBase(
      process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
    );

    const email = process.env.POCKETBASE_ADMIN_EMAIL;
    const password = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (email && password) {
      await pb.collection('_superusers').authWithPassword(email, password);
      return handler(pb);
    }

    return unauthorizedResponse('Admin credentials not configured');
  } catch (error) {
    console.error('Admin auth failed:', error);
    return unauthorizedResponse('Authentication failed');
  }
}
