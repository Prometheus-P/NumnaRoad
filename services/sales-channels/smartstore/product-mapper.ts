/**
 * SmartStore Product Mapper
 *
 * Transforms NumnaRoad eSIM products to SmartStore product format.
 * Handles data mapping, HTML generation, and change detection.
 */

import { createHash } from 'crypto';
import type {
  SmartStoreProductRequest,
  EsimProduct,
  ProductStatusType,
} from './product-types';

// ============================================================================
// Configuration
// ============================================================================

/** Default category ID for eSIM products (디지털 상품권/모바일상품권) */
const DEFAULT_CATEGORY_ID =
  process.env.SMARTSTORE_DEFAULT_CATEGORY_ID || '50000830';

/** Default product image URL */
const DEFAULT_PRODUCT_IMAGE_URL =
  process.env.SMARTSTORE_DEFAULT_PRODUCT_IMAGE_URL ||
  'https://numnaroad.com/images/esim-default.png';

/** Country code to Korean name mapping */
const COUNTRY_NAME_MAP: Record<string, string> = {
  JP: '일본',
  KR: '한국',
  US: '미국',
  CN: '중국',
  TW: '대만',
  HK: '홍콩',
  TH: '태국',
  VN: '베트남',
  SG: '싱가포르',
  MY: '말레이시아',
  PH: '필리핀',
  ID: '인도네시아',
  AU: '호주',
  NZ: '뉴질랜드',
  GB: '영국',
  DE: '독일',
  FR: '프랑스',
  IT: '이탈리아',
  ES: '스페인',
  NL: '네덜란드',
  CH: '스위스',
  AT: '오스트리아',
  BE: '벨기에',
  PT: '포르투갈',
  GR: '그리스',
  TR: '터키',
  AE: '아랍에미리트',
  IN: '인도',
  CA: '캐나다',
  MX: '멕시코',
  BR: '브라질',
  EU: '유럽',
  AS: '아시아',
  GLOBAL: '글로벌',
};

// ============================================================================
// Main Mapping Function
// ============================================================================

/**
 * Map an eSIM product to SmartStore product request format.
 *
 * @param product - Internal eSIM product
 * @param options - Optional overrides
 * @returns SmartStore product request
 */
export function mapEsimProductToSmartStore(
  product: EsimProduct,
  options?: {
    categoryId?: string;
    imageUrl?: string;
    includeOptions?: boolean;
  }
): SmartStoreProductRequest {
  const categoryId = options?.categoryId || DEFAULT_CATEGORY_ID;
  const imageUrl = options?.imageUrl || product.imageUrl || DEFAULT_PRODUCT_IMAGE_URL;

  return {
    originProduct: {
      statusType: mapStatusType(product.isActive),
      saleType: 'NEW',
      leafCategoryId: categoryId,
      name: generateProductName(product),
      detailContent: generateDetailHtml(product),
      images: {
        representativeImage: { url: imageUrl },
      },
      salePrice: product.price,
      stockQuantity: 999, // Digital product - effectively unlimited
      deliveryInfo: {
        deliveryType: 'DIRECT',
        deliveryFee: { deliveryFeeType: 'FREE' },
      },
      detailAttribute: {
        productInfoProvidedNotice: {
          productInfoProvidedNoticeType: 'ETC',
          etc: {
            itemName: 'eSIM 데이터 플랜',
            modelName: `${product.countryCode}-${product.dataLimit}`,
            manufacturer: 'NumnaRoad',
            origin: '해당없음 (디지털 상품)',
            qualityAssurance:
              '구매일로부터 사용 시작일까지 유효 / 환불 정책은 이용약관 참조',
            customerService: 'support@numnaroad.com',
          },
        },
        originAreaInfo: {
          originAreaCode: '0000000000', // 해당없음
          domestic: false,
        },
        seoInfo: {
          pageTitle: `${getCountryName(product.countryCode)} eSIM - ${product.dataLimit} ${product.durationDays}일`,
          metaDescription: `${getCountryName(product.countryCode)} 여행용 eSIM. ${product.dataLimit} 데이터, ${product.durationDays}일 유효. 즉시 발송, QR코드로 간편 설치.`,
          sellerTags: generateSellerTags(product),
        },
      },
      sellerCodeInfo: {
        sellerManagementCode: product.id,
        sellerCustomCode1: product.provider,
        sellerCustomCode2: product.providerProductId,
      },
    },
    smartstoreChannelProduct: {
      naverShoppingRegistration: true,
      channelProductDisplayStatusType: product.isActive ? 'ON' : 'SUSPENSION',
    },
  };
}

