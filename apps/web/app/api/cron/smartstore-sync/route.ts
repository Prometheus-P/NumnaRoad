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
import { createProductSyncService } from '@services/sales-channels/smartstore/product-sync';

/**
 * Verify cron secret for security.
 */
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow without secret
  if (process.env.NODE_ENV === 'development' && !cronSecret) {
    return true;
  }

  // Vercel cron jobs include this header
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  if (vercelCronHeader) {
    return true;
  }

  // Manual trigger with secret
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

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
    console.error('Failed to log sync result:', logError);
  }
}

/**
 * GET /api/cron/smartstore-sync
 *
 * Trigger product sync for all auto-sync enabled products.
 */
export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
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

    console.log(
      `[Cron] SmartStore sync completed: ${result.created} created, ${result.updated} updated, ${result.failed} failed, ${result.skipped} skipped in ${result.durationMs}ms`
    );

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
    console.error('[Cron] SmartStore sync failed:', errorMessage);

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
