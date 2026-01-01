/**
 * eSIM Provider Factory
 *
 * Base interface and factory for eSIM provider adapters.
 * Handles provider instantiation and priority-based selection.
 *
 * Task: T025
 */

import type {
  EsimProviderAdapter,
  EsimProvider,
  EsimPurchaseRequest,
  EsimPurchaseResult,
  ProviderSlug,
} from './types';

// Re-export commonly used types for convenience
export type { EsimPurchaseRequest, EsimPurchaseResult, EsimProvider, ProviderSlug } from './types';

/**
 * Base class for eSIM provider adapters
 *
 * Provides common functionality for all providers:
 * - API key retrieval
 * - Timeout handling
 * - Error classification
 */
export abstract class BaseProvider implements EsimProviderAdapter {
  abstract readonly slug: ProviderSlug;

  protected readonly config: EsimProvider;
  protected apiKey: string = '';

  constructor(config: EsimProvider) {
    this.config = config;
    // API key loaded lazily to avoid circular dependency
  }

  /**
   * Initialize API key from environment
   */
  protected loadApiKey(): string {
    if (!this.apiKey) {
      const value = process.env[this.config.apiKeyEnvVar];
      if (!value) {
        throw new Error(`Missing provider API key: ${this.config.apiKeyEnvVar}`);
      }
      this.apiKey = value;
    }
    return this.apiKey;
  }

  abstract purchase(request: EsimPurchaseRequest): Promise<EsimPurchaseResult>;

  abstract healthCheck(): Promise<boolean>;

  /**
   * Make HTTP request with timeout
   */
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs
    );

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get base API URL
   */
  protected get baseUrl(): string {
    return this.config.apiEndpoint;
  }
}

/**
 * Provider registry - maps slugs to adapter constructors
 */
type ProviderConstructor = new (config: EsimProvider) => EsimProviderAdapter;

const providerRegistry = new Map<ProviderSlug, ProviderConstructor>();

/**
 * Register a provider adapter constructor
 */
export function registerProvider(
  slug: ProviderSlug,
  constructor: ProviderConstructor
): void {
  providerRegistry.set(slug, constructor);
}

/**
 * Create provider adapter instance from config
 */
export function createProvider(config: EsimProvider): EsimProviderAdapter {
  const Constructor = providerRegistry.get(config.slug);

  if (!Constructor) {
    throw new Error(`No adapter registered for provider: ${config.slug}`);
  }

  return new Constructor(config);
}

/**
 * Get providers sorted by priority (highest first)
 */
export function sortProvidersByPriority(
  providers: EsimProvider[]
): EsimProvider[] {
  return [...providers].sort((a, b) => b.priority - a.priority);
}

/**
 * Get active providers only
 */
export function filterActiveProviders(
  providers: EsimProvider[]
): EsimProvider[] {
  return providers.filter((p) => p.isActive);
}

/**
 * Get providers in failover order (highest priority, active only)
 */
export function getProvidersInFailoverOrder(
  providers: EsimProvider[]
): EsimProvider[] {
  return sortProvidersByPriority(filterActiveProviders(providers));
}

// =============================================================================
// Exponential Backoff and Retry Logic (T038)
// =============================================================================

const DEFAULT_BASE_DELAY = 1000; // 1 second
const DEFAULT_MAX_DELAY = 30000; // 30 seconds

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number = DEFAULT_BASE_DELAY,
  maxDelay: number = DEFAULT_MAX_DELAY
): number {
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Calculate backoff delay with jitter (±30%)
 */
export function calculateBackoffDelayWithJitter(
  attempt: number,
  baseDelay: number = DEFAULT_BASE_DELAY,
  maxDelay: number = DEFAULT_MAX_DELAY
): number {
  const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay);
  const jitter = (Math.random() - 0.5) * 0.6 * delay; // ±30%
  return Math.max(0, Math.floor(delay + jitter));
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a provider purchase with exponential backoff
 */
export async function retryWithBackoff(
  adapter: EsimProviderAdapter,
  request: EsimPurchaseRequest,
  maxRetries: number,
  onRetry?: (attempt: number, error: EsimPurchaseResult) => void
): Promise<EsimPurchaseResult> {
  let lastResult: EsimPurchaseResult | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await adapter.purchase(request);

    if (result.success) {
      return result;
    }

    lastResult = result;

    // Don't retry non-retryable errors
    if (!result.isRetryable) {
      return result;
    }

    // Don't sleep after last attempt
    if (attempt < maxRetries) {
      const delay = calculateBackoffDelayWithJitter(attempt);
      onRetry?.(attempt, result);
      await sleep(delay);
    }
  }

  return lastResult!;
}

