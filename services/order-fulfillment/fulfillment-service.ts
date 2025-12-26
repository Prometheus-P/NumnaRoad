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
  type SuccessfulFailoverResult,
  type FailedFailoverResult,
  type EsimProvider,
  type EsimPurchaseRequest,
  type ErrorType,
  isManualFulfillmentPending,
  isSuccessfulResult,
  isFailedResult,
  createProvider,
  ManualProvider,
  type ManualPurchaseRequest,
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
          // Log all failed - result is guaranteed to be failed here
          const errorMsg = 'errorMessage' in result ? (result.errorMessage as string) : 'All providers failed';
          log.orderFailed(
            errorMsg,
            result.attemptedProviders
          );
        },
      }
    );

    // Handle purchase result
    if (isSuccessfulResult(purchaseResult)) {
      return this.handlePurchaseSuccess(
        order,
        purchaseResult,
        attempts,
        log,
        startTime
      );
    } else if (isFailedResult(purchaseResult)) {
      return this.handlePurchaseFailure(
        order,
        purchaseResult,
        attempts,
        log,
        startTime
      );
    } else {
      // Manual fulfillment pending case
      // Create a synthetic failed result for handling
      const syntheticFailedResult: FailedFailoverResult = {
        success: false,
        errorType: 'provider_error',
        errorMessage: 'Manual fulfillment pending',
        isRetryable: false,
        providerUsed: purchaseResult.providerUsed,
        attemptedProviders: purchaseResult.attemptedProviders,
        failoverEvents: purchaseResult.failoverEvents,
        failureReasons: purchaseResult.failureReasons,
      };
      return this.handlePurchaseFailure(
        order,
        syntheticFailedResult,
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
    result: SuccessfulFailoverResult,
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
   *
   * When all automated providers fail, attempts ManualProvider as final fallback
   * to notify staff for manual fulfillment.
   */
  private async handlePurchaseFailure(
    order: FulfillmentOrder,
    result: FailedFailoverResult,
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

    // Try ManualProvider as final fallback if Discord is configured
    if (this.config.enableDiscordAlerts && isDiscordConfigured()) {
      const manualFulfillmentResult = await this.attemptManualFulfillment(
        order,
        result,
        attempts,
        logger,
        startTime
      );

      if (manualFulfillmentResult) {
        return manualFulfillmentResult;
      }
    }

    // ManualProvider not available or failed - transition to provider_failed
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

    // Send Discord failure notification (different from manual fulfillment)
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
   * Attempt manual fulfillment via Discord notification
   *
   * @returns FulfillmentResult if manual fulfillment was queued, null otherwise
   */
  private async attemptManualFulfillment(
    order: FulfillmentOrder,
    failoverResult: FailedFailoverResult,
    attempts: ProviderAttempt[],
    logger: AutomationLogger,
    startTime: number
  ): Promise<FulfillmentResult | null> {
    const manualStep = logger.step('manual_fulfillment_attempt');
    manualStep.start({ order_id: order.orderId });

    try {
      // Create ManualProvider instance
      const manualProviderConfig: EsimProvider = {
        id: 'manual-fallback',
        name: 'Manual Provider',
        slug: 'manual',
        priority: 999,
        apiEndpoint: '',
        apiKeyEnvVar: '',
        timeoutMs: 10000,
        maxRetries: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const manualProvider = new ManualProvider(manualProviderConfig);

      // Prepare manual purchase request with context
      const manualRequest: ManualPurchaseRequest = {
        providerSku: order.providerSku,
        quantity: 1,
        customerEmail: order.customerEmail,
        correlationId: order.correlationId,
        orderId: order.orderId,
        productName: order.productId, // Could be enhanced with actual product name
        attemptedProviders: failoverResult.attemptedProviders,
        failureReason: failoverResult.errorMessage ?? 'All automated providers failed',
      };

      // Attempt manual fulfillment notification
      const manualResult = await manualProvider.purchase(manualRequest);

      if (isManualFulfillmentPending(manualResult)) {
        // Add manual attempt to log
        attempts.push({
          providerName: 'manual',
          timestamp: new Date().toISOString(),
          success: true,
          durationMs: Date.now() - startTime,
        });

        // Transition to pending_manual_fulfillment state
        await this.stateMachine.transition(
          order.id,
          order.correlationId,
          'pending_manual_fulfillment',
          {
            errorMessage: failoverResult.errorMessage,
            attemptedProviders: failoverResult.attemptedProviders,
            totalRetries: attempts.length,
            reason: 'All automated providers failed, queued for manual fulfillment',
          }
        );

        manualStep.success({
          notification_sent: true,
          orderId: order.orderId,
          attemptedProviders: failoverResult.attemptedProviders,
        });

        return {
          success: false, // Not a successful automated fulfillment
          orderId: order.orderId,
          finalState: 'pending_manual_fulfillment',
          attempts,
          pendingManualFulfillment: true,
          manualFulfillmentNotificationSent: true,
          error: {
            message: 'Order queued for manual fulfillment',
            type: 'provider_error',
          },
          totalDurationMs: Date.now() - startTime,
        };
      }

      // Manual fulfillment failed (Discord notification failed)
      manualStep.fail({
        message: 'Manual fulfillment notification failed',
        type: 'provider_error',
      });
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      manualStep.fail({ message: errorMessage, type: 'unknown' });
      console.error('Failed to attempt manual fulfillment:', error);
      return null;
    }
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
