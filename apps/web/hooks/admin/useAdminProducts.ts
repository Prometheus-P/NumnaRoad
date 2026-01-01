/**
 * Admin Product Hooks
 *
 * Reusable hooks for product data fetching and mutations.
 * Centralizes API calls and caching logic for product management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// Types
// =============================================================================

export interface Product {
  id: string;
  name: string;
  slug: string;
  country: string;
  dataLimit: string;
  durationDays: number;
  speed?: string;
  providerId: string;
  providerSku: string;
  costPrice: number;
  price: number;
  isActive: boolean;
  isFeatured: boolean;
  stockCount: number;
  sortOrder: number;
  description?: string;
  features?: string[];
}

export interface ProductsResponse {
  items: Product[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export interface ProductListOptions {
  page: number;
  pageSize: number;
  search?: string;
  country?: string;
  provider?: string;
}

// =============================================================================
// Query Keys
// =============================================================================

export const productKeys = {
  all: ['admin', 'products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (options: ProductListOptions) => [...productKeys.lists(), options] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetch paginated products list with filtering.
 */
export function useAdminProducts(options: ProductListOptions) {
  const { page, pageSize, search, country, provider } = options;

  return useQuery<ProductsResponse>({
    queryKey: productKeys.list(options),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      params.set('limit', String(pageSize));
      if (search) params.set('search', search);
      if (country) params.set('country', country);
      if (provider) params.set('provider', provider);

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
  });
}

/**
 * Fetch single product details.
 */
export function useAdminProduct(productId: string) {
  return useQuery<Product>({
    queryKey: productKeys.detail(productId),
    queryFn: async () => {
      const res = await fetch(`/api/admin/products/${productId}`);
      if (!res.ok) throw new Error('Product not found');
      return res.json();
    },
    enabled: !!productId && productId !== 'new',
  });
}

/**
 * Save (create or update) a product.
 */
export function useSaveProduct(productId?: string) {
  const queryClient = useQueryClient();
  const isNew = !productId || productId === 'new';

  return useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const url = isNew ? '/api/admin/products' : `/api/admin/products/${productId}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save product');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

/**
 * Delete a product.
 */
export function useDeleteProduct(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete product');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

/**
 * Toggle product active status.
 */
export function useToggleProductActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error('Failed to update product');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

/**
 * Sync products from providers.
 */
export function useSyncProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/sync-products', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
