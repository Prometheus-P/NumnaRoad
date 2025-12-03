/**
 * eSIM Card Provider Adapter
 *
 * Primary eSIM provider integration.
 *
 * Task: T026
 */

import type {
  EsimPurchaseRequest,
  EsimPurchaseResult,
  EsimProvider,
  ErrorType,
} from './types';
import { BaseProvider, registerProvider } from './provider-factory';

/**
 * eSIM Card API response types
 */
interface EsimCardPurchaseResponse {
  success: boolean;
  data?: {
    order_id: string;
    qr_code_url: string;
    iccid: string;
    activation_code?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * eSIM Card provider adapter
 */
export class EsimCardProvider extends BaseProvider {
  readonly slug = 'esimcard' as const;

  constructor(config: EsimProvider) {
    super(config);
  }

  /**
   * Purchase an eSIM from eSIM Card
   */
  async purchase(request: EsimPurchaseRequest): Promise<EsimPurchaseResult> {
    const apiKey = this.loadApiKey();

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/esim/purchase`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'X-Correlation-ID': request.correlationId,
          },
          body: JSON.stringify({
            sku: request.providerSku,
            customer_email: request.customerEmail,
          }),
        }
      );

      if (!response.ok) {
        return this.handleErrorResponse(response);
      }

      const data = (await response.json()) as EsimCardPurchaseResponse;

      if (!data.success || !data.data) {
        return {
          success: false,
          errorType: 'provider_error',
          errorMessage: data.error?.message ?? 'Purchase failed',
          isRetryable: false,
        };
      }

      return {
        success: true,
        qrCodeUrl: data.data.qr_code_url,
        iccid: data.data.iccid,
        activationCode: data.data.activation_code,
        providerOrderId: data.data.order_id,
      };
    } catch (error) {
      return this.handleException(error);
    }
  }

  /**
   * Check if eSIM Card API is healthy
   */
  async healthCheck(): Promise<boolean> {
    const apiKey = this.loadApiKey();

    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
    // Retry on rate limit, server errors
    return status === 429 || status >= 500;
  }
}

// Register provider
registerProvider('esimcard', EsimCardProvider);
