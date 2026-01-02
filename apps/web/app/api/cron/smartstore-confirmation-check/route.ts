import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase } from '@/lib/pocketbase';
import { verifyCronAuth } from '@/lib/admin-auth';
import { acquireLock, releaseLock } from '@/lib/cron-lock';
import { notifyCustom } from '@services/notifications/discord-notifier';
import { logger } from '@/lib/logger';

const JOB_NAME = 'smartstore-confirmation-check';
const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Cron Job: SmartStore Confirmation Timeout Check
 *
 * Finds SmartStore orders stuck in awaiting_confirmation for 3+ days
 * and sends Discord notifications for admin attention.
 *
 * POST /api/cron/smartstore-confirmation-check
 */

// Orders older than 3 days without confirmation
const TIMEOUT_DAYS = 3;
const TIMEOUT_MS = TIMEOUT_DAYS * 24 * 60 * 60 * 1000;

interface AwaitingOrder {
  id: string;
  order_id: string;
  external_order_id: string;
  customer_email: string;
  customer_name: string;
  amount: number;
  product_name: string;
  created: string;
  updated: string;
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
    logger.info('cron_job_skipped', { job: JOB_NAME, reason: 'lock_held', heldBy: lockResult.heldBy });

    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'Lock held by another instance',
      heldBy: lockResult.heldBy,
    });
  }

  try {
    const pb = await getAdminPocketBase();
    const cutoffTime = new Date(Date.now() - TIMEOUT_MS).toISOString();

    // Find SmartStore orders stuck in awaiting_confirmation
    const stuckOrders = await pb.collection('orders').getList<AwaitingOrder>(1, 50, {
      filter: `status = "awaiting_confirmation" && sales_channel = "smartstore" && created < "${cutoffTime}"`,
      sort: 'created',
    });

    if (stuckOrders.items.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stuck orders found',
        count: 0,
      });
    }

    // Build Discord notification
    const orderLines = stuckOrders.items.map((order) => {
      const daysAgo = Math.floor(
        (Date.now() - new Date(order.created).getTime()) / (24 * 60 * 60 * 1000)
      );
      return `- **${order.order_id}**: ${order.customer_name || order.customer_email} - ₩${order.amount.toLocaleString()} (${daysAgo}일 전)`;
    });

    const discordMessage = [
      `**[SmartStore] ${stuckOrders.items.length}건 구매확정 대기 중**`,
      '',
      `3일 이상 구매확정 되지 않은 주문입니다.`,
      `고객에게 구매확정을 안내하거나, 필요시 환불 처리를 검토해주세요.`,
      '',
      ...orderLines,
    ].join('\n');

    // Send Discord notification
    await notifyCustom(
      'SmartStore 구매확정 대기',
      discordMessage,
      'warning'
    );

    logger.info('smartstore_confirmation_timeout_check', {
      count: stuckOrders.items.length,
      orderIds: stuckOrders.items.map((o) => o.order_id),
    });

    return NextResponse.json({
      success: true,
      message: `Found ${stuckOrders.items.length} orders awaiting confirmation for ${TIMEOUT_DAYS}+ days`,
      count: stuckOrders.items.length,
      orders: stuckOrders.items.map((o) => ({
        orderId: o.order_id,
        externalOrderId: o.external_order_id,
        customer: o.customer_name || o.customer_email,
        amount: o.amount,
        createdAt: o.created,
      })),
    });
  } catch (error) {
    logger.error('cron_job_error', error, { job: JOB_NAME });
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
