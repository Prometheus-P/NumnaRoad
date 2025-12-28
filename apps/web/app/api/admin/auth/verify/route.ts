import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token required' },
        { status: 401 }
      );
    }

    const pb = new PocketBase(
      process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
    );

    // Load the token into auth store
    pb.authStore.save(token, null);

    // Verify the token is valid by refreshing auth
    if (!pb.authStore.isValid) {
      return NextResponse.json(
        { valid: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Try to refresh to verify with server
    try {
      const authData = await pb.collection('_superusers').authRefresh();
      return NextResponse.json({
        valid: true,
        user: {
          id: authData.record.id,
          email: authData.record.email,
        },
      });
    } catch {
      return NextResponse.json(
        { valid: false, error: 'Token expired' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Token verification failed:', error);
    return NextResponse.json(
      { valid: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
