/**
 * Order Retry API
 *
 * POST /api/admin/orders/[id]/retry
 * Resets a failed order to 'pending' status for automatic retry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Collections } from '@/lib/pocketbase';
import { withAdminAuth } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';

// Order states that can be retried
const RETRYABLE_STATES = [
  'failed',
  'provider_failed',
  'pending_manual_fulfillment',
  'fulfillment_started',
  'payment_received',
] as const;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Validate ID format (PocketBase IDs are 15-char alphanumeric)
  if (!/^[a-zA-Z0-9]{15}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid order ID format' }, { status: 400 });
  }

  return withAdminAuth(request, async (pb) => {
    try {
      // Fetch current order
      const order = await pb.collection(Collections.ORDERS).getOne(id);

      // Check if order can be retried
      if (!RETRYABLE_STATES.includes(order.status as (typeof RETRYABLE_STATES)[number])) {
        return NextResponse.json(
          {
            error: `Cannot retry order with status '${order.status}'`,
            allowedStatuses: RETRYABLE_STATES,
          },
          { status: 400 }
        );
      }

      const previousStatus = order.status;

      // Reset order to pending for automatic fulfillment
      const updatedOrder = await pb.collection(Collections.ORDERS).update(id, {
        status: 'pending',
        error_message: `Manual retry from admin (was: ${previousStatus})`,
      });

      // Log the retry attempt
      try {
        await pb.collection(Collections.AUTOMATION_LOGS).create({
          orderId: id,
          stepName: 'manual_retry_initiated',
          status: 'success',
          metadata: {
            previousStatus,
            initiatedBy: 'admin',
          },
        });
      } catch {
        // Log failure doesn't block retry
        logger.warn('automation_log_create_failed', { orderId: id, stepName: 'manual_retry' });
      }

      logger.info('admin_order_retry_success', {
        orderId: id,
        previousStatus,
        newStatus: 'pending',
      });

      return NextResponse.json({
        success: true,
        message: 'Order queued for retry',
        order: {
          id: updatedOrder.id,
          previousStatus,
          currentStatus: updatedOrder.status,
        },
      });
    } catch (error) {
      logger.error('admin_order_retry_failed', error, { orderId: id });

      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      return NextResponse.json(
        { error: 'Failed to retry order' },
        { status: 500 }
      );
    }
  });
}