// ============================================================================
// Name & Description Generation
// ============================================================================

/**
 * Generate a product name for SmartStore.
 * Format: [국가명] eSIM {데이터} {기간}일
 */
export function generateProductName(product: EsimProduct): string {
  const countryName = getCountryName(product.countryCode);
  const dataDisplay = formatDataAmount(product.dataLimit, product.dataUnit);
  const durationDisplay = `${product.durationDays}일`;

  return `[${countryName}] eSIM ${dataDisplay} ${durationDisplay}`;
}

/**
 * Get Korean country name from country code.
 */
export function getCountryName(countryCode: string): string {
  return COUNTRY_NAME_MAP[countryCode.toUpperCase()] || countryCode;
}

/**
 * Format data amount for display.
 */
export function formatDataAmount(dataLimit: string, dataUnit: string): string {
  if (dataLimit.toLowerCase() === 'unlimited' || dataUnit.toLowerCase() === 'unlimited') {
    return '무제한';
  }

  const unit = dataUnit.toUpperCase();
  if (unit === 'GB') {
    return `${dataLimit}GB`;
  } else if (unit === 'MB') {
    return `${dataLimit}MB`;
  }

  return `${dataLimit}${dataUnit}`;
}

/**
 * Generate HTML product description.
 */
export function generateDetailHtml(product: EsimProduct): string {
  const countryName = getCountryName(product.countryCode);
  const dataDisplay = formatDataAmount(product.dataLimit, product.dataUnit);

  return `
<div style="font-family: 'Noto Sans KR', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
    ${countryName} eSIM 데이터 플랜
  </h2>

  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #4CAF50; margin-top: 0;">상품 정보</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 12px 0; font-weight: bold; width: 120px;">국가/지역</td>
        <td style="padding: 12px 0;">${countryName}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 12px 0; font-weight: bold;">데이터</td>
        <td style="padding: 12px 0;">${dataDisplay}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 12px 0; font-weight: bold;">유효기간</td>
        <td style="padding: 12px 0;">${product.durationDays}일</td>
      </tr>
      <tr>
        <td style="padding: 12px 0; font-weight: bold;">발송방법</td>
        <td style="padding: 12px 0;">이메일 즉시 발송 (QR코드)</td>
      </tr>
    </table>
  </div>

  <div style="margin: 20px 0;">
    <h3 style="color: #4CAF50;">사용 방법</h3>
    <ol style="line-height: 1.8;">
      <li>결제 완료 후 이메일로 QR코드를 받습니다.</li>
      <li>스마트폰 설정에서 eSIM을 추가합니다.</li>
      <li>QR코드를 스캔하여 eSIM을 설치합니다.</li>
      <li>현지 도착 후 데이터 로밍을 켜고 사용합니다.</li>
    </ol>
  </div>

  <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #ff9800; margin-top: 0;">주의사항</h3>
    <ul style="line-height: 1.8; margin-bottom: 0;">
      <li>eSIM 지원 기기에서만 사용 가능합니다.</li>
      <li>통신사 잠금이 해제된 기기여야 합니다.</li>
      <li>QR코드는 1회만 스캔 가능합니다.</li>
      <li>유효기간은 최초 활성화 시점부터 시작됩니다.</li>
      <li>설치 후 삭제 시 복구가 불가능합니다.</li>
    </ul>
  </div>

  ${product.description ? `<div style="margin: 20px 0;"><p style="line-height: 1.8;">${product.description}</p></div>` : ''}

  <div style="text-align: center; margin-top: 30px; padding: 20px; background: #e8f5e9; border-radius: 8px;">
    <p style="margin: 0; color: #2e7d32;">
      <strong>NumnaRoad</strong> - 전 세계 여행을 위한 eSIM 전문 서비스
    </p>
    <p style="margin: 10px 0 0; font-size: 14px; color: #666;">
      문의: support@numnaroad.com
    </p>
  </div>
</div>
`.trim();
}

