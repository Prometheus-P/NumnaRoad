/**
 * Telegram Notification Service
 *
 * Sends operational alerts to Telegram for:
 * - Order fulfillment failures
 * - Provider health issues
 * - System alerts
 *
 * Note: File kept as discord-notifier.ts for backward compatibility
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

// Keep Discord types for backward compatibility (unused)
export interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp: string;
  footer?: { text: string };
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

const DEFAULT_TIMEOUT_MS = 10000;

// =============================================================================
// Helper Functions
// =============================================================================

function getTelegramConfig(): { botToken: string; chatId: string } {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
  }

  return { botToken, chatId };
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain || local.length < 2) return '***@***';
  return `${local.substring(0, 2)}***@${domain}`;
}

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

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

async function sendTelegram(message: string): Promise<void> {
  const { botToken, chatId } = getTelegramConfig();
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Retry without markdown if parsing fails
      const retryResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message.replace(/[\\*_`\[\]]/g, ''),
          disable_web_page_preview: true,
        }),
      });

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text().catch(() => 'Unknown');
        throw new Error(`Telegram API failed: ${retryResponse.status} - ${errorText}`);
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// Notification Functions
// =============================================================================

export async function notifyOrderFailure(
  notification: OrderFailureNotification
): Promise<void> {
  const providers = notification.attemptedProviders.length > 0
    ? notification.attemptedProviders.join(', ')
    : 'None';

  const message = `
🚨 *주문 처리 실패*

*Order ID:* \`${escapeMarkdown(notification.orderId)}\`
*Correlation:* \`${escapeMarkdown(notification.correlationId)}\`
*Customer:* ${escapeMarkdown(maskEmail(notification.customerEmail))}
*Product:* \`${escapeMarkdown(notification.productId)}\`

*Error:* ${escapeMarkdown(formatErrorType(notification.errorType))}
*Retries:* ${notification.totalRetries}
*Providers:* ${escapeMarkdown(providers)}

\`\`\`
${escapeMarkdown(notification.errorMessage.substring(0, 300))}
\`\`\`

⚠️ 수동 처리가 필요할 수 있습니다
`.trim();

  await sendTelegram(message);
}

export async function notifyProviderHealth(
  notification: ProviderHealthNotification
): Promise<void> {
  const emoji = { degraded: '⚠️', down: '🔴', recovered: '✅' }[notification.status];

  const message = `
${emoji} *Provider ${notification.status.toUpperCase()}*

*Provider:* ${escapeMarkdown(notification.providerName)}
*Status:* ${escapeMarkdown(notification.status)}
*Success Rate:* ${(notification.successRate * 100).toFixed(1)}%

${escapeMarkdown(notification.message)}
`.trim();

  await sendTelegram(message);
}

export async function notifyCircuitBreakerStateChange(
  notification: CircuitBreakerNotification
): Promise<void> {
  const emoji = { open: '🔓', 'half-open': '🔄', closed: '🔒' }[notification.state];

  const message = `
${emoji} *Circuit Breaker: ${escapeMarkdown(notification.providerName)}*

*State:* ${escapeMarkdown(notification.state.toUpperCase())}
*Failures:* ${notification.failureCount}
${notification.lastFailure ? `*Last Failure:* ${escapeMarkdown(notification.lastFailure)}` : ''}
`.trim();

  await sendTelegram(message);
}

export async function notifyCustom(
  title: string,
  message: string,
  level: 'error' | 'warning' | 'success' | 'info' = 'info'
): Promise<void> {
  const emoji = { error: '🚨', warning: '⚠️', success: '✅', info: 'ℹ️' }[level];

  const text = `
${emoji} *${escapeMarkdown(title)}*

${escapeMarkdown(message)}
`.trim();

  await sendTelegram(text);
}

// =============================================================================
// Utility Functions
// =============================================================================

export function isDiscordConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function testWebhookConnection(): Promise<boolean> {
  try {
    await notifyCustom('🔔 Test', 'Telegram 알림이 정상 작동합니다.', 'info');
    return true;
  } catch (error) {
    console.error('Telegram test failed:', error);
    return false;
  }
}

export async function notifyManualFulfillmentRequired(
  notification: ManualFulfillmentNotification
): Promise<void> {
  const providers = notification.attemptedProviders.length > 0
    ? notification.attemptedProviders.join(', ')
    : 'None';

  const message = `
🔧 *수동 처리 필요*

*Order ID:* \`${escapeMarkdown(notification.orderId)}\`
*Customer:* ${escapeMarkdown(maskEmail(notification.customerEmail))}
*Product:* \`${escapeMarkdown(notification.productId)}\`
${notification.productName ? `*상품명:* ${escapeMarkdown(notification.productName)}` : ''}
${notification.country ? `*국가:* ${escapeMarkdown(notification.country)}` : ''}

*시도한 Provider:* ${escapeMarkdown(providers)}
*사유:* ${escapeMarkdown(notification.reason)}

📋 *조치 사항:*
1\\. Provider 대시보드 로그인
2\\. eSIM 수동 구매
3\\. QR코드/ICCID로 주문 업데이트
4\\. 주문 완료 처리
`.trim();

  await sendTelegram(message);
}
