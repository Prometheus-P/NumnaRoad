/**
 * Persistent Circuit Breaker State Store
 *
 * Stores circuit breaker states in PocketBase for persistence across
 * server restarts and sharing across multiple instances.
 *
 * Features:
 * - PocketBase persistence for durability
 * - Local cache with 5-second TTL to minimize DB reads
 * - Graceful fallback to in-memory if DB unavailable
 *
 * Task: T062 (Phase 3 - ARCH-001)
 */

import type { CircuitState } from './provider-factory';

// =============================================================================
// Types
// =============================================================================

export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastStateChange: number;
}

interface CachedState {
  state: CircuitBreakerState;
  cachedAt: number;
}

interface PocketBaseRecord {
  id: string;
  provider_slug: string;
  state: CircuitState;
  failure_count: number;
  success_count: number;
  last_failure_time: string | null;
  last_state_change: string;
}

// =============================================================================
// Configuration
// =============================================================================

const CACHE_TTL_MS = 5000; // 5 seconds local cache

// =============================================================================
// State Management
// =============================================================================

/** In-memory cache for circuit breaker states */
const stateCache = new Map<string, CachedState>();

/** In-memory fallback when DB is unavailable */
const fallbackStates = new Map<string, CircuitBreakerState>();

/** Track if DB is available */
let dbAvailable = true;
let lastDbCheck = 0;
const DB_CHECK_INTERVAL = 30000; // 30 seconds

// =============================================================================
// Default State
// =============================================================================

function createDefaultState(): CircuitBreakerState {
  return {
    state: 'closed',
    failureCount: 0,
    successCount: 0,
    lastFailureTime: null,
    lastStateChange: Date.now(),
  };
}

// =============================================================================
// PocketBase Integration
// =============================================================================

/**
 * Dynamic import of PocketBase to avoid circular dependencies
 * Uses dynamic import to work in both Next.js and test environments
 */
async function getAdminPb() {
  // Dynamic import to avoid initialization issues
  // Path alias @/lib maps to apps/web/lib per tsconfig.json
  const pocketbaseModule = await import('@/lib/pocketbase');
  return pocketbaseModule.getAdminPocketBase();
}

/**
 * Load state from PocketBase
 */
async function loadFromDb(providerSlug: string): Promise<CircuitBreakerState | null> {
  try {
    const pb = await getAdminPb();
    const record = await pb
      .collection('circuit_breaker_states')
      .getFirstListItem<PocketBaseRecord>(`provider_slug="${providerSlug}"`);

    return {
      state: record.state,
      failureCount: record.failure_count,
      successCount: record.success_count,
      lastFailureTime: record.last_failure_time
        ? new Date(record.last_failure_time).getTime()
        : null,
      lastStateChange: new Date(record.last_state_change).getTime(),
    };
  } catch (error) {
    // Record not found is expected for new providers
    if (error instanceof Error && error.message.includes('no rows')) {
      return null;
    }
    // Other errors mean DB might be unavailable
    console.error(`[CircuitBreaker] Failed to load state for ${providerSlug}:`, error);
    dbAvailable = false;
    lastDbCheck = Date.now();
    return null;
  }
}

/**
 * Save state to PocketBase
 */
