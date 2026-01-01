/**
 * Admin Hooks Barrel Export
 *
 * Re-exports all admin hooks for convenient importing.
 * Usage: import { useAdminOrders, useAdminProduct } from '@/hooks/admin';
 */

// Order hooks
export {
  useAdminOrders,
  useAdminOrder,
  useRetryOrder,
  useBulkRetryOrders,
  useManualFulfillment,
  useResendEmail,
  orderKeys,
  isRetryableOrder,
  RETRYABLE_STATES,
  type Order,
  type OrderDetail,
  type OrderLog,
  type OrdersResponse,
  type OrderListOptions,
  type ManualFulfillmentData,
  type BulkRetryResult,
} from './useAdminOrders';

// Product hooks
export {
  useAdminProducts,
  useAdminProduct,
  useSaveProduct,
  useDeleteProduct,
  useToggleProductActive,
  useSyncProducts,
  productKeys,
  type Product,
  type ProductsResponse,
  type ProductListOptions,
} from './useAdminProducts';

// Provider hooks
export {
  useAdminProviders,
  useProviderStats,
  useResetProvider,
  providerKeys,
  getStateInfo,
  calculateOverallStats,
  getProviderStatsById,
  type Provider,
  type ProviderStats,
  type ProviderError,
  type HourlyStat,
  type StatsResponse,
  type OverallStats,
  type CircuitBreakerState,
} from './useAdminProviders';

// SmartStore hooks
export {
  useSmartStoreStatus,
  useSmartStoreMappings,
  useSmartStoreLogs,
  useSmartStoreProducts,
  useSmartStoreInquiries,
  useSyncSmartStore,
  useSaveMapping,
  useDeleteMapping,
  useReplyToInquiry,
  smartstoreKeys,
  type SmartStoreStatus,
  type ProductMapping,
  type SyncLog,
  type Inquiry,
  type InquiriesResponse,
  type MappingFormData,
} from './useSmartStore';
