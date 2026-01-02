/**
 * SmartStore Product Auto-Sync Cron Job
 *
 * Runs daily at 02:00 KST to sync products with auto-sync enabled.
 * Can also be triggered manually with proper authentication.
 *
 * Vercel Cron: Add to vercel.json
 * {
 *   "crons": [{
 *     "path": "/api/cron/smartstore-sync",
 *     "schedule": "0 17 * * *"  // 02:00 KST (17:00 UTC)
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';
import { verifyCronAuth } from '@/lib/admin-auth';
import { acquireLock, releaseLock } from '@/lib/cron-lock';
import { createProductSyncService } from '@services/sales-channels/smartstore/product-sync';
import { logger } from '@/lib/logger';

const JOB_NAME = 'smartstore-product-sync';
const LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes for product sync

/**
 * Log sync result to automation_logs.
 */
async function logSyncResult(
  pb: ReturnType<typeof getAdminPocketBase> extends Promise<infer T> ? T : never,
  result: {
    total: number;
    created: number;
    updated: number;
    failed: number;
    skipped: number;
    durationMs: number;
  },
  error?: string
): Promise<void> {
  try {
    await pb.collection(Collections.AUTOMATION_LOGS).create({
      event_type: 'smartstore_product_sync',
      status: error ? 'failed' : 'success',
      details: {
        ...result,
        error,
        triggeredBy: 'cron',
      },
    });
  } catch (logError) {
    logger.error('smartstore_sync_log_failed', logError);
  }
}

/**
 * GET /api/cron/smartstore-sync
 *
 * Trigger product sync for all auto-sync enabled products.
 * Uses distributed locking to prevent duplicate execution across instances.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret - fails closed if not configured
  const authResult = verifyCronAuth(request);
  if (!authResult.valid) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.error === 'Server misconfigured' ? 500 : 401 }
    );
  }

  // Acquire distributed lock
  const lockResult = await acquireLock(JOB_NAME, { ttlMs: LOCK_TTL_MS });

  if (!lockResult.acquired) {
    logger.info('cron_job_skipped', { job: JOB_NAME, reason: 'lock_held', heldBy: lockResult.heldBy });

    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'Lock held by another instance',
      heldBy: lockResult.heldBy,
    });
  }

  const startTime = Date.now();

  try {
    const pb = await getAdminPocketBase();
    const syncService = createProductSyncService(pb);

    // Run sync for auto-enabled products
    const result = await syncService.syncAutoEnabledProducts();

    // Log the result
    await logSyncResult(pb, {
      total: result.total,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
      skipped: result.skipped,
      durationMs: result.durationMs,
    });

    logger.info('smartstore_sync_completed', {
      created: result.created,
      updated: result.updated,
      failed: result.failed,
      skipped: result.skipped,
      durationMs: result.durationMs,
    });

    return NextResponse.json({
      success: true,
      result: {
        total: result.total,
        created: result.created,
        updated: result.updated,
        failed: result.failed,
        skipped: result.skipped,
        durationMs: result.durationMs,
        syncedAt: result.syncedAt,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('smartstore_sync_failed', error);

    try {
      const pb = await getAdminPocketBase();
      await logSyncResult(
        pb,
        {
          total: 0,
          created: 0,
          updated: 0,
          failed: 0,
          skipped: 0,
          durationMs: Date.now() - startTime,
        },
        errorMessage
      );
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { error: 'Sync failed', message: errorMessage },
      { status: 500 }
    );
  } finally {
    // Always release the lock
    await releaseLock(JOB_NAME, lockResult.lockId);
  }
}

/**
 * POST /api/cron/smartstore-sync
 *
 * Alternative method for triggering sync (useful for testing).
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
