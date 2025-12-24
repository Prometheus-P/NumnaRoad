/**
 * Order Fulfillment Service
 *
 * Handles the end-to-end order fulfillment process:
 * 1. Provider eSIM purchase with failover
 * 2. Email notification
 * 3. State transitions
 * 4. Discord alerts on failure
 *
 * Tasks: Part 1 - Task 1.3
 */

import type {
  FulfillmentOrder,
  FulfillmentResult,
  FulfillmentConfig,
  ProviderAttempt,
  OrderState,
} from './types';
import { DEFAULT_FULFILLMENT_CONFIG } from './types';
import { OrderStateMachine, createOrderStateMachine } from './state-machine';
import type { StatePersistFn, StateLoadFn } from './state-machine';
import {
  purchaseWithFailover,
  type FailoverResult,
  type EsimProvider,
  type EsimPurchaseRequest,
  type ErrorType,
} from '../esim-providers';
import {
  notifyOrderFailure,
  isDiscordConfigured,
} from '../notifications';
import { AutomationLogger, createAutomationLogger } from '../logging';

// =============================================================================
// Types
// =============================================================================

/**
 * Email sending function interface
 */
export type EmailSendFn = (params: {
  to: string;
  orderId: string;
  qrCodeUrl: string;
  activationCode?: string;
  directAppleInstallationUrl?: string;
}) => Promise<{ success: boolean; messageId?: string; error?: string }>;

/**
 * Fulfillment service configuration
 */
export interface FulfillmentServiceConfig {
  persistFn: StatePersistFn;
  loadFn: StateLoadFn;
  emailFn?: EmailSendFn;
  config?: Partial<FulfillmentConfig>;
}

// =============================================================================
// Fulfillment Service Class
// =============================================================================

/**
 * Order Fulfillment Service
 *
 * Orchestrates the entire fulfillment workflow:
 * - Manages state transitions
 * - Calls provider APIs with failover
 * - Sends confirmation emails
 * - Notifies ops on failures
 *
 * Usage:
 * ```typescript
 * const service = new FulfillmentService({
 *   persistFn: async (orderId, state, meta) => { ... },
 *   loadFn: async (orderId) => { ... },
 *   emailFn: async (params) => { ... },
 * });
 *
 * const result = await service.fulfill(order, providers);
 * ```
 */
export class FulfillmentService {
  private stateMachine: OrderStateMachine;
  private emailFn?: EmailSendFn;
  private config: FulfillmentConfig;

  constructor(serviceConfig: FulfillmentServiceConfig) {
    this.config = {
      ...DEFAULT_FULFILLMENT_CONFIG,
      ...serviceConfig.config,
    };

    this.stateMachine = createOrderStateMachine({
      persistFn: serviceConfig.persistFn,
      loadFn: serviceConfig.loadFn,
      enableAlerts: this.config.enableDiscordAlerts,
    });

    this.emailFn = serviceConfig.emailFn;
  }

  /**
   * Fulfill an order with providers
   *
   * @param order - Order to fulfill
   * @param providers - Available eSIM providers
   * @param logger - Optional automation logger
   * @returns Fulfillment result
   */
  async fulfill(
    order: FulfillmentOrder,
    providers: EsimProvider[],
    logger?: AutomationLogger
  ): Promise<FulfillmentResult> {
    const startTime = Date.now();
    const attempts: ProviderAttempt[] = [];

    // Create logger if not provided
    const log = logger ?? createAutomationLogger({
      orderId: order.orderId,
      correlationId: order.correlationId,
    });

    // Transition to fulfillment_started
    const startTransition = await this.stateMachine.transition(
      order.id,
      order.correlationId,
      'fulfillment_started'
    );

    if (!startTransition.success) {
      return this.createFailureResult(
        order,
        attempts,
        'unknown',
        startTransition.error ?? 'Failed to start fulfillment',
        startTime
      );
    }

    // Create purchase request
    const purchaseRequest: EsimPurchaseRequest = {
      providerSku: order.providerSku,
      quantity: 1,
      customerEmail: order.customerEmail,
      correlationId: order.correlationId,
    };

    // Track failover events
    const failoverLogger = log.step('failover_triggered');

    // Attempt purchase with failover
    const purchaseResult = await purchaseWithFailover(
      providers,
      purchaseRequest,
      {
        onFailover: (event) => {
          failoverLogger.start({
            from_provider: event.fromProvider,
            to_provider: event.toProvider,
          });
          failoverLogger.success({ reason: event.reason });

          attempts.push({
            providerName: event.fromProvider,
            timestamp: new Date().toISOString(),
            success: false,
            errorMessage: event.reason,
            durationMs: 0, // Not tracked per-attempt
          });
        },
        onAllFailed: async (result) => {
          // Log all failed
          log.orderFailed(
            result.errorMessage ?? 'All providers failed',
            result.attemptedProviders
          );
        },
      }
    );

    // Handle purchase result
    if (purchaseResult.success) {
      return this.handlePurchaseSuccess(
        order,
        purchaseResult,
        attempts,
        log,
        startTime
      );
    } else {
      return this.handlePurchaseFailure(
        order,
        purchaseResult,
        attempts,
        log,
        startTime
      );
    }
  }

