import PocketBase from 'pocketbase';

const pb = new PocketBase(
  process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
);

/**
 * Cached Admin PocketBase Manager
 *
 * Caches admin authentication token to reduce API calls.
 * Token is refreshed 1 minute before expiry for safety margin.
 */
class AdminPocketBaseManager {
  private static instance: PocketBase | null = null;
  private static tokenExpiry: number = 0;
  private static isAuthenticating: boolean = false;
  private static authPromise: Promise<PocketBase> | null = null;

  // Token validity duration: 1 hour (PocketBase default)
  private static readonly TOKEN_VALIDITY_MS = 60 * 60 * 1000;
  // Refresh buffer: 5 minutes before expiry
  private static readonly REFRESH_BUFFER_MS = 5 * 60 * 1000;

  /**
   * Check if cached token is still valid
   */
  private static isTokenValid(): boolean {
    if (!this.instance || !this.tokenExpiry) {
      return false;
    }
    // Return false if token expires within buffer period
    return Date.now() < this.tokenExpiry - this.REFRESH_BUFFER_MS;
  }

  /**
   * Authenticate and cache the admin instance
   */
  private static async authenticate(): Promise<PocketBase> {
    const adminPb = new PocketBase(
      process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
    );

    const email = process.env.POCKETBASE_ADMIN_EMAIL;
    const password = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error('Admin credentials not configured');
    }

    // PocketBase 0.21+ uses _superusers collection
    await adminPb.collection('_superusers').authWithPassword(email, password);

    // Cache the instance and set expiry
    this.instance = adminPb;
    this.tokenExpiry = Date.now() + this.TOKEN_VALIDITY_MS;

    return adminPb;
  }

  /**
   * Get admin PocketBase instance with caching
   *
   * Implements request coalescing to prevent multiple simultaneous auth requests
   */
  static async getAdmin(): Promise<PocketBase> {
    // Return cached instance if valid
    if (this.isTokenValid() && this.instance) {
      return this.instance;
    }

    // If already authenticating, wait for that promise
    if (this.isAuthenticating && this.authPromise) {
      return this.authPromise;
    }

    // Start new authentication
    this.isAuthenticating = true;
    this.authPromise = this.authenticate()
      .finally(() => {
        this.isAuthenticating = false;
        this.authPromise = null;
      });

    return this.authPromise;
  }

  /**
   * Force refresh the admin token
   */
  static async refresh(): Promise<PocketBase> {
    this.instance = null;
    this.tokenExpiry = 0;
    return this.getAdmin();
  }

  /**
   * Clear the cached instance
   */
  static clear(): void {
    this.instance = null;
    this.tokenExpiry = 0;
    this.isAuthenticating = false;
    this.authPromise = null;
  }
}

/**
 * Get admin PocketBase instance with authentication and caching
 *
 * Uses cached token when valid, reducing unnecessary auth API calls.
 * Automatically refreshes token 5 minutes before expiry.
 */
export async function getAdminPocketBase(): Promise<PocketBase> {
  return AdminPocketBaseManager.getAdmin();
}

/**
 * Force refresh admin token (useful after config changes)
 */
export async function refreshAdminPocketBase(): Promise<PocketBase> {
  return AdminPocketBaseManager.refresh();
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
  SMARTSTORE_PRODUCTS: 'smartstore_products',
  PRODUCT_MAPPINGS: 'product_mappings',
  USERS: 'users',
} as const;

export default pb;
