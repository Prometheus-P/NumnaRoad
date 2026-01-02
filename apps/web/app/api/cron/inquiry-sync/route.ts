import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase } from '@/lib/pocketbase';
import { acquireLock, releaseLock } from '@/lib/cron-lock';
import { createInquiryService } from '@services/customer-inquiry/inquiry-service';
import { logger } from '@/lib/logger';

const LOCK_NAME = 'inquiry-sync';

/**
 * GET /api/cron/inquiry-sync
 * Sync inquiries from all enabled channels
 *
 * Should be called every 5 minutes by external cron service
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Acquire lock to prevent concurrent execution
  const lockResult = await acquireLock(LOCK_NAME);
  if (!lockResult.acquired) {
    logger.info('inquiry_sync_skipped_lock_held');
    return NextResponse.json({
      success: true,
      skipped: true,
      message: 'Another sync is already running',
    });
  }

  try {
    logger.info('inquiry_sync_started');

    const pb = await getAdminPocketBase();

    const service = createInquiryService(pb);
    const result = await service.syncFromAllChannels();

    // Check for urgent inquiries and send notification
    if (result.synced > 0) {
      await notifyNewInquiries(pb, result.synced);
    }

    const duration = Date.now() - startTime;

    logger.info('inquiry_sync_completed', { synced: result.synced, errors: result.errors.length, durationMs: duration });

    return NextResponse.json({
      success: result.errors.length === 0,
      synced: result.synced,
      errors: result.errors,
      duration,
    });
  } catch (error) {
    logger.error('inquiry_sync_fatal_error', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await releaseLock(LOCK_NAME, lockResult.lockId);
  }
}

/**
 * Send notification for new inquiries
 */
async function notifyNewInquiries(pb: Awaited<ReturnType<typeof getAdminPocketBase>>, count: number): Promise<void> {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_ERROR_CHAT_ID;

  if (!telegramBotToken || !telegramChatId) {
    return;
  }

  // Check for urgent/high priority inquiries
  const urgentInquiries = await pb.collection('inquiries').getList(1, 10, {
    filter: `status = "new" && (priority = "urgent" || priority = "high")`,
    sort: '-created',
  });

  if (urgentInquiries.items.length === 0) {
    return;
  }

  const message = [
    `🚨 *New Customer Inquiries*`,
    ``,
    `Total new: ${count}`,
    `Urgent/High priority: ${urgentInquiries.items.length}`,
    ``,
    `Recent urgent inquiries:`,
    ...urgentInquiries.items.slice(0, 3).map((item) => {
      const channel = (item.channel as string).toUpperCase();
      const subject = ((item.subject as string) || 'No subject').slice(0, 50);
      return `• [${channel}] ${subject}`;
    }),
    ``,
    `[View in Admin](${process.env.NEXT_PUBLIC_BASE_URL}/admin/inquiries)`,
  ].join('\n');

  try {
    await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
  } catch (error) {
    logger.error('inquiry_sync_telegram_notification_failed', error);
  }
}

/**
 * POST /api/cron/inquiry-sync
 * Manual trigger for inquiry sync
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
