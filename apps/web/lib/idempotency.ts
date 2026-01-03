/**
 * Webhook Idempotency Module
 *
 * Provides robust idempotency for webhook handlers to prevent duplicate processing.
 * Uses PocketBase collection with TTL-based expiration.
 *
 * Flow:
 * 1. acquireIdempotencyLock() - atomic check-and-set, returns existing result if duplicate
 * 2. Process webhook (if lock acquired)
 * 3. completeIdempotency() or failIdempotency() - mark final status
 *
 * TTL: 24 hours (configurable)
 */

import { getAdminPocketBase } from './pocketbase';
import { logger, createLogger, type Logger } from './logger';
import { pbRetry } from './pocketbase-retry';

// =============================================================================
// Types
// =============================================================================

export type IdempotencySource = 'stripe' | 'smartstore' | 'airalo' | 'other';
export type IdempotencyStatus = 'processing' | 'completed' | 'failed';

export interface IdempotencyRecord {
  id: string;
  key: string;
  source: IdempotencySource;
  status: IdempotencyStatus;
  response: unknown;
  expires_at: string;
  correlation_id: string;
  metadata: Record<string, unknown>;
  created: string;
  updated: string;
}

export interface IdempotencyLockResult {
  /** Whether the lock was acquired (false if duplicate) */
  acquired: boolean;
  /** The idempotency record (existing or newly created) */
  record: IdempotencyRecord;
  /** Logger with correlation ID for this request */
  log: Logger;
}

