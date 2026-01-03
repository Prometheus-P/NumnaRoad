/**
 * SmartStore API Client
 *
 * Provides methods for interacting with Naver Commerce API.
 * Handles order queries, status updates, settlements, and more.
 *
 * API Documentation: https://apicenter.commerce.naver.com/docs/commerce-api/current
 */

import { SmartStoreAuth, getSmartStoreAuth } from './auth';
import type {
  NaverProductOrder,
  NaverStatusChange,
  NaverDailySettlement,
  NaverInquiry,
  NaverDispatchRequest,
  NaverDispatchResponse,
  NaverProductOrderQueryResponse,
  NaverStatusChangeResponse,
  NaverApiResponse,
  SmartStoreResult,
  SmartStoreErrorType,
} from './types';
import { logger } from '../../logger';

const NAVER_API_BASE_URL = process.env.NAVER_COMMERCE_API_URL || 'https://api.commerce.naver.com/external/v1';
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * SmartStore API Client
 *
 * Provides methods to interact with Naver Commerce API for:
 * - Order queries and status updates
 * - Dispatch (shipping) notifications
 * - Settlement queries
 * - Customer inquiries
 */
export class SmartStoreClient {
  private auth: SmartStoreAuth;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options?: {
    auth?: SmartStoreAuth;
    baseUrl?: string;
    timeoutMs?: number;
  }) {
    this.auth = options?.auth || getSmartStoreAuth();
    this.baseUrl = options?.baseUrl || NAVER_API_BASE_URL;
    this.timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  // ============================================================================
  // Order APIs
  // ============================================================================

  /**
   * Query product orders by IDs.
   * POST /pay-order/seller/product-orders/query
   */
  async getProductOrders(
    productOrderIds: string[]
  ): Promise<SmartStoreResult<NaverProductOrder[]>> {
    if (productOrderIds.length === 0) {
      return { success: true, data: [] };
    }

    try {
      const response = await this.request<NaverProductOrderQueryResponse>(
        '/pay-order/seller/product-orders/query',
        {
          method: 'POST',
          body: JSON.stringify({ productOrderIds }),
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
        data: response.data?.data || [],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get orders with status changes within a time range.
   * GET /pay-order/seller/product-orders/last-changed-statuses
   *
   * Used for polling to catch missed webhook events.
   */
  async getLastChangedStatuses(
    from: Date,
    to: Date,
    options?: {
      orderStatusType?: string;
      pageSize?: number;
      pageToken?: string;
    }
  ): Promise<SmartStoreResult<{ changes: NaverStatusChange[]; hasMore: boolean }>> {
    try {
      const params = new URLSearchParams({
        lastChangedFrom: from.toISOString(),
        lastChangedTo: to.toISOString(),
      });

      if (options?.orderStatusType) {
        params.append('orderStatusType', options.orderStatusType);
      }
      if (options?.pageSize) {
        params.append('pageSize', options.pageSize.toString());
      }
      if (options?.pageToken) {
        params.append('pageToken', options.pageToken);
      }

      const response = await this.request<NaverStatusChangeResponse>(
        `/pay-order/seller/product-orders/last-changed-statuses?${params.toString()}`,
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
        data: {
          changes: response.data?.data?.lastChangeStatuses || [],
          hasMore: response.data?.data?.more || false,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get all product orders with various filters.
   * GET /pay-order/seller/product-orders
   */
  async getProductOrdersByFilter(options: {
    productOrderStatus?: string;
    paymentDateFrom?: Date;
    paymentDateTo?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<SmartStoreResult<NaverProductOrder[]>> {
    try {
      const params = new URLSearchParams();

      if (options.productOrderStatus) {
        params.append('productOrderStatus', options.productOrderStatus);
      }
      if (options.paymentDateFrom) {
        params.append('paymentDateFrom', options.paymentDateFrom.toISOString());
      }
      if (options.paymentDateTo) {
        params.append('paymentDateTo', options.paymentDateTo.toISOString());
      }
      if (options.page) {
        params.append('page', options.page.toString());
      }
      if (options.pageSize) {
        params.append('size', options.pageSize.toString());
      }

      const response = await this.request<NaverProductOrderQueryResponse>(
        `/pay-order/seller/product-orders?${params.toString()}`,
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

  // ============================================================================
  // Dispatch APIs (Shipping/Delivery)
  // ============================================================================

  /**
   * Mark order as dispatched (shipped).
   * For eSIM, we use DIRECT_DELIVERY method.
   * POST /pay-order/seller/product-orders/dispatch
   */
  async dispatchOrder(
    productOrderId: string,
    options?: {
      trackingNumber?: string;
      deliveryCompany?: string;
    }
  ): Promise<SmartStoreResult<boolean>> {
    try {
      const dispatchRequest: NaverDispatchRequest = {
        productOrderId,
        deliveryMethod: 'DIRECT_DELIVERY',
        deliveryCompany: options?.deliveryCompany,
        trackingNumber: options?.trackingNumber,
        dispatchDate: new Date().toISOString(),
      };

      const response = await this.request<NaverDispatchResponse>(
        '/pay-order/seller/product-orders/dispatch',
        {
          method: 'POST',
          body: JSON.stringify({
            dispatchProductOrders: [dispatchRequest],
          }),
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

      const successIds = response.data?.data?.successProductOrderIds || [];
      const failIds = response.data?.data?.failProductOrderIds || [];

      if (failIds.includes(productOrderId)) {
        return {
          success: false,
          errorType: 'api_error',
          errorMessage: `Failed to dispatch order ${productOrderId}`,
          isRetryable: true,
        };
      }

      return {
        success: true,
        data: successIds.includes(productOrderId),
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Dispatch multiple orders at once.
   */
  async dispatchOrders(
    orders: Array<{ productOrderId: string; trackingNumber?: string }>
  ): Promise<SmartStoreResult<{ success: string[]; failed: string[] }>> {
    try {
      const dispatchRequests: NaverDispatchRequest[] = orders.map((order) => ({
        productOrderId: order.productOrderId,
        deliveryMethod: 'DIRECT_DELIVERY',
        trackingNumber: order.trackingNumber,
        dispatchDate: new Date().toISOString(),
      }));

      const response = await this.request<NaverDispatchResponse>(
        '/pay-order/seller/product-orders/dispatch',
        {
          method: 'POST',
          body: JSON.stringify({
            dispatchProductOrders: dispatchRequests,
          }),
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
        data: {
          success: response.data?.data?.successProductOrderIds || [],
          failed: response.data?.data?.failProductOrderIds || [],
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // Settlement APIs
  // ============================================================================

  /**
   * Get daily settlement history.
   * GET /pay-order/seller/settlements/query-daily-settlement
   */
  async getDailySettlement(
    date: Date
  ): Promise<SmartStoreResult<NaverDailySettlement>> {
    try {
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

      const response = await this.request<NaverApiResponse<NaverDailySettlement>>(
        `/pay-order/seller/settlements/query-daily-settlement?settlementDate=${dateStr}`,
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
   * Get settlement history for a date range.
   */
  async getSettlementRange(
    fromDate: Date,
    toDate: Date
  ): Promise<SmartStoreResult<NaverDailySettlement[]>> {
    const settlements: NaverDailySettlement[] = [];
    const currentDate = new Date(fromDate);

    while (currentDate <= toDate) {
      const result = await this.getDailySettlement(currentDate);
      if (result.success && result.data) {
        settlements.push(result.data);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { success: true, data: settlements };
  }

  // ============================================================================
  // Inquiry APIs
  // ============================================================================

  /**
   * Get customer inquiries.
   * GET /pay-order/seller/inquiries
   */
  async getInquiries(options?: {
    answered?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<SmartStoreResult<NaverInquiry[]>> {
    try {
      const params = new URLSearchParams();

      if (options?.answered !== undefined) {
        params.append('answered', options.answered.toString());
      }
      if (options?.page) {
        params.append('page', options.page.toString());
      }
      if (options?.pageSize) {
        params.append('size', options.pageSize.toString());
      }

      const response = await this.request<NaverApiResponse<NaverInquiry[]>>(
        `/pay-order/seller/inquiries?${params.toString()}`,
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
   * Reply to a customer inquiry.
   * POST /pay-order/seller/inquiries/{inquiryId}/answer
   */
  async replyToInquiry(
    inquiryId: string,
    content: string
  ): Promise<SmartStoreResult<boolean>> {
    try {
      const response = await this.request<NaverApiResponse<void>>(
        `/pay-order/seller/inquiries/${inquiryId}/answer`,
        {
          method: 'POST',
          body: JSON.stringify({ content }),
        }
      );

      return {
        success: response.success,
        data: response.success,
        errorType: response.errorType,
        errorMessage: response.errorMessage,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  /**
   * Check if the API is accessible and credentials are valid.
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to get a token to verify credentials
      await this.auth.getAccessToken();

      // Make a simple API call to verify connectivity
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const result = await this.getLastChangedStatuses(oneHourAgo, now, { pageSize: 1 });

      return result.success;
    } catch (error) {
      logger.error('smartstore_health_check_failed', error);
      return false;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Make an authenticated request to the Naver API.
   */
  private async request<T>(
    path: string,
    options: RequestInit
  ): Promise<SmartStoreResult<T>> {
    const url = `${this.baseUrl}${path}`;

    try {
      const headers = await this.auth.getAuthHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return this.handleHttpError(response);
      }

      const data = await response.json() as T;
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
      const body = await response.json() as { message?: string; code?: string };
      errorMessage = body.message || errorMessage;
    } catch {
      // Ignore JSON parse errors
    }

    switch (response.status) {
      case 401:
        errorType = 'authentication';
        this.auth.invalidateToken();
        isRetryable = true; // Retry after token refresh
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

/**
 * Singleton instance for shared use.
 */
let clientInstance: SmartStoreClient | null = null;

/**
 * Get the shared SmartStore client instance.
 */
export function getSmartStoreClient(): SmartStoreClient {
  if (!clientInstance) {
    clientInstance = new SmartStoreClient();
  }
  return clientInstance;
}

/**
 * Create a new SmartStore client with custom options.
 */
export function createSmartStoreClient(options?: {
  auth?: SmartStoreAuth;
  baseUrl?: string;
  timeoutMs?: number;
}): SmartStoreClient {
  return new SmartStoreClient(options);
}
