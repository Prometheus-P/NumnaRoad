/**
 * Order Fulfillment Types
 *
 * Type definitions for the order fulfillment state machine and service.
 *
 * Tasks: Part 1 - Task 1.2, 1.3
 */

import type { ErrorType, EsimPurchaseResult } from '../esim-providers/types';

// =============================================================================
// Order State Types
// =============================================================================

/**
 * Extended order states for the fulfillment workflow
 *
 * State transitions:
 * payment_received -> fulfillment_started -> provider_confirmed -> email_sent -> delivered
 *                  \-> provider_failed -> refund_needed
 */
export type OrderState =
  | 'pending'            // Initial state (legacy)
  | 'processing'         // Legacy state
  | 'payment_received'   // Payment confirmed via Stripe webhook
  | 'fulfillment_started' // Provider call initiated
  | 'provider_confirmed' // eSIM received from provider
  | 'email_sent'         // Confirmation email sent
  | 'delivered'          // Final success state
  | 'provider_failed'    // All providers failed
  | 'pending_manual_fulfillment' // Awaiting manual fulfillment by staff
  | 'refund_needed'      // Marked for refund
  | 'completed'          // Legacy success state
  | 'failed'             // Legacy failure state
  | 'refunded';          // Refund processed

/**
 * Allowed state transitions
 */
export const STATE_TRANSITIONS: Record<OrderState, OrderState[]> = {
  pending: ['payment_received', 'processing', 'failed'],
  processing: ['fulfillment_started', 'completed', 'failed'],
  payment_received: ['fulfillment_started', 'failed'],
  fulfillment_started: ['provider_confirmed', 'provider_failed', 'pending_manual_fulfillment'],
  provider_confirmed: ['email_sent', 'delivered'],
  email_sent: ['delivered'],
  delivered: [], // Terminal state
  provider_failed: ['refund_needed', 'fulfillment_started', 'pending_manual_fulfillment'], // Can retry, refund, or manual
  pending_manual_fulfillment: ['provider_confirmed', 'refund_needed'], // Staff completes or refunds
  refund_needed: ['refunded'],
  completed: [], // Terminal legacy state
  failed: ['refund_needed', 'fulfillment_started'], // Can retry or refund
  refunded: [], // Terminal state
};

/**
 * Terminal states - no further transitions allowed
 */
export const TERMINAL_STATES: OrderState[] = ['delivered', 'completed', 'refunded'];

/**
 * States that require manual intervention
 */
export const ALERT_STATES: OrderState[] = ['provider_failed', 'pending_manual_fulfillment', 'refund_needed', 'failed'];

// =============================================================================
// State Transition Types
// =============================================================================

/**
 * Metadata for state transitions
 */
export interface StateTransitionMetadata {
  providerName?: string;
  errorMessage?: string;
  errorType?: ErrorType;
  qrCodeUrl?: string;
  iccid?: string;
  activationCode?: string;
  providerOrderId?: string;
  emailMessageId?: string;
  attemptedProviders?: string[];
  totalRetries?: number;
  reason?: string;
}

/**
 * State transition event
 */
export interface StateTransitionEvent {
  orderId: string;
  fromState: OrderState;
  toState: OrderState;
  metadata?: StateTransitionMetadata;
  timestamp: string;
  correlationId: string;
}

/**
 * Result of a state transition
 */
export interface TransitionResult {
  success: boolean;
  previousState: OrderState;
  currentState: OrderState;
  error?: string;
}

// =============================================================================
// Fulfillment Types
// =============================================================================

/**
 * Order data required for fulfillment
 */
export interface FulfillmentOrder {
  id: string;
  orderId: string;
  customerEmail: string;
  customerName?: string;
  productId: string;
  providerSku: string;
  amount: number;
  currency: string;
  status: OrderState;
  correlationId: string;
  stripePaymentIntent: string;
}

/**
 * Provider attempt record
 */
export interface ProviderAttempt {
  providerName: string;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
  errorType?: ErrorType;
  durationMs: number;
}

/**
 * Result of the fulfillment process
 */
export interface FulfillmentResult {
  success: boolean;
  orderId: string;
  finalState: OrderState;
  providerUsed?: string;
  attempts: ProviderAttempt[];
  esimData?: {
    qrCodeUrl: string;
    iccid: string;
    activationCode?: string;
    providerOrderId: string;
    directAppleInstallationUrl?: string;
  };
  emailSent?: boolean;
  emailMessageId?: string;
  error?: {
    message: string;
    type: ErrorType;
  };
  /** True if order is pending manual fulfillment by staff */
  pendingManualFulfillment?: boolean;
  /** Discord notification sent for manual fulfillment */
  manualFulfillmentNotificationSent?: boolean;
  totalDurationMs: number;
}

/**
 * Configuration for fulfillment timeout
 */
export interface FulfillmentConfig {
  webhookTimeoutMs: number; // Max time before returning 200 to Stripe
  providerTimeoutMs: number; // Per-provider timeout
  maxRetries: number;
  enableEmailNotification: boolean;
  enableDiscordAlerts: boolean;
}

/**
 * Default fulfillment configuration
 */
export const DEFAULT_FULFILLMENT_CONFIG: FulfillmentConfig = {
  webhookTimeoutMs: 25000, // 25 seconds (5s buffer before Stripe's 30s timeout)
  providerTimeoutMs: 10000, // 10 seconds per provider
  maxRetries: 3,
  enableEmailNotification: true,
  enableDiscordAlerts: true,
};

// =============================================================================
// Event Types for Logging/Observability
// =============================================================================

/**
 * Fulfillment event types
 */
export type FulfillmentEventType =
  | 'fulfillment_started'
  | 'provider_attempt'
  | 'provider_success'
  | 'provider_failure'
  | 'failover_triggered'
  | 'email_sending'
  | 'email_sent'
  | 'email_failed'
  | 'fulfillment_completed'
  | 'fulfillment_failed'
  | 'timeout_warning'
  | 'refund_required';

/**
 * Fulfillment event for logging
 */
export interface FulfillmentEvent {
  type: FulfillmentEventType;
  orderId: string;
  correlationId: string;
  timestamp: string;
  data?: Record<string, unknown>;
}
