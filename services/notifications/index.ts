/**
 * Notifications Service Module
 *
 * Provides operational notifications via various channels.
 * Currently supports Discord webhooks.
 */

export {
  // Types
  type OrderFailureNotification,
  type ProviderHealthNotification,
  type CircuitBreakerNotification,
  type DiscordEmbed,
  type DiscordWebhookPayload,
  // Functions
  notifyOrderFailure,
  notifyProviderHealth,
  notifyCircuitBreakerStateChange,
  notifyCustom,
  isDiscordConfigured,
  testWebhookConnection,
} from './discord-notifier';
