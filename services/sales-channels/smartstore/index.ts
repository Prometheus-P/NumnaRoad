/**
 * SmartStore Sales Channel
 *
 * Naver SmartStore integration for eSIM sales.
 * Handles order sync, fulfillment, and settlement.
 */

// Types
export type {
  NaverAuthConfig,
  NaverAccessToken,
  NaverOrderStatus,
  NaverClaimStatus,
  NaverProductOrder,
  NaverOrderer,
  NaverReceiver,
  NaverStatusChange,
  NaverWebhookEventType,
  NaverWebhookPayload,
  NaverSettlement,
  NaverDailySettlement,
  NaverApiResponse,
  NaverPaginatedResponse,
  NaverProductOrderQueryResponse,
  NaverStatusChangeResponse,
  NaverInquiry,
  NaverInquiryReply,
  NaverDispatchRequest,
  NaverDispatchResponse,
  InternalOrder,
  SmartStoreConfig,
  SmartStoreErrorType,
  SmartStoreResult,
} from './types';

// Auth
export {
  SmartStoreAuth,
  getSmartStoreAuth,
  createSmartStoreAuth,
} from './auth';

// Client
export {
  SmartStoreClient,
  getSmartStoreClient,
  createSmartStoreClient,
} from './client';

// Normalizer
export {
  normalizeNaverOrder,
  normalizeNaverOrders,
  isPaymentComplete,
  isCanceled,
  isEligibleForFulfillment,
  mapNaverStatusToInternal,
  validateInternalOrderForFulfillment,
  createTestProductMapper,
  createPocketBaseProductMapper,
} from './normalizer';
export type { ProductMapperFn } from './normalizer';
