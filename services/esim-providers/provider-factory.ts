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

// =============================================================================
// Legacy Provider Types (for backward compatibility)
// =============================================================================

/**
 * Legacy ESIMResponse type for provider implementations
 */
export interface ESIMResponse {
  orderId: string;
  qrCodeUrl: string;
  activationCode?: string;
  iccid: string;
  provider: string;
}

/**
 * Legacy Product type for provider implementations
 */
export interface Product {
  id: string;
  name: string;
  country: string;
  duration: number;
  dataLimit: string;
  price: number;
}

/**
 * Legacy ESIMProvider interface for provider implementations
 */
export interface ESIMProvider {
  readonly name: string;
  issueESIM(productId: string, email: string): Promise<ESIMResponse>;
  getInventory(productId: string): Promise<number>;
  getProducts(): Promise<Product[]>;
}

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
 * Failover result metadata
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
 * Circuit breaker state for a single provider
 */
interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastStateChange: number;
}

/**
 * In-memory circuit breaker state store
 * Key: provider slug
 */
const circuitBreakers = new Map<string, CircuitBreakerState>();

/**
 * Get or create circuit breaker state for a provider
 */
function getCircuitState(providerSlug: string): CircuitBreakerState {
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
 * Record a successful call for a provider
 */
export function recordSuccess(
  providerSlug: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): CircuitState {
  const state = getCircuitState(providerSlug);

  if (state.state === 'half-open') {
    state.successCount++;
    if (state.successCount >= config.successThreshold) {
      // Close the circuit
      state.state = 'closed';
      state.failureCount = 0;
      state.successCount = 0;
      state.lastStateChange = Date.now();
    }
  } else if (state.state === 'closed') {
    // Reset failure count on success
    state.failureCount = 0;
  }

  return state.state;
}

/**
 * Record a failed call for a provider
 */
export function recordFailure(
  providerSlug: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): CircuitState {
  const state = getCircuitState(providerSlug);

  state.failureCount++;
  state.lastFailureTime = Date.now();

  if (state.state === 'half-open') {
    // Any failure in half-open immediately opens the circuit
    state.state = 'open';
    state.successCount = 0;
    state.lastStateChange = Date.now();
  } else if (state.state === 'closed') {
    if (state.failureCount >= config.failureThreshold) {
      state.state = 'open';
      state.lastStateChange = Date.now();
    }
  }

  return state.state;
}

/**
 * Check if a provider's circuit allows calls
 */
export function isCircuitClosed(
  providerSlug: string,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): boolean {
  const state = getCircuitState(providerSlug);

  // Check for automatic transition from open to half-open
  if (shouldAttemptReset(state, config)) {
    state.state = 'half-open';
    state.successCount = 0;
    state.lastStateChange = Date.now();
  }

  return state.state !== 'open';
}

/**
 * Get current circuit state for a provider
 */
export function getCircuitBreakerState(providerSlug: string): CircuitState {
  return getCircuitState(providerSlug).state;
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
  const state = getCircuitState(providerSlug);
  return {
    state: state.state,
    failureCount: state.failureCount,
    successCount: state.successCount,
    lastFailureTime: state.lastFailureTime,
  };
}

/**
 * Reset circuit breaker for a provider (for testing)
 */
export function resetCircuitBreaker(providerSlug: string): void {
  circuitBreakers.delete(providerSlug);
}

/**
 * Reset all circuit breakers (for testing)
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakers.clear();
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
