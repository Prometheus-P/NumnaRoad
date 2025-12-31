/**
 * SmartStore Product Mapper Tests
 *
 * Tests for product data transformation and validation functions.
 */

import { describe, test, expect } from 'vitest';
import {
  mapEsimProductToSmartStore,
  generateProductName,
  getCountryName,
  formatDataAmount,
  generateDetailHtml,
  generateSellerTags,
  mapStatusType,
  mapToActiveStatus,
  generateProductHash,
  hasProductChanged,
  validateProductForSmartStore,
} from '../../services/sales-channels/smartstore/product-mapper';
import type { EsimProduct } from '../../services/sales-channels/smartstore/product-types';

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockEsimProduct = (overrides: Partial<EsimProduct> = {}): EsimProduct => ({
  id: 'prod-001',
  name: 'Japan eSIM 1GB 7Days',
  country: 'Japan',
  countryCode: 'JP',
  dataLimit: '1',
  dataUnit: 'GB',
  durationDays: 7,
  price: 15000,
  originalPrice: 20000,
  providerProductId: 'redteago-jp-1gb-7d',
  provider: 'RedteaGO',
  isActive: true,
  description: 'Best eSIM for Japan travel',
  imageUrl: 'https://example.com/japan-esim.png',
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-15T00:00:00Z',
  ...overrides,
});

// ============================================================================
// Country Name Tests
// ============================================================================

describe('getCountryName', () => {
  test('should return Korean name for known country codes', () => {
    expect(getCountryName('JP')).toBe('일본');
    expect(getCountryName('US')).toBe('미국');
    expect(getCountryName('KR')).toBe('한국');
    expect(getCountryName('TH')).toBe('태국');
    expect(getCountryName('VN')).toBe('베트남');
  });

  test('should be case insensitive', () => {
    expect(getCountryName('jp')).toBe('일본');
    expect(getCountryName('Jp')).toBe('일본');
  });

  test('should return country code for unknown codes', () => {
    expect(getCountryName('XX')).toBe('XX');
    expect(getCountryName('UNKNOWN')).toBe('UNKNOWN');
  });

  test('should handle special region codes', () => {
    expect(getCountryName('EU')).toBe('유럽');
    expect(getCountryName('AS')).toBe('아시아');
    expect(getCountryName('GLOBAL')).toBe('글로벌');
  });
});

// ============================================================================
// Data Amount Formatting Tests
// ============================================================================

describe('formatDataAmount', () => {
  test('should format GB correctly', () => {
    expect(formatDataAmount('1', 'GB')).toBe('1GB');
    expect(formatDataAmount('5', 'GB')).toBe('5GB');
    expect(formatDataAmount('10', 'gb')).toBe('10GB');
  });

  test('should format MB correctly', () => {
    expect(formatDataAmount('500', 'MB')).toBe('500MB');
    expect(formatDataAmount('100', 'mb')).toBe('100MB');
  });

  test('should format unlimited data', () => {
    expect(formatDataAmount('unlimited', 'GB')).toBe('무제한');
    expect(formatDataAmount('Unlimited', 'unlimited')).toBe('무제한');
    expect(formatDataAmount('10', 'unlimited')).toBe('무제한');
  });

  test('should handle other units', () => {
    expect(formatDataAmount('1', 'TB')).toBe('1TB');
  });
});

// ============================================================================
// Product Name Generation Tests
// ============================================================================

describe('generateProductName', () => {
  test('should generate correct product name format', () => {
    const product = createMockEsimProduct();
    const name = generateProductName(product);

    expect(name).toBe('[일본] eSIM 1GB 7일');
  });

  test('should handle unlimited data', () => {
    const product = createMockEsimProduct({
      dataLimit: 'unlimited',
      dataUnit: 'unlimited',
    });
    const name = generateProductName(product);

    expect(name).toBe('[일본] eSIM 무제한 7일');
  });

  test('should handle different countries', () => {
    const product = createMockEsimProduct({
      countryCode: 'US',
      durationDays: 30,
    });
    const name = generateProductName(product);

    expect(name).toBe('[미국] eSIM 1GB 30일');
  });

  test('should handle unknown country codes', () => {
    const product = createMockEsimProduct({
      countryCode: 'ZZ',
    });
    const name = generateProductName(product);

    expect(name).toBe('[ZZ] eSIM 1GB 7일');
  });
});

// ============================================================================
// Status Mapping Tests
// ============================================================================

describe('mapStatusType', () => {
  test('should map active to SALE', () => {
    expect(mapStatusType(true)).toBe('SALE');
  });

  test('should map inactive to SUSPENSION', () => {
    expect(mapStatusType(false)).toBe('SUSPENSION');
  });
});

describe('mapToActiveStatus', () => {
  test('should map SALE to true', () => {
    expect(mapToActiveStatus('SALE')).toBe(true);
  });

  test('should map other statuses to false', () => {
    expect(mapToActiveStatus('SUSPENSION')).toBe(false);
    expect(mapToActiveStatus('OUTOFSTOCK')).toBe(false);
    expect(mapToActiveStatus('PROHIBITION')).toBe(false);
    expect(mapToActiveStatus('DELETE')).toBe(false);
  });
});

