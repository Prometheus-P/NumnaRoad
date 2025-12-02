/**
 * MobiMatter Provider Implementation
 *
 * API Documentation: https://api.mobimatter.com/docs
 */

import { ESIMProvider, ESIMResponse, Product } from './provider-factory';

interface MobiMatterAPIResponse {
  status: string;
  result: {
    order_id: string;
    qr_code: string;
    activation_code: string;
    iccid: string;
  };
  message?: string;
}

interface MobiMatterProduct {
  product_id: string;
  title: string;
  country_code: string;
  validity_days: number;
  data_amount: string;
  price_usd: number;
}

export class MobiMatterProvider implements ESIMProvider {
  readonly name = 'MobiMatter';
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // ms

  constructor() {
    this.apiKey = process.env.MOBIMATTER_API_KEY || '';
    this.apiUrl = process.env.MOBIMATTER_API_URL || 'https://api.mobimatter.com/v1';

    if (!this.apiKey) {
      console.warn('⚠️ MOBIMATTER_API_KEY not set');
    }
  }

  /**
   * eSIM 발급
   */
  async issueESIM(productId: string, email: string): Promise<ESIMResponse> {
    const url = `${this.apiUrl}/orders/create`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        product_id: productId,
        customer_email: email,
        quantity: 1,
      }),
    });

    const data: MobiMatterAPIResponse = await response.json();

    if (data.status !== 'success') {
      throw new Error(`MobiMatter API Error: ${data.message || 'Unknown error'}`);
    }

    return {
      orderId: data.result.order_id,
      qrCodeUrl: data.result.qr_code,
      activationCode: data.result.activation_code,
      iccid: data.result.iccid,
      provider: this.name,
    };
  }

  /**
   * 재고 조회
   */
  async getInventory(productId: string): Promise<number> {
    const url = `${this.apiUrl}/products/${productId}/stock`;

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    const data = await response.json();

    return data.result?.available || 0;
  }

  /**
   * 상품 목록 조회
   */
  async getProducts(): Promise<Product[]> {
    const url = `${this.apiUrl}/products`;

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    const data = await response.json();

    if (data.status !== 'success' || !Array.isArray(data.result)) {
      return [];
    }

    return data.result.map((p: MobiMatterProduct) => ({
      id: p.product_id,
      name: p.title,
      country: p.country_code,
      duration: p.validity_days,
      dataLimit: p.data_amount,
      price: p.price_usd,
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
          console.log(`Rate limited. Retrying after ${retryAfter}s...`);
          await this.sleep(retryAfter * 1000);
          return this.fetchWithRetry(url, options, attempt + 1);
        }
      }

      // 5xx 에러 재시도
      if (response.status >= 500 && attempt < this.maxRetries) {
        console.log(`Server error (${response.status}). Retrying attempt ${attempt + 1}...`);
        await this.sleep(this.retryDelay * attempt);
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (attempt < this.maxRetries && this.isRetryableError(error)) {
        console.log(`Request failed. Retrying attempt ${attempt + 1}...`);
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
