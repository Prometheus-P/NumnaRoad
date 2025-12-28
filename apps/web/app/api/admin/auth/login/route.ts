import { NextRequest, NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const pb = new PocketBase(
      process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
    );

    // Authenticate with PocketBase superusers collection
    const authData = await pb.collection('_superusers').authWithPassword(email, password);

    // Return the token
    return NextResponse.json({
      success: true,
      token: pb.authStore.token,
      user: {
        id: authData.record.id,
        email: authData.record.email,
      },
    });
  } catch (error) {
    console.error('Admin login failed:', error);
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    );
  }
}
