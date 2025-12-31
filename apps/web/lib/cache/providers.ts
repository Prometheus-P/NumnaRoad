import { getAdminPocketBase } from '@/lib/pocketbase';
import type { EsimProvider } from '@services/esim-providers/types';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedProviders: EsimProvider[] | null = null;
let cacheTimestamp = 0;

/**
 * Get active providers with caching (5 minute TTL).
 * Reduces database load from frequent webhook calls.
 */
export async function getCachedActiveProviders(): Promise<EsimProvider[]> {
  const now = Date.now();

  // Return cached data if still valid
  if (cachedProviders && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedProviders;
  }

  try {
    const pb = await getAdminPocketBase();
    const providers = await pb.collection('esim_providers').getFullList({
      filter: 'is_active=true',
      sort: '-priority',
    });

    cachedProviders = providers.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      priority: p.priority,
      apiEndpoint: p.api_endpoint,
      apiKeyEnvVar: p.api_key_env_var,
      timeoutMs: p.timeout_ms || 10000,
      maxRetries: p.max_retries || 3,
      isActive: p.is_active,
      createdAt: p.created,
      updatedAt: p.updated,
    }));
    cacheTimestamp = now;

    return cachedProviders;
  } catch (error) {
    console.error('Failed to fetch providers:', error);
    // Return stale cache if available, otherwise empty array
    return cachedProviders || [];
  }
}

/**
 * Invalidate the provider cache (call when providers are updated).
 */
export function invalidateProviderCache(): void {
  cachedProviders = null;
  cacheTimestamp = 0;
}
