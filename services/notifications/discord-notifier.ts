/**
 * Discord Notification Service
 *
 * Sends operational alerts to Discord for:
 * - Order fulfillment failures
 * - Provider health issues
 * - Circuit breaker state changes
 *
 * Tasks: Part 1 - Task 1.1
 */

import type { ErrorType } from '../esim-providers/types';

// =============================================================================
// Types
// =============================================================================

export interface OrderFailureNotification {
  orderId: string;
  correlationId: string;
  customerEmail: string;
  productId: string;
  errorMessage: string;
  errorType: ErrorType;
  attemptedProviders: string[];
  totalRetries: number;
  timestamp: string;
}

export interface ProviderHealthNotification {
  providerName: string;
  status: 'degraded' | 'down' | 'recovered';
  successRate: number;
  message: string;
  timestamp: string;
}

export interface CircuitBreakerNotification {
  providerName: string;
  state: 'open' | 'half-open' | 'closed';
  failureCount: number;
  lastFailure?: string;
  timestamp: string;
}

export interface ManualFulfillmentNotification {
  orderId: string;
  correlationId: string;
  customerEmail: string;
  productId: string;
  productName?: string;
  country?: string;
  dataAmount?: string;
  attemptedProviders: string[];
  reason: string;
  timestamp: string;
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp: string;
  footer?: {
    text: string;
  };
}

export interface DiscordWebhookPayload {
  content?: string;
  embeds: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DISCORD_COLORS = {
  error: 0xff0000, // Red
  warning: 0xffa500, // Orange
  success: 0x00ff00, // Green
  info: 0x0099ff, // Blue
};

const DEFAULT_USERNAME = 'NumnaRoad Ops';
const DEFAULT_TIMEOUT_MS = 10000;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get Discord webhook URL from environment
 */
function getWebhookUrl(): string {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    throw new Error('DISCORD_WEBHOOK_URL environment variable is not set');
  }
  return url;
}

/**
 * Mask email for privacy (show first 2 chars + domain)
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain || local.length < 2) {
    return '***@***';
  }
  return `${local.substring(0, 2)}***@${domain}`;
}

/**
 * Format error type for display
 */
function formatErrorType(errorType: ErrorType): string {
  const labels: Record<ErrorType, string> = {
    timeout: 'Timeout',
    rate_limit: 'Rate Limited',
    invalid_response: 'Invalid Response',
    network_error: 'Network Error',
    authentication: 'Auth Error',
    validation: 'Validation Error',
    provider_error: 'Provider Error',
    unknown: 'Unknown Error',
  };
  return labels[errorType] || errorType;
}

/**
 * Send webhook request to Discord
 */
