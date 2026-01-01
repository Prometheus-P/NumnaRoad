/**
 * Naver SmartStore Commerce API Types
 *
 * Based on: https://apicenter.commerce.naver.com/docs/commerce-api/current
 * Rate Limit: Per-second basis, varies by endpoint
 */

// ============================================================================
// Authentication
// ============================================================================

export interface NaverAuthConfig {
  appId: string;
  appSecret: string;
  sellerId?: string;
}

export interface NaverAccessToken {
  accessToken: string;
  expiresIn: number; // seconds
  tokenType: 'Bearer';
  expiresAt: Date; // computed field
}

// ============================================================================
// Order Types
// ============================================================================

/**
 * Order status types from Naver Commerce API
 */
export type NaverOrderStatus =
  | 'PAYMENT_WAITING' // 결제 대기
  | 'PAYED' // 결제 완료
  | 'DELIVERING' // 배송 중
  | 'DELIVERED' // 배송 완료
  | 'PURCHASE_DECIDED' // 구매 확정
  | 'EXCHANGED' // 교환
  | 'CANCELED' // 취소
  | 'RETURNED' // 반품
  | 'CANCELED_BY_NOPAYMENT'; // 미결제 취소

/**
 * Claim status types
 */
export type NaverClaimStatus =
  | 'CANCEL_REQUEST' // 취소 요청
  | 'CANCELING' // 취소 처리 중
  | 'CANCEL_DONE' // 취소 완료
  | 'CANCEL_REJECT' // 취소 거절
  | 'RETURN_REQUEST' // 반품 요청
  | 'COLLECTING' // 수거 중
  | 'COLLECT_DONE' // 수거 완료
  | 'RETURN_DONE' // 반품 완료
  | 'RETURN_REJECT' // 반품 거절
  | 'EXCHANGE_REQUEST' // 교환 요청
  | 'EXCHANGE_REDELIVERING' // 교환 재배송 중
  | 'EXCHANGE_DONE' // 교환 완료
  | 'EXCHANGE_REJECT'; // 교환 거절

/**
 * Product order detail from Naver API
 */
export interface NaverProductOrder {
  productOrderId: string;
  orderId: string;
  orderDate: string; // ISO date
  paymentDate: string; // ISO date
  orderStatusType: NaverOrderStatus;
  claimStatusType?: NaverClaimStatus;
  productOrderStatus: string;

  // Product info
  productId: string;
  productName: string;
  productOption: string;
  quantity: number;
  unitPrice: number;
  totalProductAmount: number;

  // Payment info
  totalPaymentAmount: number;
  paymentMeans: string;
  paymentCommission: number;

  // Orderer info
  orderer: NaverOrderer;

  // Receiver info (for physical goods - not used for eSIM)
  receiver?: NaverReceiver;

  // Delivery info
  deliveryMethod: string;
  deliveryCompany?: string;
  trackingNumber?: string;

  // Seller memo
  sellerProductManagementCode?: string;
  sellerCustomCode1?: string;
  sellerCustomCode2?: string;
}

/**
 * Orderer information
 */
export interface NaverOrderer {
  name: string;
  email: string;
  tel: string;
  safeNumber?: string; // 안심번호
  memberId?: string;
}

/**
 * Receiver information (for physical shipping)
 */
export interface NaverReceiver {
  name: string;
  tel: string;
  safeNumber?: string;
  zipCode: string;
  baseAddress: string;
  detailAddress: string;
}

/**
 * Status change record for polling
 */
export interface NaverStatusChange {
  productOrderId: string;
  orderId: string;
  orderStatusType: NaverOrderStatus;
  claimStatusType?: NaverClaimStatus;
  lastChangedDate: string; // ISO date
}

// ============================================================================
// Webhook Types
// ============================================================================

/**
 * Webhook event types
 */
export type NaverWebhookEventType =
  | 'ORDER_PAYMENT_COMPLETE' // 결제 완료
  | 'ORDER_PLACED' // 주문 접수
  | 'ORDER_DELIVERING' // 배송 시작
  | 'ORDER_DELIVERED' // 배송 완료
  | 'ORDER_PURCHASE_DECIDED' // 구매 확정 (customer confirmed purchase)
  | 'ORDER_CLAIM_REQUESTED' // 클레임 요청
  | 'ORDER_CLAIM_PROCESSED'; // 클레임 처리 완료