export interface IdempotencyOptions {
  /** TTL in hours (default: 24) */
  ttlHours?: number;
  /** Optional metadata to store */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Constants
// =============================================================================

const COLLECTION = 'idempotency_keys';
const DEFAULT_TTL_HOURS = 24;

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Attempt to acquire an idempotency lock for a webhook request.
 *
 * If the key doesn't exist, creates a new record with status='processing'.
 * If the key exists, returns the existing record (duplicate detected).
 *
 * @param key - Unique idempotency key (e.g., event ID, payment intent ID)
 * @param source - Source system identifier
 * @param correlationId - Request correlation ID for tracing
 * @param options - Optional configuration
 * @returns Lock result with acquisition status and record
 *
 * @example
 * ```typescript
 * const { acquired, record, log } = await acquireIdempotencyLock(
 *   `stripe:${event.id}`,
 *   'stripe',
 *   correlationId
 * );
 *
 * if (!acquired) {
 *   // Duplicate request - return cached response
 *   return NextResponse.json(record.response);
 * }
 *
 * // Process webhook...
 * await completeIdempotency(record.id, response);
 * ```
 */
export async function acquireIdempotencyLock(
  key: string,
  source: IdempotencySource,
  correlationId: string,
  options: IdempotencyOptions = {}
): Promise<IdempotencyLockResult> {
  const log = createLogger(correlationId);
  const { ttlHours = DEFAULT_TTL_HOURS, metadata = {} } = options;

  try {
    const pb = await getAdminPocketBase();

    // Check for existing record
    const existing = await pbRetry(async () => {
      try {
        const records = await pb.collection(COLLECTION).getList<IdempotencyRecord>(1, 1, {
          filter: `key = "${escapeFilterValue(key)}"`,
        });
        return records.items[0] || null;
      } catch (error) {
        // Collection might not exist yet in development
        if (String(error).includes('not found')) {
          return null;
        }
        throw error;
      }
    });

    if (existing) {
      log.info('idempotency_duplicate_detected', {
        key,
        source,
        existingStatus: existing.status,
        existingCreated: existing.created,
      });

      return {
        acquired: false,
        record: existing,
        log,
      };
    }

    // Create new record with atomic insert
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    const newRecord = await pbRetry(async () => {
      try {
        return await pb.collection(COLLECTION).create<IdempotencyRecord>({
          key,
          source,
          status: 'processing',
          response: null,
          expires_at: expiresAt,
          correlation_id: correlationId,
          metadata,
        });
      } catch (error) {
        // Handle race condition - another request created the record
        if (String(error).includes('unique') || String(error).includes('UNIQUE')) {
          const records = await pb.collection(COLLECTION).getList<IdempotencyRecord>(1, 1, {
            filter: `key = "${escapeFilterValue(key)}"`,
          });
          if (records.items[0]) {
            return { ...records.items[0], _duplicate: true } as IdempotencyRecord & { _duplicate: boolean };
          }
        }
        throw error;
      }
    });

    // Check if this was a race condition duplicate
    if ('_duplicate' in newRecord && newRecord._duplicate) {
      log.info('idempotency_race_condition_duplicate', {
        key,
        source,
      });

      return {
        acquired: false,
        record: newRecord,
        log,
      };
    }

    log.info('idempotency_lock_acquired', {
      key,
      source,
      recordId: newRecord.id,
      expiresAt,
    });

    return {
      acquired: true,
      record: newRecord,
      log,
    };
  } catch (error) {
    log.error('idempotency_lock_failed', error, { key, source });
    throw error;
  }
}

/**
 * Mark an idempotency record as completed with response data.
 *
 * @param recordId - The idempotency record ID
 * @param response - Response data to cache for duplicate requests
 */
export async function completeIdempotency(
  recordId: string,
  response: unknown
): Promise<void> {
  try {
    const pb = await getAdminPocketBase();

    await pbRetry(async () => {
      await pb.collection(COLLECTION).update(recordId, {
        status: 'completed',
        response,
      });
    });

    logger.info('idempotency_completed', { recordId });
  } catch (error) {
    logger.error('idempotency_complete_failed', error, { recordId });
    throw error;
  }
}

/**
 * Mark an idempotency record as failed.
 *
 * @param recordId - The idempotency record ID
 * @param error - Error information to store
 */
export async function failIdempotency(
  recordId: string,
  error: Error | string
): Promise<void> {
  try {
    const pb = await getAdminPocketBase();

    const errorData = error instanceof Error
      ? { message: error.message, name: error.name }
      : { message: String(error) };

    await pbRetry(async () => {
      await pb.collection(COLLECTION).update(recordId, {
        status: 'failed',
        response: { error: errorData },
      });
    });

    logger.info('idempotency_failed', { recordId, error: errorData.message });
  } catch (updateError) {
    logger.error('idempotency_fail_update_failed', updateError, { recordId });
    // Don't throw - original error is more important
  }
}

/**
 * Get cached response for a completed idempotency record.
 * Returns null if record doesn't exist or is not completed.
 *
 * @param key - The idempotency key
 */
export async function getIdempotencyResponse(key: string): Promise<unknown | null> {
  try {
    const pb = await getAdminPocketBase();

    const records = await pbRetry(async () => {
      return pb.collection(COLLECTION).getList<IdempotencyRecord>(1, 1, {
        filter: `key = "${escapeFilterValue(key)}" && status = "completed"`,
      });
    });

    return records.items[0]?.response ?? null;
  } catch (error) {
    logger.error('idempotency_get_response_failed', error, { key });
    return null;
  }
}

/**
 * Clean up expired idempotency records.
 * Call this periodically (e.g., daily cron job).
 *
 * @returns Number of records deleted
 */
export async function cleanupExpiredIdempotencyKeys(): Promise<number> {
  try {
    const pb = await getAdminPocketBase();
    const now = new Date().toISOString();

    // Get expired records
    const expired = await pbRetry(async () => {
      return pb.collection(COLLECTION).getList<IdempotencyRecord>(1, 100, {
        filter: `expires_at < "${now}"`,
      });
    });

    if (expired.items.length === 0) {
      logger.info('idempotency_cleanup_none_expired');
      return 0;
    }

    // Delete expired records
    let deleted = 0;
    for (const record of expired.items) {
      try {
        await pb.collection(COLLECTION).delete(record.id);
        deleted++;
      } catch (error) {
        logger.warn('idempotency_cleanup_delete_failed', {
          recordId: record.id,
          error: String(error),
        });
      }
    }

    logger.info('idempotency_cleanup_completed', {
      expired: expired.items.length,
      deleted,
      totalItems: expired.totalItems,
    });

    return deleted;
  } catch (error) {
    logger.error('idempotency_cleanup_failed', error);
    throw error;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Escape special characters in PocketBase filter values.
 * Prevents filter injection attacks.
 */
function escapeFilterValue(value: string): string {
  if (!value) return '';
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Create a composite idempotency key.
 * Use this to create keys from multiple components.
 *
 * @example
 * const key = createIdempotencyKey('stripe', eventId, paymentIntentId);
 * // Returns: "stripe:evt_xxx:pi_xxx"
 */
export function createIdempotencyKey(...parts: string[]): string {
  return parts.filter(Boolean).join(':');
}
