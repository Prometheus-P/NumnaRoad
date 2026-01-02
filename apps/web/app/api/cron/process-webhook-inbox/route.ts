import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/admin-auth';
import { acquireLock, releaseLock } from '@/lib/cron-lock';
import {
  getPendingInboxEntries,
  markInboxProcessing,
  getFailedInboxEntries,
} from '@/lib/webhook-inbox';
import { processWebhookFromInbox } from '@/app/api/webhooks/smartstore/route';
import { notifyCustom } from '@services/notifications/discord-notifier';

/**
 * Cron Job: Process Webhook Inbox
 *
 * Processes pending webhook entries from the inbox (Dead Letter Queue).
 * Handles webhooks that failed initial processing or were queued for retry.
 * Runs every minute via Vercel Cron.
 *
 * Uses distributed locking to prevent duplicate execution.
 *
 * POST /api/cron/process-webhook-inbox
 */

const JOB_NAME = 'process-webhook-inbox';

// Minimum age for pending entries (30 seconds - give initial processing a chance)
const MIN_PENDING_AGE_MS = 30 * 1000;

// Lock TTL (45 seconds - job should complete quickly)
const LOCK_TTL_MS = 45 * 1000;

// Maximum entries to process per run
const MAX_ENTRIES_PER_RUN = 20;

export async function POST(request: NextRequest) {
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
    console.log(JSON.stringify({
      level: 'info',
      event: 'cron_job_skipped',
      job: JOB_NAME,
      reason: 'lock_held',
      heldBy: lockResult.heldBy,
      expiresAt: lockResult.expiresAt?.toISOString(),
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'Lock held by another instance',
      heldBy: lockResult.heldBy,
    });
  }

  try {
    // Get pending entries older than 30 seconds
    const pendingEntries = await getPendingInboxEntries(MIN_PENDING_AGE_MS, MAX_ENTRIES_PER_RUN);

    // Also check for permanently failed entries to alert
    const failedEntries = await getFailedInboxEntries(5);
    if (failedEntries.length > 0) {
      // Alert about permanently failed webhooks
      await notifyCustom(
        'Webhook Inbox: 영구 실패 항목',
        `${failedEntries.length}개의 웹훅이 최대 재시도 횟수를 초과했습니다.\n\n` +
          failedEntries
            .map((e) => `- ${e.event_type}: ${e.error_message?.substring(0, 100)}`)
            .join('\n'),
        'error'
      );
    }

    if (pendingEntries.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending webhook entries',
        processed: 0,
        failedCount: failedEntries.length,
      });
    }

    console.log(JSON.stringify({
      level: 'info',
      event: 'processing_inbox_entries',
      job: JOB_NAME,
      count: pendingEntries.length,
      timestamp: new Date().toISOString(),
    }));

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const entry of pendingEntries) {
      results.processed++;

      // Try to mark as processing (optimistic locking)
      const acquired = await markInboxProcessing(entry.id);
      if (!acquired) {
        // Another worker already processing this entry
        results.skipped++;
        continue;
      }

      try {
        // Process the webhook
        await processWebhookFromInbox(entry);
        results.succeeded++;

        console.log(JSON.stringify({
          level: 'info',
          event: 'inbox_entry_processed',
          entryId: entry.id,
          eventType: entry.event_type,
          correlationId: entry.correlation_id,
          retryCount: entry.retry_count,
          timestamp: new Date().toISOString(),
        }));
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Entry ${entry.id}: ${errorMessage}`);

        console.error(JSON.stringify({
          level: 'error',
          event: 'inbox_entry_failed',
          entryId: entry.id,
          eventType: entry.event_type,
          correlationId: entry.correlation_id,
          retryCount: entry.retry_count,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        }));

        // Alert if this was a significant failure
        if (entry.retry_count >= 3) {
          await notifyCustom(
            'Webhook 재처리 반복 실패',
            `웹훅이 ${entry.retry_count + 1}회 실패했습니다.\n\n` +
              `Event: ${entry.event_type}\n` +
              `CorrelationId: ${entry.correlation_id}\n` +
              `Error: ${errorMessage}`,
            'warning'
          );
        }
      }
    }

    console.log(JSON.stringify({
      level: 'info',
      event: 'cron_job_completed',
      job: JOB_NAME,
      results,
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} inbox entries`,
      ...results,
      failedEntriesCount: failedEntries.length,
    });
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      event: 'cron_job_error',
      job: JOB_NAME,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    // Always release the lock
    await releaseLock(JOB_NAME, lockResult.lockId);
  }
}

// Also support GET for manual triggering (with auth)
export async function GET(request: NextRequest) {
  return POST(request);
}
