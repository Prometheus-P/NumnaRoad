/**
 * eSIM Card Provider Implementation
 *
 * API Documentation: https://api.esimcard.com/docs
 */

import { logger } from '../logger';

// Legacy provider interface for eSIM Card
interface ESIMProvider {
  readonly name: string;
  issueESIM(productId: string, email: string): Promise<ESIMResponse>;
  getInventory(productId: string): Promise<number>;
  getProducts(): Promise<Product[]>;
}

interface ESIMResponse {
  orderId: string;
  qrCodeUrl: string;
  activationCode: string;
  iccid: string;
  provider: string;
}

interface Product {
  id: string;
  name: string;
  country: string;
  duration: number;
  dataLimit: string;
  price: number;
}

interface ESIMCardAPIResponse {
  success: boolean;
  data: {
    orderId: string;
    qrCodeUrl: string;
    lpaString: string;
    iccid: string;
  };
  error?: string;
}

interface ESIMCardProduct {
  id: string;
  name: string;
  country: string;
  duration: number;
  dataLimit: string;
  price: number;
}

export class ESIMCardProvider implements ESIMProvider {
  readonly name = 'eSIM Card';
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // ms

  constructor() {
    this.apiKey = process.env.ESIM_CARD_API_KEY || '';
    this.apiUrl = process.env.ESIM_CARD_API_URL || 'https://api.esimcard.com/v1';

    if (!this.apiKey) {
      logger.warn('esimcard_api_key_not_set');
    }
  }

  /**
   * eSIM 발급
   */
  async issueESIM(productId: string, email: string): Promise<ESIMResponse> {
    const url = `${this.apiUrl}/esim/issue`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        productId,
        email,
        autoActivate: false,
      }),
    });

    const data: ESIMCardAPIResponse = await response.json();

    if (!data.success) {
      throw new Error(`eSIM Card API Error: ${data.error || 'Unknown error'}`);
    }

    return {
      orderId: data.data.orderId,
      qrCodeUrl: data.data.qrCodeUrl,
      activationCode: data.data.lpaString,
      iccid: data.data.iccid,
      provider: this.name,
    };
  }

  /**
   * 재고 조회
   */
  async getInventory(productId: string): Promise<number> {
    const url = `${this.apiUrl}/products/${productId}/inventory`;

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    const data = await response.json();

    return data.data?.stock || 0;
  }

  /**
   * 상품 목록 조회
   */
  async getProducts(): Promise<Product[]> {
    const url = `${this.apiUrl}/products`;

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    const data = await response.json();

    if (!data.success || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map((p: ESIMCardProduct) => ({
      id: p.id,
      name: p.name,
      country: p.country,
      duration: p.duration,
      dataLimit: p.dataLimit,
      price: p.price,
    }));
  }

  /**
   * Retry logic이 포함된 fetch
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt: number = 1
  ): Promise<Response> {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000), // 10초 타임아웃
      });

      // Rate limit 처리
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
        if (attempt < this.maxRetries) {
          logger.info('esimcard_rate_limited_retrying', { retryAfter, attempt });
          await this.sleep(retryAfter * 1000);
          return this.fetchWithRetry(url, options, attempt + 1);
        }
      }

      // 5xx 에러 재시도
      if (response.status >= 500 && attempt < this.maxRetries) {
        logger.info('esimcard_server_error_retrying', { status: response.status, attempt: attempt + 1 });
        await this.sleep(this.retryDelay * attempt);
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (attempt < this.maxRetries && this.isRetryableError(error)) {
        logger.info('esimcard_request_failed_retrying', { attempt: attempt + 1 });
        await this.sleep(this.retryDelay * attempt);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * 재시도 가능한 에러인지 확인
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof TypeError) {
      // Network errors
      return true;
    }
    if (error instanceof Error) {
      return error.name === 'AbortError' || error.message.includes('timeout');
    }
    return false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