  /**
   * Handle successful eSIM purchase
   */
  private async handlePurchaseSuccess(
    order: FulfillmentOrder,
    result: FailoverResult,
    attempts: ProviderAttempt[],
    logger: AutomationLogger,
    startTime: number
  ): Promise<FulfillmentResult> {
    // Add successful attempt
    if (result.providerUsed) {
      attempts.push({
        providerName: result.providerUsed,
        timestamp: new Date().toISOString(),
        success: true,
        durationMs: Date.now() - startTime,
      });
    }

    // Transition to provider_confirmed
    await this.stateMachine.transition(
      order.id,
      order.correlationId,
      'provider_confirmed',
      {
        providerName: result.providerUsed,
        qrCodeUrl: result.qrCodeUrl,
        iccid: result.iccid,
        activationCode: result.activationCode,
        providerOrderId: result.providerOrderId,
      }
    );

    // Send email if configured
    let emailSent = false;
    let emailMessageId: string | undefined;

    if (this.emailFn && this.config.enableEmailNotification) {
      const emailStep = logger.step('email_sent');
      emailStep.start({ to: order.customerEmail });

      try {
        const emailResult = await this.emailFn({
          to: order.customerEmail,
          orderId: order.orderId,
          qrCodeUrl: result.qrCodeUrl ?? '',
          activationCode: result.activationCode,
          directAppleInstallationUrl: result.directAppleInstallationUrl,
        });

        if (emailResult.success) {
          emailSent = true;
          emailMessageId = emailResult.messageId;
          emailStep.success({ message_id: emailMessageId });

          // Transition to email_sent
          await this.stateMachine.transition(
            order.id,
            order.correlationId,
            'email_sent',
            { emailMessageId }
          );
        } else {
          emailStep.fail({ message: emailResult.error ?? 'Email failed', type: 'provider_error' });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown email error';
        emailStep.fail({ message: errorMessage, type: 'unknown' });
        logger.emailFailed(errorMessage);
      }
    }

    // Transition to delivered (final success state)
    await this.stateMachine.transition(
      order.id,
      order.correlationId,
      'delivered'
    );

    logger.orderCompleted(result.providerUsed ?? 'unknown');

    return {
      success: true,
      orderId: order.orderId,
      finalState: 'delivered',
      providerUsed: result.providerUsed,
      attempts,
      esimData: {
        qrCodeUrl: result.qrCodeUrl ?? '',
        iccid: result.iccid ?? '',
        activationCode: result.activationCode,
        providerOrderId: result.providerOrderId ?? '',
        directAppleInstallationUrl: result.directAppleInstallationUrl,
      },
      emailSent,
      emailMessageId,
      totalDurationMs: Date.now() - startTime,
    };
  }

  /**
   * Handle failed eSIM purchase
   */
  private async handlePurchaseFailure(
    order: FulfillmentOrder,
    result: FailoverResult,
    attempts: ProviderAttempt[],
    logger: AutomationLogger,
    startTime: number
  ): Promise<FulfillmentResult> {
    // Add failed attempts from result
    for (const providerSlug of result.attemptedProviders) {
      const existingAttempt = attempts.find(a => a.providerName === providerSlug);
      if (!existingAttempt) {
        attempts.push({
          providerName: providerSlug,
          timestamp: new Date().toISOString(),
          success: false,
          errorMessage: result.failureReasons[providerSlug],
          errorType: result.errorType,
          durationMs: 0,
        });
      }
    }

    // Transition to provider_failed
    await this.stateMachine.transition(
      order.id,
      order.correlationId,
      'provider_failed',
      {
        errorMessage: result.errorMessage,
        errorType: result.errorType,
        attemptedProviders: result.attemptedProviders,
        totalRetries: attempts.length,
      }
    );

    // Send Discord notification
    if (this.config.enableDiscordAlerts && isDiscordConfigured()) {
      try {
        await notifyOrderFailure({
          orderId: order.orderId,
          correlationId: order.correlationId,
          customerEmail: order.customerEmail,
          productId: order.productId,
          errorMessage: result.errorMessage ?? 'All providers failed',
          errorType: result.errorType ?? 'provider_error',
          attemptedProviders: result.attemptedProviders,
          totalRetries: attempts.length,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to send Discord notification:', error);
      }
    }

    return this.createFailureResult(
      order,
      attempts,
      result.errorType ?? 'provider_error',
      result.errorMessage ?? 'All providers failed',
      startTime
    );
  }

  /**
   * Create a failure result object
   */
  private createFailureResult(
    order: FulfillmentOrder,
    attempts: ProviderAttempt[],
    errorType: ErrorType,
    errorMessage: string,
    startTime: number
  ): FulfillmentResult {
    return {
      success: false,
      orderId: order.orderId,
      finalState: 'provider_failed',
      attempts,
      error: {
        message: errorMessage,
        type: errorType,
      },
      totalDurationMs: Date.now() - startTime,
    };
  }

  /**
   * Check if fulfillment should timeout
   *
   * Use this to implement early return for webhook handlers
   */
  shouldTimeout(startTime: number): boolean {
    return Date.now() - startTime >= this.config.webhookTimeoutMs;
  }

  /**
   * Get remaining time before timeout
   */
  getRemainingTime(startTime: number): number {
    return Math.max(0, this.config.webhookTimeoutMs - (Date.now() - startTime));
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new fulfillment service
 */
export function createFulfillmentService(
  config: FulfillmentServiceConfig
): FulfillmentService {
  return new FulfillmentService(config);
}

// =============================================================================
// Timeout-Aware Fulfillment (for Webhook Handlers)
// =============================================================================

/**
 * Result when fulfillment times out
 */
export interface TimeoutResult {
  timedOut: true;
  orderId: string;
  elapsedMs: number;
  message: string;
}

/**
 * Fulfill with timeout awareness
 *
 * Returns early if approaching webhook timeout.
 * Allows webhook to return 200 while fulfillment continues in background.
 *
 * @param service - Fulfillment service
 * @param order - Order to fulfill
 * @param providers - Available providers
 * @param timeoutMs - Max time to wait (default: 25000ms)
 * @returns Fulfillment result or timeout result
 */
export async function fulfillWithTimeout(
  service: FulfillmentService,
  order: FulfillmentOrder,
  providers: EsimProvider[],
  timeoutMs: number = 25000
): Promise<FulfillmentResult | TimeoutResult> {
  const startTime = Date.now();

  // Create promise race between fulfillment and timeout
  const fulfillmentPromise = service.fulfill(order, providers);

  const timeoutPromise = new Promise<TimeoutResult>((resolve) => {
    setTimeout(() => {
      resolve({
        timedOut: true,
        orderId: order.orderId,
        elapsedMs: Date.now() - startTime,
        message: `Fulfillment timed out after ${timeoutMs}ms`,
      });
    }, timeoutMs);
  });

  return Promise.race([fulfillmentPromise, timeoutPromise]);
}

/**
 * Check if result is a timeout
 */
export function isTimeoutResult(
  result: FulfillmentResult | TimeoutResult
): result is TimeoutResult {
  return 'timedOut' in result && result.timedOut === true;
}
