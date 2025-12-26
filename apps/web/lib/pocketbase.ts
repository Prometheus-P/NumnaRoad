import PocketBase from 'pocketbase';

const pb = new PocketBase(
  process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
);

/**
 * Get admin PocketBase instance with authentication
 */
export async function getAdminPocketBase(): Promise<PocketBase> {
  const adminPb = new PocketBase(
    process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
  );

  const email = process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.POCKETBASE_ADMIN_PASSWORD;

  if (email && password) {
    await adminPb.admins.authWithPassword(email, password);
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
