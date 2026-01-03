/**
 * Airalo Webhook Handler
 *
 * Handles async order completion callbacks from Airalo.
 * Endpoint: POST /api/webhooks/airalo
 *
 * Security: HMAC-SHA256 signature verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';
import { verifyAiraloWebhook } from '@/lib/webhook-verification';
import { checkRateLimitByKey, getClientIP, RateLimitPresets } from '@/lib/rate-limit';
import type { AiraloWebhookPayload } from '@services/esim-providers/types';
import { logger } from '@/lib/logger';

interface PendingAsyncOrder {
  id: string;
  requestId: string;
  orderId: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIP = getClientIP(request);
  const rateLimitResult = checkRateLimitByKey(`webhook:airalo:${clientIP}`, RateLimitPresets.webhook);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rateLimitResult.retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-airalo-signature') || '';
    const webhookSecret = process.env.AIRALO_WEBHOOK_SECRET;

    // Verify webhook signature (if secret is configured)
    if (webhookSecret) {
      const isValid = verifyAiraloWebhook(rawBody, signature, webhookSecret);
      if (!isValid) {
        logger.error('airalo_webhook_invalid_signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else {
      logger.warn('airalo_webhook_secret_not_configured');
    }

    // Parse payload
    const payload: AiraloWebhookPayload = JSON.parse(rawBody);
    const { request_id, status, data, error } = payload;

    logger.info('airalo_webhook_received', { requestId: request_id, status });

    // Get admin PocketBase instance
    const pb = await getAdminPocketBase();

    // Find the pending async order by request_id
    let pendingOrder: PendingAsyncOrder;
    try {
      const records = await pb.collection('pending_async_orders').getList<PendingAsyncOrder>(1, 1, {
        filter: `requestId = "${request_id}"`,
      });

      if (records.items.length === 0) {
        logger.error('airalo_webhook_pending_order_not_found', undefined, { requestId: request_id });
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      pendingOrder = records.items[0];
    } catch {
      // If collection doesn't exist, try to find by correlationId pattern
      logger.warn('airalo_webhook_pending_collection_fallback', { requestId: request_id });

      try {
        const orders = await pb.collection(Collections.ORDERS).getList(1, 1, {
          filter: `correlationId ~ "${request_id}"`,
        });

        if (orders.items.length === 0) {
          return NextResponse.json(
            { error: 'Order not found' },
            { status: 404 }
          );
        }

        pendingOrder = {
          id: '',
          requestId: request_id,
          orderId: orders.items[0].id,
          status: 'pending',
          createdAt: orders.items[0].created,
        };
      } catch {
        return NextResponse.json(
          { error: 'Failed to lookup order' },
          { status: 500 }
        );
      }
    }

    // Process based on status
    if (status === 'completed' && data) {
      // Extract eSIM data from the first SIM
      const esim = data.sims?.[0];

      if (!esim) {
        logger.error('airalo_webhook_no_sim_data', undefined, { requestId: request_id });
        return NextResponse.json(
          { error: 'No SIM data in response' },
          { status: 400 }
        );
      }

      // Update the order with eSIM details
      await pb.collection(Collections.ORDERS).update(pendingOrder.orderId, {
        status: 'completed',
        esimQrCode: esim.qrcode_url,
        esimIccid: esim.iccid,
        esimActivationCode: esim.lpa || esim.qrcode,
        providerOrderId: data.id.toString(),
        completedAt: new Date().toISOString(),
      });

      // Update pending async order status (if collection exists)
      if (pendingOrder.id) {
        try {
          await pb.collection('pending_async_orders').update(pendingOrder.id, {
            status: 'completed',
          });
        } catch {
          // Collection may not exist, ignore
        }
      }

      // Log success
      try {
        await pb.collection(Collections.AUTOMATION_LOGS).create({
          orderId: pendingOrder.orderId,
          correlationId: request_id,
          stepName: 'provider_call_success',
          status: 'success',
          providerName: 'airalo',
          responsePayload: { request_id, esim_iccid: esim.iccid },
        });
      } catch {
        logger.warn('airalo_webhook_automation_log_failed', { orderId: pendingOrder.orderId });
      }

      logger.info('airalo_webhook_order_completed', { orderId: pendingOrder.orderId });

      return NextResponse.json({
        success: true,
        message: 'Order updated successfully',
        orderId: pendingOrder.orderId,
      });
    } else if (status === 'failed') {
      // Update order as failed
      await pb.collection(Collections.ORDERS).update(pendingOrder.orderId, {
        status: 'failed',
        errorMessage: error?.message || 'Async order failed',
      });

      // Update pending async order status (if collection exists)
      if (pendingOrder.id) {
        try {
          await pb.collection('pending_async_orders').update(pendingOrder.id, {
            status: 'failed',
          });
        } catch {
          // Collection may not exist, ignore
        }
      }

      // Log failure
      try {
        await pb.collection(Collections.AUTOMATION_LOGS).create({
          orderId: pendingOrder.orderId,
          correlationId: request_id,
          stepName: 'provider_call_failed',
          status: 'failed',
          providerName: 'airalo',
          errorMessage: error?.message,
          errorType: 'provider_error',
        });
      } catch {
        logger.warn('airalo_webhook_automation_log_failed', { orderId: pendingOrder.orderId });
      }

      logger.error('airalo_webhook_order_failed', undefined, { orderId: pendingOrder.orderId, error: error?.message });

      return NextResponse.json({
        success: false,
        message: 'Order marked as failed',
        orderId: pendingOrder.orderId,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook received',
    });
  } catch (err) {
    logger.error('airalo_webhook_error', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for webhook verification (some providers require this)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');

  if (challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({
    status: 'Airalo webhook endpoint active',
    timestamp: new Date().toISOString(),
  });
}