/**
 * Webhook payload
 */
export interface NaverWebhookPayload {
  type: NaverWebhookEventType;
  timestamp: string;
  productOrderIds: string[];
  orderId?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Settlement Types
// ============================================================================

/**
 * Settlement record
 */
export interface NaverSettlement {
  settlementDate: string; // YYYY-MM-DD
  scheduledSettlementDate: string;
  completedSettlementDate?: string;
  productOrderId: string;
  orderId: string;
  settlementAmount: number;
  settlementCommission: number;
  deductionAmount: number;
  refundAmount: number;
  netAmount: number;
  status: 'SCHEDULED' | 'COMPLETED';
}

/**
 * Daily settlement summary
 */
export interface NaverDailySettlement {
  date: string;
  totalSettlementAmount: number;
  totalDeductionAmount: number;
  totalNetAmount: number;
  itemCount: number;
  items: NaverSettlement[];
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface NaverApiResponse<T> {
  code: string;
  message: string;
  data?: T;
  traceId?: string;
}

/**
 * Paginated response
 */
export interface NaverPaginatedResponse<T> {
  code: string;
  message: string;
  data: {
    contents: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
  };
}

/**
 * Product order query response
 */
export interface NaverProductOrderQueryResponse {
  code: string;
  message: string;
  data: NaverProductOrder[];
}

/**
 * Status change query response
 */
export interface NaverStatusChangeResponse {
  code: string;
  message: string;
  data: {
    lastChangeStatuses: NaverStatusChange[];
    more: boolean;
  };
}

// ============================================================================
// Inquiry/CS Types
// ============================================================================

/**
 * Customer inquiry
 */
export interface NaverInquiry {
  inquiryId: string;
  productId: string;
  productName: string;
  inquiryType: 'PRODUCT' | 'DELIVERY' | 'EXCHANGE_RETURN' | 'OTHER';
  title: string;
  content: string;
  createdDate: string;
  answeredDate?: string;
  isAnswered: boolean;
  inquirer: {
    name: string;
    memberId: string;
  };
}

/**
 * Inquiry reply request
 */
export interface NaverInquiryReply {
  inquiryId: string;
  content: string;
}

// ============================================================================
// Dispatch Types (for eSIM delivery)
// ============================================================================

/**
 * Dispatch request for marking order as shipped
 * For eSIM, we use "직접전달" (direct delivery) method
 */
export interface NaverDispatchRequest {
  productOrderId: string;
  deliveryMethod: 'DIRECT_DELIVERY'; // 직접전달
  deliveryCompany?: string;
  trackingNumber?: string;
  dispatchDate: string; // ISO date
}

/**
 * Dispatch response
 */
export interface NaverDispatchResponse {
  code: string;
  message: string;
  data: {
    successProductOrderIds: string[];
    failProductOrderIds: string[];
  };
}

// ============================================================================
// Internal Types (for order normalization)
// ============================================================================

/**
 * Normalized internal order format
 * Used to unify orders from different sales channels
 */
export interface InternalOrder {
  salesChannel: 'smartstore' | 'stripe' | 'tosspay' | 'direct';
  externalOrderId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  productId: string; // Internal product ID
  providerSku?: string;
  quantity: number;
  amount: number;
  currency: string;
  paidAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * SmartStore service configuration
 */
export interface SmartStoreConfig {
  enabled: boolean;
  appId: string;
  appSecret: string;
  sellerId: string;
  webhookSecret?: string;
  pollingIntervalMs: number;
  baseUrl: string;
}

/**
 * Error types for SmartStore operations
 */
export type SmartStoreErrorType =
  | 'authentication'
  | 'rate_limit'
  | 'validation'
  | 'not_found'
  | 'network_error'
  | 'api_error'
  | 'unknown';

/**
 * SmartStore operation result
 */
export interface SmartStoreResult<T> {
  success: boolean;
  data?: T;
  errorType?: SmartStoreErrorType;
  errorMessage?: string;
  isRetryable?: boolean;
}
