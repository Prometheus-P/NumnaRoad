/**
 * RedteaGO (eSIMAccess) Provider
 *
 * Wholesale eSIM provider with significantly lower costs than retail APIs.
 * Uses pre-paid credit model - funds must be deposited before API usage.
 *
 * API Documentation: https://esimaccess.com/docs (requires partner access)
 *
 * Pricing Tiers (Group XYZ - Asia including Japan/Korea):
 * - 1GB 7 days: $0.46
 * - 3GB 15 days: $1.39
 * - 5GB 30 days: $2.30
 * - 10GB 30 days: $4.20
 */

import {
  BaseProvider,
  EsimPurchaseRequest,
  EsimPurchaseResult,
  registerProvider,
} from './provider-factory';
import { ProviderSlug, ErrorType } from './types';
import { logger } from '../logger';

const REDTEAGO_API_URL = process.env.REDTEAGO_API_URL || 'https://api.esimaccess.com/api/v1';

/**
 * RedteaGO API Response Types
 */
interface RedteaGOOrderResponse {
  success: boolean;
  code: number;
  msg: string;
  data?: {
    orderNo: string;
    transactionId: string;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    esimList: Array<{
      iccid: string;
      eid?: string;
      smdpAddress: string;
      activationCode: string;
      qrcodeUrl?: string;
      qrcodeData?: string; // LPA string for QR generation
      expiryDate?: string;
    }>;
    totalAmount: number;
    currency: string;
  };
}

interface RedteaGOPackageListResponse {
  success: boolean;
  code: number;
  msg: string;
  data?: {
    packages: Array<{
      packageCode: string;
      name: string;
      country: string;
      countryCode: string;
      dataAmount: number;
      dataUnit: string;
      validity: number;
      price: number;
      currency: string;
      description?: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  };
}

interface RedteaGOBalanceResponse {
  success: boolean;
  code: number;
  msg: string;
  data?: {
    balance: number;
    currency: string;
  };
}

/**
 * RedteaGO Provider Implementation
 *
 * Key differences from Airalo:
 * - Pre-paid credit model (no OAuth, just API key)
 * - Lower wholesale pricing (~70% cheaper)
 * - Direct QR code/activation code in response
 * - No token refresh needed
 */
export class RedteaGOProvider extends BaseProvider {
  readonly slug: ProviderSlug = 'redteago';

  /**
   * Purchase an eSIM package
   */
  async purchase(request: EsimPurchaseRequest): Promise<EsimPurchaseResult> {
    try {
      const apiKey = this.loadApiKey();

      const response = await this.fetchWithTimeout(`${REDTEAGO_API_URL}/order/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          packageCode: request.providerSku,
          quantity: request.quantity || 1,
          referenceId: request.correlationId,
          // Optional: customer email for direct delivery
          ...(request.customerEmail && { customerEmail: request.customerEmail }),
        }),
      });

      if (!response.ok) {
        return this.handleErrorResponse(response);
      }

      const data: RedteaGOOrderResponse = await response.json();

      if (!data.success || !data.data) {
        return {
          success: false,
          errorType: 'provider_error',
          errorMessage: data.msg || 'Order creation failed',
          isRetryable: this.isRetryableError(data.code),
        };
      }

      // Check if order is completed with eSIM data
      if (data.data.status !== 'COMPLETED' || !data.data.esimList?.length) {
        return {
          success: false,
          errorType: 'provider_error',
          errorMessage: `Order status: ${data.data.status}. No eSIM data available.`,
          isRetryable: data.data.status === 'PENDING',
        };
      }

      const esim = data.data.esimList[0];

      // Build LPA activation code if not provided directly
      const activationCode = esim.activationCode ||
        `LPA:1$${esim.smdpAddress}$${esim.activationCode || ''}`;

      // Generate QR code URL if only data is provided
      const qrCodeUrl = esim.qrcodeUrl ||
        (esim.qrcodeData ? this.generateQrCodeUrl(esim.qrcodeData) : '');

      return {
        success: true,
        qrCodeUrl,
        iccid: esim.iccid,
        activationCode: activationCode,
        providerOrderId: data.data.orderNo,
      };
    } catch (error) {
      return this.handleException(error);
    }
  }

  /**
   * Health check - verify API connectivity and balance
   */
  async healthCheck(): Promise<boolean> {
    try {
      const apiKey = this.loadApiKey();

      const response = await this.fetchWithTimeout(`${REDTEAGO_API_URL}/account/balance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }

      const data: RedteaGOBalanceResponse = await response.json();

      if (!data.success || !data.data) {
        return false;
      }

      // Log low balance warning
      if (data.data.balance < 10) {
        logger.warn('redteago_low_balance', { balance: data.data.balance });
      }

      // Check if we have sufficient balance (at least $1)
      return data.data.balance >= 1;
    } catch (error) {
      logger.error('redteago_health_check_failed', error);
      return false;
    }
  }

