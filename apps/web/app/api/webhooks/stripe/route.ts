import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import { verifyWebhookSignature, WebhookEvents } from '@/lib/stripe';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';
import { getConfig } from '@/lib/config';
import {
  createFulfillmentService,
  fulfillWithTimeout,
  isTimeoutResult,
  type FulfillmentOrder,
} from '@services/order-fulfillment';
import { getCachedActiveProviders } from '@/lib/cache/providers';
import { createAlimtalkSendFn } from '@services/notifications/kakao-alimtalk';

// =============================================================================
// Structured Logging Helper
// =============================================================================

interface LogContext {
  correlationId?: string;
  orderId?: string;
  paymentIntentId?: string;
  [key: string]: unknown;
}

function structuredLog(
  level: 'info' | 'warn' | 'error',
  event: string,
  context: LogContext = {}
) {
  const logEntry = JSON.stringify({
    level,
    event,
    ...context,
    timestamp: new Date().toISOString(),
  });

  switch (level) {
    case 'error':
      console.error(logEntry);
      break;
    case 'warn':
      console.warn(logEntry);
      break;
    default:
      console.log(logEntry);
  }
}

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
  ipStore.forEach((data, ip) => {
    if (now - data.firstRequestTime > RATE_LIMIT_INTERVAL_MS) {
      ipStore.delete(ip);
    }
  });
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
    customerPhone: string | null;
    customerName: string | null;
    productId: string;
    sessionId: string;
    amount: number;
    currency: string;
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

  // Extract customer phone from customer_details (collected via phone_number_collection)
  const customerPhone = session.customer_details?.phone ?? null;
  const customerName = session.customer_details?.name ?? null;

  return {
    valid: true,
    data: {
      paymentIntentId,
      customerEmail: session.customer_email,
      customerPhone,
      customerName,
      productId,
      sessionId: session.id,
      amount: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
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
 * Create new order with payment_received status (for inline fulfillment)
 */
async function createOrder(
  pb: Awaited<ReturnType<typeof getAdminPocketBase>>,
  data: {
    paymentIntentId: string;
    customerEmail: string;
    customerPhone: string | null;
    customerName: string | null;
    productId: string;
    sessionId: string;
    correlationId: string;
    amount: number;
    currency: string;
  },
  useInlineFulfillment: boolean
) {
  const orderId = `NR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  return pb.collection(Collections.ORDERS).create({
    order_id: orderId,
    customer_email: data.customerEmail,
    customer_phone: data.customerPhone || '',
    customer_name: data.customerName || '',
    product: data.productId,
    stripe_payment_intent: data.paymentIntentId,
    stripe_session_id: data.sessionId,
    correlation_id: data.correlationId,
    amount: data.amount / 100, // Convert from cents
    currency: data.currency.toUpperCase(),
    status: useInlineFulfillment ? 'payment_received' : 'pending',
    payment_status: 'paid',
    payment_method: 'card',
    dispatch_method: 'provider_api',
    retry_count: 0,
  });
}

/**
 * Trigger n8n workflow for order processing (legacy flow)
 */
async function triggerOrderProcessing(orderId: string, correlationId: string) {
  const config = getConfig();

  if (!config.n8n.webhookUrl) {
    throw new Error('n8n webhook URL not configured');
  }

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
 * Get product details including provider SKU
 */
async function getProductDetails(
  pb: Awaited<ReturnType<typeof getAdminPocketBase>>,
  productId: string
): Promise<{ providerSku: string } | null> {
  try {
    const product = await pb.collection('esim_products').getOne(productId);
    return {
      providerSku: product.provider_sku || product.id,
    };
  } catch (error) {
    console.error('Failed to fetch product:', error);
    return null;
  }
}

/**
 * Update order with fulfillment result
 */
async function updateOrderWithResult(
  pb: Awaited<ReturnType<typeof getAdminPocketBase>>,
  orderId: string,
  result: {
    success: boolean;
    providerUsed?: string;
    esimData?: {
      qrCodeUrl: string;
      iccid: string;
      activationCode?: string;
      providerOrderId: string;
    };
    error?: { message: string };
    finalState: string;
  }
) {
  const updateData: Record<string, unknown> = {
    status: result.finalState,
  };

  if (result.success && result.esimData) {
    updateData.provider_used = result.providerUsed;
    updateData.esim_qr_code_url = result.esimData.qrCodeUrl;
    updateData.esim_iccid = result.esimData.iccid;
    updateData.esim_activation_code = result.esimData.activationCode;
    updateData.provider_order_id = result.esimData.providerOrderId;
    updateData.completed_at = new Date().toISOString();
  } else if (!result.success && result.error) {
    updateData.error_message = result.error.message;
  }

  await pb.collection(Collections.ORDERS).update(orderId, updateData);
}

/**
 * Process order with inline fulfillment
 */
async function processOrderInline(
  pb: Awaited<ReturnType<typeof getAdminPocketBase>>,
  order: Record<string, unknown>,
  correlationId: string,
  config: ReturnType<typeof getConfig>
) {
  const orderId = order.id as string;

  // Get providers
  const providers = await getCachedActiveProviders();
  if (providers.length === 0) {
    structuredLog('error', 'no_active_providers', { correlationId, orderId });
    await updateOrderWithResult(pb, orderId, {
      success: false,
      error: { message: 'No active providers available' },
      finalState: 'provider_failed',
    });
    return { success: false, error: 'No providers' };
  }

  // Get product details
  const product = await getProductDetails(pb, order.product as string);
  if (!product) {
    structuredLog('error', 'product_not_found', {
      correlationId,
      orderId,
      productId: order.product as string,
    });
    await updateOrderWithResult(pb, orderId, {
      success: false,
      error: { message: 'Product not found' },
      finalState: 'failed',
    });
    return { success: false, error: 'Product not found' };
  }

  // Create fulfillment order object with customer phone for Kakao Alimtalk
  const customerPhone = (order.customer_phone as string) || undefined;
  const fulfillmentOrder: FulfillmentOrder = {
    id: orderId,
    orderId: order.order_id as string,
    customerEmail: order.customer_email as string,
    customerPhone,
    productId: order.product as string,
    providerSku: product.providerSku,
    amount: order.amount as number,
    currency: order.currency as string,
    status: 'payment_received',
    correlationId,
    stripePaymentIntent: order.stripe_payment_intent as string,
  };

  // Create Kakao Alimtalk send function if enabled and configured
  const alimtalkFn = config.kakaoAlimtalk.enabled
    ? createAlimtalkSendFn(config.kakaoAlimtalk)
    : undefined;

  // Create fulfillment service with Kakao Alimtalk support
  const fulfillmentService = createFulfillmentService({
    persistFn: async (id, state, metadata) => {
      await pb.collection(Collections.ORDERS).update(id, {
        status: state,
        ...(metadata?.providerName && { provider_used: metadata.providerName }),
        ...(metadata?.errorMessage && { error_message: metadata.errorMessage }),
        ...(state === 'fulfillment_started' && {
          fulfillment_started_at: new Date().toISOString(),
        }),
      });
    },
    loadFn: async (id) => {
      const o = await pb.collection(Collections.ORDERS).getOne(id);
      return o.status;
    },
    alimtalkFn,
    config: {
      webhookTimeoutMs: config.fulfillment.webhookTimeoutMs,
      providerTimeoutMs: 10000,
      maxRetries: 3,
      enableEmailNotification: config.fulfillment.enableEmailNotification,
      enableDiscordAlerts: config.fulfillment.enableDiscordAlerts,
      enableKakaoAlimtalk: config.kakaoAlimtalk.enabled && !!customerPhone,
    },
  });

  structuredLog('info', 'fulfillment_starting', {
    correlationId,
    orderId,
    providerCount: providers.length,
    hasAlimtalk: !!alimtalkFn && !!customerPhone,
  });

  // Execute fulfillment with timeout
  const result = await fulfillWithTimeout(
    fulfillmentService,
    fulfillmentOrder,
    providers,
    config.fulfillment.webhookTimeoutMs
  );

  if (isTimeoutResult(result)) {
    // Timeout - order stays in fulfillment_started, will be picked up by cron
    structuredLog('warn', 'fulfillment_timeout', {
      correlationId,
      orderId,
      timeoutMs: config.fulfillment.webhookTimeoutMs,
    });
    return { success: true, timedOut: true };
  }

  // Update order with final result
  await updateOrderWithResult(pb, orderId, result);

  structuredLog('info', 'fulfillment_completed', {
    correlationId,
    orderId,
    success: result.success,
    providerUsed: result.providerUsed,
    finalState: result.finalState,
  });

  return result;
}

/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook endpoint for payment events.
 * Signature verified, idempotent.
 * Supports both n8n (legacy) and inline fulfillment based on feature flag.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const correlationId = uuidv4();
  let ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  if (Array.isArray(ip)) ip = ip[0];

  // Cleanup old entries
  cleanupIpStore();

  // Rate limiting check
  const ipData = ipStore.get(ip) || { count: 0, firstRequestTime: Date.now() };

  if (Date.now() - ipData.firstRequestTime > RATE_LIMIT_INTERVAL_MS) {
    ipData.count = 1;
    ipData.firstRequestTime = Date.now();
  } else {
    ipData.count++;
  }

  ipStore.set(ip, ipData);

  if (ipData.count > MAX_REQUESTS_PER_INTERVAL) {
    structuredLog('warn', 'rate_limit_exceeded', { correlationId, ip });
    return NextResponse.json(
      { error: 'Too Many Requests' },
      { status: 429, headers: { 'Retry-After': (RATE_LIMIT_INTERVAL_MS / 1000).toString() } }
    );
  }

  try {
    const config = getConfig();
    const useInlineFulfillment = config.featureFlags.useInlineFulfillment;

    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      structuredLog('warn', 'missing_stripe_signature', { correlationId });
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(Buffer.from(body), signature);
    } catch (err) {
      structuredLog('error', 'webhook_signature_verification_failed', {
        correlationId,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
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
      structuredLog('error', 'invalid_checkout_session', {
        correlationId,
        error: validation.error,
        sessionId: session.id,
      });
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const {
      paymentIntentId,
      customerEmail,
      customerPhone,
      customerName,
      productId,
      sessionId,
      amount,
      currency,
    } = validation.data;

    const pb = await getAdminPocketBase();

    // Idempotency check
    const existingOrder = await findExistingOrder(pb, paymentIntentId);
    if (existingOrder) {
      structuredLog('info', 'order_already_exists', {
        correlationId,
        paymentIntentId,
        orderId: existingOrder.id,
      });
      return NextResponse.json({
        received: true,
        handled: true,
        skipped: true,
        reason: 'Order already exists',
        orderId: existingOrder.id,
      });
    }

    // Create order
    const order = await createOrder(
      pb,
      {
        paymentIntentId,
        customerEmail,
        customerPhone,
        customerName,
        productId,
        sessionId,
        correlationId,
        amount,
        currency,
      },
      useInlineFulfillment
    );

    structuredLog('info', 'order_created', {
      correlationId,
      orderId: order.id,
      paymentIntentId,
      mode: useInlineFulfillment ? 'inline' : 'n8n',
      hasPhone: !!customerPhone,
    });

    // Process order based on feature flag
    if (useInlineFulfillment) {
      // New inline fulfillment flow
      const result = await processOrderInline(pb, order, correlationId, config);

      const durationMs = Date.now() - startTime;

      return NextResponse.json({
        received: true,
        handled: true,
        orderId: order.id,
        correlationId,
        mode: 'inline',
        success: result.success,
        durationMs,
      });
    } else {
      // Legacy n8n flow
      try {
        await triggerOrderProcessing(order.id, correlationId);
        structuredLog('info', 'n8n_workflow_triggered', {
          correlationId,
          orderId: order.id,
        });
      } catch (err) {
        structuredLog('error', 'n8n_workflow_trigger_failed', {
          correlationId,
          orderId: order.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }

      const durationMs = Date.now() - startTime;

      return NextResponse.json({
        received: true,
        handled: true,
        orderId: order.id,
        correlationId,
        mode: 'n8n',
        durationMs,
      });
    }
  } catch (error) {
    structuredLog('error', 'webhook_processing_failed', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return 500 to trigger Stripe retry
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
