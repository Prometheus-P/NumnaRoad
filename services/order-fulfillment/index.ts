/**
 * Order Fulfillment Service Module
 *
 * Provides order fulfillment with:
 * - State machine for order lifecycle
 * - Provider failover orchestration
 * - Email notifications
 * - Discord alerts
 */

// Export types
export * from './types';

// Export state machine
export {
  OrderStateMachine,
  createOrderStateMachine,
  isValidOrderState,
  getStateDescription,
  getNextStates,
  type StatePersistFn,
  type StateLoadFn,
  type StateMachineConfig,
} from './state-machine';

// Export fulfillment service
export {
  FulfillmentService,
  createFulfillmentService,
  fulfillWithTimeout,
  isTimeoutResult,
  type EmailSendFn,
  type FulfillmentServiceConfig,
  type TimeoutResult,
} from './fulfillment-service';
