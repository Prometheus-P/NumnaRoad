import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const logs = await pb.collection(Collections.SMARTSTORE_SYNC_LOGS).getList(1, limit, {
      sort: '-timestamp',
    });

    const result = logs.items.map((log) => ({
      id: log.id,
      timestamp: log.timestamp || log.created,
      message: log.message,
      ordersFound: log.orders_found || 0,
      ordersProcessed: log.orders_processed || 0,
      durationMs: log.duration_ms,
      errors: log.errors,
    }));

    return NextResponse.json(result);
  } catch (error) {
    // Collection might not exist yet, return empty array
    logger.warn('smartstore_sync_logs_fetch_failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();
    const body = await request.json();

    const log = await pb.collection(Collections.SMARTSTORE_SYNC_LOGS).create({
      timestamp: body.timestamp || new Date().toISOString(),
      message: body.message,
      orders_found: body.ordersFound || 0,
      orders_processed: body.ordersProcessed || 0,
      duration_ms: body.durationMs || 0,
      errors: body.errors || null,
    });

    return NextResponse.json({
      success: true,
      log,
    });
  } catch (error) {
    logger.error('smartstore_sync_log_create_failed', error);
    return NextResponse.json(
      { error: 'Failed to create sync log' },
      { status: 500 }
    );
  }
}