/**
 * Generate SEO seller tags for the product.
 */
export function generateSellerTags(
  product: EsimProduct
): Array<{ text: string }> {
  const countryName = getCountryName(product.countryCode);
  const tags: Array<{ text: string }> = [
    { text: 'eSIM' },
    { text: '이심' },
    { text: `${countryName}eSIM` },
    { text: `${countryName}이심` },
    { text: `${countryName}여행` },
    { text: '해외로밍' },
    { text: '데이터로밍' },
    { text: '여행eSIM' },
  ];

  // Add data-specific tags
  if (product.dataLimit.toLowerCase() === 'unlimited') {
    tags.push({ text: '무제한데이터' });
  }

  return tags.slice(0, 10); // SmartStore limit
}

// ============================================================================
// Status Mapping
// ============================================================================

/**
 * Map internal active status to SmartStore status type.
 */
export function mapStatusType(isActive: boolean): ProductStatusType {
  return isActive ? 'SALE' : 'SUSPENSION';
}

/**
 * Map SmartStore status type to internal active status.
 */
export function mapToActiveStatus(statusType: ProductStatusType): boolean {
  return statusType === 'SALE';
}

// ============================================================================
// Change Detection
// ============================================================================

/**
 * Generate a hash of product data for change detection.
 * Only includes fields that affect the SmartStore product.
 */
export function generateProductHash(product: EsimProduct): string {
  const relevantData = {
    name: product.name,
    country: product.country,
    countryCode: product.countryCode,
    dataLimit: product.dataLimit,
    dataUnit: product.dataUnit,
    durationDays: product.durationDays,
    price: product.price,
    isActive: product.isActive,
    description: product.description,
    imageUrl: product.imageUrl,
  };

  return createHash('sha256')
    .update(JSON.stringify(relevantData))
    .digest('hex')
    .substring(0, 16);
}

/**
 * Check if a product has changed based on hash comparison.
 */
export function hasProductChanged(
  product: EsimProduct,
  previousHash?: string
): boolean {
  if (!previousHash) return true;
  return generateProductHash(product) !== previousHash;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate an eSIM product for SmartStore registration.
 * Returns validation errors if any.
 */
export function validateProductForSmartStore(
  product: EsimProduct
): string[] {
  const errors: string[] = [];

  // Required fields
  if (!product.name || product.name.trim().length === 0) {
    errors.push('상품명이 필요합니다.');
  }

  if (!product.countryCode || product.countryCode.trim().length === 0) {
    errors.push('국가 코드가 필요합니다.');
  }

  if (!product.dataLimit || product.dataLimit.trim().length === 0) {
    errors.push('데이터 용량이 필요합니다.');
  }

  if (!product.durationDays || product.durationDays <= 0) {
    errors.push('유효 기간(일)이 필요합니다.');
  }

  if (!product.price || product.price <= 0) {
    errors.push('가격이 필요합니다.');
  }

  // Name length check
  const generatedName = generateProductName(product);
  if (generatedName.length > 100) {
    errors.push('생성된 상품명이 100자를 초과합니다.');
  }

  return errors;
}

// ============================================================================
// Export Types
// ============================================================================

export type { EsimProduct } from './product-types';
