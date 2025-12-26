import { NextRequest, NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';

/**
 * Cron Job: Retry Stuck Orders
 *
 * Finds orders stuck in intermediate states and retries fulfillment.
 * Runs every 5 minutes via Vercel Cron.
 *
 * POST /api/cron/retry-stuck-orders
 */

// Stuck order states that need retry
const STUCK_STATES = ['fulfillment_started', 'payment_received'];

// Max age for stuck orders (5 minutes)
const MAX_STUCK_AGE_MS = 5 * 60 * 1000;

interface StuckOrder {
  id: string;
  order_id: string;
  status: string;
  updated: string;
  correlation_id: string;
}

export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
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
  }
}

// Also support GET for manual triggering (with auth)
export async function GET(request: NextRequest) {
  return POST(request);
}
