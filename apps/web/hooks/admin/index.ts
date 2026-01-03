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
  useRefundOrder,
  orderKeys,
  isRetryableOrder,
  isRefundableOrder,
  RETRYABLE_STATES,
  REFUNDABLE_STATES,
  type Order,
  type OrderDetail,
  type OrderLog,
  type OrdersResponse,
  type OrderListOptions,
  type ManualFulfillmentData,
  type BulkRetryResult,
  type RefundData,
  type RefundResult,
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

// Settings hooks
export {
  useAdminSettings,
  useAdminSettingsByCategory,
  useUpdateSetting,
  useUpdateSettings,
  useSettingsAuditLogs,
  useTestConnection,
  settingsKeys,
  getCategoryLabel,
  getCategoryDescription,
  groupSettingsByStatus,
  type ParsedSetting,
  type SettingsByCategoryMap,
  type SettingCategory,
  type SettingValueType,
  type AuditLogEntry,
  type TestConnectionResult,
} from './useAdminSettings';

// Inquiry hooks
export {
  useInquiries,
  useInquiryDetail,
  useUpdateInquiry,
  useSendInquiryReply,
  useSyncInquiries,
  useInquiryMetrics,
  useChannelHealth,
  inquiryKeys,
  getChannelInfo,
  getStatusInfo,
  getPriorityInfo,
  formatResponseTime,
  type Inquiry as InquiryItem,
  type InquiryDetail,
  type InquiryMessage,
  type InquiryMetrics,
  type ChannelHealth,
  type InquiryChannel,
  type InquiryStatus,
  type InquiryPriority,
  type InquiryType,
  type InquiryListOptions,
} from './useInquiries';