async function saveToDb(providerSlug: string, state: CircuitBreakerState): Promise<boolean> {
  try {
    const pb = await getAdminPb();
    const data = {
      provider_slug: providerSlug,
      state: state.state,
      failure_count: state.failureCount,
      success_count: state.successCount,
      last_failure_time: state.lastFailureTime
        ? new Date(state.lastFailureTime).toISOString()
        : null,
      last_state_change: new Date(state.lastStateChange).toISOString(),
    };

    // Try to find existing record
    try {
      const existing = await pb
        .collection('circuit_breaker_states')
        .getFirstListItem<PocketBaseRecord>(`provider_slug="${providerSlug}"`);

      await pb.collection('circuit_breaker_states').update(existing.id, data);
    } catch {
      // Create new record if not found
      await pb.collection('circuit_breaker_states').create(data);
    }

    dbAvailable = true;
    return true;
  } catch (error) {
    console.error(`[CircuitBreaker] Failed to save state for ${providerSlug}:`, error);
    dbAvailable = false;
    lastDbCheck = Date.now();
    return false;
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get circuit breaker state for a provider
 *
 * Uses local cache if available and fresh, otherwise loads from DB.
 * Falls back to in-memory state if DB is unavailable.
 */
export async function getCircuitState(providerSlug: string): Promise<CircuitBreakerState> {
  // Check local cache first
  const cached = stateCache.get(providerSlug);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.state;
  }

  // Check if we should retry DB
  if (!dbAvailable && Date.now() - lastDbCheck > DB_CHECK_INTERVAL) {
    dbAvailable = true; // Reset to try again
  }

  // Try loading from DB if available
  if (dbAvailable) {
    const dbState = await loadFromDb(providerSlug);
    if (dbState) {
      stateCache.set(providerSlug, { state: dbState, cachedAt: Date.now() });
      return dbState;
    }
  }

  // Fall back to in-memory state
  let fallbackState = fallbackStates.get(providerSlug);
  if (!fallbackState) {
    fallbackState = createDefaultState();
    fallbackStates.set(providerSlug, fallbackState);
  }

  // Cache the fallback state
  stateCache.set(providerSlug, { state: fallbackState, cachedAt: Date.now() });
  return fallbackState;
}

/**
 * Update circuit breaker state for a provider
 *
 * Updates local cache immediately and persists to DB asynchronously.
 */
export async function updateCircuitState(
  providerSlug: string,
  state: CircuitBreakerState
): Promise<void> {
  // Update local cache immediately
  stateCache.set(providerSlug, { state, cachedAt: Date.now() });
  fallbackStates.set(providerSlug, state);

  // Persist to DB (fire-and-forget, but log errors)
  if (dbAvailable) {
    saveToDb(providerSlug, state).catch((error) => {
      console.error(`[CircuitBreaker] Async save failed for ${providerSlug}:`, error);
    });
  }
}

/**
 * Reset circuit breaker state for a provider
 */
export async function resetCircuitState(providerSlug: string): Promise<void> {
  const defaultState = createDefaultState();
  await updateCircuitState(providerSlug, defaultState);
}

/**
 * Reset all circuit breaker states
 */
export async function resetAllCircuitStates(): Promise<void> {
  stateCache.clear();
  fallbackStates.clear();

  if (dbAvailable) {
    try {
      const pb = await getAdminPb();
      const records = await pb.collection('circuit_breaker_states').getFullList<PocketBaseRecord>();

      await Promise.all(
        records.map((record) =>
          pb.collection('circuit_breaker_states').delete(record.id)
        )
      );
    } catch (error) {
      console.error('[CircuitBreaker] Failed to reset all states in DB:', error);
    }
  }
}

/**
 * Get all circuit breaker states (for monitoring)
 */
export async function getAllCircuitStates(): Promise<Record<string, CircuitBreakerState>> {
  const result: Record<string, CircuitBreakerState> = {};

  if (dbAvailable) {
    try {
      const pb = await getAdminPb();
      const records = await pb.collection('circuit_breaker_states').getFullList<PocketBaseRecord>();

      for (const record of records) {
        result[record.provider_slug] = {
          state: record.state,
          failureCount: record.failure_count,
          successCount: record.success_count,
          lastFailureTime: record.last_failure_time
            ? new Date(record.last_failure_time).getTime()
            : null,
          lastStateChange: new Date(record.last_state_change).getTime(),
        };
      }
    } catch (error) {
      console.error('[CircuitBreaker] Failed to get all states:', error);
    }
  }

  // Include any in-memory states not in DB
  Array.from(fallbackStates.entries()).forEach(([slug, state]) => {
    if (!result[slug]) {
      result[slug] = state;
    }
  });

  return result;
}

/**
 * Check if DB is currently available
 */
export function isDbAvailable(): boolean {
  return dbAvailable;
}
