/**
 * SmartStore Product API Client
 *
 * Provides methods for product CRUD operations on Naver SmartStore.
 * Follows the same patterns as the order client.
 *
 * API Documentation: https://apicenter.commerce.naver.com/docs/commerce-api/current
 */

import { SmartStoreAuth, getSmartStoreAuth } from './auth';
import type {
  SmartStoreResult,
  SmartStoreErrorType,
  NaverApiResponse,
  NaverPaginatedResponse,
} from './types';
import type {
  SmartStoreProductRequest,
  SmartStoreProductResponse,
  SmartStoreProductListItem,
  SmartStorePaginatedProducts,
  ListProductsOptions,
  NaverCategory,
  CategoryAttributes,
  ImageUploadResponse,
  ProductStatusType,
} from './product-types';
import { logger } from '../../logger';

/** API base URL - use v2 for product APIs */
const NAVER_API_BASE_URL =
  process.env.NAVER_COMMERCE_API_URL || 'https://api.commerce.naver.com/external/v2';
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * SmartStore Product API Client
 *
 * Provides methods for:
 * - Product CRUD operations
 * - Product status/stock/price updates
 * - Image uploads
 * - Category queries
 */
export class SmartStoreProductClient {
  private auth: SmartStoreAuth;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options?: { auth?: SmartStoreAuth; baseUrl?: string; timeoutMs?: number }) {
    this.auth = options?.auth || getSmartStoreAuth();
    this.baseUrl = options?.baseUrl || NAVER_API_BASE_URL;
    this.timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  // ============================================================================
  // Product CRUD Operations
  // ============================================================================

  /**
   * Create a new product on SmartStore.
   * POST /products
   */
  async createProduct(
    product: SmartStoreProductRequest
  ): Promise<SmartStoreResult<SmartStoreProductResponse>> {
    try {
      const response = await this.request<NaverApiResponse<SmartStoreProductResponse>>(
        '/products',
        {
          method: 'POST',
          body: JSON.stringify(product),
        }
      );

      if (!response.success) {
        return {
          success: false,
          errorType: response.errorType,
          errorMessage: response.errorMessage,
          isRetryable: response.isRetryable,
        };
      }

      return {
        success: true,
        data: response.data?.data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update an existing product.
   * PUT /products/{productNo}
   */
  async updateProduct(
    productNo: string,
    product: Partial<SmartStoreProductRequest>
  ): Promise<SmartStoreResult<SmartStoreProductResponse>> {
    try {
      const response = await this.request<NaverApiResponse<SmartStoreProductResponse>>(
        `/products/${productNo}`,
        {
          method: 'PUT',
          body: JSON.stringify(product),
        }
      );

      if (!response.success) {
        return {
          success: false,
          errorType: response.errorType,
          errorMessage: response.errorMessage,
          isRetryable: response.isRetryable,
        };
      }

      return {
        success: true,
        data: response.data?.data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete a product.
   * DELETE /products/{productNo}
   */
  async deleteProduct(productNo: string): Promise<SmartStoreResult<boolean>> {
    try {
      const response = await this.request<NaverApiResponse<void>>(`/products/${productNo}`, {
        method: 'DELETE',
      });

      if (!response.success) {
        return {
          success: false,
          errorType: response.errorType,
          errorMessage: response.errorMessage,
          isRetryable: response.isRetryable,
        };
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get a single product by product number.
   * GET /products/{productNo}
   */
  async getProduct(productNo: string): Promise<SmartStoreResult<SmartStoreProductResponse>> {
    try {
      const response = await this.request<NaverApiResponse<SmartStoreProductResponse>>(
        `/products/${productNo}`,
        { method: 'GET' }
      );

      if (!response.success) {
        return {
          success: false,
          errorType: response.errorType,
          errorMessage: response.errorMessage,
          isRetryable: response.isRetryable,
        };
      }

      return {
        success: true,
        data: response.data?.data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * List products with optional filters.
   * GET /products
   */
  async listProducts(
    options?: ListProductsOptions
  ): Promise<SmartStoreResult<SmartStorePaginatedProducts>> {
    try {
      const params = new URLSearchParams();

      if (options?.page !== undefined) {
        params.append('page', options.page.toString());
      }
      if (options?.size !== undefined) {
        params.append('size', Math.min(options.size, 500).toString());
      }
      if (options?.statusType) {
        params.append('statusType', options.statusType);
      }
      if (options?.productName) {
        params.append('productName', options.productName);
      }
      if (options?.sellerManagementCode) {
        params.append('sellerManagementCode', options.sellerManagementCode);
      }
      if (options?.sortBy) {
        params.append('sortBy', options.sortBy);
      }
      if (options?.sortOrder) {
        params.append('sortOrder', options.sortOrder);
      }

      const queryString = params.toString();
      const path = queryString ? `/products?${queryString}` : '/products';

      const response = await this.request<NaverPaginatedResponse<SmartStoreProductListItem>>(
        path,
        { method: 'GET' }
      );

      if (!response.success) {
        return {
          success: false,
          errorType: response.errorType,
          errorMessage: response.errorMessage,
          isRetryable: response.isRetryable,
        };
      }

      const data = response.data?.data;
      return {
        success: true,
        data: data
          ? {
              contents: data.contents,
              page: data.page,
              size: data.size,
              totalElements: data.totalElements,
              totalPages: data.totalPages,
              first: data.first,
              last: data.last,
            }
          : {
              contents: [],
              page: 0,
              size: 0,
              totalElements: 0,
              totalPages: 0,
              first: true,
              last: true,
            },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // Quick Update Operations
  // ============================================================================

  /**
   * Update product status (SALE, SUSPENSION, etc.)
   * PATCH /products/{productNo}/status
   */
  async updateProductStatus(
    productNo: string,
    status: ProductStatusType
  ): Promise<SmartStoreResult<boolean>> {
    try {
      const response = await this.request<NaverApiResponse<void>>(
        `/products/${productNo}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ statusType: status }),
        }
      );

      if (!response.success) {
        return {
          success: false,
          errorType: response.errorType,
          errorMessage: response.errorMessage,
          isRetryable: response.isRetryable,
        };
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update product stock quantity.
   * PATCH /products/{productNo}/stock
   */
  async updateStock(productNo: string, quantity: number): Promise<SmartStoreResult<boolean>> {
    try {
      const response = await this.request<NaverApiResponse<void>>(`/products/${productNo}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ stockQuantity: quantity }),
      });

      if (!response.success) {
        return {
          success: false,
          errorType: response.errorType,
          errorMessage: response.errorMessage,
          isRetryable: response.isRetryable,
        };
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update product price.
   * PATCH /products/{productNo}/price
   */
  async updatePrice(productNo: string, price: number): Promise<SmartStoreResult<boolean>> {
    try {
      const response = await this.request<NaverApiResponse<void>>(`/products/${productNo}/price`, {
        method: 'PATCH',
        body: JSON.stringify({ salePrice: price }),
      });

      if (!response.success) {
        return {
          success: false,
          errorType: response.errorType,
          errorMessage: response.errorMessage,
          isRetryable: response.isRetryable,
        };
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // Image Operations
  // ============================================================================

  /**
   * Upload an image to Naver CDN for product registration.
   * The URL must be accessible publicly.
   * POST /products/images/upload
   */
  async uploadProductImage(imageUrl: string): Promise<SmartStoreResult<ImageUploadResponse>> {
    try {
      const response = await this.request<NaverApiResponse<ImageUploadResponse>>(
        '/products/images/upload',
        {
          method: 'POST',
          body: JSON.stringify({ url: imageUrl }),
        }
      );

      if (!response.success) {
        return {
          success: false,
          errorType: response.errorType,
          errorMessage: response.errorMessage,
          isRetryable: response.isRetryable,
        };
      }

      return {
        success: true,
        data: response.data?.data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // Category Operations
  // ============================================================================

  /**
   * Get all available categories.
   * GET /products/categories
   */
  async getCategories(): Promise<SmartStoreResult<NaverCategory[]>> {
    try {
      const response = await this.request<NaverApiResponse<NaverCategory[]>>(
        '/products/categories',
        { method: 'GET' }
      );

      if (!response.success) {
        return {
          success: false,
          errorType: response.errorType,
          errorMessage: response.errorMessage,
          isRetryable: response.isRetryable,
        };
      }

      return {
        success: true,
        data: response.data?.data || [],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get required attributes for a specific category.
   * GET /products/categories/{categoryId}/attributes
   */
  async getCategoryAttributes(categoryId: string): Promise<SmartStoreResult<CategoryAttributes>> {
    try {
      const response = await this.request<NaverApiResponse<CategoryAttributes>>(
        `/products/categories/${categoryId}/attributes`,
        { method: 'GET' }
      );

      if (!response.success) {
        return {
          success: false,
          errorType: response.errorType,
          errorMessage: response.errorMessage,
          isRetryable: response.isRetryable,
        };
      }

      return {
        success: true,
        data: response.data?.data,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * Batch update product statuses.
   * POST /products/batch/status
   */
  async batchUpdateStatus(
    productNos: string[],
    status: ProductStatusType
  ): Promise<SmartStoreResult<{ success: string[]; failed: string[] }>> {
    try {
      const response = await this.request<
        NaverApiResponse<{
          successProductNos: string[];
          failProductNos: string[];
        }>
      >('/products/batch/status', {
        method: 'POST',
        body: JSON.stringify({
          productNos,
          statusType: status,
        }),
      });

      if (!response.success) {
        return {
          success: false,
          errorType: response.errorType,
          errorMessage: response.errorMessage,
          isRetryable: response.isRetryable,
        };
      }

      return {
        success: true,
        data: {
          success: response.data?.data?.successProductNos || [],
          failed: response.data?.data?.failProductNos || [],
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  /**
   * Check if the Product API is accessible.
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.auth.getAccessToken();
      const result = await this.listProducts({ page: 0, size: 1 });
      return result.success;
    } catch (error) {
      logger.error('smartstore_product_api_health_check_failed', error);
      return false;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Make an authenticated request to the Naver API.
   */
  private async request<T>(path: string, options: RequestInit): Promise<SmartStoreResult<T>> {
    const url = `${this.baseUrl}${path}`;

    try {
      const headers = await this.auth.getAuthHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return this.handleHttpError(response);
      }

      // Handle empty responses (204 No Content)
      const text = await response.text();
      if (!text) {
        return { success: true } as SmartStoreResult<T>;
      }

      const data = JSON.parse(text) as T;
      return { success: true, data };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Handle HTTP error responses.
   */
  private async handleHttpError<T>(response: Response): Promise<SmartStoreResult<T>> {
    let errorMessage = `HTTP ${response.status}`;
    let errorType: SmartStoreErrorType = 'api_error';
    let isRetryable = false;

    try {
      const body = (await response.json()) as { message?: string; code?: string };
      errorMessage = body.message || errorMessage;
    } catch {
      // Ignore JSON parse errors
    }

    switch (response.status) {
      case 401:
        errorType = 'authentication';
        this.auth.invalidateToken();
        isRetryable = true;
        break;
      case 403:
        errorType = 'authentication';
        break;
      case 404:
        errorType = 'not_found';
        break;
      case 429:
        errorType = 'rate_limit';
        isRetryable = true;
        break;
      case 400:
      case 422:
        errorType = 'validation';
        break;
      default:
        if (response.status >= 500) {
          errorType = 'api_error';
          isRetryable = true;
        }
    }

    return {
      success: false,
      errorType,
      errorMessage,
      isRetryable,
    };
  }

  /**
   * Handle exceptions during API calls.
   */
  private handleError<T>(error: unknown): SmartStoreResult<T> {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          errorType: 'network_error',
          errorMessage: `Request timed out after ${this.timeoutMs}ms`,
          isRetryable: true,
        };
      }

      if (error.message.includes('fetch') || error.message.includes('network')) {
        return {
          success: false,
          errorType: 'network_error',
          errorMessage: error.message,
          isRetryable: true,
        };
      }
    }

    return {
      success: false,
      errorType: 'unknown',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      isRetryable: false,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let productClientInstance: SmartStoreProductClient | null = null;

/**
 * Get the shared SmartStore Product client instance.
 */
export function getSmartStoreProductClient(): SmartStoreProductClient {
  if (!productClientInstance) {
    productClientInstance = new SmartStoreProductClient();
  }
  return productClientInstance;
}

/**
 * Create a new SmartStore Product client with custom options.
 */
export function createSmartStoreProductClient(options?: {
  auth?: SmartStoreAuth;
  baseUrl?: string;
  timeoutMs?: number;
}): SmartStoreProductClient {
  return new SmartStoreProductClient(options);
}
