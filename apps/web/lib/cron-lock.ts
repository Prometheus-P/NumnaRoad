/**
 * Distributed Lock for Cron Jobs
 *
 * Prevents duplicate cron job execution across multiple instances.
 * Uses PocketBase for distributed locking.
 *
 * Features:
 * - Automatic lock expiration (prevents deadlocks)
 * - Instance identification (for debugging)
 * - Graceful fallback when DB unavailable
 *
 * Task: ARCH-002 (Phase 3)
 */

import { getAdminPocketBase } from './pocketbase';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// Types
// =============================================================================

export interface LockOptions {
  /** Lock duration in milliseconds (default: 5 minutes) */
  ttlMs?: number;
  /** Whether to wait and retry if lock is held (default: false) */
  waitForLock?: boolean;
  /** Max wait time in ms if waitForLock is true (default: 30 seconds) */
  maxWaitMs?: number;
  /** Retry interval in ms (default: 1 second) */
  retryIntervalMs?: number;
}

export interface LockResult {
  acquired: boolean;
  lockId?: string;
  heldBy?: string;
  expiresAt?: Date;
}

interface CronLockRecord {
  id: string;
  job_name: string;
  instance_id: string;
  acquired_at: string;
  expires_at: string;
  status: 'active' | 'released' | 'expired';
}

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_WAIT_MS = 30 * 1000; // 30 seconds
const DEFAULT_RETRY_INTERVAL_MS = 1000; // 1 second
const COLLECTION_NAME = 'cron_locks';

// Instance ID for this server instance (persists across function calls)
const INSTANCE_ID = `${process.env.VERCEL_REGION || 'local'}-${uuidv4().slice(0, 8)}`;

// =============================================================================
// Lock Operations
// =============================================================================

/**
 * Try to acquire a distributed lock for a cron job
 *
 * @param jobName - Unique name for the cron job (e.g., 'sync-smartstore-orders')
 * @param options - Lock options
 * @returns Lock result with acquisition status
 */
export async function acquireLock(
  jobName: string,
  options: LockOptions = {}
): Promise<LockResult> {
  const {
    ttlMs = DEFAULT_TTL_MS,
    waitForLock = false,
    maxWaitMs = DEFAULT_MAX_WAIT_MS,
    retryIntervalMs = DEFAULT_RETRY_INTERVAL_MS,
  } = options;

  const startTime = Date.now();

  while (true) {
    const result = await tryAcquireLock(jobName, ttlMs);

    if (result.acquired) {
      return result;
    }

    // If not waiting or max wait exceeded, return failure
    if (!waitForLock || Date.now() - startTime >= maxWaitMs) {
      return result;
    }

    // Wait and retry
    await sleep(retryIntervalMs);
  }
}

/**
 * Single attempt to acquire a lock
 */
async function tryAcquireLock(
  jobName: string,
  ttlMs: number
): Promise<LockResult> {
  try {
    const pb = await getAdminPocketBase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    // Check for existing active lock
    try {
      const existing = await pb
        .collection(COLLECTION_NAME)
        .getFirstListItem<CronLockRecord>(`job_name="${jobName}"`);

      const existingExpiry = new Date(existing.expires_at);

      // Check if existing lock is expired
      if (existingExpiry > now && existing.status === 'active') {
        // Lock is held by another instance
        return {
          acquired: false,
          heldBy: existing.instance_id,
          expiresAt: existingExpiry,
        };
      }

      // Lock is expired or released - update it
      const updated = await pb.collection(COLLECTION_NAME).update<CronLockRecord>(existing.id, {
        instance_id: INSTANCE_ID,
        acquired_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active',
      });

      console.log(
        JSON.stringify({
          level: 'info',
          event: 'cron_lock_acquired',
          jobName,
          instanceId: INSTANCE_ID,
          lockId: updated.id,
          expiresAt: expiresAt.toISOString(),
        })
      );

      return {
        acquired: true,
        lockId: updated.id,
        expiresAt,
      };
    } catch {
      // No existing lock - create new one
      const created = await pb.collection(COLLECTION_NAME).create<CronLockRecord>({
        job_name: jobName,
        instance_id: INSTANCE_ID,
        acquired_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active',
      });

      console.log(
        JSON.stringify({
          level: 'info',
          event: 'cron_lock_acquired',
          jobName,
          instanceId: INSTANCE_ID,
          lockId: created.id,
          expiresAt: expiresAt.toISOString(),
        })
      );

      return {
        acquired: true,
        lockId: created.id,
        expiresAt,
      };
    }
  } catch (error) {
    // Race condition - another instance got the lock first
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      console.log(
        JSON.stringify({
          level: 'info',
          event: 'cron_lock_race_condition',
          jobName,
          instanceId: INSTANCE_ID,
        })
      );

      return {
        acquired: false,
        heldBy: 'unknown (race condition)',
      };
    }

    // DB error - log and proceed without lock (fail-open for availability)
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'cron_lock_error',
        jobName,
        instanceId: INSTANCE_ID,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );

    // Fail-open: allow execution if DB is unavailable
    // This prioritizes availability over strict consistency
    return {
      acquired: true,
      lockId: 'fallback-no-db',
    };
  }
}

