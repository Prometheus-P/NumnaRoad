import { NextRequest, NextResponse } from 'next/server';
import { Collections } from '@/lib/pocketbase';
import { withAdminAuth } from '@/lib/admin-auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Validate ID format
  if (!/^[a-zA-Z0-9]{15}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid provider ID format' }, { status: 400 });
  }

  return withAdminAuth(request, async (pb) => {
    try {
      // Reset circuit breaker state
      const provider = await pb.collection(Collections.ESIM_PROVIDERS).update(id, {
        circuit_breaker_state: 'CLOSED',
        consecutive_failures: 0,
        last_failure_at: null,
      });

      return NextResponse.json({
        success: true,
        provider: {
          id: provider.id,
          name: provider.name,
          state: 'CLOSED',
          consecutiveFailures: 0,
        },
      });
    } catch (error) {
      console.error('Failed to reset circuit breaker:', error);
      return NextResponse.json(
        { error: 'Failed to reset circuit breaker' },
        { status: 500 }
      );
    }
  });
}