// =============================================================================
// Error Classification (T039)
// =============================================================================

import { isRetryableError as isRetryableErrorType } from './types';

/**
 * Re-export for convenience
 */
export const isRetryableError = isRetryableErrorType;

// =============================================================================
// Provider Cascade Failover (T040)
// =============================================================================

/**
 * Failover event for logging
 */
export interface FailoverEvent {
  fromProvider: string;
  toProvider: string;
  reason: string;
  attempt: number;
}

/**
 * Failover metadata added to purchase results
 */
export interface FailoverMetadata {
  providerUsed?: string;
  attemptedProviders: string[];
  failoverEvents: FailoverEvent[];
  failureReasons: Record<string, string>;
}

/**
 * Failover result with metadata
 */
export type FailoverResult = EsimPurchaseResult & FailoverMetadata;

/**
 * Failover options
 */
export interface FailoverOptions {
  onFailover?: (event: FailoverEvent) => void;
  onAllFailed?: (result: FailoverResult) => void;
}

// =============================================================================
// Circuit Breaker (T062, FR-011, FR-012)
// =============================================================================

import {
  getCircuitState as getPersistedState,
  updateCircuitState as persistState,
  resetCircuitState,
  resetAllCircuitStates,
  getAllCircuitStates,
  type CircuitBreakerState,
} from './circuit-breaker-store';

/**
 * Circuit breaker states
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker configuration per FR-011
 */
export interface CircuitBreakerConfig {
  /** Number of consecutive failures to open circuit (default: 5) */
  failureThreshold: number;
  /** Time in ms before attempting half-open (default: 30000) */
  resetTimeout: number;
  /** Number of successes in half-open to close circuit (default: 2) */
  successThreshold: number;
}

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000,
  successThreshold: 2,
};

/**
 * In-memory circuit breaker state store for sync access
 * Used as a fast-path cache; persistent store is source of truth
 */
const circuitBreakers = new Map<string, CircuitBreakerState>();

/**
 * Get circuit breaker state (sync version for backwards compatibility)
 * Uses local cache, async version updates from persistent store
 */
function getCircuitStateSync(providerSlug: string): CircuitBreakerState {
  if (!circuitBreakers.has(providerSlug)) {
    circuitBreakers.set(providerSlug, {
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      lastStateChange: Date.now(),
    });
  }
  return circuitBreakers.get(providerSlug)!;
}

/**
 * Load circuit breaker state from persistent store (async)
 */
async function loadCircuitState(providerSlug: string): Promise<CircuitBreakerState> {
  const state = await getPersistedState(providerSlug);
  circuitBreakers.set(providerSlug, state);
  return state;
}

/**
 * Save circuit breaker state to persistent store
 */
async function saveCircuitState(providerSlug: string, state: CircuitBreakerState): Promise<void> {
  circuitBreakers.set(providerSlug, state);
  await persistState(providerSlug, state);
}

/**
 * Check if circuit should transition from open to half-open
 */
function shouldAttemptReset(
  state: CircuitBreakerState,
  config: CircuitBreakerConfig
): boolean {
  if (state.state !== 'open') return false;
  if (!state.lastFailureTime) return false;

  const elapsed = Date.now() - state.lastFailureTime;
  return elapsed >= config.resetTimeout;
}

/**
 * Record a successful call for a provider (async version)
 * Updates both local cache and persistent store
 */
export async function recordSuccessAsync(
  providerSlug: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): Promise<CircuitState> {
  const state = await loadCircuitState(providerSlug);

  if (state.state === 'half-open') {
    state.successCount++;
    if (state.successCount >= config.successThreshold) {
      state.state = 'closed';
      state.failureCount = 0;
      state.successCount = 0;
      state.lastStateChange = Date.now();
    }
  } else if (state.state === 'closed') {
    state.failureCount = 0;
  }

  await saveCircuitState(providerSlug, state);
  return state.state;
}

/**
 * Record a failed call for a provider (async version)
 * Updates both local cache and persistent store
 */
export async function recordFailureAsync(
  providerSlug: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): Promise<CircuitState> {
  const state = await loadCircuitState(providerSlug);

  state.failureCount++;
  state.lastFailureTime = Date.now();

  if (state.state === 'half-open') {
    state.state = 'open';
    state.successCount = 0;
    state.lastStateChange = Date.now();
  } else if (state.state === 'closed') {
    if (state.failureCount >= config.failureThreshold) {
      state.state = 'open';
      state.lastStateChange = Date.now();
    }
  }

  await saveCircuitState(providerSlug, state);
  return state.state;
}

