import { NextRequest, NextResponse } from 'next/server';
import { Collections } from '@/lib/pocketbase';
import { withAdminAuth } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';

// Default providers configuration (used when esim_providers collection doesn't exist)
const DEFAULT_PROVIDERS = [
  {
    id: 'airalo',
    name: 'Airalo',
    priority: 1,
    isActive: true,
    apiEndpoint: 'https://partners-api.airalo.com/v2',
  },
  {
    id: 'esimcard',
    name: 'eSIM Card',
    priority: 2,
    isActive: false,
    apiEndpoint: 'https://api.esimcard.com',
  },
  {
    id: 'mobimatter',
    name: 'MobiMatter',
    priority: 3,
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
          slug: provider.slug,
          priority: provider.priority || 1,
          isActive: provider.is_active !== false,
          apiEndpoint: provider.api_endpoint,
          state: provider.circuit_breaker_state || 'CLOSED',
          successRate: provider.success_rate || 1,
          consecutiveFailures: provider.consecutive_failures || 0,
          lastFailureAt: provider.last_failure_at,
        }));

        return NextResponse.json(result);
      } catch {
        // Collection doesn't exist, return default providers
        logger.info('esim_providers_collection_not_found');
        return NextResponse.json(DEFAULT_PROVIDERS);
      }
    } catch (error) {
      logger.error('admin_providers_fetch_failed', error);
      return NextResponse.json(
        { error: 'Failed to fetch providers' },
        { status: 500 }
      );
    }
  });
}
