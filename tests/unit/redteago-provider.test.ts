/**
 * RedteaGO Provider Unit Tests
 *
 * Tests for the RedteaGO (eSIMAccess) wholesale eSIM provider adapter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RedteaGOProvider } from '@services/esim-providers/redteago';
import type { EsimProvider, EsimPurchaseRequest } from '@services/esim-providers/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RedteaGOProvider', () => {
  let provider: RedteaGOProvider;

  const mockConfig: EsimProvider = {
    id: 'redteago-1',
    name: 'RedteaGO',
    slug: 'redteago',
    priority: 100,
    apiEndpoint: 'https://api.esimaccess.com/api/v1',
    apiKeyEnvVar: 'REDTEAGO_API_KEY',
    timeoutMs: 10000,
    maxRetries: 3,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockPurchaseRequest: EsimPurchaseRequest = {
    providerSku: 'JP-3GB-15D',
    quantity: 1,
    customerEmail: 'test@example.com',
    correlationId: 'test-correlation-123',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.REDTEAGO_API_KEY = 'test-api-key';
    provider = new RedteaGOProvider(mockConfig);
  });

  afterEach(() => {
    delete process.env.REDTEAGO_API_KEY;
  });

  describe('purchase', () => {
    it('should successfully purchase an eSIM', async () => {
      const mockResponse = {
        success: true,
        code: 0,
        msg: 'Success',
        data: {
          orderNo: 'RG-ORDER-123',
          transactionId: 'TXN-456',
          status: 'COMPLETED',
          esimList: [
            {
              iccid: '8901234567890123456',
              smdpAddress: 'rsp.esimaccess.com',
              activationCode: 'K2-ABC123',
              qrcodeUrl: 'https://api.esimaccess.com/qr/123.png',
              qrcodeData: 'LPA:1$rsp.esimaccess.com$K2-ABC123',
              expiryDate: '2024-12-31',
            },
          ],
          totalAmount: 1.39,
          currency: 'USD',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await provider.purchase(mockPurchaseRequest);

      expect(result.success).toBe(true);
      if (result.success === true) {
        expect(result.iccid).toBe('8901234567890123456');
        expect(result.qrCodeUrl).toBe('https://api.esimaccess.com/qr/123.png');
        expect(result.providerOrderId).toBe('RG-ORDER-123');
        expect(result.activationCode).toBe('K2-ABC123');
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.esimaccess.com/api/v1/order/create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
    });

    it('should handle purchase with pending status', async () => {
      const mockResponse = {
        success: true,
        code: 0,
        msg: 'Order pending',
        data: {
          orderNo: 'RG-ORDER-124',
          transactionId: 'TXN-457',
          status: 'PENDING',
          esimList: [],
          totalAmount: 1.39,
          currency: 'USD',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await provider.purchase(mockPurchaseRequest);

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errorType).toBe('provider_error');
        expect(result.isRetryable).toBe(true); // Pending is retryable
      }
    });

    it('should handle API error response', async () => {
      const mockResponse = {
        success: false,
        code: 1001,
        msg: 'Temporary service unavailable',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await provider.purchase(mockPurchaseRequest);

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errorType).toBe('provider_error');
        expect(result.errorMessage).toBe('Temporary service unavailable');
        expect(result.isRetryable).toBe(true); // 1001 is retryable
      }
    });

    it('should handle 401 authentication error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ msg: 'Invalid API key' }),
      });

      const result = await provider.purchase(mockPurchaseRequest);

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errorType).toBe('authentication');
        expect(result.isRetryable).toBe(false);
      }
    });

    it('should handle 429 rate limit error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ msg: 'Too many requests' }),
      });

      const result = await provider.purchase(mockPurchaseRequest);

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errorType).toBe('rate_limit');
        expect(result.isRetryable).toBe(true);
      }
    });

    it('should handle 500 server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ msg: 'Internal server error' }),
      });

      const result = await provider.purchase(mockPurchaseRequest);

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errorType).toBe('provider_error');
        expect(result.isRetryable).toBe(true);
      }
    });

    it('should handle network timeout', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await provider.purchase(mockPurchaseRequest);

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errorType).toBe('timeout');
        expect(result.isRetryable).toBe(true);
      }
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

      const result = await provider.purchase(mockPurchaseRequest);

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errorType).toBe('network_error');
        expect(result.isRetryable).toBe(true);
      }
    });

    it('should throw error when API key is missing', async () => {
      delete process.env.REDTEAGO_API_KEY;

      const result = await provider.purchase(mockPurchaseRequest);

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errorMessage).toContain('Missing provider API key');
      }
    });

    it('should generate QR code URL when only qrcodeData is provided', async () => {
      const mockResponse = {
        success: true,
        code: 0,
        msg: 'Success',
        data: {
          orderNo: 'RG-ORDER-125',
          transactionId: 'TXN-458',
          status: 'COMPLETED',
          esimList: [
            {
              iccid: '8901234567890123457',
              smdpAddress: 'rsp.esimaccess.com',
              activationCode: 'K2-DEF456',
              qrcodeData: 'LPA:1$rsp.esimaccess.com$K2-DEF456',
              // No qrcodeUrl provided
            },
          ],
          totalAmount: 1.39,
          currency: 'USD',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await provider.purchase(mockPurchaseRequest);

      expect(result.success).toBe(true);
      if (result.success === true) {
        expect(result.qrCodeUrl).toContain('chart.googleapis.com');
        expect(result.qrCodeUrl).toContain(encodeURIComponent('LPA:1$rsp.esimaccess.com$K2-DEF456'));
      }
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy and balance is sufficient', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          code: 0,
          msg: 'Success',
          data: {
            balance: 50.00,
            currency: 'USD',
          },
        }),
      });

      const result = await provider.healthCheck();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.esimaccess.com/api/v1/account/balance',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
    });

    it('should return false when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });

    it('should return true when balance is low but positive', async () => {
      // Mock console.warn to verify low balance warning
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          code: 0,
          msg: 'Success',
          data: {
            balance: 5.00, // Low balance
            currency: 'USD',
          },
        }),
      });

      const result = await provider.healthCheck();

      expect(result).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith('RedteaGO low balance warning: $5');

      warnSpy.mockRestore();
    });

    it('should return false when balance is zero', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          code: 0,
          msg: 'Success',
          data: {
            balance: 0,
            currency: 'USD',
          },
        }),
      });

      const result = await provider.healthCheck();

      // Balance >= 1 is required
      expect(result).toBe(false);
    });

    it('should handle network error gracefully', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.healthCheck();

      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith(
        'RedteaGO health check failed:',
        expect.any(Error)
      );

      errorSpy.mockRestore();
    });
  });

  describe('getPackages', () => {
    it('should fetch packages successfully', async () => {
      const mockPackages = {
        success: true,
        code: 0,
        msg: 'Success',
        data: {
          packages: [
            {
              packageCode: 'JP-3GB-15D',
              name: 'Japan 3GB 15 Days',
              country: 'Japan',
              countryCode: 'JP',
              dataAmount: 3,
              dataUnit: 'GB',
              validity: 15,
              price: 1.39,
              currency: 'USD',
              description: 'Japan eSIM with 3GB data for 15 days',
            },
            {
              packageCode: 'JP-5GB-30D',
              name: 'Japan 5GB 30 Days',
              country: 'Japan',
              countryCode: 'JP',
              dataAmount: 5,
              dataUnit: 'GB',
              validity: 30,
              price: 2.30,
              currency: 'USD',
            },
          ],
          total: 2,
          page: 1,
          pageSize: 100,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPackages,
      });

      const result = await provider.getPackages('JP');

      expect(result.success).toBe(true);
      expect(result.data?.packages).toHaveLength(2);
      expect(result.data?.packages[0].packageCode).toBe('JP-3GB-15D');
      expect(result.data?.packages[0].price).toBe(1.39);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('countryCode=JP'),
        expect.any(Object)
      );
    });

    it('should fetch all packages when no country filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          code: 0,
          msg: 'Success',
          data: {
            packages: [],
            total: 0,
            page: 1,
            pageSize: 100,
          },
        }),
      });

      await provider.getPackages();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=100'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.not.stringContaining('countryCode'),
        expect.any(Object)
      );
    });

    it('should throw error on API failure', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(provider.getPackages()).rejects.toThrow(
        'RedteaGO package fetch failed'
      );

      errorSpy.mockRestore();
    });
  });

  describe('getBalance', () => {
    it('should return balance info', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          code: 0,
          msg: 'Success',
          data: {
            balance: 100.50,
            currency: 'USD',
          },
        }),
      });

      const result = await provider.getBalance();

      expect(result).toEqual({
        balance: 100.50,
        currency: 'USD',
      });
    });

    it('should return null on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await provider.getBalance();

      expect(result).toBeNull();
    });

    it('should return null on unsuccessful response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          code: 1001,
          msg: 'Error',
        }),
      });

      const result = await provider.getBalance();

      expect(result).toBeNull();
    });

    it('should handle network error', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.getBalance();

      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalledWith(
        'Error fetching RedteaGO balance:',
        expect.any(Error)
      );

      errorSpy.mockRestore();
    });
  });

  describe('error classification', () => {
    const testCases = [
      { status: 400, expectedType: 'validation', retryable: false },
      { status: 401, expectedType: 'authentication', retryable: false },
      { status: 403, expectedType: 'authentication', retryable: false },
      { status: 422, expectedType: 'validation', retryable: false },
      { status: 429, expectedType: 'rate_limit', retryable: true },
      { status: 500, expectedType: 'provider_error', retryable: true },
      { status: 502, expectedType: 'provider_error', retryable: true },
      { status: 503, expectedType: 'provider_error', retryable: true },
    ];

    testCases.forEach(({ status, expectedType, retryable }) => {
      it(`should classify HTTP ${status} as ${expectedType} (retryable: ${retryable})`, async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status,
          json: async () => ({ msg: 'Error' }),
        });

        const result = await provider.purchase(mockPurchaseRequest);

        expect(result.success).toBe(false);
        if (result.success === false) {
          expect(result.errorType).toBe(expectedType);
          expect(result.isRetryable).toBe(retryable);
        }
      });
    });
  });

  describe('retryable error codes', () => {
    const retryableCodes = [1001, 1002, 2001, 5000];
    const nonRetryableCodes = [1003, 2002, 3000, 4000];

    retryableCodes.forEach((code) => {
      it(`should mark error code ${code} as retryable`, async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: false,
            code,
            msg: `Error code ${code}`,
          }),
        });

        const result = await provider.purchase(mockPurchaseRequest);

        expect(result.success).toBe(false);
        if (result.success === false) {
          expect(result.isRetryable).toBe(true);
        }
      });
    });

    nonRetryableCodes.forEach((code) => {
      it(`should mark error code ${code} as non-retryable`, async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: false,
            code,
            msg: `Error code ${code}`,
          }),
        });

        const result = await provider.purchase(mockPurchaseRequest);

        expect(result.success).toBe(false);
        if (result.success === false) {
          expect(result.isRetryable).toBe(false);
        }
      });
    });
  });
});
