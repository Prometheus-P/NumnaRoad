/**
 * Order State Machine Service
 *
 * Manages order state transitions with validation.
 * Ensures only valid state transitions are allowed.
 *
 * Tasks: Part 1 - Task 1.2
 */

import type {
  OrderState,
  StateTransitionMetadata,
  StateTransitionEvent,
  TransitionResult,
} from './types';
import { STATE_TRANSITIONS, TERMINAL_STATES, ALERT_STATES } from './types';
import {
  notifyOrderFailure,
  notifyCustom,
  isDiscordConfigured,
} from '../notifications';
import { logger } from '../logger';

// =============================================================================
// Types
// =============================================================================

/**
 * Function to persist state changes to the database
 */
export type StatePersistFn = (
  orderId: string,
  newState: OrderState,
  metadata?: StateTransitionMetadata
) => Promise<void>;

/**
 * Function to fetch current order state from database
 */
export type StateLoadFn = (orderId: string) => Promise<OrderState>;

/**
 * State machine configuration
 */
export interface StateMachineConfig {
  persistFn: StatePersistFn;
  loadFn: StateLoadFn;
  enableAlerts?: boolean;
}

// =============================================================================
// State Machine Class
// =============================================================================

/**
 * Order State Machine
 *
 * Manages state transitions with:
 * - Validation of allowed transitions
 * - Automatic Discord alerts for failure states
 * - Event logging
 *
 * Usage:
 * ```typescript
 * const machine = new OrderStateMachine({
 *   persistFn: async (orderId, state, meta) => { ... },
 *   loadFn: async (orderId) => { ... },
 * });
 *
 * await machine.transition(orderId, correlationId, 'fulfillment_started');
 * ```
 */
export class OrderStateMachine {
  private config: StateMachineConfig;
  private eventLog: StateTransitionEvent[] = [];

  constructor(config: StateMachineConfig) {
    this.config = {
      ...config,
      enableAlerts: config.enableAlerts ?? true,
    };
  }

  /**
   * Transition an order to a new state
   *
   * @param orderId - Order ID
   * @param correlationId - Correlation ID for tracing
   * @param newState - Target state
   * @param metadata - Optional metadata for the transition
   * @returns Transition result
   */
  async transition(
    orderId: string,
    correlationId: string,
    newState: OrderState,
    metadata?: StateTransitionMetadata
  ): Promise<TransitionResult> {
    // Load current state
    const currentState = await this.config.loadFn(orderId);

    // Validate transition
    if (!this.isValidTransition(currentState, newState)) {
      return {
        success: false,
        previousState: currentState,
        currentState: currentState,
        error: `Invalid transition from '${currentState}' to '${newState}'`,
      };
    }

    // Persist new state
    try {
      await this.config.persistFn(orderId, newState, metadata);
    } catch (error) {
      return {
        success: false,
        previousState: currentState,
        currentState: currentState,
        error: `Failed to persist state: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    // Log event
    const event: StateTransitionEvent = {
      orderId,
      fromState: currentState,
      toState: newState,
      metadata,
      timestamp: new Date().toISOString(),
      correlationId,
    };
    this.eventLog.push(event);

    // Send alerts for failure states
    if (this.config.enableAlerts && ALERT_STATES.includes(newState)) {
      await this.sendAlert(orderId, correlationId, newState, metadata);
    }

    return {
      success: true,
      previousState: currentState,
      currentState: newState,
    };
  }

  /**
   * Check if a transition is valid
   *
   * @param fromState - Current state
   * @param toState - Target state
   * @returns True if transition is allowed
   */
  isValidTransition(fromState: OrderState, toState: OrderState): boolean {
    // Cannot transition from terminal states
    if (TERMINAL_STATES.includes(fromState)) {
      return false;
    }

    // Check allowed transitions
    const allowedTransitions = STATE_TRANSITIONS[fromState];
    return allowedTransitions?.includes(toState) ?? false;
  }

  /**
   * Check if an order is in a terminal state
   *
   * @param state - State to check
   * @returns True if terminal
   */
  isTerminalState(state: OrderState): boolean {
    return TERMINAL_STATES.includes(state);
  }

  /**
   * Check if an order requires alert
   *
   * @param state - State to check
   * @returns True if alert needed
   */
  isAlertState(state: OrderState): boolean {
    return ALERT_STATES.includes(state);
  }

  /**
   * Get the event log
   *
   * @returns Array of transition events
   */
  getEventLog(): StateTransitionEvent[] {
    return [...this.eventLog];
  }

  /**
   * Clear the event log
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Send alert for failure states
   */
  private async sendAlert(
    orderId: string,
    correlationId: string,
    state: OrderState,
    metadata?: StateTransitionMetadata
  ): Promise<void> {
    if (!isDiscordConfigured()) {
      logger.warn('alert_skipped_discord_not_configured', { orderId, state });
      return;
    }

    try {
      if (state === 'provider_failed' || state === 'failed') {
        await notifyOrderFailure({
          orderId,
          correlationId,
          customerEmail: 'unknown', // Will be filled by caller
          productId: 'unknown', // Will be filled by caller
          errorMessage: metadata?.errorMessage ?? 'Unknown error',
          errorType: metadata?.errorType ?? 'unknown',
          attemptedProviders: metadata?.attemptedProviders ?? [],
          totalRetries: metadata?.totalRetries ?? 0,
          timestamp: new Date().toISOString(),
        });
      } else if (state === 'refund_needed') {
        await notifyCustom(
          '💰 Refund Required',
          `Order ${orderId} requires manual refund.\nReason: ${metadata?.reason ?? 'Provider fulfillment failed'}`,
          'warning'
        );
      }
    } catch (error) {
      logger.error('alert_send_failed', error, { orderId, state });
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new order state machine
 *
 * @param config - State machine configuration
 * @returns Configured state machine
 */
export function createOrderStateMachine(
  config: StateMachineConfig
): OrderStateMachine {
  return new OrderStateMachine(config);
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Validate that a state string is a valid OrderState
 */
export function isValidOrderState(state: string): state is OrderState {
  const validStates: OrderState[] = [
    'pending',
    'processing',
    'payment_received',
    'fulfillment_started',
    'provider_confirmed',
    'email_sent',
    'delivered',
    'provider_failed',
    'refund_needed',
    'completed',
    'failed',
    'refunded',
  ];
  return validStates.includes(state as OrderState);
}

/**
 * Get human-readable state description
 */
export function getStateDescription(state: OrderState): string {
  const descriptions: Record<OrderState, string> = {
    pending: 'Order created, awaiting payment',
    processing: 'Order is being processed',
    payment_received: 'Payment confirmed, ready for fulfillment',
    awaiting_confirmation: 'Waiting for customer purchase confirmation',
    fulfillment_started: 'eSIM purchase in progress',
    provider_confirmed: 'eSIM received from provider',
    email_sent: 'Confirmation email sent to customer',
    delivered: 'Order successfully delivered',
    provider_failed: 'All provider attempts failed',
    pending_manual_fulfillment: 'Awaiting manual fulfillment by staff',
    refund_needed: 'Order requires refund',
    completed: 'Order completed successfully',
    failed: 'Order failed',
    refunded: 'Refund processed',
  };
  return descriptions[state] ?? 'Unknown state';
}

/**
 * Get next expected state(s) for an order
 */
export function getNextStates(currentState: OrderState): OrderState[] {
  return STATE_TRANSITIONS[currentState] ?? [];
}
