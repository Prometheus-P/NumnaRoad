#!/usr/bin/env node
/**
 * Standalone SmartStore Order Sync Script
 *
 * Runs on Oracle Cloud VM with static IP to bypass Naver's IP whitelist requirement.
 * Fetches orders from SmartStore and sends them to Vercel API for processing.
 *
 * Required environment variables:
 * - NAVER_COMMERCE_APP_ID
 * - NAVER_COMMERCE_APP_SECRET
 * - SMARTSTORE_SELLER_ID
 * - CRON_SECRET
 * - POCKETBASE_URL
 * - POCKETBASE_ADMIN_EMAIL
 * - POCKETBASE_ADMIN_PASSWORD
 * - VERCEL_API_URL (optional, defaults to https://numnaroad.vercel.app)
 */

const crypto = require('crypto');

// Helper to get secret (supports direct value or base64 encoded)
function getSecret(envKey) {
  // First try direct value
  if (process.env[envKey]) {
    return process.env[envKey];
  }
  // Then try base64 encoded value
  const b64Key = `${envKey}_B64`;
  if (process.env[b64Key]) {
    return Buffer.from(process.env[b64Key], 'base64').toString('utf-8');
  }
  return null;
}

// Build config with support for base64 encoded secrets
const CONFIG = {
  NAVER_APP_ID: process.env.NAVER_COMMERCE_APP_ID,
  NAVER_APP_SECRET: getSecret('NAVER_COMMERCE_APP_SECRET'),
  SMARTSTORE_SELLER_ID: process.env.SMARTSTORE_SELLER_ID,
  VERCEL_API_URL: process.env.VERCEL_API_URL || 'https://numnaroad.vercel.app',
  CRON_SECRET: process.env.CRON_SECRET,
  POCKETBASE_URL: process.env.POCKETBASE_URL,
  POCKETBASE_ADMIN_EMAIL: process.env.POCKETBASE_ADMIN_EMAIL,
  POCKETBASE_ADMIN_PASSWORD: process.env.POCKETBASE_ADMIN_PASSWORD,
};

// Validate required config
const REQUIRED_CONFIG = [
  ['NAVER_APP_ID', 'NAVER_COMMERCE_APP_ID'],
  ['NAVER_APP_SECRET', 'NAVER_COMMERCE_APP_SECRET or NAVER_COMMERCE_APP_SECRET_B64'],
  ['SMARTSTORE_SELLER_ID', 'SMARTSTORE_SELLER_ID'],
  ['CRON_SECRET', 'CRON_SECRET'],
  ['POCKETBASE_URL', 'POCKETBASE_URL'],
  ['POCKETBASE_ADMIN_EMAIL', 'POCKETBASE_ADMIN_EMAIL'],
  ['POCKETBASE_ADMIN_PASSWORD', 'POCKETBASE_ADMIN_PASSWORD'],
];

const missing = REQUIRED_CONFIG.filter(([configKey]) => !CONFIG[configKey]);
if (missing.length > 0) {
  console.error('[FATAL] Missing required environment variables:');
  missing.forEach(([, envKey]) => console.error(`  - ${envKey}`));
  console.error('\nPlease set these in /opt/numnaroad/.env or export them before running.');
  process.exit(1);
}

const NAVER_API_URL = 'https://api.commerce.naver.com/external/v1';

let accessToken = null;
let tokenExpiresAt = null;
let pbToken = null;

/**
 * Generate bcrypt-based signature for Naver Commerce API
 */
function generateSignature(clientId, timestamp, clientSecret) {
  const bcrypt = require('bcryptjs');
  const password = `${clientId}_${timestamp}`;
  const hashed = bcrypt.hashSync(password, clientSecret);
  return Buffer.from(hashed).toString('base64');
}

/**
 * Get Naver Commerce API access token
 */
