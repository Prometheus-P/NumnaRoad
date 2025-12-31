/**
 * SmartStore Product Client Tests
 *
 * Tests for the SmartStore Product API client.
 */

import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  SmartStoreProductClient,
  createSmartStoreProductClient,
  getSmartStoreProductClient,
} from '../../services/sales-channels/smartstore/product-client';
import type {
  SmartStoreProductRequest,
  SmartStoreProductResponse,
} from '../../services/sales-channels/smartstore/product-types';

// ============================================================================
// Mocks
// ============================================================================

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock auth
const mockAuth = {
  getAccessToken: vi.fn().mockResolvedValue('mock-access-token'),
  getAuthHeaders: vi.fn().mockResolvedValue({
    Authorization: 'Bearer mock-access-token',
  }),
  invalidateToken: vi.fn(),
};

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockProductRequest = (
  overrides: Partial<SmartStoreProductRequest> = {}
): SmartStoreProductRequest => ({
  originProduct: {
    statusType: 'SALE',
    saleType: 'NEW',
    leafCategoryId: '50000830',
    name: '[일본] eSIM 1GB 7일',
    detailContent: '<p>Test content</p>',
    images: {
      representativeImage: { url: 'https://example.com/image.png' },
    },
    salePrice: 15000,
    stockQuantity: 999,
    deliveryInfo: {
      deliveryType: 'DIRECT',
      deliveryFee: { deliveryFeeType: 'FREE' },
    },
  },
  smartstoreChannelProduct: {
    naverShoppingRegistration: true,
  },
  ...overrides,
});

const createMockProductResponse = (
  overrides: Partial<SmartStoreProductResponse> = {}
): SmartStoreProductResponse => ({
  originProductNo: 'prod-123456',
  smartstoreChannelProductNo: 'ss-123456',
  statusType: 'SALE',
  name: '[일본] eSIM 1GB 7일',
  salePrice: 15000,
  stockQuantity: 999,
  created: '2024-01-15T10:00:00Z',
  modified: '2024-01-15T10:00:00Z',
  ...overrides,
});

// ============================================================================
// Setup
// ============================================================================

