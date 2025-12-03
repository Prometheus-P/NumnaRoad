/**
 * eSIM Provider Services
 *
 * Entry point for all eSIM provider functionality.
 */

// Export types
export * from './types';

// Export factory and utilities
export {
  BaseProvider,
  registerProvider,
  createProvider,
  sortProvidersByPriority,
  filterActiveProviders,
  getProvidersInFailoverOrder,
  calculateBackoffDelay,
  calculateBackoffDelayWithJitter,
  retryWithBackoff,
  isRetryableError,
  purchaseWithFailover,
  type FailoverEvent,
  type FailoverResult,
  type FailoverOptions,
} from './provider-factory';

// Import providers to register them
import './esimcard';
import './mobimatter';
import './airalo';
