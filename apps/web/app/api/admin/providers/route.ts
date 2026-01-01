import { NextRequest, NextResponse } from 'next/server';
import { Collections } from '@/lib/pocketbase';
import { withAdminAuth } from '@/lib/admin-auth';

// Default providers configuration (used when esim_providers collection doesn't exist)
const DEFAULT_PROVIDERS = [
  {
    id: 'airalo',
    name: 'Airalo',
    priority: 1,
    state: 'CLOSED',
    successRate: 98.5,
    consecutiveFailures: 0,
    lastFailureAt: null,
    isActive: true,
    apiEndpoint: 'https://partners-api.airalo.com/v2',
  },
  {
    id: 'esimcard',
    name: 'eSIM Card',
    priority: 2,
    state: 'CLOSED',
    successRate: 95.0,
    consecutiveFailures: 0,
    lastFailureAt: null,
    isActive: false,
    apiEndpoint: 'https://api.esimcard.com',
  },
  {
    id: 'mobimatter',
    name: 'MobiMatter',
    priority: 3,
    state: 'CLOSED',
    successRate: 92.0,
    consecutiveFailures: 0,
    lastFailureAt: null,
    isActive: false,
    apiEndpoint: 'https://api.mobimatter.com',
  },
];

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (pb) => {
    try {
      try {
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
      } catch {
        // Collection doesn't exist, return default providers
        console.log('esim_providers collection not found, using defaults');
        return NextResponse.json(DEFAULT_PROVIDERS);
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch providers' },
        { status: 500 }
      );
    }
  });
}