  /**
   * Get available packages (for product sync)
   */
  async getPackages(countryCode?: string): Promise<RedteaGOPackageListResponse> {
    try {
      const apiKey = this.loadApiKey();
      const params = new URLSearchParams();
      if (countryCode) {
        params.append('countryCode', countryCode);
      }
      params.append('pageSize', '100');

      const url = `${REDTEAGO_API_URL}/package/list?${params.toString()}`;

      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const statusError = new Error(`Failed to fetch packages: HTTP ${response.status}`);
        throw statusError;
      }

      return response.json();
    } catch (error) {
      logger.error('redteago_packages_fetch_failed', error);
      // Preserve error cause chain for debugging
      throw new Error('RedteaGO package fetch failed', { cause: error });
    }
  }

  /**
   * Get current account balance
   */
  async getBalance(): Promise<{ balance: number; currency: string } | null> {
    try {
      const apiKey = this.loadApiKey();

      const response = await this.fetchWithTimeout(`${REDTEAGO_API_URL}/account/balance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data: RedteaGOBalanceResponse = await response.json();

      if (data.success && data.data) {
        return {
          balance: data.data.balance,
          currency: data.data.currency,
        };
      }

      return null;
    } catch (error) {
      logger.error('redteago_balance_fetch_failed', error);
      return null;
    }
  }

  /**
   * Generate QR code URL from LPA data
   * Uses a QR code generation service
   */
  private generateQrCodeUrl(lpaData: string): string {
    // Use Google Charts API for QR generation (free, reliable)
    const encoded = encodeURIComponent(lpaData);
    return `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encoded}`;
  }

  /**
   * Handle HTTP error responses
   */
  private async handleErrorResponse(response: Response): Promise<EsimPurchaseResult> {
    const errorType = this.classifyHttpError(response.status);
    let errorMessage = `HTTP ${response.status}`;

    try {
      const body = await response.json() as { msg?: string; code?: number };
      errorMessage = body.msg || errorMessage;
    } catch (parseError) {
      // Log JSON parse failure but continue with HTTP status message
      logger.warn('redteago_error_response_parse_failed', { parseError: parseError instanceof Error ? parseError.message : 'Unknown' });
    }

    return {
      success: false,
      errorType,
      errorMessage,
      isRetryable: this.isRetryableStatus(response.status),
    };
  }

  /**
   * Handle exceptions during API calls
   */
  private handleException(error: unknown): EsimPurchaseResult {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          errorType: 'timeout',
          errorMessage: `Request timed out after ${this.config.timeoutMs}ms`,
          isRetryable: true,
        };
      }

      if (error.message.includes('fetch') || error.message.includes('network')) {
        return {
          success: false,
          errorType: 'network_error',
          errorMessage: error.message,
          isRetryable: true,
        };
      }
    }

    return {
      success: false,
      errorType: 'unknown',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      isRetryable: false,
    };
  }

  /**
   * Classify HTTP status codes to error types
   */
  private classifyHttpError(status: number): ErrorType {
    if (status === 401 || status === 403) {
      return 'authentication';
    }
    if (status === 429) {
      return 'rate_limit';
    }
    if (status === 400 || status === 422) {
      return 'validation';
    }
    if (status >= 500) {
      return 'provider_error';
    }
    return 'unknown';
  }

  /**
   * Check if HTTP status indicates retryable error
   */
  private isRetryableStatus(status: number): boolean {
    return status === 429 || status >= 500;
  }

  /**
   * Check if RedteaGO error code is retryable
   */
  private isRetryableError(code: number): boolean {
    // Common retryable error codes (adjust based on actual API docs)
    const retryableCodes = [
      1001, // Temporary service unavailable
      1002, // Rate limit exceeded
      2001, // Insufficient balance (might need top-up)
      5000, // Internal server error
    ];
    return retryableCodes.includes(code);
  }
}

// Register the provider
registerProvider('redteago', RedteaGOProvider);