describe('SmartStoreProductClient', () => {
  let client: SmartStoreProductClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createSmartStoreProductClient({
      auth: mockAuth as unknown as Parameters<typeof createSmartStoreProductClient>[0]['auth'],
      baseUrl: 'https://api.commerce.naver.com/external/v2',
      timeoutMs: 5000,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Create Product Tests
  // ============================================================================

  describe('createProduct', () => {
    test('should create product successfully', async () => {
      const mockResponse = createMockProductResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: '200', data: mockResponse }),
        text: () => Promise.resolve(JSON.stringify({ code: '200', data: mockResponse })),
      });

      const request = createMockProductRequest();
      const result = await client.createProduct(request);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.commerce.naver.com/external/v2/products',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      );
    });

    test('should handle validation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid product data' }),
      });

      const request = createMockProductRequest();
      const result = await client.createProduct(request);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.errorMessage).toContain('Invalid product data');
    });

    test('should handle authentication error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      const request = createMockProductRequest();
      const result = await client.createProduct(request);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('authentication');
      expect(result.isRetryable).toBe(true);
      expect(mockAuth.invalidateToken).toHaveBeenCalled();
    });

    test('should handle rate limit error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: 'Rate limit exceeded' }),
      });

      const request = createMockProductRequest();
      const result = await client.createProduct(request);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('rate_limit');
      expect(result.isRetryable).toBe(true);
    });
  });

  // ============================================================================
  // Update Product Tests
  // ============================================================================

  describe('updateProduct', () => {
    test('should update product successfully', async () => {
      const mockResponse = createMockProductResponse({ salePrice: 20000 });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: '200', data: mockResponse }),
        text: () => Promise.resolve(JSON.stringify({ code: '200', data: mockResponse })),
      });

      const request = createMockProductRequest();
      const result = await client.updateProduct('prod-123456', request);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.commerce.naver.com/external/v2/products/prod-123456',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    test('should handle not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Product not found' }),
      });

      const request = createMockProductRequest();
      const result = await client.updateProduct('nonexistent', request);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('not_found');
    });
  });

  // ============================================================================
  // Delete Product Tests
  // ============================================================================

  describe('deleteProduct', () => {
    test('should delete product successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      });

      const result = await client.deleteProduct('prod-123456');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.commerce.naver.com/external/v2/products/prod-123456',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  // ============================================================================
  // Get Product Tests
  // ============================================================================

  describe('getProduct', () => {
    test('should get product successfully', async () => {
      const mockResponse = createMockProductResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: '200', data: mockResponse }),
        text: () => Promise.resolve(JSON.stringify({ code: '200', data: mockResponse })),
      });

      const result = await client.getProduct('prod-123456');

      expect(result.success).toBe(true);
      expect(result.data?.originProductNo).toBe('prod-123456');
    });
  });

  // ============================================================================
  // List Products Tests
  // ============================================================================

  describe('listProducts', () => {
    test('should list products with default options', async () => {
      const mockResponse = {
        contents: [createMockProductResponse()],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: '200', data: mockResponse }),
        text: () => Promise.resolve(JSON.stringify({ code: '200', data: mockResponse })),
      });

      const result = await client.listProducts();

      expect(result.success).toBe(true);
      expect(result.data?.contents).toHaveLength(1);
      expect(result.data?.totalElements).toBe(1);
    });

    test('should pass query parameters correctly', async () => {
      const mockResponse = {
        contents: [],
        page: 1,
        size: 50,
        totalElements: 0,
        totalPages: 0,
        first: false,
        last: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: '200', data: mockResponse }),
        text: () => Promise.resolve(JSON.stringify({ code: '200', data: mockResponse })),
      });

      await client.listProducts({
        page: 1,
        size: 50,
        statusType: 'SALE',
        productName: 'eSIM',
        sortBy: 'CREATED',
        sortOrder: 'DESC',
      });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('size=50');
      expect(calledUrl).toContain('statusType=SALE');
      expect(calledUrl).toContain('productName=eSIM');
      expect(calledUrl).toContain('sortBy=CREATED');
      expect(calledUrl).toContain('sortOrder=DESC');
    });

    test('should limit size to 500', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            code: '200',
            data: { contents: [], page: 0, size: 500, totalElements: 0, totalPages: 0, first: true, last: true },
          }),
        text: () =>
          Promise.resolve(
            JSON.stringify({
              code: '200',
              data: { contents: [], page: 0, size: 500, totalElements: 0, totalPages: 0, first: true, last: true },
            })
          ),
      });

      await client.listProducts({ size: 1000 });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('size=500');
    });
  });

  // ============================================================================
  // Status Update Tests
  // ============================================================================

  describe('updateProductStatus', () => {
    test('should update status successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      });

      const result = await client.updateProductStatus('prod-123456', 'SUSPENSION');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.commerce.naver.com/external/v2/products/prod-123456/status',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ statusType: 'SUSPENSION' }),
        })
      );
    });
  });

  // ============================================================================
  // Stock Update Tests
  // ============================================================================

  describe('updateStock', () => {
    test('should update stock successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      });

      const result = await client.updateStock('prod-123456', 100);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.commerce.naver.com/external/v2/products/prod-123456/stock',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ stockQuantity: 100 }),
        })
      );
    });
  });

  // ============================================================================
  // Price Update Tests
  // ============================================================================

  describe('updatePrice', () => {
    test('should update price successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      });

      const result = await client.updatePrice('prod-123456', 25000);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.commerce.naver.com/external/v2/products/prod-123456/price',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ salePrice: 25000 }),
        })
      );
    });
  });

  // ============================================================================
  // Image Upload Tests
  // ============================================================================

  describe('uploadProductImage', () => {
    test('should upload image successfully', async () => {
      const mockResponse = { url: 'https://shop-phinf.pstatic.net/image.png' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: '200', data: mockResponse }),
        text: () => Promise.resolve(JSON.stringify({ code: '200', data: mockResponse })),
      });

      const result = await client.uploadProductImage('https://example.com/source.png');

      expect(result.success).toBe(true);
      expect(result.data?.url).toContain('pstatic.net');
    });
  });

  // ============================================================================
  // Category Tests
  // ============================================================================

  describe('getCategories', () => {
    test('should get categories successfully', async () => {
      const mockCategories = [
        { id: '50000830', name: '모바일상품권', isLeaf: true, wholeCategoryName: '디지털 > 모바일상품권' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ code: '200', data: mockCategories }),
        text: () => Promise.resolve(JSON.stringify({ code: '200', data: mockCategories })),
      });

      const result = await client.getCategories();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  // ============================================================================
  // Batch Update Tests
  // ============================================================================

  describe('batchUpdateStatus', () => {
    test('should batch update status successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            code: '200',
            data: {
              successProductNos: ['prod-1', 'prod-2'],
              failProductNos: ['prod-3'],
            },
          }),
        text: () =>
          Promise.resolve(
            JSON.stringify({
              code: '200',
              data: {
                successProductNos: ['prod-1', 'prod-2'],
                failProductNos: ['prod-3'],
              },
            })
          ),
      });

      const result = await client.batchUpdateStatus(['prod-1', 'prod-2', 'prod-3'], 'SUSPENSION');

      expect(result.success).toBe(true);
      expect(result.data?.success).toEqual(['prod-1', 'prod-2']);
      expect(result.data?.failed).toEqual(['prod-3']);
    });
  });

  // ============================================================================
  // Health Check Tests
  // ============================================================================

  describe('healthCheck', () => {
    test('should return true when API is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            code: '200',
            data: { contents: [], page: 0, size: 1, totalElements: 0, totalPages: 0, first: true, last: true },
          }),
        text: () =>
          Promise.resolve(
            JSON.stringify({
              code: '200',
              data: { contents: [], page: 0, size: 1, totalElements: 0, totalPages: 0, first: true, last: true },
            })
          ),
      });

      const result = await client.healthCheck();

      expect(result).toBe(true);
    });

    test('should return false when API is unhealthy', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    test('should handle network timeout', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            const error = new Error('Request timed out');
            error.name = 'AbortError';
            setTimeout(() => reject(error), 100);
          })
      );

      const request = createMockProductRequest();
      const result = await client.createProduct(request);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network_error');
      expect(result.isRetryable).toBe(true);
    });

    test('should handle server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Internal server error' }),
      });

      const request = createMockProductRequest();
      const result = await client.createProduct(request);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('api_error');
      expect(result.isRetryable).toBe(true);
    });
  });

  // ============================================================================
  // Singleton Tests
  // ============================================================================

  describe('getSmartStoreProductClient', () => {
    test('should return the same instance', () => {
      // Note: This test verifies singleton behavior
      // In a real test environment, you'd want to reset the singleton between tests
      const client1 = getSmartStoreProductClient();
      const client2 = getSmartStoreProductClient();

      expect(client1).toBe(client2);
    });
  });
});
