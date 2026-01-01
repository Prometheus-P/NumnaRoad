import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';
import { getConfig } from '@/lib/config';
import {
  getSmartStoreClient,
  getSmartStoreAuth,
  normalizeNaverOrder,
  isEligibleForFulfillment,
  createPocketBaseProductMapper,
  type NaverWebhookPayload,
  type NaverProductOrder,
} from '@services/sales-channels/smartstore';
import {
  createFulfillmentService,
  fulfillWithTimeout,
  isTimeoutResult,
  type FulfillmentOrder,
} from '@services/order-fulfillment';
import { createAutomationLogger } from '@services/logging';
import type { EsimProvider } from '@services/esim-providers/types';
import { getCachedActiveProviders } from '@/lib/cache/providers';
import {
  sendOrderReceivedAlimtalk,
  sendEsimDeliveryAlimtalk,
  type AlimtalkConfig,
} from '@services/notifications/kakao-alimtalk';
import { notifyCustom, isDiscordConfigured } from '@services/notifications/discord-notifier';

/**
 * POST /api/webhooks/smartstore
 *
 * Naver SmartStore webhook endpoint for order events.
 * Handles payment completion and triggers eSIM fulfillment.
 *
 * IMPORTANT: Naver webhooks do NOT retry on failure.
 * A polling cron job is required as a fallback mechanism.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const correlationId = uuidv4();

  // Check if SmartStore integration is enabled
  const config = getConfig();
  if (!config.smartStore?.enabled) {
    return NextResponse.json(
      { error: 'SmartStore integration disabled' },
      { status: 503 }
    );
  }

  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-naver-signature') || '';

    // Verify webhook signature
    const auth = getSmartStoreAuth();
    if (!auth.verifyWebhookSignature(body, signature)) {
      console.error('SmartStore webhook signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    let payload: NaverWebhookPayload;
    try {
      payload = JSON.parse(body) as NaverWebhookPayload;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    console.log(
      `SmartStore webhook received: ${payload.type}`,
      `productOrderIds: ${payload.productOrderIds?.join(', ')}`
    );

    // Handle different event types
    switch (payload.type) {
      case 'ORDER_PAYMENT_COMPLETE':
        // New flow: Send guidance alimtalk, dispatch order, set status to awaiting_confirmation
        return handlePaymentComplete(payload, correlationId, config, startTime);

      case 'ORDER_PURCHASE_DECIDED':
        // Customer confirmed purchase on Naver - trigger eSIM fulfillment
        return handlePurchaseDecided(payload, correlationId, config, startTime);

      case 'ORDER_CLAIM_REQUESTED':
        return handleClaimRequest(payload, correlationId);

      case 'ORDER_DELIVERING':
      case 'ORDER_DELIVERED':
        // These are sent when we dispatch - just acknowledge
        return NextResponse.json({
          received: true,
          handled: true,
          type: payload.type,
        });

      default:
        console.log(`Unhandled SmartStore event type: ${payload.type}`);
        return NextResponse.json({
          received: true,
          handled: false,
          type: payload.type,
        });
    }
  } catch (error) {
    console.error('SmartStore webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle payment complete event - trigger eSIM fulfillment.
 */
async function handlePaymentComplete(
  payload: NaverWebhookPayload,
  correlationId: string,
  config: ReturnType<typeof getConfig>,
  startTime: number
): Promise<NextResponse> {
  const { productOrderIds } = payload;

  if (!productOrderIds?.length) {
    return NextResponse.json(
      { error: 'No product order IDs provided' },
      { status: 400 }
    );
  }

  const pb = await getAdminPocketBase();
  const client = getSmartStoreClient();
  const productMapper = createPocketBaseProductMapper(pb);

  // Fetch full order details from Naver
  const ordersResult = await client.getProductOrders(productOrderIds);
  if (!ordersResult.success || !ordersResult.data) {
    console.error('Failed to fetch orders from Naver:', ordersResult.errorMessage);
    return NextResponse.json(
      { error: 'Failed to fetch order details' },
      { status: 502 }
    );
  }

  const results: Array<{
    productOrderId: string;
    status: 'success' | 'skipped' | 'failed';
    orderId?: string;
    error?: string;
  }> = [];

  // Process each order
  for (const naverOrder of ordersResult.data) {
    const result = await processNaverOrder(
      naverOrder,
      pb,
      productMapper,
      client,
      correlationId,
      config
    );
    results.push(result);
  }

  return NextResponse.json({
    received: true,
    handled: true,
    correlationId,
    results,
    durationMs: Date.now() - startTime,
  });
}

