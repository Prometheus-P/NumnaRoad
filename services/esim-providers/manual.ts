/**
 * Manual Provider
 *
 * Fallback provider for manual order fulfillment.
 * When all automated providers fail, this provider:
 * 1. Sends a Discord notification requesting manual intervention
 * 2. Returns a pending_manual status
 * 3. The order stays in a "pending_manual" state until staff fulfills it
 *
 * Task: Week 2 - ManualProvider implementation
 */

import { BaseProvider, registerProvider } from './provider-factory';
import type {
  EsimProvider,
  EsimPurchaseRequest,
  EsimPurchaseResult,
  EsimManualFulfillmentPending,
} from './types';
import {
  notifyManualFulfillmentRequired,
  isDiscordConfigured,
} from '../notifications';

/**
 * Extended purchase request with additional context for manual fulfillment
 */
export interface ManualPurchaseRequest extends EsimPurchaseRequest {
  orderId: string;
  productName?: string;
  country?: string;
  dataAmount?: string;
  attemptedProviders?: string[];
  failureReason?: string;
}

/**
 * Manual Provider Implementation
 *
 * This provider doesn't actually purchase eSIMs - it sends notifications
 * to operations staff for manual fulfillment.
 */
export class ManualProvider extends BaseProvider {
  readonly slug = 'manual' as const;

  constructor(config: EsimProvider) {
    super(config);
  }

  /**
   * "Purchase" via manual fulfillment
   *
   * Sends Discord notification and returns pending_manual status
   */
  async purchase(request: EsimPurchaseRequest): Promise<EsimPurchaseResult> {
    const manualRequest = request as ManualPurchaseRequest;

    // Check if Discord is configured
    if (!isDiscordConfigured()) {
      console.warn('Discord webhook not configured - cannot send manual fulfillment notification');
      return {
        success: false,
        errorType: 'provider_error',
        errorMessage: 'Manual fulfillment notifications not configured (DISCORD_WEBHOOK_URL missing)',
        isRetryable: false,
      };
    }

    try {
      // Send Discord notification
      await notifyManualFulfillmentRequired({
        orderId: manualRequest.orderId || manualRequest.correlationId,
        correlationId: manualRequest.correlationId,
        customerEmail: manualRequest.customerEmail,
        productId: manualRequest.providerSku,
        productName: manualRequest.productName,
        country: manualRequest.country,
        dataAmount: manualRequest.dataAmount,
        attemptedProviders: manualRequest.attemptedProviders || [],
        reason: manualRequest.failureReason || 'All automated providers failed',
        timestamp: new Date().toISOString(),
      });

      // Return pending_manual status
      const result: EsimManualFulfillmentPending = {
        success: 'pending_manual',
        orderId: manualRequest.orderId || manualRequest.correlationId,
        notificationSent: true,
        message: 'Order queued for manual fulfillment. Discord notification sent.',
      };

      return result;
    } catch (error) {
      console.error('Failed to send manual fulfillment notification:', error);

      return {
        success: false,
        errorType: 'provider_error',
        errorMessage: `Failed to send manual fulfillment notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isRetryable: true, // Retry sending notification
      };
    }
  }

  /**
   * Health check - always returns true
   *
   * Manual provider is always "available" as long as Discord is configured
   */
  async healthCheck(): Promise<boolean> {
    return isDiscordConfigured();
  }
}

// Register the manual provider
registerProvider('manual', ManualProvider);

/**
 * Helper to check if a result is a manual fulfillment pending response
 */
export function isManualFulfillmentPending(
  result: EsimPurchaseResult
): result is EsimManualFulfillmentPending {
  return typeof result === 'object' && result.success === 'pending_manual';
}
