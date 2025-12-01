/**
 * eSIM Provider Factory
 *
 * 다양한 eSIM 공급사를 통합 관리하고 자동 전환을 지원합니다.
 */

export interface ESIMProvider {
  name: string;
  issueESIM(productId: string, email: string): Promise<ESIMResponse>;
  getInventory(productId: string): Promise<number>;
  getProducts(): Promise<Product[]>;
}

export interface ESIMResponse {
  orderId: string;
  qrCodeUrl: string;
  activationCode: string;
  iccid?: string;
  provider: string;
}

export interface Product {
  id: string;
  name: string;
  country: string;
  duration: number;
  dataLimit: string;
  price: number;
}

/**
 * 공급사별 우선순위
 * 높은 숫자가 우선
 */
const PROVIDER_PRIORITY = {
  'eSIM Card': 100,
  'MobiMatter': 80,
  'Airalo': 60,
};

/**
 * 공급사 인스턴스 가져오기
 */
export function getProvider(name: string): ESIMProvider {
  switch (name) {
    case 'eSIM Card':
      // return new ESIMCardProvider();
      throw new Error('eSIM Card provider not implemented');

    case 'MobiMatter':
      // return new MobiMatterProvider();
      throw new Error('MobiMatter provider not implemented');

    case 'Airalo':
      // return new AiraloProvider();
      throw new Error('Airalo provider not implemented');

    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

/**
 * 모든 공급사 목록 (우선순위 순)
 */
export function getAllProviders(): ESIMProvider[] {
  return Object.keys(PROVIDER_PRIORITY)
    .sort((a, b) => PROVIDER_PRIORITY[b] - PROVIDER_PRIORITY[a])
    .map(name => getProvider(name));
}

/**
 * eSIM 발급 (자동 전환 지원)
 *
 * @param productId 상품 ID
 * @param email 고객 이메일
 * @param maxRetries 최대 재시도 횟수
 */
export async function issueESIMWithFallback(
  productId: string,
  email: string,
  maxRetries: number = 3
): Promise<ESIMResponse> {
  const providers = getAllProviders();
  const errors: Array<{ provider: string; error: Error }> = [];

  for (const provider of providers) {
    console.log(`Trying provider: ${provider.name}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await provider.issueESIM(productId, email);
        console.log(`Success with ${provider.name} on attempt ${attempt}`);
        return result;
      } catch (error) {
        console.error(`${provider.name} failed (attempt ${attempt}):`, error);

        if (attempt === maxRetries) {
          errors.push({ provider: provider.name, error: error as Error });
        } else {
          // 재시도 전 대기 (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
  }

  // 모든 공급사에서 실패
  throw new Error(
    `All providers failed. Details: ${errors.map(e => `${e.provider}: ${e.error.message}`).join('; ')}`
  );
}

/**
 * 재고 조회 (모든 공급사)
 */
export async function getInventoryFromAllProviders(
  productId: string
): Promise<Record<string, number>> {
  const providers = getAllProviders();
  const inventory: Record<string, number> = {};

  await Promise.allSettled(
    providers.map(async (provider) => {
      try {
        inventory[provider.name] = await provider.getInventory(productId);
      } catch (error) {
        console.error(`Failed to get inventory from ${provider.name}:`, error);
        inventory[provider.name] = 0;
      }
    })
  );

  return inventory;
}
