import PocketBase from 'pocketbase';

const pb = new PocketBase(
  process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
);

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
