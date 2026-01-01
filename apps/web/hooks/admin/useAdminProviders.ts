/**
 * Admin Provider Hooks
 *
 * Reusable hooks for provider data fetching and mutations.
 * Centralizes API calls and caching logic for provider management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// Types
// =============================================================================

export type CircuitBreakerState = 'CLOSED' | 'HALF_OPEN' | 'OPEN';

export interface Provider {
  id: string;
  name: string;
  priority: number;
  state: CircuitBreakerState;
  successRate: number;
  consecutiveFailures: number;
  lastFailureAt?: string;
  isActive: boolean;
  apiEndpoint?: string;
}

export interface ProviderError {
  message: string;
  count: number;
  lastOccurred: string;
}

export interface HourlyStat {
  hour: string;
  success: number;
  failure: number;
}

export interface ProviderStats {
  providerId: string;
  providerName: string;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  recentErrors: ProviderError[];
  hourlyStats: HourlyStat[];
}

export interface StatsResponse {
  period: string;
  generatedAt: string;
  providers: ProviderStats[];
}

export interface OverallStats {
  requests: number;
  success: number;
  failures: number;
  successRate: number;
}

// =============================================================================
// Query Keys
// =============================================================================

export const providerKeys = {
  all: ['admin', 'providers'] as const,
  list: () => [...providerKeys.all, 'list'] as const,
  stats: (hours: number) => [...providerKeys.all, 'stats', hours] as const,
};

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetch all providers with circuit breaker status.
 */
export function useAdminProviders() {
  return useQuery<Provider[]>({
    queryKey: providerKeys.list(),
    queryFn: async () => {
      const res = await fetch('/api/admin/providers');
      if (!res.ok) throw new Error('Failed to fetch providers');
      return res.json();
    },
  });
}

/**
 * Fetch provider statistics for the given time period.
 */
export function useProviderStats(hours: number = 24) {
  return useQuery<StatsResponse>({
    queryKey: providerKeys.stats(hours),
    queryFn: async () => {
      const res = await fetch(`/api/admin/providers/stats?hours=${hours}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Reset a provider's circuit breaker.
 */
export function useResetProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (providerId: string) => {
      const res = await fetch(`/api/admin/providers/${providerId}/reset`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Reset failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerKeys.all });
    },
  });
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get circuit breaker state display info.
 */
export function getStateInfo(
  state: CircuitBreakerState
): { color: 'success' | 'warning' | 'error'; label: string; icon: string } {
  switch (state) {
    case 'CLOSED':
      return { color: 'success', label: 'Normal', icon: '🟢' };
    case 'HALF_OPEN':
      return { color: 'warning', label: 'Testing', icon: '🟡' };
    case 'OPEN':
      return { color: 'error', label: 'Blocked', icon: '🔴' };
    default:
      return { color: 'success', label: 'Unknown', icon: '⚪' };
  }
}

/**
 * Calculate overall stats from provider stats.
 */
export function calculateOverallStats(providers: ProviderStats[]): OverallStats {
  const totals = providers.reduce(
    (acc, p) => ({
      requests: acc.requests + p.totalRequests,
      success: acc.success + p.successCount,
      failures: acc.failures + p.failureCount,
    }),
    { requests: 0, success: 0, failures: 0 }
  );

  return {
    ...totals,
    successRate: totals.requests > 0 ? (totals.success / totals.requests) * 100 : 100,
  };
}

/**
 * Get stats for a specific provider.
 */
export function getProviderStatsById(
  statsData: StatsResponse | undefined,
  providerId: string
): ProviderStats | undefined {
  return statsData?.providers.find(
    (s) => s.providerId === providerId || s.providerName.toLowerCase() === providerId.toLowerCase()
  );
}
