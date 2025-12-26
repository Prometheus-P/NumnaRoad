// =============================================================================
// Airalo Specific Types
// =============================================================================

export interface AiraloImage {
  width: number;
  height: number;
  url: string;
}

export interface AiraloNetwork {
  name: string;
  types: string[];
}

export interface AiraloCoverage {
  name: string;
  code: string;
  networks: AiraloNetwork[];
}

export interface AiraloApnDetail {
  apn_type: string;
  apn_value: string | null;
}

export interface AiraloApn {
  ios: AiraloApnDetail;
  android: AiraloApnDetail;
}

export interface AiraloCurrencyPrices {
  AUD: number;
  BRL: number;
  GBP: number;
  CAD: number;
  AED: number;
  EUR: number;
  INR?: number; // Optional based on example
  IDR?: number; // Optional based on example
  ILS: number;
  JPY: number;
  MYR?: number; // Optional based on example
  MXN: number;
  SGD?: number; // Optional based on example
  KRW?: number; // Optional based on example
  USD: number;
  VND: number;
}

export interface AiraloPrices {
  net_price: AiraloCurrencyPrices;
  recommended_retail_price: AiraloCurrencyPrices;
}

export interface AiraloPackageDetails {
  id: string;
  type: string;
  price: number;
  amount: number;
  day: number;
  is_unlimited: boolean;
  title: string;
  short_info: string | null;
  qr_installation: string;
  manual_installation: string;
  is_fair_usage_policy: boolean;
  fair_usage_policy: string | null;
  data: string;
  voice: number | null;
  text: number | null;
  net_price?: number; // Only in some responses
  prices: AiraloPrices;
  air_usage_policy?: string | null; // Only in some responses
}

export interface AiraloCountry {
  country_code: string;
  title: string;
  image: AiraloImage;
}

export interface AiraloOperator {
  id: number;
  style: string;
  gradient_start: string;
  gradient_end: string;
  type: string;
  is_prepaid: boolean;
  title: string;
  esim_type: string;
  warning: string | null;
  apn_type: string;
  apn_value: string | null;
  is_roaming: boolean;
  info: string[];
  image: AiraloImage;
  plan_type: string;
  activation_policy: string;
  is_kyc_verify: boolean;
  rechargeability: boolean;
  other_info: string | null;
  coverages: AiraloCoverage[];
  install_window_days: number | null;
  topup_grace_window_days: number | null;
  apn: AiraloApn;
  packages: AiraloPackageDetails[];
  countries: AiraloCountry[];
}

export interface AiraloPackageData {
  slug: string;
  country_code: string;
  title: string;
  image: AiraloImage;
  operators: AiraloOperator[];
}

export interface AiraloPackageResponse {
  pricing: {
    model: string;
    discount_percentage: number;
  };
  data: AiraloPackageData[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    message: string;
    current_page: number;
    from: number;
    last_page: number;
    path: string;
    per_page: string;
    to: number;
    total: number;
  };
}


/**
 * Shared TypeScript types for eSIM provider integrations
 */

// =============================================================================
// Provider Types
// =============================================================================

/**
 * Provider slugs matching the database
 */
export type ProviderSlug = 'esimcard' | 'mobimatter' | 'airalo' | 'redteago' | 'manual';

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
  providerPackageId: string; // New field to store the specific package ID from the provider
  price: number;
  dataAmount: number; // Storing data amount as a number
  dataUnit: string; // Storing data unit (e.g., "GB", "MB")
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
  providerSku: string; // package_id
  quantity: number;
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
  directAppleInstallationUrl?: string; // New field from Airalo order response
}

/**
 * Request to purchase an eSIM from Airalo
 */
export interface AiraloOrderRequest {
  quantity: string;
  package_id: string;
  type: string;
  description: string;
  brand_settings_name: string | null;
}

/**
 * Represents a single SIM card within an Airalo order response
 */
export interface AiraloSim {
  id: number;
  created_at: string;
  iccid: string;
  lpa: string;
  imsis: string | null;
  matching_id: string;
  qrcode: string;
  qrcode_url: string;
  direct_apple_installation_url: string;
  airalo_code: string | null;
  apn_type: string;
  apn_value: string | null;
  is_roaming: boolean;
  confirmation_code: string | null;
}

/**
 * Installation guides for an eSIM
 */
export interface AiraloInstallationGuides {
  en: string;
  // Potentially other languages
}

/**
 * Data section of the Airalo order response
 */
export interface AiraloOrderData {
  package_id: string;
  quantity: string;
  type: string;
  description: string;
  esim_type: string;
  validity: number;
  package: string;
  data: string;
  price: number;
  pricing_model: string;
  created_at: string;
  id: number;
  code: string;
  currency: string;
  manual_installation: string;
  qrcode_installation: string;
  installation_guides: AiraloInstallationGuides;
  brand_settings_name: string;
  sims: AiraloSim[];
  discount_percentage?: number; // Only in some responses
  discount_amount?: number; // Only in some responses
  unit_paid_price?: number; // Only in some responses
  total_amount_paid?: number; // Only in some responses
}

/**
 * Full Airalo order submission response
 */
export interface AiraloOrderResponse {
  data: AiraloOrderData;
  meta: {
    message: string;
  };
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

/**
 * Response indicating manual fulfillment is required
 */
export interface EsimManualFulfillmentPending {
  success: 'pending_manual';
  orderId: string;
  notificationSent: boolean;
  message: string;
}

export type EsimPurchaseResult = EsimPurchaseResponse | EsimPurchaseError | EsimManualFulfillmentPending;

/**
 * Response for fetching eSIM installation instructions from Airalo
 */
export interface AiraloSimInstructionsResponse {
  data: {
    instructions: {
      en: string;
      // potentially other languages
    };
  };
  meta: {
    message: string;
  };
}


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
  | 'manual_fulfillment_attempt'
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
