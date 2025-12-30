import PocketBase from 'pocketbase';

const pb = new PocketBase(
  process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
);

/**
 * Get admin PocketBase instance with authentication
 * PocketBase 0.21+ uses _superusers collection for admin auth
 */
export async function getAdminPocketBase(): Promise<PocketBase> {
  const adminPb = new PocketBase(
    process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
  );

  const email = process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.POCKETBASE_ADMIN_PASSWORD;

  if (email && password) {
    // PocketBase 0.21+ uses _superusers collection instead of admins
    await adminPb.collection('_superusers').authWithPassword(email, password);
  }

  return adminPb;
}

/**
 * Collection names enum
 */
export const Collections = {
  ORDERS: 'orders',
  ESIM_PRODUCTS: 'esim_products',
  ESIM_PROVIDERS: 'esim_providers',
  AUTOMATION_LOGS: 'automation_logs',
  SMARTSTORE_CONFIG: 'smartstore_config',
  SMARTSTORE_SYNC_LOGS: 'smartstore_sync_logs',
  PRODUCT_MAPPINGS: 'product_mappings',
  USERS: 'users',
} as const;

export default pb;
