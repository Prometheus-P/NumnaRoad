/**
 * Airalo Provider Adapter
 *
 * Tertiary eSIM provider integration (backup).
 *
 * Task: T037
 */

import type {
  EsimPurchaseRequest,
  EsimPurchaseResult,
  EsimProvider,
  ErrorType,
} from './types';
import { BaseProvider, registerProvider } from './provider-factory';

/**
 * Airalo API response types
 */
interface AiraloPurchaseResponse {
  data?: {
    id: string;
    esim: {
      qr_code_url: string;
      iccid: string;
      manual_code?: string;
    };
    status: string;
  };
  meta?: {
    message: string;
  };
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

/**
 * Airalo provider adapter
 */
export class AiraloProvider extends BaseProvider {
  readonly slug = 'airalo' as const;

  constructor(config: EsimProvider) {
    super(config);
  }

  /**
   * Purchase an eSIM from Airalo
   */
  async purchase(request: EsimPurchaseRequest): Promise<EsimPurchaseResult> {
    const apiKey = this.loadApiKey();

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'X-Correlation-ID': request.correlationId,
          },
          body: JSON.stringify({
            package_id: request.providerSku,
            email: request.customerEmail,
            quantity: 1,
          }),
        }
      );

      if (!response.ok) {
        return this.handleErrorResponse(response);
      }

      const data = (await response.json()) as AiraloPurchaseResponse;

      if (!data.data?.esim) {
        return {
          success: false,
          errorType: 'invalid_response',
          errorMessage: data.errors?.[0]?.message ?? 'Invalid response from Airalo',
          isRetryable: false,
        };
      }

      return {
        success: true,
        qrCodeUrl: data.data.esim.qr_code_url,
        iccid: data.data.esim.iccid,
        activationCode: data.data.esim.manual_code,
        providerOrderId: data.data.id,
      };
    } catch (error) {
      return this.handleException(error);
    }
  }

  /**
   * Check if Airalo API is healthy
   */
  async healthCheck(): Promise<boolean> {
    const apiKey = this.loadApiKey();

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/packages?limit=1`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

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
      const body = (await response.json()) as AiraloPurchaseResponse;
      errorMessage = body.errors?.[0]?.message ?? body.meta?.message ?? errorMessage;
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
registerProvider('airalo', AiraloProvider);
