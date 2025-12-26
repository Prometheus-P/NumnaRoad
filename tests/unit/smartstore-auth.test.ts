/**
 * SmartStore Authentication Service Tests
 *
 * Tests for token management, caching, and webhook signature verification.
 */

import { vi, expect, test, describe, beforeEach, afterEach } from 'vitest';
import { SmartStoreAuth, createSmartStoreAuth } from '../../services/sales-channels/smartstore/auth';

describe('SmartStoreAuth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NAVER_COMMERCE_APP_ID: 'test-app-id',
      NAVER_COMMERCE_APP_SECRET: 'test-app-secret',
      SMARTSTORE_SELLER_ID: 'test-seller-id',
      NAVER_COMMERCE_WEBHOOK_SECRET: 'test-webhook-secret',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should use environment variables by default', () => {
      const auth = createSmartStoreAuth();
      expect(auth.isConfigured()).toBe(true);
    });

    test('should accept custom config', () => {
      const auth = createSmartStoreAuth({
        appId: 'custom-app-id',
        appSecret: 'custom-app-secret',
      });
      expect(auth.isConfigured()).toBe(true);
    });

    test('should return false for isConfigured when credentials missing', () => {
      delete process.env.NAVER_COMMERCE_APP_ID;
      delete process.env.NAVER_COMMERCE_APP_SECRET;
      const auth = createSmartStoreAuth({ appId: '', appSecret: '' });
      expect(auth.isConfigured()).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    test('should fetch new token when none exists', async () => {
      const mockResponse = {
        access_token: 'new-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const auth = createSmartStoreAuth();
      const token = await auth.getAccessToken();

      expect(token).toBe('new-access-token');
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.commerce.naver.com/external/v1/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );
    });

    test('should return cached token when still valid', async () => {
      const mockResponse = {
        access_token: 'cached-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const auth = createSmartStoreAuth();

      // First call - fetches token
      const token1 = await auth.getAccessToken();
      expect(token1).toBe('cached-token');

      // Second call - should use cached token
      const token2 = await auth.getAccessToken();
      expect(token2).toBe('cached-token');

      // fetch should only be called once
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('should refresh token when expired', async () => {
      const mockResponse1 = {
        access_token: 'first-token',
        expires_in: 0, // Expires immediately
        token_type: 'Bearer',
      };
      const mockResponse2 = {
        access_token: 'refreshed-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse1),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse2),
        });

      const auth = createSmartStoreAuth();

      // First call
      await auth.getAccessToken();

      // Wait a bit to ensure token expires
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second call should refresh
      const token = await auth.getAccessToken();
      expect(token).toBe('refreshed-token');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('should throw error when credentials not configured', async () => {
      // Clear any previous fetch mocks
      global.fetch = vi.fn();

      // Clear environment variables so they don't provide fallback credentials
      delete process.env.NAVER_COMMERCE_APP_ID;
      delete process.env.NAVER_COMMERCE_APP_SECRET;

      const auth = createSmartStoreAuth({ appId: '', appSecret: '' });

      await expect(auth.getAccessToken()).rejects.toThrow(
        'SmartStore credentials not configured'
      );

      // fetch should not be called since credentials are missing
      expect(fetch).not.toHaveBeenCalled();
    });

    test('should throw error on authentication failure', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const auth = createSmartStoreAuth();

      await expect(auth.getAccessToken()).rejects.toThrow(
        'Token refresh failed: 401 - Unauthorized'
      );
    });

    test('should prevent concurrent token refresh', async () => {
      const mockResponse = {
        access_token: 'concurrent-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          ok: true,
          json: () => Promise.resolve(mockResponse),
        };
      });

      const auth = createSmartStoreAuth();

      // Make concurrent calls
      const [token1, token2, token3] = await Promise.all([
        auth.getAccessToken(),
        auth.getAccessToken(),
        auth.getAccessToken(),
      ]);

      expect(token1).toBe('concurrent-token');
      expect(token2).toBe('concurrent-token');
      expect(token3).toBe('concurrent-token');
      // Only one fetch call despite 3 concurrent requests
      expect(callCount).toBe(1);
    });
  });

  describe('invalidateToken', () => {
    test('should clear cached token', async () => {
      const mockResponse = {
        access_token: 'test-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const auth = createSmartStoreAuth();

      // Get token first
      await auth.getAccessToken();
      expect(fetch).toHaveBeenCalledTimes(1);

      // Invalidate
      auth.invalidateToken();

      // Should fetch new token
      await auth.getAccessToken();
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAuthHeaders', () => {
    test('should return authorization headers', async () => {
      const mockResponse = {
        access_token: 'header-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const auth = createSmartStoreAuth();
      const headers = await auth.getAuthHeaders();

      expect(headers).toEqual({
        Authorization: 'Bearer header-token',
        'Content-Type': 'application/json',
      });
    });
  });

  describe('verifyWebhookSignature', () => {
    test('should verify valid HMAC signature', () => {
      const auth = createSmartStoreAuth();
      const payload = '{"type":"ORDER_PAYMENT_COMPLETE","productOrderIds":["123"]}';
      const secret = 'test-webhook-secret';

      // Generate expected signature
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const result = auth.verifyWebhookSignature(payload, expectedSignature, secret);
      expect(result).toBe(true);
    });

    test('should reject invalid signature', () => {
      const auth = createSmartStoreAuth();
      const payload = '{"type":"ORDER_PAYMENT_COMPLETE"}';
      const invalidSignature = 'invalid-signature-12345678901234567890123456789012345678901234567890123456789012';

      const result = auth.verifyWebhookSignature(payload, invalidSignature, 'secret');
      expect(result).toBe(false);
    });

    test('should skip verification when secret not configured', () => {
      delete process.env.NAVER_COMMERCE_WEBHOOK_SECRET;
      const auth = createSmartStoreAuth();

      const result = auth.verifyWebhookSignature('payload', 'any-signature');
      expect(result).toBe(true); // Skips verification
    });
  });

  describe('getTokenInfo', () => {
    test('should return token info when token exists', async () => {
      const mockResponse = {
        access_token: 'info-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const auth = createSmartStoreAuth();
      await auth.getAccessToken();

      const info = auth.getTokenInfo();
      expect(info.hasToken).toBe(true);
      expect(info.isValid).toBe(true);
      expect(info.expiresAt).toBeInstanceOf(Date);
    });

    test('should return no token info when token not fetched', () => {
      const auth = createSmartStoreAuth();
      const info = auth.getTokenInfo();

      expect(info.hasToken).toBe(false);
      expect(info.isValid).toBe(false);
      expect(info.expiresAt).toBeUndefined();
    });
  });
});
