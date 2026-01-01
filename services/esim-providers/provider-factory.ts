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

/**
 * Purchase with multi-provider failover
 *
 * Tries each provider in priority order with retry logic.
 * Fails over to next provider on non-retryable errors or after max retries.
 */
export async function purchaseWithFailover(
  providers: EsimProvider[],
  request: EsimPurchaseRequest,
  options?: FailoverOptions
): Promise<FailoverResult> {
  const orderedProviders = getProvidersInFailoverOrder(providers);

  if (orderedProviders.length === 0) {
    return {
      success: false,
      errorType: 'provider_error',
      errorMessage: 'No active providers available',
      isRetryable: false,
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
      return {
        ...result,
        providerUsed: providerConfig.slug,
        attemptedProviders,
        failoverEvents,
        failureReasons,
      };
    }

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