/**
 * Check if a provider's circuit allows calls (async version)
 */
export async function isCircuitClosedAsync(
  providerSlug: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): Promise<boolean> {
  const state = await loadCircuitState(providerSlug);

  if (shouldAttemptReset(state, config)) {
    state.state = 'half-open';
    state.successCount = 0;
    state.lastStateChange = Date.now();
    await saveCircuitState(providerSlug, state);
  }

  return state.state !== 'open';
}

/**
 * Record a successful call for a provider (sync version for backwards compatibility)
 * @deprecated Use recordSuccessAsync for persistent state
 */
export function recordSuccess(
  providerSlug: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): CircuitState {
  const state = getCircuitStateSync(providerSlug);

  if (state.state === 'half-open') {
    state.successCount++;
    if (state.successCount >= config.successThreshold) {
      state.state = 'closed';
      state.failureCount = 0;
      state.successCount = 0;
      state.lastStateChange = Date.now();
    }
  } else if (state.state === 'closed') {
    state.failureCount = 0;
  }

  // Fire-and-forget persist
  persistState(providerSlug, state).catch((err) => {
    console.error(`[CircuitBreaker] Failed to persist success for ${providerSlug}:`, err);
  });

  return state.state;
}

/**
 * Record a failed call for a provider (sync version for backwards compatibility)
 * @deprecated Use recordFailureAsync for persistent state
 */
export function recordFailure(
  providerSlug: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): CircuitState {
  const state = getCircuitStateSync(providerSlug);

  state.failureCount++;
  state.lastFailureTime = Date.now();

  if (state.state === 'half-open') {
    state.state = 'open';
    state.successCount = 0;
    state.lastStateChange = Date.now();
  } else if (state.state === 'closed') {
    if (state.failureCount >= config.failureThreshold) {
      state.state = 'open';
      state.lastStateChange = Date.now();
    }
  }

  // Fire-and-forget persist
  persistState(providerSlug, state).catch((err) => {
    console.error(`[CircuitBreaker] Failed to persist failure for ${providerSlug}:`, err);
  });

  return state.state;
}

/**
 * Check if a provider's circuit allows calls (sync version)
 * @deprecated Use isCircuitClosedAsync for persistent state
 */
export function isCircuitClosed(
  providerSlug: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): boolean {
  const state = getCircuitStateSync(providerSlug);

  if (shouldAttemptReset(state, config)) {
    state.state = 'half-open';
    state.successCount = 0;
    state.lastStateChange = Date.now();

    // Fire-and-forget persist
    persistState(providerSlug, state).catch((err) => {
      console.error(`[CircuitBreaker] Failed to persist half-open for ${providerSlug}:`, err);
    });
  }

  return state.state !== 'open';
}

/**
 * Get current circuit state for a provider
 */
export function getCircuitBreakerState(providerSlug: string): CircuitState {
  return getCircuitStateSync(providerSlug).state;
}

/**
 * Get full circuit breaker info for a provider
 */
export function getCircuitBreakerInfo(providerSlug: string): {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
} {
  const state = getCircuitStateSync(providerSlug);
  return {
    state: state.state,
    failureCount: state.failureCount,
    successCount: state.successCount,
    lastFailureTime: state.lastFailureTime,
  };
}

/**
 * Get all circuit breaker states from persistent store (async)
 */
export async function getAllCircuitBreakerStates(): Promise<Record<string, CircuitBreakerState>> {
  return getAllCircuitStates();
}

/**
 * Reset circuit breaker for a provider
 */
export function resetCircuitBreaker(providerSlug: string): void {
  circuitBreakers.delete(providerSlug);
  resetCircuitState(providerSlug).catch((err) => {
    console.error(`[CircuitBreaker] Failed to reset state for ${providerSlug}:`, err);
  });
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakers.clear();
  resetAllCircuitStates().catch((err) => {
    console.error('[CircuitBreaker] Failed to reset all states:', err);
  });
}

/**
 * Filter providers that have closed or half-open circuits
 * Per FR-012: skip providers with open circuits during failover
 */
export function filterByCircuitState(
  providers: EsimProvider[],
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): EsimProvider[] {
  return providers.filter((p) => isCircuitClosed(p.slug, config));
}

