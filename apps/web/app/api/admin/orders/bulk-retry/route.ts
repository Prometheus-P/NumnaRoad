import { NextRequest, NextResponse } from 'next/server';
import { Collections } from '@/lib/pocketbase';
import { withAdminAuth } from '@/lib/admin-auth';
import { isRetryableOrder } from '@/hooks/admin';
import { logger } from '@/lib/logger';

// PocketBase ID format validation
const ID_REGEX = /^[a-zA-Z0-9]{15}$/;

/**
 * Bulk Retry Failed Orders
 * POST /api/admin/orders/bulk-retry
 *
 * Body: { orderIds: string[] }
 *
 * Resets selected failed orders to 'pending' status for automatic retry.
 */

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (pb) => {
    try {
      const body = await request.json();
      const { orderIds } = body;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return NextResponse.json(
          { error: 'orderIds array is required' },
          { status: 400 }
        );
      }

      // Limit batch size
      if (orderIds.length > 100) {
        return NextResponse.json(
          { error: 'Maximum 100 orders can be retried at once' },
          { status: 400 }
        );
      }

      // Validate all order IDs format before processing
      const invalidIds = orderIds.filter((id: unknown) => typeof id !== 'string' || !ID_REGEX.test(id));
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: 'Invalid order ID format detected' },
          { status: 400 }
        );
      }

      const results = {
        total: orderIds.length,
        retried: 0,
        skipped: 0,
        failed: 0,
        details: [] as { orderId: string; status: 'retried' | 'skipped' | 'failed'; reason?: string }[],
      };

      for (const orderId of orderIds) {
        try {
          // Fetch current order
          const order = await pb.collection(Collections.ORDERS).getOne(orderId);

          // Check if order can be retried
          if (!isRetryableOrder(order.status)) {
            results.skipped++;
            results.details.push({
              orderId,
              status: 'skipped',
              reason: `Current status '${order.status}' cannot be retried`,
            });
            continue;
          }

          // Reset order to pending
          await pb.collection(Collections.ORDERS).update(orderId, {
            status: 'pending',
            error_message: `Manual bulk retry from admin (was: ${order.status})`,
          });

          // Log the retry
          try {
            await pb.collection(Collections.AUTOMATION_LOGS).create({
              orderId,
              stepName: 'bulk_retry_initiated',
              status: 'success',
              metadata: {
                previousStatus: order.status,
                initiatedBy: 'admin',
              },
            });
          } catch {
            // Log failure doesn't block retry
          }

          results.retried++;
          results.details.push({
            orderId,
            status: 'retried',
          });
        } catch (error) {
          results.failed++;
          results.details.push({
            orderId,
            status: 'failed',
            reason: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Retried ${results.retried} of ${results.total} orders`,
        ...results,
      });
    } catch (error) {
      logger.error('admin_orders_bulk_retry_failed', error);
      return NextResponse.json(
        { error: 'Failed to process bulk retry' },
        { status: 500 }
      );
    }
  });
}
