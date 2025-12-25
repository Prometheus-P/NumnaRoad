/**
 * SmartStore Authentication Service
 *
 * Handles OAuth token management for Naver Commerce API.
 * Tokens are cached and automatically refreshed before expiry.
 *
 * Required environment variables:
 * - NAVER_COMMERCE_APP_ID: Application ID from apicenter.commerce.naver.com
 * - NAVER_COMMERCE_APP_SECRET: Application Secret
 */

import type { NaverAccessToken, NaverAuthConfig, SmartStoreResult } from './types';

const NAVER_AUTH_URL = 'https://api.commerce.naver.com/external/v1/oauth2/token';
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000; // Refresh 1 minute before expiry

/**
 * SmartStore Authentication Service
 *
 * Manages OAuth 2.0 tokens for Naver Commerce API access.
 * Implements automatic token caching and refresh.
 */
export class SmartStoreAuth {
  private token: NaverAccessToken | null = null;
  private refreshPromise: Promise<string> | null = null;
  private config: NaverAuthConfig;

  constructor(config?: Partial<NaverAuthConfig>) {
    this.config = {
      appId: config?.appId || process.env.NAVER_COMMERCE_APP_ID || '',
      appSecret: config?.appSecret || process.env.NAVER_COMMERCE_APP_SECRET || '',
      sellerId: config?.sellerId || process.env.SMARTSTORE_SELLER_ID,
    };
  }

  /**
   * Get a valid access token.
   * Returns cached token if still valid, otherwise refreshes.
   */
  async getAccessToken(): Promise<string> {
    // Check if current token is still valid
    if (this.token && this.isTokenValid()) {
      return this.token.accessToken;
    }

    // Prevent concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Refresh the token
    this.refreshPromise = this.refreshToken();
    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Check if the current token is still valid.
   * Returns false if token will expire within the buffer period.
   */
  private isTokenValid(): boolean {
    if (!this.token) {
      return false;
    }
    const now = new Date();
    const expiresAt = new Date(this.token.expiresAt.getTime() - TOKEN_REFRESH_BUFFER_MS);
    return now < expiresAt;
  }

  /**
   * Refresh the access token from Naver API.
   */
  private async refreshToken(): Promise<string> {
    if (!this.config.appId || !this.config.appSecret) {
      throw new Error('SmartStore credentials not configured. Set NAVER_COMMERCE_APP_ID and NAVER_COMMERCE_APP_SECRET.');
    }

    try {
      // Naver Commerce API uses client_credentials grant type
      const credentials = Buffer.from(
        `${this.config.appId}:${this.config.appSecret}`
      ).toString('base64');

      const response = await fetch(NAVER_AUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          type: 'SELF',
        }).toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Token refresh failed: ${response.status} - ${errorBody}`);
      }

      const data = await response.json() as {
        access_token: string;
        expires_in: number;
        token_type: string;
      };

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);

      this.token = {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
        tokenType: 'Bearer',
        expiresAt,
      };

      console.log(`SmartStore token refreshed, expires at ${expiresAt.toISOString()}`);
      return this.token.accessToken;
    } catch (error) {
      console.error('Failed to refresh SmartStore token:', error);
      throw error;
    }
  }

  /**
   * Invalidate the current token.
   * Useful when receiving 401 responses.
   */
  invalidateToken(): void {
    this.token = null;
  }

  /**
   * Get authorization headers for API requests.
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Verify webhook signature using HMAC-SHA256.
   * The webhook secret should be configured in Naver Commerce API Center.
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret?: string
  ): boolean {
    const webhookSecret = secret || process.env.NAVER_COMMERCE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('Webhook secret not configured, skipping signature verification');
      return true; // Skip verification if secret not configured
    }

    try {
      // Use dynamic import for crypto to work in both Node.js and Edge runtime
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      // Use timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Check if credentials are configured.
   */
  isConfigured(): boolean {
    return !!(this.config.appId && this.config.appSecret);
  }

  /**
   * Get current token info (for debugging).
   */
  getTokenInfo(): { hasToken: boolean; expiresAt?: Date; isValid: boolean } {
    return {
      hasToken: !!this.token,
      expiresAt: this.token?.expiresAt,
      isValid: this.isTokenValid(),
    };
  }
}

/**
 * Singleton instance for shared use across the application.
 */
let authInstance: SmartStoreAuth | null = null;

/**
 * Get the shared SmartStore auth instance.
 */
export function getSmartStoreAuth(): SmartStoreAuth {
  if (!authInstance) {
    authInstance = new SmartStoreAuth();
  }
  return authInstance;
}

/**
 * Create a new SmartStore auth instance with custom config.
 * Useful for testing with different credentials.
 */
export function createSmartStoreAuth(config?: Partial<NaverAuthConfig>): SmartStoreAuth {
  return new SmartStoreAuth(config);
}
