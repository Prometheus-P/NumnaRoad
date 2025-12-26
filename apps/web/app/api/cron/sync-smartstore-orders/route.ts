import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cron/sync-smartstore-orders
 * Vercel Cron job to sync orders from SmartStore
 *
 * This endpoint is called by Vercel Cron every 5 minutes
 * to fetch new orders from SmartStore and create them in PocketBase.
 *
 * @see https://vercel.com/docs/cron-jobs
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // TODO: Implement SmartStore order sync
    // 1. Fetch new orders from SmartStore API
    // 2. Filter orders that are not yet in PocketBase
    // 3. Create orders in PocketBase
    // 4. Trigger n8n workflow for each new order

    // Placeholder response
    const result = {
      success: true,
      message: 'SmartStore order sync completed',
      syncedOrders: 0,
      timestamp: new Date().toISOString(),
    };

    console.log('[Cron] SmartStore sync:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Cron] SmartStore sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 }
    );
  }
}
