/**
 * SmartStore Product Sync API
 *
 * POST - Trigger product sync operations
 * GET  - Get sync status summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase } from '@/lib/pocketbase';
import { createProductSyncService } from '@services/sales-channels/smartstore/product-sync';

/**
 * GET /api/admin/smartstore/products/sync
 *
 * Get sync status summary.
 */
export async function GET() {
  try {
    const pb = await getAdminPocketBase();
    const syncService = createProductSyncService(pb);

    const summary = await syncService.getSyncStatusSummary();

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/smartstore/products/sync
 *
 * Trigger product sync.
 *
 * Body options:
 * - mode: 'all' | 'auto' | 'selected'
 * - productIds: string[] (required if mode is 'selected')
 * - forceUpdate: boolean (optional, default false)
 * - dryRun: boolean (optional, default false)
 */
export async function POST(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();
    const body = await request.json();

    const {
      mode = 'auto',
      productIds = [],
      forceUpdate = false,
      dryRun = false,
    } = body;

    const syncService = createProductSyncService(pb);
    const syncOptions = { forceUpdate, dryRun };

    let result;

    switch (mode) {
      case 'all':
        // Sync all active products
        result = await syncService.syncAllActiveProducts(syncOptions);
        break;

      case 'auto':
        // Sync only products with auto-sync enabled
        result = await syncService.syncAutoEnabledProducts(syncOptions);
        break;

      case 'selected':
        // Sync specific products
        if (!productIds || productIds.length === 0) {
          return NextResponse.json(
            { error: 'Product IDs are required for selected mode' },
            { status: 400 }
          );
        }
        result = await syncService.syncProducts(productIds, syncOptions);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid sync mode' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      mode,
      dryRun,
      result: {
        total: result.total,
        created: result.created,
        updated: result.updated,
        failed: result.failed,
        skipped: result.skipped,
        durationMs: result.durationMs,
        syncedAt: result.syncedAt,
      },
      // Include detailed results only for small batches
      details: result.total <= 50 ? result.results : undefined,
    });
  } catch (error) {
    console.error('Failed to sync products:', error);
    return NextResponse.json(
      { error: 'Failed to sync products' },
      { status: 500 }
    );
  }
}
