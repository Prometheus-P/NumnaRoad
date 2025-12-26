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
  PRODUCT_MAPPINGS: 'product_mappings',
} as const;

export default pb;

/**
 * Collection names for type safety
 */
export const Collections = {
  ORDERS: 'orders',
  ESIM_PRODUCTS: 'esim_products',
  USERS: 'users',
} as const;

/**
 * Get authenticated admin PocketBase client
 * Uses admin credentials from environment
 */
export async function getAdminPocketBase(): Promise<PocketBase> {
  const adminPb = new PocketBase(
    process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
  );

  await adminPb.admins.authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!
  );

  return adminPb;
}
