/**
 * SmartStore API Client Tests
 *
 * Tests for Naver Commerce API client operations.
 */

import { vi, expect, test, describe, beforeEach, afterEach } from 'vitest';
import { SmartStoreClient, createSmartStoreClient } from '../../services/sales-channels/smartstore/client';
import { SmartStoreAuth, createSmartStoreAuth } from '../../services/sales-channels/smartstore/auth';
import type { NaverProductOrder, NaverStatusChange } from '../../services/sales-channels/smartstore/types';

describe('SmartStoreClient', () => {
  const originalEnv = process.env;
  let mockAuth: SmartStoreAuth;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NAVER_COMMERCE_APP_ID: 'test-app-id',
      NAVER_COMMERCE_APP_SECRET: 'test-app-secret',
      NAVER_COMMERCE_API_URL: 'https://api.commerce.naver.com/external/v1',
    };

    // Create a mock auth that returns tokens without HTTP calls
    mockAuth = createSmartStoreAuth();
    vi.spyOn(mockAuth, 'getAuthHeaders').mockResolvedValue({
      Authorization: 'Bearer mock-token',
      'Content-Type': 'application/json',
    });
    vi.spyOn(mockAuth, 'invalidateToken').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // ============================================================================
  // getProductOrders Tests
  // ============================================================================

  describe('getProductOrders', () => {
    test('should return empty array for empty input', async () => {
      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.getProductOrders([]);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    test('should fetch product orders by IDs', async () => {
      const mockOrders: NaverProductOrder[] = [
        {
          productOrderId: 'order-123',
          orderId: 'ord-001',
          orderDate: '2024-01-15T10:00:00Z',
          paymentDate: '2024-01-15T10:05:00Z',
          orderStatusType: 'PAYED',
          productOrderStatus: 'PAYED',
          productId: 'prod-001',
          productName: 'Japan eSIM 1GB',
          productOption: '7 Days',
          quantity: 1,
          unitPrice: 10000,
          totalProductAmount: 10000,
          totalPaymentAmount: 10000,
          paymentMeans: 'CARD',
          paymentCommission: 300,
          orderer: {
            name: 'Test User',
            email: 'test@example.com',
            tel: '010-1234-5678',
          },
          deliveryMethod: 'DIRECT_DELIVERY',
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            code: '0',
            message: 'Success',
            data: mockOrders,
          }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.getProductOrders(['order-123']);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].productOrderId).toBe('order-123');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/pay-order/seller/product-orders/query'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ productOrderIds: ['order-123'] }),
        })
      );
    });

    test('should handle API error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            message: 'Internal Server Error',
          }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.getProductOrders(['order-123']);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('api_error');
      expect(result.isRetryable).toBe(true);
    });
  });

  // ============================================================================
  // getLastChangedStatuses Tests
  // ============================================================================

  describe('getLastChangedStatuses', () => {
    test('should fetch status changes for date range', async () => {
      const mockChanges: NaverStatusChange[] = [
        {
          productOrderId: 'order-456',
          orderId: 'ord-002',
          orderStatusType: 'PAYED',
          lastChangedDate: '2024-01-15T11:00:00Z',
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            code: '0',
            message: 'Success',
            data: {
              lastChangeStatuses: mockChanges,
              more: false,
            },
          }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      const from = new Date('2024-01-15T00:00:00Z');
      const to = new Date('2024-01-15T23:59:59Z');
      const result = await client.getLastChangedStatuses(from, to);

      expect(result.success).toBe(true);
      expect(result.data?.changes).toHaveLength(1);
      expect(result.data?.hasMore).toBe(false);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/pay-order\/seller\/product-orders\/last-changed-statuses\?/),
        expect.objectContaining({ method: 'GET' })
      );
    });

    test('should apply filter options', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            code: '0',
            data: { lastChangeStatuses: [], more: false },
          }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      await client.getLastChangedStatuses(new Date(), new Date(), {
        orderStatusType: 'PAYED',
        pageSize: 50,
        pageToken: 'token123',
      });

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain('orderStatusType=PAYED');
      expect(calledUrl).toContain('pageSize=50');
      expect(calledUrl).toContain('pageToken=token123');
    });

    test('should indicate when more results available', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            code: '0',
            data: {
              lastChangeStatuses: [{ productOrderId: '1' }],
              more: true,
            },
          }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.getLastChangedStatuses(new Date(), new Date());

      expect(result.success).toBe(true);
      expect(result.data?.hasMore).toBe(true);
    });
  });

  // ============================================================================
  // dispatchOrder Tests
  // ============================================================================

  describe('dispatchOrder', () => {
    test('should dispatch order successfully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            code: '0',
            message: 'Success',
            data: {
              successProductOrderIds: ['order-789'],
              failProductOrderIds: [],
            },
          }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.dispatchOrder('order-789');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/pay-order/seller/product-orders/dispatch'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    test('should handle dispatch failure', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            code: '0',
            data: {
              successProductOrderIds: [],
              failProductOrderIds: ['order-789'],
            },
          }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.dispatchOrder('order-789');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Failed to dispatch order');
    });

    test('should use DIRECT_DELIVERY method for eSIM', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            code: '0',
            data: { successProductOrderIds: ['order-789'], failProductOrderIds: [] },
          }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      await client.dispatchOrder('order-789');

      const body = JSON.parse(
        (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
      );
      expect(body.dispatchProductOrders[0].deliveryMethod).toBe('DIRECT_DELIVERY');
    });
  });

  // ============================================================================
  // dispatchOrders (batch) Tests
  // ============================================================================

  describe('dispatchOrders', () => {
    test('should dispatch multiple orders', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            code: '0',
            data: {
              successProductOrderIds: ['order-1', 'order-2'],
              failProductOrderIds: ['order-3'],
            },
          }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.dispatchOrders([
        { productOrderId: 'order-1' },
        { productOrderId: 'order-2' },
        { productOrderId: 'order-3' },
      ]);

      expect(result.success).toBe(true);
      expect(result.data?.success).toEqual(['order-1', 'order-2']);
      expect(result.data?.failed).toEqual(['order-3']);
    });
  });

  // ============================================================================
  // getDailySettlement Tests
  // ============================================================================

  describe('getDailySettlement', () => {
    test('should fetch daily settlement data', async () => {
      const mockSettlement = {
        date: '2024-01-15',
        totalSettlementAmount: 100000,
        totalDeductionAmount: 3000,
        totalNetAmount: 97000,
        itemCount: 5,
        items: [],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            code: '0',
            data: mockSettlement,
          }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.getDailySettlement(new Date('2024-01-15'));

      expect(result.success).toBe(true);
      expect(result.data?.totalNetAmount).toBe(97000);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('settlementDate=2024-01-15'),
        expect.any(Object)
      );
    });
  });

  // ============================================================================
  // getInquiries Tests
  // ============================================================================

  describe('getInquiries', () => {
    test('should fetch customer inquiries', async () => {
      const mockInquiries = [
        {
          inquiryId: 'inq-001',
          productId: 'prod-001',
          productName: 'Japan eSIM',
          inquiryType: 'PRODUCT',
          title: 'Question about activation',
          content: 'How do I activate?',
          createdDate: '2024-01-15T10:00:00Z',
          isAnswered: false,
          inquirer: { name: 'User', memberId: 'member-001' },
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            code: '0',
            data: mockInquiries,
          }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.getInquiries({ answered: false });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  // ============================================================================
  // replyToInquiry Tests
  // ============================================================================

  describe('replyToInquiry', () => {
    test('should reply to inquiry successfully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            code: '0',
            message: 'Success',
          }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.replyToInquiry('inq-001', 'Here is how to activate...');

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/pay-order/seller/inquiries/inq-001/answer'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'Here is how to activate...' }),
        })
      );
    });
  });

  // ============================================================================
  // healthCheck Tests
  // ============================================================================

  describe('healthCheck', () => {
    test('should return true when API is healthy', async () => {
      vi.spyOn(mockAuth, 'getAccessToken').mockResolvedValue('valid-token');

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            code: '0',
            data: { lastChangeStatuses: [], more: false },
          }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.healthCheck();

      expect(result).toBe(true);
    });

    test('should return false on API failure', async () => {
      vi.spyOn(mockAuth, 'getAccessToken').mockRejectedValue(new Error('Auth failed'));

      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    test('should handle 401 authentication error and invalidate token', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.getProductOrders(['order-123']);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('authentication');
      expect(result.isRetryable).toBe(true);
      expect(mockAuth.invalidateToken).toHaveBeenCalled();
    });

    test('should handle 403 forbidden error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ message: 'Forbidden' }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.getProductOrders(['order-123']);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('authentication');
      expect(result.isRetryable).toBe(false);
    });

    test('should handle 404 not found error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not Found' }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.getProductOrders(['order-123']);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('not_found');
    });

    test('should handle 429 rate limit error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: 'Too Many Requests' }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.getProductOrders(['order-123']);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('rate_limit');
      expect(result.isRetryable).toBe(true);
    });

    test('should handle 422 validation error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ message: 'Invalid input' }),
      });

      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.getProductOrders(['order-123']);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.isRetryable).toBe(false);
    });

    test('should handle network timeout', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      global.fetch = vi.fn().mockRejectedValueOnce(abortError);

      const client = createSmartStoreClient({ auth: mockAuth, timeoutMs: 100 });
      const result = await client.getProductOrders(['order-123']);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network_error');
      expect(result.isRetryable).toBe(true);
    });

    test('should handle network error', async () => {
      // The client checks for 'fetch' or 'network' in error message
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('fetch failed: network unreachable'));

      const client = createSmartStoreClient({ auth: mockAuth });
      const result = await client.getProductOrders(['order-123']);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network_error');
      expect(result.isRetryable).toBe(true);
    });
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================

  describe('Configuration', () => {
    test('should use custom base URL', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: '0', data: [] }),
      });

      const customUrl = 'https://custom-api.example.com/v1';
      const client = createSmartStoreClient({
        auth: mockAuth,
        baseUrl: customUrl,
      });

      await client.getProductOrders(['order-123']);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(customUrl),
        expect.any(Object)
      );
    });

    test('should use custom timeout', async () => {
      const client = createSmartStoreClient({
        auth: mockAuth,
        timeoutMs: 5000,
      });

      // The timeout is used internally, we just verify it accepts the option
      expect(client).toBeDefined();
    });
  });
});
