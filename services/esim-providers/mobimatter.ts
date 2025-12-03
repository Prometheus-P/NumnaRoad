/**
 * MobiMatter Provider Adapter
 *
 * Secondary eSIM provider integration.
 *
 * Task: T036
 */

import type {
  EsimPurchaseRequest,
  EsimPurchaseResult,
  EsimProvider,
  ErrorType,
} from './types';
import { BaseProvider, registerProvider } from './provider-factory';

/**
 * MobiMatter API response types
 */
interface MobiMatterPurchaseResponse {
  status: 'success' | 'error';
  data?: {
    orderId: string;
    esim: {
      qrCode: string;
      iccid: string;
      lpaCode?: string;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * MobiMatter provider adapter
 */
export class MobiMatterProvider extends BaseProvider {
  readonly slug = 'mobimatter' as const;

  constructor(config: EsimProvider) {
    super(config);
  }

  /**
   * Purchase an eSIM from MobiMatter
   */
  async purchase(request: EsimPurchaseRequest): Promise<EsimPurchaseResult> {
    const apiKey = this.loadApiKey();

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/orders/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
            'X-Request-ID': request.correlationId,
          },
          body: JSON.stringify({
            productId: request.providerSku,
            customerEmail: request.customerEmail,
            deliveryType: 'qr_code',
          }),
        }
      );

      if (!response.ok) {
        return this.handleErrorResponse(response);
      }

      const data = (await response.json()) as MobiMatterPurchaseResponse;

      if (data.status !== 'success' || !data.data) {
        return {
          success: false,
          errorType: 'provider_error',
          errorMessage: data.error?.message ?? 'Purchase failed',
          isRetryable: false,
        };
      }

      return {
        success: true,
        qrCodeUrl: data.data.esim.qrCode,
        iccid: data.data.esim.iccid,
        activationCode: data.data.esim.lpaCode,
        providerOrderId: data.data.orderId,
      };
    } catch (error) {
      return this.handleException(error);
    }
  }

  /**
   * Check if MobiMatter API is healthy
   */
  async healthCheck(): Promise<boolean> {
    const apiKey = this.loadApiKey();

    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/status`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Handle HTTP error responses
   */
  private async handleErrorResponse(
    response: Response
  ): Promise<EsimPurchaseResult> {
    const errorType = this.classifyHttpError(response.status);
    let errorMessage = `HTTP ${response.status}`;

    try {
      const body = (await response.json()) as { error?: { message?: string } };
      errorMessage = body.error?.message ?? errorMessage;
    } catch {
      // Ignore JSON parse errors
    }

    return {
      success: false,
      errorType,
      errorMessage,
      isRetryable: this.isRetryableStatus(response.status),
    };
  }

  /**
   * Handle exceptions during purchase
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

      if (error.message.includes('fetch')) {
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
   * Classify HTTP status to error type
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
   * Check if HTTP status is retryable
   */
  private isRetryableStatus(status: number): boolean {
    return status === 429 || status >= 500;
  }
}

// Register provider
registerProvider('mobimatter', MobiMatterProvider);
