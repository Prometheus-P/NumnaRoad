import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // The actual sync is done by the Oracle VM cron job
    // This endpoint just triggers a notification or logs the manual sync request
    console.log('[SmartStore] Manual sync triggered from admin panel');

    // Could also call the Oracle VM sync endpoint if needed
    // For now, just return success
    return NextResponse.json({
      success: true,
      message: 'Sync request submitted. The sync job runs every 5 minutes on the Oracle VM.',
    });
  } catch (error) {
    console.error('Failed to trigger sync:', error);
    return NextResponse.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}
