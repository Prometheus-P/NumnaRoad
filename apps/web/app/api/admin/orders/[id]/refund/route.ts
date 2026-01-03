/**
 * Order Refund API
 *
 * POST /api/admin/orders/[id]/refund
 * Processes a refund for a paid order via Stripe.
 *
 * Body: {
 *   reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other';
 *   amount?: number;  // Partial refund amount (optional, full refund if not specified)
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { Collections } from '@/lib/pocketbase';
import { withAdminAuth } from '@/lib/admin-auth';
import { getStripe } from '@/lib/stripe';
import { logger } from '@/lib/logger';

// Order states that can be refunded
const REFUNDABLE_STATES = [
  'delivered',
  'pending_manual_fulfillment',
  'provider_failed',
  'failed',
] as const;

// Valid Stripe refund reasons
const VALID_REFUND_REASONS = [
  'duplicate',
  'fraudulent',
  'requested_by_customer',
] as const;

type RefundReason = (typeof VALID_REFUND_REASONS)[number];

interface RefundRequestBody {
  reason?: RefundReason | 'other';
  amount?: number;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Validate ID format
  if (!/^[a-zA-Z0-9]{15}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid order ID format' }, { status: 400 });
  }

  return withAdminAuth(request, async (pb) => {
    try {
      // Parse request body
      let body: RefundRequestBody = {};
      try {
        body = await request.json();
      } catch {
        // Empty body is OK (full refund with no reason)
      }

      const { reason, amount } = body;

      // Validate reason if provided
      if (reason && reason !== 'other' && !VALID_REFUND_REASONS.includes(reason as RefundReason)) {
        return NextResponse.json(
          {
            error: 'Invalid refund reason',
            validReasons: [...VALID_REFUND_REASONS, 'other'],
          },
          { status: 400 }
        );
      }

      // Validate amount if provided
      if (amount !== undefined) {
        if (typeof amount !== 'number' || amount <= 0) {
          return NextResponse.json(
            { error: 'Amount must be a positive number' },
            { status: 400 }
          );
        }
      }

      // Fetch order
      const order = await pb.collection(Collections.ORDERS).getOne(id);

      // Check if order can be refunded
      if (!REFUNDABLE_STATES.includes(order.status as (typeof REFUNDABLE_STATES)[number])) {
        return NextResponse.json(
          {
            error: `Cannot refund order with status '${order.status}'`,
            allowedStatuses: REFUNDABLE_STATES,
          },
          { status: 400 }
        );
      }

      // Check if order has been paid
      if (order.payment_status !== 'paid') {
        return NextResponse.json(
          { error: 'Order has not been paid' },
          { status: 400 }
        );
      }

      // Get payment intent ID from metadata or Stripe session
      const paymentIntentId = order.metadata?.stripe_payment_intent_id ||
                               order.metadata?.paymentIntentId ||
                               order.stripe_payment_intent_id;

      if (!paymentIntentId) {
        return NextResponse.json(
          { error: 'No payment intent found for this order. Cannot process refund.' },
          { status: 400 }
        );
      }

      // Check if already refunded
      if (order.metadata?.refunded || order.payment_status === 'refunded') {
        return NextResponse.json(
          { error: 'Order has already been refunded' },
          { status: 400 }
        );
      }

      // Process refund via Stripe
      const stripe = getStripe();

      const refundParams: {
        payment_intent: string;
        reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
        amount?: number;
        metadata: Record<string, string>;
      } = {
        payment_intent: paymentIntentId,
        metadata: {
          order_id: id,
          admin_refund: 'true',
        },
      };

      // Add reason if it's a valid Stripe reason
      if (reason && VALID_REFUND_REASONS.includes(reason as RefundReason)) {
        refundParams.reason = reason as RefundReason;
      }

      // Add amount for partial refund (Stripe expects amount in cents)
      if (amount) {
        // Assume amount is already in the smallest currency unit
        refundParams.amount = Math.round(amount);
      }

      const refund = await stripe.refunds.create(refundParams);

      // Update order status
      const previousStatus = order.status;
      const isPartialRefund = amount && amount < order.total_price;

      const updatedOrder = await pb.collection(Collections.ORDERS).update(id, {
        status: 'refunded',
        payment_status: isPartialRefund ? 'partially_refunded' : 'refunded',
        metadata: {
          ...order.metadata,
          refunded: true,
          refund_id: refund.id,
          refund_amount: refund.amount,
          refund_reason: reason || 'admin_initiated',
          refund_date: new Date().toISOString(),
          partial_refund: isPartialRefund,
        },
      });

      // Log the refund
      try {
        await pb.collection(Collections.AUTOMATION_LOGS).create({
          orderId: id,
          stepName: 'refund_processed',
          status: 'success',
          metadata: {
            refundId: refund.id,
            amount: refund.amount,
            reason: reason || 'admin_initiated',
            previousStatus,
            isPartialRefund,
            initiatedBy: 'admin',
          },
        });
      } catch {
        logger.warn('automation_log_create_failed', { orderId: id, stepName: 'refund' });
      }

      logger.info('admin_order_refund_success', {
        orderId: id,
        refundId: refund.id,
        amount: refund.amount,
        isPartialRefund,
      });

      return NextResponse.json({
        success: true,
        message: isPartialRefund ? 'Partial refund processed' : 'Full refund processed',
        refund: {
          id: refund.id,
          amount: refund.amount,
          currency: refund.currency,
          status: refund.status,
        },
        order: {
          id: updatedOrder.id,
          previousStatus,
          currentStatus: updatedOrder.status,
          paymentStatus: updatedOrder.payment_status,
        },
      });
    } catch (error) {
      logger.error('admin_order_refund_failed', error, { orderId: id });

      // Handle specific Stripe errors
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Stripe error handling
        const stripeError = error as { type?: string; code?: string; message: string };
        if (stripeError.type === 'StripeInvalidRequestError') {
          return NextResponse.json(
            { error: `Stripe error: ${stripeError.message}` },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        { error: 'Failed to process refund' },
        { status: 500 }
      );
    }
  });
}