// ============================================================================
// Detail HTML Generation Tests
// ============================================================================

describe('generateDetailHtml', () => {
  test('should generate valid HTML', () => {
    const product = createMockEsimProduct();
    const html = generateDetailHtml(product);

    expect(html).toContain('일본');
    expect(html).toContain('1GB');
    expect(html).toContain('7일');
    expect(html).toContain('eSIM');
    expect(html).toContain('QR코드');
  });

  test('should include product description if provided', () => {
    const product = createMockEsimProduct({
      description: 'Special offer for Japan travel',
    });
    const html = generateDetailHtml(product);

    expect(html).toContain('Special offer for Japan travel');
  });

  test('should not include description section if empty', () => {
    const product = createMockEsimProduct({
      description: undefined,
    });
    const html = generateDetailHtml(product);

    expect(html).not.toContain('undefined');
  });
});

// ============================================================================
// Seller Tags Generation Tests
// ============================================================================

describe('generateSellerTags', () => {
  test('should generate basic eSIM tags', () => {
    const product = createMockEsimProduct();
    const tags = generateSellerTags(product);

    const tagTexts = tags.map((t) => t.text);

    expect(tagTexts).toContain('eSIM');
    expect(tagTexts).toContain('이심');
    expect(tagTexts).toContain('일본eSIM');
    expect(tagTexts).toContain('일본이심');
    expect(tagTexts).toContain('일본여행');
    expect(tagTexts).toContain('해외로밍');
  });

  test('should add unlimited data tag for unlimited products', () => {
    const product = createMockEsimProduct({
      dataLimit: 'unlimited',
    });
    const tags = generateSellerTags(product);

    const tagTexts = tags.map((t) => t.text);
    expect(tagTexts).toContain('무제한데이터');
  });

  test('should limit to 10 tags', () => {
    const product = createMockEsimProduct();
    const tags = generateSellerTags(product);

    expect(tags.length).toBeLessThanOrEqual(10);
  });
});

// ============================================================================
// Product Hash Tests
// ============================================================================

describe('generateProductHash', () => {
  test('should generate consistent hash for same product', () => {
    const product = createMockEsimProduct();
    const hash1 = generateProductHash(product);
    const hash2 = generateProductHash(product);

    expect(hash1).toBe(hash2);
  });

  test('should generate different hash for different products', () => {
    const product1 = createMockEsimProduct();
    const product2 = createMockEsimProduct({ price: 20000 });

    const hash1 = generateProductHash(product1);
    const hash2 = generateProductHash(product2);

    expect(hash1).not.toBe(hash2);
  });

  test('should detect changes in relevant fields', () => {
    const baseProduct = createMockEsimProduct();
    const baseHash = generateProductHash(baseProduct);

    // Changes that should affect hash
    const changedName = createMockEsimProduct({ name: 'New Name' });
    const changedPrice = createMockEsimProduct({ price: 99999 });
    const changedActive = createMockEsimProduct({ isActive: false });

    expect(generateProductHash(changedName)).not.toBe(baseHash);
    expect(generateProductHash(changedPrice)).not.toBe(baseHash);
    expect(generateProductHash(changedActive)).not.toBe(baseHash);
  });

  test('should return 16-character hash', () => {
    const product = createMockEsimProduct();
    const hash = generateProductHash(product);

    expect(hash.length).toBe(16);
  });
});

