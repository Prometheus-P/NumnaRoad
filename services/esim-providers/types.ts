/**
 * Shared TypeScript types for eSIM provider integrations
 */

// =============================================================================
// Provider Types
// =============================================================================

/**
 * Provider slugs matching the database
 */
export type ProviderSlug = 'esimcard' | 'mobimatter' | 'airalo';

/**
 * Provider configuration from database
 */
export interface EsimProvider {
  id: string;
  name: string;
  slug: ProviderSlug;
  priority: number;
  apiEndpoint: string;
  apiKeyEnvVar: string;
  timeoutMs: number;
  maxRetries: number;
  isActive: boolean;
  successRate?: number;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Product catalog entry
 */
export interface EsimProduct {
  id: string;
  name: string;
  slug: string;
  country: string;
  providerId: string;
  providerSku: string;
  price: number;
  dataLimit: string;
  durationDays: number;
  isActive: boolean;
  stockCount?: number;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Order Types
// =============================================================================

/**
 * Order status state machine values
 */
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Order record from database
 */
export interface Order {
  id: string;
  customerEmail: string;
  productId: string;
  stripePaymentIntent: string;
  stripeSessionId?: string;
  status: OrderStatus;
  providerUsed?: string;
  esimQrCode?: string;
  esimIccid?: string;
  esimActivationCode?: string;
  correlationId: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Input for creating a new order
 */
export interface CreateOrderInput {
  customerEmail: string;
  productId: string;
  stripePaymentIntent: string;
  stripeSessionId?: string;
  correlationId: string;
}

// =============================================================================
// eSIM Purchase Types
// =============================================================================

/**
 * Request to purchase an eSIM from a provider
 */
export interface EsimPurchaseRequest {
  providerSku: string;
  customerEmail: string;
  correlationId: string;
}

/**
 * Response from a successful eSIM purchase
 */
export interface EsimPurchaseResponse {
  success: true;
  qrCodeUrl: string;
  iccid: string;
  activationCode?: string;
  providerOrderId: string;
}

/**
 * Response from a failed eSIM purchase
 */
export interface EsimPurchaseError {
  success: false;
  errorType: ErrorType;
  errorMessage: string;
  isRetryable: boolean;
  providerOrderId?: string;
}

export type EsimPurchaseResult = EsimPurchaseResponse | EsimPurchaseError;

// =============================================================================
// Error Types
// =============================================================================

/**
 * Classified error types for logging and retry decisions
 */
export type ErrorType =
  | 'timeout'
  | 'rate_limit'
  | 'invalid_response'
  | 'network_error'
  | 'authentication'
  | 'validation'
  | 'provider_error'
  | 'unknown';

/**
 * Check if an error type is retryable
 */
export function isRetryableError(errorType: ErrorType): boolean {
  const retryable: ErrorType[] = ['timeout', 'rate_limit', 'network_error'];
  return retryable.includes(errorType);
}

// =============================================================================
// Logging Types
// =============================================================================

/**
 * Step names for automation_logs
 */
export type StepName =
  | 'webhook_received'
  | 'order_created'
  | 'provider_call_started'
  | 'provider_call_success'
  | 'provider_call_failed'
  | 'failover_triggered'
  | 'email_sent'
  | 'email_failed'
  | 'order_completed'
  | 'order_failed';

/**
 * Log entry status
 */
export type LogStatus = 'started' | 'success' | 'failed' | 'skipped';

/**
 * Automation log entry
 */
export interface AutomationLog {
  id: string;
  orderId: string;
  correlationId: string;
  stepName: StepName;
  status: LogStatus;
  providerName?: string;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  errorMessage?: string;
  errorType?: ErrorType;
  durationMs?: number;
  retryCount?: number;
  createdAt: string;
}

/**
 * Input for creating a log entry
 */
export interface CreateLogInput {
  orderId: string;
  correlationId: string;
  stepName: StepName;
  status: LogStatus;
  providerName?: string;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  errorMessage?: string;
  errorType?: ErrorType;
  durationMs?: number;
  retryCount?: number;
}

// =============================================================================
// Provider Interface
// =============================================================================

/**
 * Interface that all eSIM providers must implement
 */
export interface EsimProviderAdapter {
  /**
   * Provider slug identifier
   */
  readonly slug: ProviderSlug;

  /**
   * Purchase an eSIM
   */
  purchase(request: EsimPurchaseRequest): Promise<EsimPurchaseResult>;

  /**
   * Check if provider is healthy/available
   */
  healthCheck(): Promise<boolean>;
}
