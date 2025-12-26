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
  type FailoverMetadata,
  type FailoverOptions,
  // Type guards and helper types
  type SuccessfulFailoverResult,
  type FailedFailoverResult,
  type ManualPendingFailoverResult,
  isSuccessfulResult,
  isFailedResult,
  isManualPendingResult,
} from './provider-factory';

// Import providers to register them
import './esimcard';
import './mobimatter';
import './airalo';
import './redteago';
import './manual';

// Export manual provider and helpers
export {
  ManualProvider,
  isManualFulfillmentPending,
  type ManualPurchaseRequest,
} from './manual';

// Export RedteaGO provider
export { RedteaGOProvider } from './redteago';
