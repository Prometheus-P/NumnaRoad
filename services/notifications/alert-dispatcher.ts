/**
 * Alert Dispatcher - Multi-channel alerting system
 *
 * Ensures critical alerts are never lost by dispatching to multiple channels:
 * 1. Database (always - for audit and recovery)
 * 2. Discord (primary real-time notification)
 * 3. Email (critical alerts only)
 *
 * Pattern: Fire-and-forget with guaranteed database persistence
 */

import { notifyCustom, isDiscordConfigured } from './discord-notifier';
import { logger } from '../logger';

export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  level: AlertLevel;
  title: string;
  message: string;
  orderId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertDispatchResult {
  database: boolean;
  discord: boolean;
  email: boolean;
  errors: string[];
}

/**
 * Log alert to database for persistence.
 * This is the guaranteed channel - always attempts to persist.
 */
async function logToDatabase(alert: Alert): Promise<boolean> {
  try {
    // Dynamic import to avoid circular dependencies
    const { getAdminPocketBase } = await import('@/lib/pocketbase');
    const pb = await getAdminPocketBase();

    await pb.collection('system_alerts').create({
      level: alert.level,
      title: alert.title.substring(0, 200),
      message: alert.message.substring(0, 5000),
      order_id: alert.orderId || null,
      correlation_id: alert.correlationId || null,
      acknowledged: false,
    });

    return true;
  } catch (error) {
    // Log as last resort when database fails
    logger.error('alert_database_failed', error, { alert });
    return false;
  }
}

/**
 * Send alert to Discord channel.
 */
async function sendDiscord(alert: Alert): Promise<boolean> {
  if (!isDiscordConfigured()) {
    return false;
  }

  try {
    const discordLevel =
      alert.level === 'critical' || alert.level === 'error'
        ? 'error'
        : alert.level === 'warning'
        ? 'warning'
        : 'info';

    await notifyCustom(
      `[${alert.level.toUpperCase()}] ${alert.title}`,
      alert.message +
        (alert.orderId ? `\n\n주문ID: ${alert.orderId}` : '') +
        (alert.correlationId ? `\nCorrelationId: ${alert.correlationId}` : ''),
      discordLevel
    );

    return true;
  } catch (error) {
    logger.warn('alert_discord_failed', { alertTitle: alert.title, error: error instanceof Error ? error.message : 'Unknown' });
    return false;
  }
}

/**
 * Send critical alert via email.
 * Only sends for critical-level alerts.
 */
async function sendAdminEmail(alert: Alert): Promise<boolean> {
  // Only send email for critical alerts
  if (alert.level !== 'critical') {
    return false;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return false;
  }

  try {
    // Dynamic import to avoid initialization issues
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'alerts@numnaroad.com',
      to: adminEmail,
      subject: `[CRITICAL] NumnaRoad: ${alert.title}`,
      text: `
CRITICAL ALERT

Title: ${alert.title}
Level: ${alert.level}

${alert.message}

${alert.orderId ? `Order ID: ${alert.orderId}` : ''}
${alert.correlationId ? `Correlation ID: ${alert.correlationId}` : ''}

---
Time: ${new Date().toISOString()}
This is an automated alert from NumnaRoad operations.
      `.trim(),
    });

    return true;
  } catch (error) {
    logger.warn('alert_email_failed', { alertTitle: alert.title, error: error instanceof Error ? error.message : 'Unknown' });
    return false;
  }
}

/**
 * Dispatch alert to all configured channels.
 *
 * Guarantees:
 * 1. Database persistence is always attempted first
 * 2. Discord is attempted for all alerts
 * 3. Email is attempted only for critical alerts
 * 4. Failures in one channel don't block others
 *
 * @example
 * ```typescript
 * await dispatchAlert({
 *   level: 'critical',
 *   title: 'Provider API Down',
 *   message: 'RedteaGO API is not responding',
 *   correlationId: 'abc-123',
 * });
 * ```
 */
export async function dispatchAlert(alert: Alert): Promise<AlertDispatchResult> {
  const result: AlertDispatchResult = {
    database: false,
    discord: false,
    email: false,
    errors: [],
  };

  // Use Promise.allSettled to ensure all channels are attempted
  const [dbResult, discordResult, emailResult] = await Promise.allSettled([
    logToDatabase(alert),
    sendDiscord(alert),
    sendAdminEmail(alert),
  ]);

  // Process results
  if (dbResult.status === 'fulfilled') {
    result.database = dbResult.value;
  } else {
    result.errors.push(`Database: ${dbResult.reason}`);
  }

  if (discordResult.status === 'fulfilled') {
    result.discord = discordResult.value;
  } else {
    result.errors.push(`Discord: ${discordResult.reason}`);
  }

  if (emailResult.status === 'fulfilled') {
    result.email = emailResult.value;
  } else {
    result.errors.push(`Email: ${emailResult.reason}`);
  }

  // Log if all channels failed
  if (!result.database && !result.discord && !result.email) {
    logger.error('all_alert_channels_failed', undefined, { alert, errors: result.errors });
  }

  return result;
}

/**
 * Convenience function for critical alerts.
 */
export async function alertCritical(
  title: string,
  message: string,
  context?: { orderId?: string; correlationId?: string }
): Promise<AlertDispatchResult> {
  return dispatchAlert({
    level: 'critical',
    title,
    message,
    ...context,
  });
}

/**
 * Convenience function for error alerts.
 */
export async function alertError(
  title: string,
  message: string,
  context?: { orderId?: string; correlationId?: string }
): Promise<AlertDispatchResult> {
  return dispatchAlert({
    level: 'error',
    title,
    message,
    ...context,
  });
}

/**
 * Convenience function for warning alerts.
 */
export async function alertWarning(
  title: string,
  message: string,
  context?: { orderId?: string; correlationId?: string }
): Promise<AlertDispatchResult> {
  return dispatchAlert({
    level: 'warning',
    title,
    message,
    ...context,
  });
}

/**
 * Convenience function for info alerts.
 */
export async function alertInfo(
  title: string,
  message: string,
  context?: { orderId?: string; correlationId?: string }
): Promise<AlertDispatchResult> {
  return dispatchAlert({
    level: 'info',
    title,
    message,
    ...context,
  });
}
