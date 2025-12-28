import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';

export async function GET(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();

    const providers = await pb.collection(Collections.ESIM_PROVIDERS).getFullList({
      sort: 'priority',
    });

    const result = providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      priority: provider.priority || 1,
      state: provider.circuit_breaker_state || 'CLOSED',
      successRate: provider.success_rate || 100,
      consecutiveFailures: provider.consecutive_failures || 0,
      lastFailureAt: provider.last_failure_at,
      isActive: provider.is_active !== false,
      apiEndpoint: provider.api_endpoint,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}
