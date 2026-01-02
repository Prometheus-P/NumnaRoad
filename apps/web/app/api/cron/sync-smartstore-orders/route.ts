import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Force dynamic rendering - requires runtime env vars
export const dynamic = 'force-dynamic';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';
import { getConfig } from '@/lib/config';
import { verifyCronAuth } from '@/lib/admin-auth';
import { acquireLock, releaseLock } from '@/lib/cron-lock';
import {
  getSmartStoreClient,
  createPocketBaseProductMapper,
  normalizeNaverOrder,
  isEligibleForFulfillment,
  type NaverProductOrder,
} from '@services/sales-channels/smartstore';
import {
  createFulfillmentService,
  fulfillWithTimeout,
  isTimeoutResult,
  type FulfillmentOrder,
} from '@services/order-fulfillment';
import type { EsimProvider } from '@services/esim-providers/types';
import { getCachedActiveProviders } from '@/lib/cache/providers';

const JOB_NAME = 'sync-smartstore-orders';
const LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/cron/sync-smartstore-orders
 *
 * Polling cron job to sync SmartStore orders.
 * This is a fallback mechanism since Naver webhooks don't retry on failure.
 *
 * Uses distributed locking to prevent duplicate execution across instances.
 *
 * Should be called every 5 minutes via Vercel Cron.
 *
 * Vercel Cron Config (vercel.json):
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/sync-smartstore-orders",
 *       "schedule": "* /5 * * * *"
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const correlationId = uuidv4();

  // Verify cron secret - fails closed if not configured
  const authResult = verifyCronAuth(request);
  if (!authResult.valid) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.error === 'Server misconfigured' ? 500 : 401 }
    );
  }

  // Check if SmartStore integration is enabled
  const config = getConfig();
  if (!config.smartStore?.enabled) {
    return NextResponse.json({
      success: true,
      message: 'SmartStore integration disabled',
      synced: 0,
    });
  }

  // Acquire distributed lock
  const lockResult = await acquireLock(JOB_NAME, { ttlMs: LOCK_TTL_MS });

  if (!lockResult.acquired) {
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'cron_job_skipped',
        job: JOB_NAME,
        correlationId,
        reason: 'lock_held',
        heldBy: lockResult.heldBy,
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
    const client = getSmartStoreClient();

    // Get last sync time from config collection
    const lastSyncTime = await getLastSyncTime(pb);
    const now = new Date();

    // Query for orders that changed status since last sync
    const changesResult = await client.getLastChangedStatuses(lastSyncTime, now, {
      orderStatusType: 'PAYED', // Only look for paid orders
      pageSize: 100,
    });

    if (!changesResult.success || !changesResult.data) {
      console.error('Failed to fetch status changes:', changesResult.errorMessage);
      return NextResponse.json(
        { error: 'Failed to fetch status changes' },
        { status: 502 }
      );
    }

    const { changes, hasMore } = changesResult.data;
    console.log(`Found ${changes.length} order status changes (hasMore: ${hasMore})`);

    // Filter for orders we haven't processed yet
    const unprocessedOrderIds: string[] = [];
    for (const change of changes) {
      const existingOrder = await findExistingOrder(pb, change.productOrderId);
      if (!existingOrder) {
        unprocessedOrderIds.push(change.productOrderId);
      }
    }

    console.log(`${unprocessedOrderIds.length} orders need processing`);

    if (unprocessedOrderIds.length === 0) {
      await updateLastSyncTime(pb, now);
      return NextResponse.json({
        success: true,
        message: 'No new orders to process',
        synced: 0,
        durationMs: Date.now() - startTime,
      });
    }

    // Fetch full order details
    const ordersResult = await client.getProductOrders(unprocessedOrderIds);
    if (!ordersResult.success || !ordersResult.data) {
      console.error('Failed to fetch order details:', ordersResult.errorMessage);
      return NextResponse.json(
        { error: 'Failed to fetch order details' },
        { status: 502 }
      );
    }

    // Process each order
    const results = {
      success: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    const productMapper = createPocketBaseProductMapper(pb);
    const providers = await getCachedActiveProviders();

    for (const naverOrder of ordersResult.data) {
      try {
        const result = await processOrder(
          naverOrder,
          pb,
          productMapper,
          client,
          providers,
          correlationId,
          config
        );

        if (result.status === 'success') {
          results.success++;
        } else if (result.status === 'skipped') {
          results.skipped++;
        } else {
          results.failed++;
          if (result.error) {
            results.errors.push(`${naverOrder.productOrderId}: ${result.error}`);
          }
        }
      } catch (error) {
        results.failed++;
        results.errors.push(
          `${naverOrder.productOrderId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Update last sync time
    await updateLastSyncTime(pb, now);

    return NextResponse.json({
      success: true,
      correlationId,
      results,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('SmartStore sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    // Always release the lock
    await releaseLock(JOB_NAME, lockResult.lockId);
  }
}

/**
 * Get last sync time from the database.
 */
async function getLastSyncTime(
  pb: Awaited<ReturnType<typeof getAdminPocketBase>>
): Promise<Date> {
  try {
    const config = await pb
      .collection('smartstore_config')
      .getFirstListItem('id != ""');

    if (config?.last_sync_at) {
      return new Date(config.last_sync_at as string);
    }
  } catch {
    // Collection or record doesn't exist
  }

  // Default to 1 hour ago if no sync time recorded
  return new Date(Date.now() - 60 * 60 * 1000);
}

/**
 * Update last sync time in the database.
 */
async function updateLastSyncTime(
  pb: Awaited<ReturnType<typeof getAdminPocketBase>>,
  time: Date
): Promise<void> {
  try {
    // Try to update existing record
    const existing = await pb
      .collection('smartstore_config')
      .getFirstListItem('id != ""')
      .catch(() => null);

    if (existing) {
      await pb.collection('smartstore_config').update(existing.id, {
        last_sync_at: time.toISOString(),
      });
    } else {
      // Create new record
      await pb.collection('smartstore_config').create({
        last_sync_at: time.toISOString(),
        is_active: true,
      });
    }
  } catch (error) {
    console.error('Failed to update last sync time:', error);
  }
}

/**
 * Find existing order by SmartStore product order ID.
 */
async function findExistingOrder(
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
 * Process a single order.
 */
async function processOrder(
  naverOrder: NaverProductOrder,
  pb: Awaited<ReturnType<typeof getAdminPocketBase>>,
  productMapper: ReturnType<typeof createPocketBaseProductMapper>,
  client: ReturnType<typeof getSmartStoreClient>,
  providers: EsimProvider[],
  correlationId: string,
  config: ReturnType<typeof getConfig>
): Promise<{
  status: 'success' | 'skipped' | 'failed';
  error?: string;
}> {
  // Check eligibility
  if (!isEligibleForFulfillment(naverOrder)) {
    return { status: 'skipped', error: 'Not eligible for fulfillment' };
  }

  // Normalize order
  const normalizeResult = await normalizeNaverOrder(naverOrder, productMapper);
  if (!normalizeResult.success || !normalizeResult.data) {
    return { status: 'failed', error: normalizeResult.errorMessage };
  }

  const internalOrder = normalizeResult.data;

  // Create order in database
  const orderId = `SS-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const order = await pb.collection(Collections.ORDERS).create({
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
    status: 'payment_received',
    payment_status: 'paid',
    payment_method: 'smartstore',
    dispatch_method: 'provider_api',
    retry_count: 0,
    stripe_payment_intent: `ss_${internalOrder.externalOrderId}`,
  });

  if (providers.length === 0) {
    await pb.collection(Collections.ORDERS).update(order.id, {
      status: 'provider_failed',
      error_message: 'No active providers',
    });
    return { status: 'failed', error: 'No active providers' };
  }

  // Get product details
  const product = await pb.collection('esim_products').getOne(internalOrder.productId).catch(() => null);
  if (!product) {
    await pb.collection(Collections.ORDERS).update(order.id, {
      status: 'failed',
      error_message: 'Product not found',
    });
    return { status: 'failed', error: 'Product not found' };
  }

  // Create fulfillment order
  const fulfillmentOrder: FulfillmentOrder = {
    id: order.id,
    orderId,
    customerEmail: internalOrder.customerEmail,
    productId: internalOrder.productId,
    providerSku: product.provider_sku || product.id,
    amount: internalOrder.amount,
    currency: internalOrder.currency,
    status: 'payment_received',
    correlationId,
    stripePaymentIntent: `ss_${internalOrder.externalOrderId}`,
  };

  // Create fulfillment service
  const fulfillmentService = createFulfillmentService({
    persistFn: async (id: string, state: string, metadata?: { providerName?: string; errorMessage?: string }) => {
      await pb.collection(Collections.ORDERS).update(id, {
        status: state,
        ...(metadata?.providerName && { provider_used: metadata.providerName }),
        ...(metadata?.errorMessage && { error_message: metadata.errorMessage }),
      });
    },
    loadFn: async (id: string) => {
      const o = await pb.collection(Collections.ORDERS).getOne(id);
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
    return { status: 'success' }; // Will retry later
  }

  // Update order with result
  if (result.success && result.esimData) {
    await pb.collection(Collections.ORDERS).update(order.id, {
      status: result.finalState,
      provider_used: result.providerUsed,
      esim_qr_code_url: result.esimData.qrCodeUrl,
      esim_iccid: result.esimData.iccid,
      esim_activation_code: result.esimData.activationCode,
      provider_order_id: result.esimData.providerOrderId,
      completed_at: new Date().toISOString(),
    });

    // Dispatch in SmartStore
    await client.dispatchOrder(naverOrder.productOrderId);
    return { status: 'success' };
  }

  await pb.collection(Collections.ORDERS).update(order.id, {
    status: result.finalState,
    error_message: result.error?.message,
  });

  return { status: 'failed', error: result.error?.message };
}
