import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase } from '@/lib/pocketbase';
import { verifyCronAuth } from '@/lib/admin-auth';
import { acquireLock, releaseLock } from '@/lib/cron-lock';

/**
 * Cron Job: Retry Stuck Orders
 *
 * Finds orders stuck in intermediate states and retries fulfillment.
 * Runs every 5 minutes via Vercel Cron.
 *
 * Uses distributed locking to prevent duplicate execution across instances.
 *
 * POST /api/cron/retry-stuck-orders
 */

const JOB_NAME = 'retry-stuck-orders';

// Stuck order states that need retry
const STUCK_STATES = ['fulfillment_started', 'payment_received'];

// Max age for stuck orders (5 minutes)
const MAX_STUCK_AGE_MS = 5 * 60 * 1000;

// Lock TTL (3 minutes - should complete well before next run)
const LOCK_TTL_MS = 3 * 60 * 1000;

interface StuckOrder {
  id: string;
  order_id: string;
  status: string;
  updated: string;
  correlation_id: string;
}

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
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'cron_job_skipped',
        job: JOB_NAME,
        reason: 'lock_held',
        heldBy: lockResult.heldBy,
        expiresAt: lockResult.expiresAt?.toISOString(),
      })
    );

    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'Lock held by another instance',
      heldBy: lockResult.heldBy,
    });
  }

  try {
    const pb = await getAdminPocketBase();
    const cutoffTime = new Date(Date.now() - MAX_STUCK_AGE_MS).toISOString();

    // Find orders stuck in intermediate states
    const stuckOrders = await pb.collection('orders').getList<StuckOrder>(1, 50, {
      filter: `(status = "fulfillment_started" || status = "payment_received") && updated < "${cutoffTime}"`,
      sort: 'updated',
    });

    if (stuckOrders.items.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stuck orders found',
        processed: 0,
      });
    }

    const results = {
      processed: 0,
      retried: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const order of stuckOrders.items) {
      results.processed++;

      try {
        // Mark order for retry by transitioning to pending
        await pb.collection('orders').update(order.id, {
          status: 'pending',
          error_message: `Auto-retry: was stuck in ${order.status}`,
        });
        results.retried++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Order ${order.order_id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    console.log(
      JSON.stringify({
        level: 'info',
        event: 'cron_job_completed',
        job: JOB_NAME,
        results,
      })
    );

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} stuck orders`,
      ...results,
    });
  } catch (error) {
    console.error('Cron job error:', error);
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
