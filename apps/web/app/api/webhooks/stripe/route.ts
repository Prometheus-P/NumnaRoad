import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import { verifyWebhookSignature, WebhookEvents } from '@/lib/stripe';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';
import { getConfig } from '@/lib/config';

// In-memory store for rate limiting (per IP)
const ipStore = new Map<
  string,
  { count: number; firstRequestTime: number }
>();
const RATE_LIMIT_INTERVAL_MS = 60 * 1000; // 60 seconds
const MAX_REQUESTS_PER_INTERVAL = 10; // Max 10 requests per IP per interval

/**
 * Cleanup function for ipStore - run periodically or on request to clear old entries
 */
function cleanupIpStore() {
  const now = Date.now();
  for (const [ip, data] of ipStore.entries()) {
    if (now - data.firstRequestTime > RATE_LIMIT_INTERVAL_MS) {
      ipStore.delete(ip);
    }
  }
}

/**
 * Extract payment intent ID from session (handles both string and expanded object)
 */
function getPaymentIntentId(
  paymentIntent: string | Stripe.PaymentIntent | null
): string | null {
  if (!paymentIntent) return null;
  if (typeof paymentIntent === 'string') return paymentIntent;
  return paymentIntent.id;
}

/**
 * Validate required fields from checkout session
 */
function validateCheckoutSession(session: Stripe.Checkout.Session): {
  valid: boolean;
  error?: string;
  data?: {
    paymentIntentId: string;
    customerEmail: string;
    productId: string;
    sessionId: string;
  };
} {
  const paymentIntentId = getPaymentIntentId(session.payment_intent);

  if (!paymentIntentId) {
    return { valid: false, error: 'Missing payment_intent' };
  }

  if (!paymentIntentId.startsWith('pi_')) {
    return { valid: false, error: 'Invalid payment_intent format' };
  }

  if (!session.customer_email) {
    return { valid: false, error: 'Missing customer_email' };
  }

  const productId = session.metadata?.product_id;
  if (!productId) {
    return { valid: false, error: 'Missing product_id in metadata' };
  }

  return {
    valid: true,
    data: {
      paymentIntentId,
      customerEmail: session.customer_email,
      productId,
      sessionId: session.id,
    },
  };
}

/**
 * Check if order already exists (idempotency)
 */
async function findExistingOrder(
  pb: Awaited<ReturnType<typeof getAdminPocketBase>>,
  paymentIntentId: string
) {
  try {
    const order = await pb
      .collection(Collections.ORDERS)
      .getFirstListItem(`stripe_payment_intent="${paymentIntentId}"`);
    return order;
  } catch {
    // Not found
    return null;
  }
}

/**
 * Create new order in pending state
 */
async function createOrder(
  pb: Awaited<ReturnType<typeof getAdminPocketBase>>,
  data: {
    paymentIntentId: string;
    customerEmail: string;
    productId: string;
    sessionId: string;
    correlationId: string;
  }
) {
  return pb.collection(Collections.ORDERS).create({
    customer_email: data.customerEmail,
    product_id: data.productId,
    stripe_payment_intent: data.paymentIntentId,
    stripe_session_id: data.sessionId,
    status: 'pending',
    correlation_id: data.correlationId,
  });
}

/**
 * Trigger n8n workflow for order processing
 */
async function triggerOrderProcessing(orderId: string, correlationId: string) {
  const config = getConfig();

  const response = await fetch(
    `${config.n8n.webhookUrl}/webhook/order-processing`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.n8n.apiKey}`,
      },
      body: JSON.stringify({
        orderId,
        correlationId,
        timestamp: new Date().toISOString(),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`n8n webhook failed: ${response.status}`);
  }

  return response.json();
}

/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook endpoint for payment events.
 * Signature verified, idempotent, triggers async order processing.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const correlationId = uuidv4();
  let ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  if (Array.isArray(ip)) ip = ip[0]; // If x-forwarded-for has multiple, take the first

  // Cleanup old entries (can be optimized to run less frequently)
  cleanupIpStore();

  // Rate limiting check
  const ipData = ipStore.get(ip) || { count: 0, firstRequestTime: Date.now() };

  if (Date.now() - ipData.firstRequestTime > RATE_LIMIT_INTERVAL_MS) {
    // Reset if interval passed
    ipData.count = 1;
    ipData.firstRequestTime = Date.now();
  } else {
    ipData.count++;
  }

  ipStore.set(ip, ipData);

  if (ipData.count > MAX_REQUESTS_PER_INTERVAL) {
    console.warn(`Rate limit exceeded for IP: ${ip}`);
    return NextResponse.json(
      { error: 'Too Many Requests' },
      { status: 429, headers: { 'Retry-After': (RATE_LIMIT_INTERVAL_MS / 1000).toString() } }
    );
  }

  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // T021: Verify webhook signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(Buffer.from(body), signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Only handle checkout.session.completed
    if (event.type !== WebhookEvents.CHECKOUT_SESSION_COMPLETED) {
      return NextResponse.json({ received: true, handled: false });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    // Validate required fields
    const validation = validateCheckoutSession(session);
    if (!validation.valid || !validation.data) {
      console.error('Invalid checkout session:', validation.error);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { paymentIntentId, customerEmail, productId, sessionId } =
      validation.data;

    const pb = await getAdminPocketBase();

    // T022: Idempotency check
    const existingOrder = await findExistingOrder(pb, paymentIntentId);
    if (existingOrder) {
      console.log(
        `Order already exists for payment_intent ${paymentIntentId}:`,
        existingOrder.id
      );
      return NextResponse.json({
        received: true,
        handled: true,
        skipped: true,
        reason: 'Order already exists',
        orderId: existingOrder.id,
      });
    }

    // T023 & T031: Create order with correlation_id
    const order = await createOrder(pb, {
      paymentIntentId,
      customerEmail,
      productId,
      sessionId,
      correlationId,
    });

    console.log(`Created order ${order.id} with correlation_id ${correlationId}`);

    // Trigger async order processing via n8n
    try {
      await triggerOrderProcessing(order.id, correlationId);
    } catch (err) {
      // Log but don't fail - the order is created, processing can be retried
      console.error('Failed to trigger order processing:', err);
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      received: true,
      handled: true,
      orderId: order.id,
      correlationId,
      durationMs,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);

    // Return 500 to trigger Stripe retry
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
