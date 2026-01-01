/**
 * SmartStore Integration Hooks
 *
 * Reusable hooks for SmartStore data fetching and mutations.
 * Centralizes API calls and caching logic for SmartStore management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// Types
// =============================================================================

export interface SmartStoreStatus {
  isActive: boolean;
  sellerId: string;
  lastSyncAt?: string;
  syncInterval: number;
  totalMappings: number;
  activeMappings: number;
}

export interface ProductMapping {
  id: string;
  smartstoreProductName: string;
  smartstoreProductId: string;
  internalProductId?: string;
  internalProductName?: string;
  providerSku?: string;
  isActive: boolean;
}

export interface SyncLog {
  id?: string;
  timestamp: string;
  message: string;
  ordersFound: number;
  ordersProcessed?: number;
  durationMs?: number;
  errors?: unknown;
}

export interface Inquiry {
  id: string;
  inquiryNo: string;
  productName: string;
  title: string;
  content: string;
  customerName: string;
  created: string;
  isAnswered: boolean;
  answer?: string;
  answeredAt?: string;
}

export interface InquiriesResponse {
  items: Inquiry[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export interface MappingFormData {
  id?: string;
  smartstoreProductName: string;
  smartstoreProductId: string;
  internalProductId: string;
}

// =============================================================================
// Query Keys
// =============================================================================

export const smartstoreKeys = {
  all: ['admin', 'smartstore'] as const,
  status: () => [...smartstoreKeys.all, 'status'] as const,
  mappings: () => [...smartstoreKeys.all, 'mappings'] as const,
  logs: () => [...smartstoreKeys.all, 'logs'] as const,
  inquiries: (answered?: boolean) => [...smartstoreKeys.all, 'inquiries', { answered }] as const,
  products: () => [...smartstoreKeys.all, 'products'] as const,
};

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetch SmartStore connection status.
 */
export function useSmartStoreStatus() {
  return useQuery<SmartStoreStatus>({
    queryKey: smartstoreKeys.status(),
    queryFn: async () => {
      const res = await fetch('/api/admin/smartstore/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      return res.json();
    },
  });
}

/**
 * Fetch product mappings.
 */
export function useSmartStoreMappings() {
  return useQuery<ProductMapping[]>({
    queryKey: smartstoreKeys.mappings(),
    queryFn: async () => {
      const res = await fetch('/api/admin/smartstore/mappings');
      if (!res.ok) throw new Error('Failed to fetch mappings');
      return res.json();
    },
  });
}

/**
 * Fetch sync logs.
 */
export function useSmartStoreLogs(limit: number = 20) {
  return useQuery<SyncLog[]>({
    queryKey: smartstoreKeys.logs(),
    queryFn: async () => {
      const res = await fetch(`/api/admin/smartstore/sync-logs?limit=${limit}`);
      if (!res.ok) return [];
      return res.json();
    },
  });
}

/**
 * Fetch SmartStore products.
 */
export function useSmartStoreProducts() {
  return useQuery<{ id: string; name: string; channelProductNo: string }[]>({
    queryKey: smartstoreKeys.products(),
    queryFn: async () => {
      const res = await fetch('/api/admin/smartstore/products');
      if (!res.ok) return [];
      return res.json();
    },
  });
}

/**
 * Fetch customer inquiries.
 */
export function useSmartStoreInquiries(options: {
  page?: number;
  pageSize?: number;
  answered?: boolean;
} = {}) {
  const { page = 0, pageSize = 10, answered } = options;

  return useQuery<InquiriesResponse>({
    queryKey: smartstoreKeys.inquiries(answered),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      params.set('limit', String(pageSize));
      if (answered !== undefined) {
        params.set('answered', String(answered));
      }

      const res = await fetch(`/api/admin/smartstore/inquiries?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch inquiries');
      return res.json();
    },
  });
}

/**
 * Manual sync with SmartStore.
 */
export function useSyncSmartStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/smartstore/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smartstoreKeys.all });
    },
  });
}

/**
 * Save product mapping (create or update).
 */
export function useSaveMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MappingFormData) => {
      const method = data.id ? 'PATCH' : 'POST';
      const res = await fetch('/api/admin/smartstore/mappings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save mapping');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smartstoreKeys.all });
    },
  });
}

/**
 * Delete product mapping.
 */
export function useDeleteMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/smartstore/mappings?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete mapping');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smartstoreKeys.all });
    },
  });
}

/**
 * Reply to customer inquiry.
 */
export function useReplyToInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inquiryId, answer }: { inquiryId: string; answer: string }) => {
      const res = await fetch(`/api/admin/smartstore/inquiries/${inquiryId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to reply');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smartstoreKeys.inquiries() });
    },
  });
}