/**
 * Release a distributed lock
 *
 * @param jobName - The cron job name
 * @param lockId - The lock ID returned from acquireLock
 */
export async function releaseLock(jobName: string, lockId?: string): Promise<void> {
  // Skip if no valid lock ID
  if (!lockId || lockId === 'fallback-no-db') {
    return;
  }

  try {
    const pb = await getAdminPocketBase();

    await pb.collection(COLLECTION_NAME).update(lockId, {
      status: 'released',
    });

    console.log(
      JSON.stringify({
        level: 'info',
        event: 'cron_lock_released',
        jobName,
        instanceId: INSTANCE_ID,
        lockId,
      })
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'cron_lock_release_error',
        jobName,
        lockId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );
    // Don't throw - lock will expire naturally
  }
}

/**
 * Extend a lock's expiration time
 *
 * Use this for long-running jobs to prevent the lock from expiring
 *
 * @param lockId - The lock ID to extend
 * @param additionalMs - Additional time in milliseconds
 */
export async function extendLock(lockId: string, additionalMs: number): Promise<boolean> {
  if (!lockId || lockId === 'fallback-no-db') {
    return false;
  }

  try {
    const pb = await getAdminPocketBase();
    const lock = await pb.collection(COLLECTION_NAME).getOne<CronLockRecord>(lockId);

    // Only extend if we own the lock
    if (lock.instance_id !== INSTANCE_ID || lock.status !== 'active') {
      return false;
    }

    const newExpiry = new Date(new Date(lock.expires_at).getTime() + additionalMs);

    await pb.collection(COLLECTION_NAME).update(lockId, {
      expires_at: newExpiry.toISOString(),
    });

    return true;
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'cron_lock_extend_error',
        lockId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );
    return false;
  }
}

// =============================================================================
// Higher-Order Function Wrapper
// =============================================================================

/**
 * Wrap a cron job handler with distributed locking
 *
 * @param jobName - Unique name for the cron job
 * @param handler - The cron job handler function
 * @param options - Lock options
 * @returns Wrapped handler that acquires lock before execution
 *
 * @example
 * ```typescript
 * export const GET = withCronLock('sync-smartstore-orders', async (request) => {
 *   // Your cron job logic here
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withCronLock<T>(
  jobName: string,
  handler: (request: Request) => Promise<T>,
  options: LockOptions = {}
): (request: Request) => Promise<T | Response> {
  return async (request: Request): Promise<T | Response> => {
    const lockResult = await acquireLock(jobName, options);

    if (!lockResult.acquired) {
      console.log(
        JSON.stringify({
          level: 'info',
          event: 'cron_job_skipped',
          jobName,
          reason: 'lock_held',
          heldBy: lockResult.heldBy,
          expiresAt: lockResult.expiresAt?.toISOString(),
        })
      );

      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: 'Lock held by another instance',
          heldBy: lockResult.heldBy,
          expiresAt: lockResult.expiresAt?.toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      return await handler(request);
    } finally {
      await releaseLock(jobName, lockResult.lockId);
    }
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get the current instance ID (for debugging)
 */
export function getInstanceId(): string {
  return INSTANCE_ID;
}

/**
 * Clean up expired locks (run periodically)
 */
export async function cleanupExpiredLocks(): Promise<number> {
  try {
    const pb = await getAdminPocketBase();
    const now = new Date().toISOString();

    // Find expired locks
    const expiredLocks = await pb
      .collection(COLLECTION_NAME)
      .getFullList<CronLockRecord>({
        filter: `expires_at < "${now}" && status = "active"`,
      });

    // Mark them as expired
    await Promise.all(
      expiredLocks.map((lock) =>
        pb.collection(COLLECTION_NAME).update(lock.id, { status: 'expired' })
      )
    );

    return expiredLocks.length;
  } catch (error) {
    console.error('Failed to cleanup expired locks:', error);
    return 0;
  }
}
