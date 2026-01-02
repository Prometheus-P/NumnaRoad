import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(_request: NextRequest) {
  try {
    // The actual sync is done by the Oracle VM cron job
    // This endpoint just triggers a notification or logs the manual sync request
    logger.info('smartstore_manual_sync_triggered');

    // Could also call the Oracle VM sync endpoint if needed
    // For now, just return success
    return NextResponse.json({
      success: true,
      message: 'Sync request submitted. The sync job runs every 5 minutes on the Oracle VM.',
    });
  } catch (error) {
    logger.error('smartstore_sync_trigger_failed', error);
    return NextResponse.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}
