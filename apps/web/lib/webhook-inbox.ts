/**
 * Webhook Inbox - Dead Letter Queue for SmartStore webhooks
 *
 * Ensures no webhook is ever lost by persisting before processing.
 * Failed webhooks are retried by the process-webhook-inbox cron job.
 *
 * Pattern:
 * 1. Webhook arrives -> immediately persist to inbox
 * 2. Return 200 to caller (Naver doesn't retry)
 * 3. Process asynchronously
 * 4. If processing fails, cron job will retry from inbox
 */

import { getAdminPocketBase } from './pocketbase';
import type { NaverWebhookPayload } from '@services/sales-channels/smartstore';

export const WEBHOOK_INBOX_COLLECTION = 'webhook_inbox';

export type InboxStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface WebhookInboxEntry {
  id: string;
  correlation_id: string;
  event_type: string;
  payload: string; // JSON stringified
  product_order_ids: string; // Comma-separated for easy querying
  status: InboxStatus;
  retry_count: number;
  max_retries: number;
  error_message?: string;
  created: string;
  updated: string;
  processed_at?: string;
}

/**
 * Persist webhook to inbox immediately upon receipt.
 * This ensures the webhook data is never lost, even if processing fails.
 */
export async function persistToInbox(
  payload: NaverWebhookPayload,
  correlationId: string
): Promise<string> {
  const pb = await getAdminPocketBase();

  const entry = await pb.collection(WEBHOOK_INBOX_COLLECTION).create({
    correlation_id: correlationId,
    event_type: payload.type,
    payload: JSON.stringify(payload),
    product_order_ids: payload.productOrderIds?.join(',') || '',
    status: 'pending',
    retry_count: 0,
    max_retries: 5,
  });

  return entry.id;
}

/**
 * Mark inbox entry as being processed.
 * Prevents duplicate processing by concurrent workers.
 */
export async function markInboxProcessing(id: string): Promise<boolean> {
  const pb = await getAdminPocketBase();

  try {
    // Use optimistic locking - only update if still pending
    const entry = await pb.collection(WEBHOOK_INBOX_COLLECTION).getOne<WebhookInboxEntry>(id);

    if (entry.status !== 'pending') {
      return false; // Already being processed or completed
    }

    await pb.collection(WEBHOOK_INBOX_COLLECTION).update(id, {
      status: 'processing',
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Mark inbox entry as successfully processed.
 */
export async function markInboxCompleted(id: string): Promise<void> {
  const pb = await getAdminPocketBase();

  await pb.collection(WEBHOOK_INBOX_COLLECTION).update(id, {
    status: 'completed',
    processed_at: new Date().toISOString(),
  });
}

/**
 * Mark inbox entry as failed.
 * If max retries exceeded, marks as permanently failed.
 */
export async function markInboxFailed(id: string, error: string): Promise<void> {
  const pb = await getAdminPocketBase();

  const entry = await pb.collection(WEBHOOK_INBOX_COLLECTION).getOne<WebhookInboxEntry>(id);
  const newRetryCount = entry.retry_count + 1;

  await pb.collection(WEBHOOK_INBOX_COLLECTION).update(id, {
    status: newRetryCount >= entry.max_retries ? 'failed' : 'pending',
    retry_count: newRetryCount,
    error_message: error,
  });
}

/**
 * Get pending inbox entries older than specified age.
 * Used by cron job to find entries that need processing.
 */
export async function getPendingInboxEntries(
  minAgeMs: number = 30000, // Default: 30 seconds old
  limit: number = 20
): Promise<WebhookInboxEntry[]> {
  const pb = await getAdminPocketBase();

  const cutoff = new Date(Date.now() - minAgeMs).toISOString();

  const result = await pb.collection(WEBHOOK_INBOX_COLLECTION).getList<WebhookInboxEntry>(1, limit, {
    filter: `status = "pending" && created < "${cutoff}"`,
    sort: 'created',
  });

  return result.items;
}

/**
 * Get failed inbox entries for alerting.
 */
export async function getFailedInboxEntries(limit: number = 10): Promise<WebhookInboxEntry[]> {
  const pb = await getAdminPocketBase();

  const result = await pb.collection(WEBHOOK_INBOX_COLLECTION).getList<WebhookInboxEntry>(1, limit, {
    filter: `status = "failed"`,
    sort: '-created',
  });

  return result.items;
}

/**
 * Check if a webhook with given event type and product order IDs already exists.
 * Used for idempotency check.
 */
export async function findExistingInboxEntry(
  eventType: string,
  productOrderIds: string[]
): Promise<WebhookInboxEntry | null> {
  const pb = await getAdminPocketBase();

  // Check for duplicate within last 24 hours
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const orderIdsStr = productOrderIds.join(',');

  try {
    const entry = await pb.collection(WEBHOOK_INBOX_COLLECTION).getFirstListItem<WebhookInboxEntry>(
      `event_type = "${eventType}" && product_order_ids = "${orderIdsStr}" && created > "${cutoff}"`
    );
    return entry;
  } catch {
    return null;
  }
}

/**
 * Parse payload from inbox entry.
 */
export function parseInboxPayload(entry: WebhookInboxEntry): NaverWebhookPayload {
  return JSON.parse(entry.payload) as NaverWebhookPayload;
}