async function getAccessToken() {
  if (accessToken && tokenExpiresAt && new Date() < tokenExpiresAt) {
    return accessToken;
  }

  const timestamp = Date.now().toString();
  const signature = generateSignature(CONFIG.NAVER_APP_ID, timestamp, CONFIG.NAVER_APP_SECRET);

  const response = await fetch('https://api.commerce.naver.com/external/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CONFIG.NAVER_APP_ID,
      timestamp: timestamp,
      client_secret_sign: signature,
      grant_type: 'client_credentials',
      type: 'SELF',
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiresAt = new Date(Date.now() + (data.expires_in - 60) * 1000);

  console.log(`[INFO] SmartStore token refreshed, expires at ${tokenExpiresAt.toISOString()}`);
  return accessToken;
}

/**
 * Authenticate with PocketBase
 */
async function getPocketBaseToken() {
  if (pbToken) return pbToken;

  const response = await fetch(`${CONFIG.POCKETBASE_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: CONFIG.POCKETBASE_ADMIN_EMAIL,
      password: CONFIG.POCKETBASE_ADMIN_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`PocketBase auth failed: ${response.status}`);
  }

  const data = await response.json();
  pbToken = data.token;
  console.log('[INFO] PocketBase authenticated');
  return pbToken;
}

/**
 * Fetch order status changes from SmartStore
 */
async function fetchOrderChanges(lastSyncTime) {
  const token = await getAccessToken();

  const fromDate = lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const toDate = new Date();

  const url = new URL(`${NAVER_API_URL}/pay-order/seller/product-orders/last-changed-statuses`);
  url.searchParams.set('lastChangedFrom', fromDate.toISOString());
  url.searchParams.set('lastChangedTo', toDate.toISOString());
  url.searchParams.set('orderStatusType', 'PAYED');

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch orders: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data?.lastChangeStatuses || [];
}

/**
 * Fetch order details from SmartStore
 */
async function fetchOrderDetails(productOrderIds) {
  if (!productOrderIds.length) return [];

  const token = await getAccessToken();

  const response = await fetch(`${NAVER_API_URL}/pay-order/seller/product-orders/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ productOrderIds }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch order details: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Create order in PocketBase
 */
async function createOrderInPocketBase(order) {
  const token = await getPocketBaseToken();

  const productOrder = order.productOrder;
  const orderInfo = order.order;

  const orderData = {
    order_number: productOrder.productOrderId,
    external_order_id: productOrder.productOrderId,
    sales_channel: 'smartstore',
    status: 'pending',
    customer_email: orderInfo.ordererEmail || '',
    customer_name: orderInfo.ordererName || '',
    customer_phone: orderInfo.ordererTel || '',
    product_id: productOrder.productId,
    product_name: productOrder.productName,
    quantity: productOrder.quantity || 1,
    total_price: productOrder.totalPaymentAmount || 0,
    currency: 'KRW',
    metadata: JSON.stringify({
      smartstore: {
        orderId: orderInfo.orderId,
        productOrderId: productOrder.productOrderId,
        paymentDate: orderInfo.paymentDate,
        shippingAddress: productOrder.shippingAddress,
      }
    }),
  };

  const response = await fetch(`${CONFIG.POCKETBASE_URL}/api/collections/orders/records`, {
    method: 'POST',
    headers: {
      'Authorization': pbToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const error = await response.text();
    // Ignore duplicate errors
    if (error.includes('unique') || error.includes('already exists')) {
      console.log(`[INFO] Order ${productOrder.productOrderId} already exists, skipping`);
      return null;
    }
    throw new Error(`Failed to create order: ${response.status} - ${error}`);
  }

  const created = await response.json();
  console.log(`[INFO] Created order: ${created.id} (${productOrder.productOrderId})`);
  return created;
}

/**
 * Trigger fulfillment for an order
 */
async function triggerFulfillment(orderId) {
  const response = await fetch(`${CONFIG.VERCEL_API_URL}/api/orders/${orderId}/fulfill`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.CRON_SECRET}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[ERROR] Fulfillment failed for ${orderId}: ${error}`);
    return false;
  }

  console.log(`[INFO] Fulfillment triggered for order ${orderId}`);
  return true;
}

/**
 * Main sync function
 */
async function syncOrders() {
  const startTime = new Date();
  console.log(`\n[${startTime.toISOString()}] Starting SmartStore order sync...`);

  try {
    // Fetch order changes from last 24 hours
    const changes = await fetchOrderChanges();
    console.log(`[INFO] Found ${changes.length} order status changes`);

    if (changes.length === 0) {
      console.log('[INFO] No new orders to process');
      return;
    }

    // Get unique product order IDs that are PAYED
    const productOrderIds = changes
      .filter(c => c.lastChangedType === 'PAYED')
      .map(c => c.productOrderId);

    if (productOrderIds.length === 0) {
      console.log('[INFO] No paid orders to process');
      return;
    }

    console.log(`[INFO] Fetching details for ${productOrderIds.length} orders...`);

    // Fetch order details
    const orders = await fetchOrderDetails(productOrderIds);
    console.log(`[INFO] Got ${orders.length} order details`);

    // Process each order
    let created = 0;
    let fulfilled = 0;

    for (const order of orders) {
      try {
        const pbOrder = await createOrderInPocketBase(order);
        if (pbOrder) {
          created++;
          // Trigger fulfillment
          const success = await triggerFulfillment(pbOrder.id);
          if (success) fulfilled++;
        }
      } catch (error) {
        console.error(`[ERROR] Failed to process order: ${error.message}`);
      }
    }

    const duration = Date.now() - startTime.getTime();
    console.log(`[INFO] Sync complete: ${created} created, ${fulfilled} fulfilled (${duration}ms)`);

  } catch (error) {
    console.error(`[ERROR] Sync failed: ${error.message}`);
    process.exit(1);
  }
}

// Run sync
syncOrders();