/**
 * Process a single Naver order (payment complete event).
 *
 * NEW FLOW (Deferred Fulfillment):
 * 1. Create order with 'awaiting_confirmation' status
 * 2. Send order received alimtalk (instructing customer to confirm purchase)
 * 3. Dispatch order on SmartStore (activates "구매확정" button)
 * 4. Wait for ORDER_PURCHASE_DECIDED event to trigger actual fulfillment
 */
async function processNaverOrder(
  naverOrder: NaverProductOrder,
  pb: Awaited<ReturnType<typeof getAdminPocketBase>>,
  productMapper: ReturnType<typeof createPocketBaseProductMapper>,
  client: ReturnType<typeof getSmartStoreClient>,
  correlationId: string,
  config: ReturnType<typeof getConfig>
): Promise<{
  productOrderId: string;
  status: 'success' | 'skipped' | 'failed';
  orderId?: string;
  error?: string;
}> {
  const { productOrderId } = naverOrder;

  try {
    // Check idempotency - does order already exist?
    const existingOrder = await findExistingSmartStoreOrder(pb, productOrderId);
    if (existingOrder) {
      console.log(`Order already exists for SmartStore order ${productOrderId}`);
      return {
        productOrderId,
        status: 'skipped',
        orderId: existingOrder.id as string,
      };
    }

    // Check if order is eligible for fulfillment
    if (!isEligibleForFulfillment(naverOrder)) {
      console.log(`Order ${productOrderId} not eligible for fulfillment`);
      return {
        productOrderId,
        status: 'skipped',
        error: 'Not eligible for fulfillment',
      };
    }

    // Normalize the order
    const normalizeResult = await normalizeNaverOrder(naverOrder, productMapper);
    if (!normalizeResult.success || !normalizeResult.data) {
      return {
        productOrderId,
        status: 'failed',
        error: normalizeResult.errorMessage || 'Normalization failed',
      };
    }

    const internalOrder = normalizeResult.data;

    // Create the order in PocketBase with awaiting_confirmation status
    const order = await createSmartStoreOrder(pb, internalOrder, correlationId, 'awaiting_confirmation');

    // Get product details for alimtalk
    const product = await getProductDetails(pb, order.product as string);
    const productName = product?.name || internalOrder.productId;

    // Send order received alimtalk (guidance message)
    if (config.kakaoAlimtalk.enabled && internalOrder.customerPhone) {
      const alimtalkConfig: AlimtalkConfig = {
        enabled: true,
        solapi: config.kakaoAlimtalk.solapi,
        kakao: {
          pfId: config.kakaoAlimtalk.kakao.pfId,
          senderKey: config.kakaoAlimtalk.kakao.senderKey,
          esimDeliveryTemplateId: config.kakaoAlimtalk.kakao.esimDeliveryTemplateId,
          orderReceivedTemplateId: config.kakaoAlimtalk.kakao.orderReceivedTemplateId,
        },
      };

      const alimtalkResult = await sendOrderReceivedAlimtalk(
        {
          to: internalOrder.customerPhone,
          orderId: order.order_id as string,
          customerName: internalOrder.customerName,
          productName,
          orderCheckUrl: `${config.app.url}/orders/${order.order_id}`,
        },
        alimtalkConfig
      );

      if (!alimtalkResult.success) {
        console.error(JSON.stringify({
          level: 'warn',
          event: 'order_received_alimtalk_failed',
          orderId: order.id,
          productOrderId,
          error: alimtalkResult.error,
          timestamp: new Date().toISOString(),
        }));

        // Send Discord notification for alimtalk failure
        await notifyCustom(
          '알림톡 발송 실패 (주문 접수)',
          `알림톡 발송 실패: ${alimtalkResult.error}\n\n주문번호: ${order.order_id}\n고객명: ${internalOrder.customerName}\n전화번호: ${internalOrder.customerPhone}\n상품: ${productName}`,
          'error'
        );
      }
    } else if (config.kakaoAlimtalk.enabled && !internalOrder.customerPhone) {
      // Notify admin if phone number is missing
      console.warn(JSON.stringify({
        level: 'warn',
        event: 'customer_phone_missing',
        orderId: order.id,
        productOrderId,
        timestamp: new Date().toISOString(),
      }));

      await notifyCustom(
        '전화번호 누락',
        `주문에 전화번호가 없어 알림톡을 발송할 수 없습니다.\n\n주문번호: ${order.order_id}\n고객명: ${internalOrder.customerName}\n이메일: ${internalOrder.customerEmail}`,
        'warning'
      );
    }

    // Dispatch order on SmartStore (marks as shipped, activates purchase confirm button)
    try {
      await client.dispatchOrder(productOrderId);
      console.log(JSON.stringify({
        level: 'info',
        event: 'smartstore_order_dispatched',
        orderId: order.id,
        productOrderId,
        timestamp: new Date().toISOString(),
      }));
    } catch (dispatchError) {
      console.error(JSON.stringify({
        level: 'error',
        event: 'smartstore_dispatch_failed',
        orderId: order.id,
        productOrderId,
        error: dispatchError instanceof Error ? dispatchError.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }));

      await notifyCustom(
        'SmartStore 발송처리 실패',
        `주문 발송처리에 실패했습니다. 수동 처리가 필요합니다.\n\n주문번호: ${order.order_id}`,
        'error'
      );
    }

    return {
      productOrderId,
      status: 'success',
      orderId: order.id as string,
    };
  } catch (error) {
    console.error(`Error processing order ${productOrderId}:`, error);
    return {
      productOrderId,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle claim request event (cancellation/return).
 */
async function handleClaimRequest(
  payload: NaverWebhookPayload,
  correlationId: string
): Promise<NextResponse> {
  const { productOrderIds } = payload;

  console.log(
    `SmartStore claim requested for orders: ${productOrderIds?.join(', ')}`,
    `correlationId: ${correlationId}`
  );

  // For now, just log and acknowledge
  // In the future, implement refund/cancellation logic
  // TODO: Implement claim handling

  return NextResponse.json({
    received: true,
    handled: true,
    type: 'ORDER_CLAIM_REQUESTED',
    message: 'Claim request acknowledged, manual review required',
  });
}

/**
 * Handle purchase decided event - customer confirmed purchase on Naver.
 * This triggers actual eSIM fulfillment.
 */
async function handlePurchaseDecided(
  payload: NaverWebhookPayload,
  correlationId: string,
  config: ReturnType<typeof getConfig>,
  startTime: number
): Promise<NextResponse> {
  const { productOrderIds } = payload;

  if (!productOrderIds?.length) {
    return NextResponse.json(
      { error: 'No product order IDs provided' },
      { status: 400 }
    );
  }

  const pb = await getAdminPocketBase();

  const results: Array<{
    productOrderId: string;
    status: 'success' | 'skipped' | 'failed';
    orderId?: string;
    error?: string;
  }> = [];

  // Process each order
  for (const productOrderId of productOrderIds) {
    const result = await processPurchaseConfirmation(
      productOrderId,
      pb,
      correlationId,
      config
    );
    results.push(result);
  }

  return NextResponse.json({
    received: true,
    handled: true,
    type: 'ORDER_PURCHASE_DECIDED',
    correlationId,
    results,
    durationMs: Date.now() - startTime,
  });
}

/**
 * Process purchase confirmation for a single order.
 * Triggers eSIM fulfillment and sends delivery notification.
 */
async function processPurchaseConfirmation(
  productOrderId: string,
  pb: Awaited<ReturnType<typeof getAdminPocketBase>>,
  correlationId: string,
  config: ReturnType<typeof getConfig>
): Promise<{
  productOrderId: string;
  status: 'success' | 'skipped' | 'failed';
  orderId?: string;
  error?: string;
}> {
  try {
    // Find the order by SmartStore product order ID
    const order = await findExistingSmartStoreOrder(pb, productOrderId);
    if (!order) {
      console.warn(JSON.stringify({
        level: 'warn',
        event: 'purchase_decided_order_not_found',
        productOrderId,
        correlationId,
        timestamp: new Date().toISOString(),
      }));
      return {
        productOrderId,
        status: 'failed',
        error: 'Order not found',
      };
    }

    // Check if order is in awaiting_confirmation status
    const orderStatus = order.status as string;
    if (orderStatus !== 'awaiting_confirmation') {
      console.log(JSON.stringify({
        level: 'info',
        event: 'purchase_decided_invalid_status',
        productOrderId,
        orderId: order.id,
        currentStatus: orderStatus,
        timestamp: new Date().toISOString(),
      }));

      // If already delivered, skip
      if (['delivered', 'completed'].includes(orderStatus)) {
        return {
          productOrderId,
          status: 'skipped',
          orderId: order.id as string,
          error: 'Order already fulfilled',
        };
      }

      // If not in awaiting_confirmation, still try to fulfill if it's a valid pre-fulfillment state
      if (!['awaiting_confirmation', 'payment_received'].includes(orderStatus)) {
        return {
          productOrderId,
          status: 'skipped',
          orderId: order.id as string,
          error: `Invalid order status: ${orderStatus}`,
        };
      }
    }

    console.log(JSON.stringify({
      level: 'info',
      event: 'purchase_decided_processing',
      productOrderId,
      orderId: order.id,
      timestamp: new Date().toISOString(),
    }));

    // Get active providers
    const providers = await getCachedActiveProviders();
    if (providers.length === 0) {
      await updateOrderStatus(pb, order.id as string, 'provider_failed', 'No active providers');
      return {
        productOrderId,
        status: 'failed',
        orderId: order.id as string,
        error: 'No active providers',
      };
    }

    // Process fulfillment
    const fulfillmentResult = await processFulfillment(
      pb,
      order,
      providers,
      correlationId,
      config
    );

    // If successful, send eSIM delivery alimtalk
    if (fulfillmentResult.success && config.kakaoAlimtalk.enabled) {
      const customerPhone = order.customer_phone as string | undefined;
      if (customerPhone) {
        const alimtalkConfig: AlimtalkConfig = {
          enabled: true,
          solapi: config.kakaoAlimtalk.solapi,
          kakao: {
            pfId: config.kakaoAlimtalk.kakao.pfId,
            senderKey: config.kakaoAlimtalk.kakao.senderKey,
            esimDeliveryTemplateId: config.kakaoAlimtalk.kakao.esimDeliveryTemplateId,
            orderReceivedTemplateId: config.kakaoAlimtalk.kakao.orderReceivedTemplateId,
          },
        };

        const alimtalkResult = await sendEsimDeliveryAlimtalk(
          {
            to: customerPhone,
            orderId: order.order_id as string,
            orderDetailUrl: `${config.app.url}/orders/${order.order_id}`,
            customerName: order.customer_name as string,
          },
          alimtalkConfig
        );

        if (!alimtalkResult.success) {
          console.error(JSON.stringify({
            level: 'warn',
            event: 'esim_delivery_alimtalk_failed',
            orderId: order.id,
            productOrderId,
            error: alimtalkResult.error,
            timestamp: new Date().toISOString(),
          }));

          // Send Discord notification for alimtalk failure
          await notifyCustom(
            '알림톡 발송 실패 (eSIM 발급)',
            `알림톡 발송 실패: ${alimtalkResult.error}. 이메일은 정상 발송됨.\n\n주문번호: ${order.order_id}`,
            'warning'
          );
        }
      }
    }

    return {
      productOrderId,
      status: fulfillmentResult.success ? 'success' : 'failed',
      orderId: order.id as string,
      error: fulfillmentResult.error?.message,
    };
  } catch (error) {
    console.error(`Error processing purchase confirmation ${productOrderId}:`, error);
    return {
      productOrderId,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Find existing order by SmartStore product order ID.
 */
async function findExistingSmartStoreOrder(
  pb: Awaited<ReturnType<typeof getAdminPocketBase>>,
  productOrderId: string
) {
  try {
    return await pb
      .collection(Collections.ORDERS)
      .getFirstListItem(`smartstore_product_order_id="${productOrderId}"`);
  } catch {
    return null;
  }
}

/**
 * Create a new order from SmartStore data.
 */
async function createSmartStoreOrder(
  pb: Awaited<ReturnType<typeof getAdminPocketBase>>,
  internalOrder: {
    externalOrderId: string;
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
    productId: string;
    providerSku?: string;
    quantity: number;
    amount: number;
    currency: string;
  },
  correlationId: string,
  status: 'payment_received' | 'awaiting_confirmation' = 'payment_received'
) {
  const orderId = `SS-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  return pb.collection(Collections.ORDERS).create({
    order_id: orderId,
    customer_email: internalOrder.customerEmail,
    customer_name: internalOrder.customerName,
    customer_phone: internalOrder.customerPhone,
    product: internalOrder.productId,
    smartstore_product_order_id: internalOrder.externalOrderId,
    sales_channel: 'smartstore',
    correlation_id: correlationId,
    amount: internalOrder.amount,
    currency: internalOrder.currency,
    status,
    payment_status: 'paid',
    payment_method: 'smartstore',
    dispatch_method: 'provider_api',
    retry_count: 0,
    // SmartStore doesn't use Stripe, so we use a placeholder
    stripe_payment_intent: `ss_${internalOrder.externalOrderId}`,
  });
}

/**
 * Process eSIM fulfillment for an order.
 */
async function processFulfillment(
  pb: Awaited<ReturnType<typeof getAdminPocketBase>>,
  order: Record<string, unknown>,
  providers: EsimProvider[],
  correlationId: string,
  config: ReturnType<typeof getConfig>
): Promise<{ success: boolean; error?: { message: string } }> {
  const logger = createAutomationLogger({
    orderId: order.id as string,
    correlationId,
  });

  // Get product details
  const product = await getProductDetails(pb, order.product as string);
  if (!product) {
    await updateOrderStatus(pb, order.id as string, 'failed', 'Product not found');
    return { success: false, error: { message: 'Product not found' } };
  }

  // Create fulfillment order
  const fulfillmentOrder: FulfillmentOrder = {
    id: order.id as string,
    orderId: order.order_id as string,
    customerEmail: order.customer_email as string,
    productId: order.product as string,
    providerSku: product.providerSku,
    amount: order.amount as number,
    currency: order.currency as string,
    status: 'payment_received',
    correlationId,
    stripePaymentIntent: order.stripe_payment_intent as string,
  };

  // Create fulfillment service
  const fulfillmentService = createFulfillmentService({
    persistFn: async (orderId, state, metadata) => {
      await pb.collection(Collections.ORDERS).update(orderId, {
        status: state,
        ...(metadata?.providerName && { provider_used: metadata.providerName }),
        ...(metadata?.errorMessage && { error_message: metadata.errorMessage }),
        ...(state === 'fulfillment_started' && {
          fulfillment_started_at: new Date().toISOString(),
        }),
      });
    },
    loadFn: async (orderId) => {
      const o = await pb.collection(Collections.ORDERS).getOne(orderId);
      return o.status;
    },
    config: {
      webhookTimeoutMs: config.fulfillment.webhookTimeoutMs,
      providerTimeoutMs: 10000,
      maxRetries: 3,
      enableEmailNotification: config.fulfillment.enableEmailNotification,
      enableDiscordAlerts: config.fulfillment.enableDiscordAlerts,
    },
  });

  // Execute fulfillment
  const result = await fulfillWithTimeout(
    fulfillmentService,
    fulfillmentOrder,
    providers,
    config.fulfillment.webhookTimeoutMs
  );

  if (isTimeoutResult(result)) {
    console.log(`Order ${order.id} fulfillment timed out, will retry via cron`);
    return { success: true }; // Will be picked up by cron
  }

  // Update order with result
  await updateOrderWithResult(pb, order.id as string, result);

  return {
    success: result.success,
    error: result.error,
  };
}

/**
 * Get product details.
 */
async function getProductDetails(
  pb: Awaited<ReturnType<typeof getAdminPocketBase>>,
  productId: string
): Promise<{ providerSku: string; name: string } | null> {
  try {
    const product = await pb.collection('esim_products').getOne(productId);
    return {
      providerSku: product.provider_sku || product.id,
      name: product.name || product.country_name || productId,
    };
  } catch {
    return null;
  }
}

/**
 * Update order status.
 */
async function updateOrderStatus(
  pb: Awaited<ReturnType<typeof getAdminPocketBase>>,
  orderId: string,
  status: string,
  errorMessage?: string
) {
  await pb.collection(Collections.ORDERS).update(orderId, {
    status,
    ...(errorMessage && { error_message: errorMessage }),
  });
}

/**
 * Update order with fulfillment result.
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
