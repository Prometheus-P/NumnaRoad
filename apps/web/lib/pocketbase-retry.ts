/**
 * PocketBase Retry Logic
 *
 * Provides exponential backoff retry for PocketBase operations.
 * Ensures transient failures (network issues, temporary unavailability)
 * don't cause permanent data loss.
 *
 * Usage:
 * ```typescript
 * await withRetry(() => pb.collection('orders').update(id, data));
 * ```
 */

import { logger } from './logger';

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds (default: 100) */
  baseDelayMs?: number;
  /** Maximum delay cap in milliseconds (default: 5000) */
  maxDelayMs?: number;
  /** Jitter factor 0-1 to randomize delay (default: 0.2) */
  jitter?: number;
  /** Optional callback for logging retry attempts */
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
  /** Predicate to determine if error is retryable (default: true for network errors) */
  isRetryable?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'isRetryable'>> = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  jitter: 0.2,
};

/**
 * Default predicate for retryable errors.
 * Retries on network errors, timeouts, and 5xx server errors.
 */
function defaultIsRetryable(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Network errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('timeout') ||
    message.includes('socket hang up')
  ) {
    return true;
  }

  // PocketBase specific errors that might be transient
  if (
    message.includes('failed to fetch') ||
    message.includes('connection reset') ||
    message.includes('service unavailable')
  ) {
    return true;
  }

  // Check for HTTP status codes in error
  // Retry on 429 (rate limit), 502, 503, 504
  const statusMatch = message.match(/status[:\s]*(4\d\d|5\d\d)/i);
  if (statusMatch) {
    const status = parseInt(statusMatch[1], 10);
    return status === 429 || (status >= 500 && status <= 599);
  }

  // Don't retry validation errors (400), not found (404), auth errors (401, 403)
  return false;
}

/**
 * Calculate delay with exponential backoff and jitter.
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = options.baseDelayMs * Math.pow(2, attempt);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);

  // Add jitter to prevent thundering herd
  const jitterRange = cappedDelay * options.jitter;
  const jitter = Math.random() * jitterRange * 2 - jitterRange;

  return Math.max(0, Math.round(cappedDelay + jitter));
}

/**
 * Sleep for specified milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an operation with exponential backoff retry.
 *
 * @param operation - The async operation to execute
 * @param options - Retry configuration options
 * @returns The result of the operation
 * @throws The last error if all retries are exhausted
 *
 * @example
 * ```typescript
 * // Basic usage
 * const order = await withRetry(() =>
 *   pb.collection('orders').getOne(orderId)
 * );
 *
 * // With custom options
 * const order = await withRetry(
 *   () => pb.collection('orders').update(orderId, data),
 *   {
 *     maxRetries: 5,
 *     baseDelayMs: 200,
 *     onRetry: (attempt, error, delay) => {
 *       console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`);
 *     },
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts: Required<RetryOptions> = {
    ...DEFAULT_OPTIONS,
    onRetry: options?.onRetry || (() => {}),
    isRetryable: options?.isRetryable || defaultIsRetryable,
    ...options,
  } as Required<RetryOptions>;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt >= opts.maxRetries || !opts.isRetryable(lastError)) {
        throw lastError;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, opts);
      opts.onRetry(attempt + 1, lastError, delay);

      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry failed');
}

/**
 * Create a retry wrapper with preset options.
 * Useful for creating a consistent retry policy across the application.
 *
 * @example
 * ```typescript
 * const pbRetry = createRetryWrapper({
 *   maxRetries: 3,
 *   onRetry: (attempt, error) => {
 *     console.warn(`PocketBase retry ${attempt}: ${error.message}`);
 *   },
 * });
 *
 * // Use the wrapper
 * const order = await pbRetry(() => pb.collection('orders').getOne(id));
 * ```
 */
export function createRetryWrapper(defaultOptions: RetryOptions) {
  return <T>(operation: () => Promise<T>, additionalOptions?: RetryOptions): Promise<T> => {
    return withRetry(operation, { ...defaultOptions, ...additionalOptions });
  };
}

/**
 * Pre-configured retry wrapper for PocketBase operations.
 * Uses sensible defaults with logging.
 */
export const pbRetry = createRetryWrapper({
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 3000,
  onRetry: (attempt, error, delay) => {
    logger.warn('pocketbase_retry', {
      attempt,
      error: error.message,
      delayMs: delay,
    });
  },
});