async function sendWebhook(payload: DiscordWebhookPayload): Promise<void> {
  const webhookUrl = getWebhookUrl();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        username: payload.username || DEFAULT_USERNAME,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Discord webhook failed: ${response.status} - ${errorText}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// Notification Functions
// =============================================================================

/**
 * Send notification when order fulfillment fails
 *
 * @param notification - Order failure details
 */
export async function notifyOrderFailure(
  notification: OrderFailureNotification
): Promise<void> {
  const embed: DiscordEmbed = {
    title: '🚨 Order Fulfillment Failed',
    description: `Order **${notification.orderId}** could not be fulfilled after trying all available providers.`,
    color: DISCORD_COLORS.error,
    fields: [
      {
        name: 'Order ID',
        value: `\`${notification.orderId}\``,
        inline: true,
      },
      {
        name: 'Correlation ID',
        value: `\`${notification.correlationId}\``,
        inline: true,
      },
      {
        name: 'Customer',
        value: maskEmail(notification.customerEmail),
        inline: true,
      },
      {
        name: 'Product ID',
        value: `\`${notification.productId}\``,
        inline: true,
      },
      {
        name: 'Error Type',
        value: formatErrorType(notification.errorType),
        inline: true,
      },
      {
        name: 'Total Retries',
        value: notification.totalRetries.toString(),
        inline: true,
      },
      {
        name: 'Attempted Providers',
        value: notification.attemptedProviders.length > 0
          ? notification.attemptedProviders.map(p => `• ${p}`).join('\n')
          : 'None',
        inline: false,
      },
      {
        name: 'Error Message',
        value: `\`\`\`${notification.errorMessage.substring(0, 500)}\`\`\``,
        inline: false,
      },
    ],
    timestamp: notification.timestamp,
    footer: {
      text: 'Manual intervention may be required',
    },
  };

  await sendWebhook({ embeds: [embed] });
}

/**
 * Send notification when provider health changes
 *
 * @param notification - Provider health details
 */
export async function notifyProviderHealth(
  notification: ProviderHealthNotification
): Promise<void> {
  const statusEmoji: Record<string, string> = {
    degraded: '⚠️',
    down: '🔴',
    recovered: '✅',
  };

  const statusColor: Record<string, number> = {
    degraded: DISCORD_COLORS.warning,
    down: DISCORD_COLORS.error,
    recovered: DISCORD_COLORS.success,
  };

  const embed: DiscordEmbed = {
    title: `${statusEmoji[notification.status]} Provider ${notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}: ${notification.providerName}`,
    description: notification.message,
    color: statusColor[notification.status],
    fields: [
      {
        name: 'Provider',
        value: notification.providerName,
        inline: true,
      },
      {
        name: 'Status',
        value: notification.status.toUpperCase(),
        inline: true,
      },
      {
        name: 'Success Rate',
        value: `${(notification.successRate * 100).toFixed(1)}%`,
        inline: true,
      },
    ],
    timestamp: notification.timestamp,
  };

  await sendWebhook({ embeds: [embed] });
}

/**
 * Send notification when circuit breaker state changes
 *
 * @param notification - Circuit breaker state details
 */
export async function notifyCircuitBreakerStateChange(
  notification: CircuitBreakerNotification
): Promise<void> {
  const stateEmoji: Record<string, string> = {
    open: '🔓',
    'half-open': '🔄',
    closed: '🔒',
  };

  const stateColor: Record<string, number> = {
    open: DISCORD_COLORS.error,
    'half-open': DISCORD_COLORS.warning,
    closed: DISCORD_COLORS.success,
  };

  const stateDescription: Record<string, string> = {
    open: 'Circuit is OPEN - requests are being rejected',
    'half-open': 'Circuit is HALF-OPEN - testing recovery',
    closed: 'Circuit is CLOSED - normal operation resumed',
  };

  const embed: DiscordEmbed = {
    title: `${stateEmoji[notification.state]} Circuit Breaker: ${notification.providerName}`,
    description: stateDescription[notification.state],
    color: stateColor[notification.state],
    fields: [
      {
        name: 'Provider',
        value: notification.providerName,
        inline: true,
      },
      {
        name: 'State',
        value: notification.state.toUpperCase(),
        inline: true,
      },
      {
        name: 'Failure Count',
        value: notification.failureCount.toString(),
        inline: true,
      },
    ],
    timestamp: notification.timestamp,
  };

  if (notification.lastFailure) {
    embed.fields.push({
      name: 'Last Failure',
      value: notification.lastFailure,
      inline: false,
    });
  }

  await sendWebhook({ embeds: [embed] });
}

/**
 * Send a custom notification
 *
 * @param title - Notification title
 * @param message - Notification message
 * @param level - Severity level
 */
export async function notifyCustom(
  title: string,
  message: string,
  level: 'error' | 'warning' | 'success' | 'info' = 'info'
): Promise<void> {
  const embed: DiscordEmbed = {
    title,
    description: message,
    color: DISCORD_COLORS[level],
    timestamp: new Date().toISOString(),
  };

  await sendWebhook({ embeds: [embed] });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if Discord notifications are configured
 */
export function isDiscordConfigured(): boolean {
  return Boolean(process.env.DISCORD_WEBHOOK_URL);
}

/**
 * Test Discord webhook connection
 */
export async function testWebhookConnection(): Promise<boolean> {
  try {
    await notifyCustom(
      '🔔 Test Notification',
      'Discord webhook is configured correctly.',
      'info'
    );
    return true;
  } catch (error) {
    console.error('Discord webhook test failed:', error);
    return false;
  }
}

/**
 * Send notification requesting manual fulfillment
 *
 * @param notification - Manual fulfillment request details
 */
export async function notifyManualFulfillmentRequired(
  notification: ManualFulfillmentNotification
): Promise<void> {
  const embed: DiscordEmbed = {
    title: '🔧 Manual Fulfillment Required',
    description: `Order **${notification.orderId}** requires manual processing. All automated providers have been exhausted.`,
    color: DISCORD_COLORS.warning,
    fields: [
      {
        name: 'Order ID',
        value: `\`${notification.orderId}\``,
        inline: true,
      },
      {
        name: 'Correlation ID',
        value: `\`${notification.correlationId}\``,
        inline: true,
      },
      {
        name: 'Customer',
        value: maskEmail(notification.customerEmail),
        inline: true,
      },
      {
        name: 'Product ID',
        value: `\`${notification.productId}\``,
        inline: true,
      },
    ],
    timestamp: notification.timestamp,
    footer: {
      text: 'Please fulfill this order manually via provider dashboard',
    },
  };

  // Add product details if available
  if (notification.productName) {
    embed.fields.push({
      name: 'Product',
      value: notification.productName,
      inline: true,
    });
  }

  if (notification.country) {
    embed.fields.push({
      name: 'Country',
      value: notification.country,
      inline: true,
    });
  }

  if (notification.dataAmount) {
    embed.fields.push({
      name: 'Data',
      value: notification.dataAmount,
      inline: true,
    });
  }

  // Add attempted providers
  embed.fields.push({
    name: 'Attempted Providers',
    value: notification.attemptedProviders.length > 0
      ? notification.attemptedProviders.map(p => `• ${p} (failed)`).join('\n')
      : 'None (direct manual)',
    inline: false,
  });

  // Add reason
  embed.fields.push({
    name: 'Reason',
    value: notification.reason,
    inline: false,
  });

  // Add action items
  embed.fields.push({
    name: '📋 Action Required',
    value: [
      '1. Log into provider dashboard',
      '2. Purchase eSIM manually',
      '3. Update order with QR code/ICCID',
      '4. Mark order as completed',
    ].join('\n'),
    inline: false,
  });

  await sendWebhook({ embeds: [embed] });
}
