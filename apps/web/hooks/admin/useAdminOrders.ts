/**
 * Admin Order Hooks
 *
 * Reusable hooks for order data fetching and mutations.
 * Centralizes API calls and caching logic for order management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// Types
// =============================================================================

export interface Order {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName?: string;
  productName: string;
  totalPrice: number;
  status: string;
  salesChannel: string;
  created: string;
}

export interface OrdersResponse {
  items: Order[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export interface OrderListOptions {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  channel?: string;
  fromDate?: string;
  toDate?: string;
}

export interface OrderLog {
  id: string;
  stepName: string;
  status: string;
  providerName?: string;
  errorMessage?: string;
  durationMs?: number;
  created: string;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  externalOrderId?: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  currency: string;
  status: string;
  paymentStatus?: string;
  salesChannel: string;
  providerUsed?: string;
  esimIccid?: string;
  esimQrCode?: string;
  esimActivationCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  created: string;
  updated: string;
  logs: OrderLog[];
}

export interface ManualFulfillmentData {
  esimIccid: string;
  esimActivationCode: string;
  esimQrCode?: string;
  providerUsed: string;
}

export interface BulkRetryResult {
  retried: number;
  skipped: number;
  failed: number;
}

export interface RefundData {
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other';
  amount?: number;
}

export interface RefundResult {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

// =============================================================================
// Query Keys
// =============================================================================

export const orderKeys = {
  all: ['admin', 'orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (options: OrderListOptions) => [...orderKeys.lists(), options] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetch paginated orders list with filtering.
 */
export function useAdminOrders(options: OrderListOptions) {
  const { page, pageSize, search, status, channel, fromDate, toDate } = options;

  return useQuery<OrdersResponse>({
    queryKey: orderKeys.list(options),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      params.set('limit', String(pageSize));
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (channel) params.set('channel', channel);
      if (fromDate) params.set('from', new Date(fromDate).toISOString());
      if (toDate) params.set('to', new Date(toDate).toISOString());

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
  });
}

/**
 * Fetch single order details.
 */
export function useAdminOrder(orderId: string) {
  return useQuery<OrderDetail>({
    queryKey: orderKeys.detail(orderId),
    queryFn: async () => {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (!res.ok) throw new Error('Order not found');
      return res.json();
    },
    enabled: !!orderId,
  });
}

/**
 * Retry order fulfillment.
 */
export function useRetryOrder(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/orders/${orderId}/retry`, {
        method: 'POST',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Retry failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/**
 * Bulk retry multiple orders.
 */
export function useBulkRetryOrders() {
  const queryClient = useQueryClient();

  return useMutation<BulkRetryResult, Error, string[]>({
    mutationFn: async (orderIds: string[]) => {
      const res = await fetch('/api/admin/orders/bulk-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Bulk retry failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

/**
 * Manual fulfillment for an order.
 */
export function useManualFulfillment(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ManualFulfillmentData) => {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_fulfillment',
          ...data,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Manual fulfillment failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

/**
 * Resend eSIM email for an order.
 */
export function useResendEmail(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/orders/${orderId}/resend-email`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to resend email');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
    },
  });
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Order states that can be retried.
 */
export const RETRYABLE_STATES = [
  'failed',
  'provider_failed',
  'pending_manual_fulfillment',
  'fulfillment_started',
  'payment_received',
] as const;

/**
 * Check if an order can be retried.
 */
export function isRetryableOrder(status: string): boolean {
  return RETRYABLE_STATES.includes(status as (typeof RETRYABLE_STATES)[number]);
}

/**
 * Order states that can be refunded.
 */
export const REFUNDABLE_STATES = [
  'delivered',
  'pending_manual_fulfillment',
  'provider_failed',
  'failed',
] as const;

/**
 * Check if an order can be refunded.
 */
export function isRefundableOrder(status: string, paymentStatus: string): boolean {
  return (
    REFUNDABLE_STATES.includes(status as (typeof REFUNDABLE_STATES)[number]) &&
    paymentStatus === 'paid'
  );
}

/**
 * Refund an order.
 */
export function useRefundOrder(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; refund: RefundResult }, Error, RefundData | undefined>({
    mutationFn: async (data?: RefundData) => {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Refund failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}
