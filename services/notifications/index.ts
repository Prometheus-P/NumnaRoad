/**
 * Notifications Service Module
 *
 * Provides operational notifications via various channels.
 * - Discord webhooks (operational alerts)
 * - Kakao Alimtalk (customer notifications)
 */

export {
  // Types
  type OrderFailureNotification,
  type ProviderHealthNotification,
  type CircuitBreakerNotification,
  type ManualFulfillmentNotification,
  type DiscordEmbed,
  type DiscordWebhookPayload,
  // Functions
  notifyOrderFailure,
  notifyProviderHealth,
  notifyCircuitBreakerStateChange,
  notifyManualFulfillmentRequired,
  notifyCustom,
  isDiscordConfigured,
  testWebhookConnection,
} from './discord-notifier';

export {
  // Types
  type AlimtalkSendParams,
  type AlimtalkSendResult,
  type AlimtalkSendFn,
  type AlimtalkConfig,
  // Functions
  formatKoreanPhone,
  isAlimtalkConfigured,
  sendEsimDeliveryAlimtalk,
  createAlimtalkSendFn,
  testAlimtalkConnection,
} from './kakao-alimtalk';