describe('hasProductChanged', () => {
  test('should return true if no previous hash', () => {
    const product = createMockEsimProduct();
    expect(hasProductChanged(product, undefined)).toBe(true);
  });

  test('should return false if hash matches', () => {
    const product = createMockEsimProduct();
    const hash = generateProductHash(product);

    expect(hasProductChanged(product, hash)).toBe(false);
  });

  test('should return true if product changed', () => {
    const product = createMockEsimProduct();
    const oldHash = generateProductHash(product);

    const changedProduct = createMockEsimProduct({ price: 99999 });
    expect(hasProductChanged(changedProduct, oldHash)).toBe(true);
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('validateProductForSmartStore', () => {
  test('should return no errors for valid product', () => {
    const product = createMockEsimProduct();
    const errors = validateProductForSmartStore(product);

    expect(errors).toHaveLength(0);
  });

  test('should return error for missing name', () => {
    const product = createMockEsimProduct({ name: '' });
    const errors = validateProductForSmartStore(product);

    expect(errors).toContain('상품명이 필요합니다.');
  });

  test('should return error for missing country code', () => {
    const product = createMockEsimProduct({ countryCode: '' });
    const errors = validateProductForSmartStore(product);

    expect(errors).toContain('국가 코드가 필요합니다.');
  });

  test('should return error for missing data limit', () => {
    const product = createMockEsimProduct({ dataLimit: '' });
    const errors = validateProductForSmartStore(product);

    expect(errors).toContain('데이터 용량이 필요합니다.');
  });

  test('should return error for invalid duration', () => {
    const product = createMockEsimProduct({ durationDays: 0 });
    const errors = validateProductForSmartStore(product);

    expect(errors).toContain('유효 기간(일)이 필요합니다.');
  });

  test('should return error for invalid price', () => {
    const product = createMockEsimProduct({ price: 0 });
    const errors = validateProductForSmartStore(product);

    expect(errors).toContain('가격이 필요합니다.');
  });

  test('should return multiple errors if multiple fields invalid', () => {
    const product = createMockEsimProduct({
      name: '',
      countryCode: '',
      price: 0,
    });
    const errors = validateProductForSmartStore(product);

    expect(errors.length).toBeGreaterThan(1);
  });
});

// ============================================================================
// Full Mapping Tests
// ============================================================================

describe('mapEsimProductToSmartStore', () => {
  test('should map all required fields', () => {
    const product = createMockEsimProduct();
    const mapped = mapEsimProductToSmartStore(product);

    expect(mapped.originProduct).toBeDefined();
    expect(mapped.originProduct.statusType).toBe('SALE');
    expect(mapped.originProduct.saleType).toBe('NEW');
    expect(mapped.originProduct.name).toBe('[일본] eSIM 1GB 7일');
    expect(mapped.originProduct.salePrice).toBe(15000);
    expect(mapped.originProduct.stockQuantity).toBe(999);
  });

  test('should set delivery info for digital product', () => {
    const product = createMockEsimProduct();
    const mapped = mapEsimProductToSmartStore(product);

    expect(mapped.originProduct.deliveryInfo.deliveryType).toBe('DIRECT');
    expect(mapped.originProduct.deliveryInfo.deliveryFee.deliveryFeeType).toBe('FREE');
  });

  test('should include seller code info', () => {
    const product = createMockEsimProduct();
    const mapped = mapEsimProductToSmartStore(product);

    expect(mapped.originProduct.sellerCodeInfo).toBeDefined();
    expect(mapped.originProduct.sellerCodeInfo?.sellerManagementCode).toBe('prod-001');
    expect(mapped.originProduct.sellerCodeInfo?.sellerCustomCode1).toBe('RedteaGO');
    expect(mapped.originProduct.sellerCodeInfo?.sellerCustomCode2).toBe('redteago-jp-1gb-7d');
  });

  test('should include SmartStore channel product settings', () => {
    const product = createMockEsimProduct();
    const mapped = mapEsimProductToSmartStore(product);

    expect(mapped.smartstoreChannelProduct).toBeDefined();
    expect(mapped.smartstoreChannelProduct?.naverShoppingRegistration).toBe(true);
    expect(mapped.smartstoreChannelProduct?.channelProductDisplayStatusType).toBe('ON');
  });

  test('should set SUSPENSION status for inactive product', () => {
    const product = createMockEsimProduct({ isActive: false });
    const mapped = mapEsimProductToSmartStore(product);

    expect(mapped.originProduct.statusType).toBe('SUSPENSION');
    expect(mapped.smartstoreChannelProduct?.channelProductDisplayStatusType).toBe('SUSPENSION');
  });

  test('should use custom category ID if provided', () => {
    const product = createMockEsimProduct();
    const mapped = mapEsimProductToSmartStore(product, { categoryId: 'custom-123' });

    expect(mapped.originProduct.leafCategoryId).toBe('custom-123');
  });

  test('should use custom image URL if provided', () => {
    const product = createMockEsimProduct();
    const mapped = mapEsimProductToSmartStore(product, {
      imageUrl: 'https://custom-image.com/image.png',
    });

    expect(mapped.originProduct.images.representativeImage.url).toBe(
      'https://custom-image.com/image.png'
    );
  });

  test('should use product image URL if available', () => {
    const product = createMockEsimProduct({
      imageUrl: 'https://product-image.com/esim.png',
    });
    const mapped = mapEsimProductToSmartStore(product);

    expect(mapped.originProduct.images.representativeImage.url).toBe(
      'https://product-image.com/esim.png'
    );
  });

  test('should include product info notice', () => {
    const product = createMockEsimProduct();
    const mapped = mapEsimProductToSmartStore(product);

    const notice = mapped.originProduct.detailAttribute?.productInfoProvidedNotice;
    expect(notice).toBeDefined();
    expect(notice?.productInfoProvidedNoticeType).toBe('ETC');
    expect(notice?.etc?.itemName).toBe('eSIM 데이터 플랜');
    expect(notice?.etc?.manufacturer).toBe('NumnaRoad');
  });

  test('should include SEO info', () => {
    const product = createMockEsimProduct();
    const mapped = mapEsimProductToSmartStore(product);

    const seoInfo = mapped.originProduct.detailAttribute?.seoInfo;
    expect(seoInfo).toBeDefined();
    expect(seoInfo?.pageTitle).toContain('일본');
    expect(seoInfo?.metaDescription).toContain('eSIM');
    expect(seoInfo?.sellerTags).toBeDefined();
    expect(seoInfo?.sellerTags?.length).toBeGreaterThan(0);
  });
});