/**
 * Filter providers that have closed or half-open circuits (async version)
 * Per FR-012: skip providers with open circuits during failover
 */
export async function filterByCircuitStateAsync(
  providers: EsimProvider[],
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): Promise<EsimProvider[]> {
  const results = await Promise.all(
    providers.map(async (p) => ({
      provider: p,
      allowed: await isCircuitClosedAsync(p.slug, config),
    }))
  );
  return results.filter((r) => r.allowed).map((r) => r.provider);
}

/**
 * Purchase with multi-provider failover
 *
 * Tries each provider in priority order with retry logic.
 * Fails over to next provider on non-retryable errors or after max retries.
 */
export async function purchaseWithFailover(
  providers: EsimProvider[],
  request: EsimPurchaseRequest,
  options?: FailoverOptions & { circuitBreakerConfig?: CircuitBreakerConfig }
): Promise<FailoverResult> {
  const activeProviders = getProvidersInFailoverOrder(providers);

  // FR-012: Filter out providers with open circuits
  const orderedProviders = filterByCircuitState(
    activeProviders,
    options?.circuitBreakerConfig
  );

  if (orderedProviders.length === 0) {
    // Check if we have active providers but all circuits are open
    const hasActiveButBlocked = activeProviders.length > 0;
    return {
      success: false,
      errorType: 'provider_error',
      errorMessage: hasActiveButBlocked
        ? 'All provider circuits are open'
        : 'No active providers available',
      isRetryable: hasActiveButBlocked, // Retry later if circuits might reset
      attemptedProviders: [],
      failoverEvents: [],
      failureReasons: {},
    };
  }

  const attemptedProviders: string[] = [];
  const failoverEvents: FailoverEvent[] = [];
  const failureReasons: Record<string, string> = {};

  for (let i = 0; i < orderedProviders.length; i++) {
    const providerConfig = orderedProviders[i];
    const adapter = createProvider(providerConfig);

    attemptedProviders.push(providerConfig.slug);

    // Try this provider with retries
    const result = await retryWithBackoff(
      adapter,
      request,
      providerConfig.maxRetries
    );

    if (result.success) {
      // Record success for circuit breaker
      recordSuccess(providerConfig.slug, options?.circuitBreakerConfig);
      return {
        ...result,
        providerUsed: providerConfig.slug,
        attemptedProviders,
        failoverEvents,
        failureReasons,
      };
    }

    // Record failure for circuit breaker
    recordFailure(providerConfig.slug, options?.circuitBreakerConfig);
    failureReasons[providerConfig.slug] = result.errorMessage;

    // Trigger failover to next provider
    const nextProvider = orderedProviders[i + 1];
    if (nextProvider) {
      const event: FailoverEvent = {
        fromProvider: providerConfig.slug,
        toProvider: nextProvider.slug,
        reason: result.errorMessage,
        attempt: i,
      };
      failoverEvents.push(event);
      options?.onFailover?.(event);
    }
  }

  // All providers failed
  const finalResult: FailoverResult = {
    success: false,
    errorType: 'provider_error',
    errorMessage: `All providers failed: ${Object.entries(failureReasons)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ')}`,
    isRetryable: false,
    attemptedProviders,
    failoverEvents,
    failureReasons,
  };

  options?.onAllFailed?.(finalResult);

  return finalResult;
}

// =============================================================================
// Type Guards and Helper Types
// =============================================================================

import type { EsimPurchaseResponse, EsimPurchaseError, EsimManualFulfillmentPending } from './types';

/**
 * Type for successful FailoverResult
 */
export type SuccessfulFailoverResult = EsimPurchaseResponse & FailoverMetadata;

/**
 * Type for failed FailoverResult
 */
export type FailedFailoverResult = EsimPurchaseError & FailoverMetadata;

/**
 * Type for manual fulfillment pending FailoverResult
 */
export type ManualPendingFailoverResult = EsimManualFulfillmentPending & FailoverMetadata;

/**
 * Type guard for successful purchase result
 */
export function isSuccessfulResult(result: FailoverResult): result is SuccessfulFailoverResult {
  return result.success === true;
}

/**
 * Type guard for failed purchase result
 */
export function isFailedResult(result: FailoverResult): result is FailedFailoverResult {
  return result.success === false;
}

/**
 * Type guard for manual fulfillment pending result
 */
export function isManualPendingResult(result: FailoverResult): result is ManualPendingFailoverResult {
  return result.success === 'pending_manual';
}
