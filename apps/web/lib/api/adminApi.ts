/**
 * Admin API Service Layer
 *
 * Centralized API abstraction for admin operations.
 * Provides type-safe methods and consistent error handling.
 */

// =============================================================================
// Types
// =============================================================================

interface ApiError {
  error: string;
  message?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

// =============================================================================
// Base Request
// =============================================================================

/**
 * Make an API request with consistent error handling.
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;

  // Build URL with query params
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url = `${endpoint}?${queryString}`;
    }
  }

  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorMessage = `Request failed: ${res.status}`;
    try {
      const errorData: ApiError = await res.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // Use default error message
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

// =============================================================================
// Orders API
// =============================================================================

export const ordersApi = {
  list: (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    channel?: string;
    from?: string;
    to?: string;
  }) => request('/api/admin/orders', { params }),

  get: (id: string) => request(`/api/admin/orders/${id}`),

  retry: (id: string) =>
    request(`/api/orders/${id}/fulfill`, { method: 'POST' }),

  bulkRetry: (orderIds: string[]) =>
    request('/api/admin/orders/bulk-retry', {
      method: 'POST',
      body: { orderIds },
    }),

  manualFulfillment: (
    id: string,
    data: {
      esimIccid: string;
      esimActivationCode: string;
      esimQrCode?: string;
      providerUsed: string;
    }
  ) =>
    request(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      body: { action: 'manual_fulfillment', ...data },
    }),

  resendEmail: (id: string) =>
    request(`/api/admin/orders/${id}/resend-email`, { method: 'POST' }),
};

// =============================================================================
// Products API
// =============================================================================

export const productsApi = {
  list: (params: {
    page?: number;
    limit?: number;
    search?: string;
    country?: string;
    provider?: string;
  }) => request('/api/admin/products', { params }),

  get: (id: string) => request(`/api/admin/products/${id}`),

  create: (data: unknown) =>
    request('/api/admin/products', { method: 'POST', body: data }),

  update: (id: string, data: unknown) =>
    request(`/api/admin/products/${id}`, { method: 'PUT', body: data }),

  delete: (id: string) =>
    request(`/api/admin/products/${id}`, { method: 'DELETE' }),

  sync: () => request('/api/admin/sync-products', { method: 'POST' }),
};

// =============================================================================
// Providers API
// =============================================================================

export const providersApi = {
  list: () => request('/api/admin/providers'),

  stats: (hours: number = 24) =>
    request('/api/admin/providers/stats', { params: { hours } }),

  reset: (id: string) =>
    request(`/api/admin/providers/${id}/reset`, { method: 'POST' }),
};

// =============================================================================
// SmartStore API
// =============================================================================

export const smartstoreApi = {
  status: () => request('/api/admin/smartstore/status'),

  mappings: {
    list: () => request('/api/admin/smartstore/mappings'),

    create: (data: {
      smartstoreProductName: string;
      smartstoreProductId: string;
      internalProductId: string;
    }) => request('/api/admin/smartstore/mappings', { method: 'POST', body: data }),

    update: (data: {
      id: string;
      smartstoreProductName: string;
      smartstoreProductId: string;
      internalProductId: string;
    }) => request('/api/admin/smartstore/mappings', { method: 'PATCH', body: data }),

    delete: (id: string) =>
      request('/api/admin/smartstore/mappings', {
        method: 'DELETE',
        params: { id },
      }),
  },

  products: () => request('/api/admin/smartstore/products'),

  logs: (limit: number = 20) =>
    request('/api/admin/smartstore/sync-logs', { params: { limit } }),

  sync: () => request('/api/admin/smartstore/sync', { method: 'POST' }),

  inquiries: {
    list: (params: { page?: number; limit?: number; answered?: boolean }) =>
      request('/api/admin/smartstore/inquiries', { params }),

    reply: (id: string, answer: string) =>
      request(`/api/admin/smartstore/inquiries/${id}/reply`, {
        method: 'POST',
        body: { answer },
      }),
  },
};

// =============================================================================
// Combined Export
// =============================================================================

export const adminApi = {
  orders: ordersApi,
  products: productsApi,
  providers: providersApi,
  smartstore: smartstoreApi,
};

export default adminApi;
