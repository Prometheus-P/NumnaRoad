/**
 * Airalo Provider Implementation
 *
 * API Documentation: https://api.airalo.com/docs
 */

import { ESIMProvider, ESIMResponse, Product } from './provider-factory';

interface AiraloAPIResponse {
  data: {
    id: string;
    qrcode: string;
    iccid: string;
    matching_id: string;
  };
  message?: string;
}

interface AiraloProduct {
  id: string;
  name: string;
  country: {
    slug: string;
  };
  validity: number;
  data: {
    value: string;
  };
  price: number;
}

export class AiraloProvider implements ESIMProvider {
  readonly name = 'Airalo';
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // ms

  constructor() {
    this.apiKey = process.env.AIRALO_API_KEY || '';
    this.apiUrl = process.env.AIRALO_API_URL || 'https://api.airalo.com/v1';

    if (!this.apiKey) {
      console.warn('⚠️ AIRALO_API_KEY not set');
    }
  }

  /**
   * eSIM 발급
   */
  async issueESIM(productId: string, email: string): Promise<ESIMResponse> {
    const url = `${this.apiUrl}/sims/topup`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        package_id: productId,
        email: email,
        quantity: 1,
      }),
    });

    const data: AiraloAPIResponse = await response.json();

    if (!data.data) {
      throw new Error(`Airalo API Error: ${data.message || 'Unknown error'}`);
    }

    return {
      orderId: data.data.id,
      qrCodeUrl: data.data.qrcode,
      activationCode: data.data.matching_id, // LPA string
      iccid: data.data.iccid,
      provider: this.name,
    };
  }

  /**
   * 재고 조회
   */
  async getInventory(_productId: string): Promise<number> {
    // Airalo는 항상 재고가 있다고 가정
    // (실제 API에는 재고 조회 엔드포인트가 없을 수 있음)
    return 999;
  }

  /**
   * 상품 목록 조회
   */
  async getProducts(): Promise<Product[]> {
    const url = `${this.apiUrl}/packages`;

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map((p: AiraloProduct) => ({
      id: p.id,
      name: p.name,
      country: p.country.slug.toUpperCase(),
      duration: p.validity,
      dataLimit: p.data.value,
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
