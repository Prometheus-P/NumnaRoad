/**
 * SmartStore Order Normalizer Tests
 *
 * Tests for order normalization and validation functions.
 */

import { vi, expect, test, describe, beforeEach } from 'vitest';
import {
  normalizeNaverOrder,
  normalizeNaverOrders,
  isPaymentComplete,
  isCanceled,
  isEligibleForFulfillment,
  mapNaverStatusToInternal,
  validateInternalOrderForFulfillment,
  createTestProductMapper,
} from '../../services/sales-channels/smartstore/normalizer';
import type { NaverProductOrder, NaverOrderStatus } from '../../services/sales-channels/smartstore/types';

describe('SmartStore Normalizer', () => {
  // Sample Naver order for testing
  const createMockNaverOrder = (
    overrides: Partial<NaverProductOrder> = {}
  ): NaverProductOrder => ({
    productOrderId: 'po-12345',
    orderId: 'ord-67890',
    orderDate: '2024-01-15T10:00:00Z',
    paymentDate: '2024-01-15T10:05:00Z',
    orderStatusType: 'PAYED',
    productOrderStatus: 'PAYED',
    productId: 'naver-prod-001',
    productName: 'Japan Travel eSIM 1GB/7Days',
    productOption: '7 Days',
    quantity: 1,
    unitPrice: 15000,
    totalProductAmount: 15000,
    totalPaymentAmount: 15000,
    paymentMeans: 'CARD',
    paymentCommission: 450,
    orderer: {
      name: '홍길동',
      email: 'hong@example.com',
      tel: '010-1234-5678',
      safeNumber: '050-1234-5678',
    },
    deliveryMethod: 'DIRECT_DELIVERY',
    ...overrides,
  });

  // Sample product mapper
  const productMappings = {
    'naver-prod-001': {
      internalProductId: 'internal-prod-001',
      providerSku: 'japan-1gb-7d',
      externalProductName: 'Japan Travel eSIM',
    },
    'naver-prod-002': {
      internalProductId: 'internal-prod-002',
      providerSku: 'korea-5gb-30d',
      externalProductName: 'Korea eSIM',
    },
  };

  const mockProductMapper = createTestProductMapper(productMappings);

  // ============================================================================
  // normalizeNaverOrder Tests
  // ============================================================================

  describe('normalizeNaverOrder', () => {
    test('should normalize a valid Naver order', async () => {
      const naverOrder = createMockNaverOrder();
      const result = await normalizeNaverOrder(naverOrder, mockProductMapper);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        salesChannel: 'smartstore',
        externalOrderId: 'po-12345',
        customerEmail: 'hong@example.com',
        customerName: '홍길동',
        customerPhone: '050-1234-5678', // Uses safeNumber first
        productId: 'internal-prod-001',
        providerSku: 'japan-1gb-7d',
        quantity: 1,
        amount: 15000,
        currency: 'KRW',
        paidAt: expect.any(Date),
        metadata: {
          naverOrderId: 'ord-67890',
          naverProductOrderId: 'po-12345',
          naverProductName: 'Japan Travel eSIM 1GB/7Days',
          naverProductOption: '7 Days',
          naverOrderStatus: 'PAYED',
        },
      });
    });

    test('should use tel when safeNumber is not available', async () => {
      const naverOrder = createMockNaverOrder({
        orderer: {
          name: 'Test User',
          email: 'test@example.com',
          tel: '010-1111-2222',
          // No safeNumber
        },
      });

      const result = await normalizeNaverOrder(naverOrder, mockProductMapper);

      expect(result.success).toBe(true);
      expect(result.data?.customerPhone).toBe('010-1111-2222');
    });

    test('should return error for missing productOrderId', async () => {
      const naverOrder = createMockNaverOrder({ productOrderId: '' });
      const result = await normalizeNaverOrder(naverOrder, mockProductMapper);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.errorMessage).toBe('Missing productOrderId');
    });

    test('should return error for missing orderer email', async () => {
      const naverOrder = createMockNaverOrder({
        orderer: {
          name: 'Test',
          email: '',
          tel: '010-1234-5678',
        },
      });

      const result = await normalizeNaverOrder(naverOrder, mockProductMapper);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.errorMessage).toBe('Missing orderer email');
    });

    test('should return error for unmapped product', async () => {
      const naverOrder = createMockNaverOrder({ productId: 'unknown-product' });
      const result = await normalizeNaverOrder(naverOrder, mockProductMapper);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('not_found');
      expect(result.errorMessage).toContain('Product mapping not found');
    });

    test('should handle quantity greater than 1', async () => {
      const naverOrder = createMockNaverOrder({
        quantity: 3,
        totalPaymentAmount: 45000,
      });

      const result = await normalizeNaverOrder(naverOrder, mockProductMapper);

      expect(result.success).toBe(true);
      expect(result.data?.quantity).toBe(3);
      expect(result.data?.amount).toBe(45000);
    });

    test('should default quantity to 1 when missing', async () => {
      const naverOrder = createMockNaverOrder();
      // @ts-expect-error - Testing edge case
      delete naverOrder.quantity;

      const result = await normalizeNaverOrder(naverOrder, mockProductMapper);

      expect(result.success).toBe(true);
      expect(result.data?.quantity).toBe(1);
    });
  });

  // ============================================================================
  // normalizeNaverOrders (batch) Tests
  // ============================================================================

  describe('normalizeNaverOrders', () => {
    test('should normalize multiple orders', async () => {
      const orders = [
        createMockNaverOrder({ productOrderId: 'po-001' }),
        createMockNaverOrder({
          productOrderId: 'po-002',
          productId: 'naver-prod-002',
        }),
      ];

      const result = await normalizeNaverOrders(orders, mockProductMapper);

      expect(result.orders).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    test('should collect errors for failed normalizations', async () => {
      const orders = [
        createMockNaverOrder({ productOrderId: 'po-001' }),
        createMockNaverOrder({
          productOrderId: 'po-002',
          productId: 'unknown-product',
        }),
        createMockNaverOrder({
          productOrderId: 'po-003',
          orderer: { name: 'No Email', email: '', tel: '010' },
        }),
      ];

      const result = await normalizeNaverOrders(orders, mockProductMapper);

      expect(result.orders).toHaveLength(1);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].productOrderId).toBe('po-002');
      expect(result.errors[1].productOrderId).toBe('po-003');
    });
  });

  // ============================================================================
  // isPaymentComplete Tests
  // ============================================================================

  describe('isPaymentComplete', () => {
    const paymentCompleteStatuses: NaverOrderStatus[] = [
      'PAYED',
      'DELIVERING',
      'DELIVERED',
      'PURCHASE_DECIDED',
    ];

    const notPaymentCompleteStatuses: NaverOrderStatus[] = [
      'PAYMENT_WAITING',
      'CANCELED',
      'CANCELED_BY_NOPAYMENT',
      'RETURNED',
      'EXCHANGED',
    ];

    test.each(paymentCompleteStatuses)(
      'should return true for %s status',
      (status) => {
        expect(isPaymentComplete(status)).toBe(true);
      }
    );

    test.each(notPaymentCompleteStatuses)(
      'should return false for %s status',
      (status) => {
        expect(isPaymentComplete(status)).toBe(false);
      }
    );
  });

  // ============================================================================
  // isCanceled Tests
  // ============================================================================

  describe('isCanceled', () => {
    const canceledStatuses: NaverOrderStatus[] = [
      'CANCELED',
      'CANCELED_BY_NOPAYMENT',
      'RETURNED',
      'EXCHANGED',
    ];

    const notCanceledStatuses: NaverOrderStatus[] = [
      'PAYMENT_WAITING',
      'PAYED',
      'DELIVERING',
      'DELIVERED',
      'PURCHASE_DECIDED',
    ];

    test.each(canceledStatuses)('should return true for %s status', (status) => {
      expect(isCanceled(status)).toBe(true);
    });

    test.each(notCanceledStatuses)(
      'should return false for %s status',
      (status) => {
        expect(isCanceled(status)).toBe(false);
      }
    );
  });

  // ============================================================================
  // isEligibleForFulfillment Tests
  // ============================================================================

  describe('isEligibleForFulfillment', () => {
    test('should return true for PAYED order without claims', () => {
      const order = createMockNaverOrder({ orderStatusType: 'PAYED' });
      expect(isEligibleForFulfillment(order)).toBe(true);
    });

    test('should return true for DELIVERING order', () => {
      const order = createMockNaverOrder({ orderStatusType: 'DELIVERING' });
      expect(isEligibleForFulfillment(order)).toBe(true);
    });

    test('should return false for PAYMENT_WAITING order', () => {
      const order = createMockNaverOrder({ orderStatusType: 'PAYMENT_WAITING' });
      expect(isEligibleForFulfillment(order)).toBe(false);
    });

    test('should return false for CANCELED order', () => {
      const order = createMockNaverOrder({ orderStatusType: 'CANCELED' });
      expect(isEligibleForFulfillment(order)).toBe(false);
    });

    test('should return false when order has a claim status', () => {
      const order = createMockNaverOrder({
        orderStatusType: 'PAYED',
        claimStatusType: 'CANCEL_REQUEST',
      });
      expect(isEligibleForFulfillment(order)).toBe(false);
    });

    test('should return false for RETURNED order', () => {
      const order = createMockNaverOrder({ orderStatusType: 'RETURNED' });
      expect(isEligibleForFulfillment(order)).toBe(false);
    });
  });

  // ============================================================================
  // mapNaverStatusToInternal Tests
  // ============================================================================

  describe('mapNaverStatusToInternal', () => {
    const statusMappings: Array<{
      naver: NaverOrderStatus;
      internal: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    }> = [
      { naver: 'PAYMENT_WAITING', internal: 'pending' },
      { naver: 'PAYED', internal: 'processing' },
      { naver: 'DELIVERING', internal: 'completed' },
      { naver: 'DELIVERED', internal: 'completed' },
      { naver: 'PURCHASE_DECIDED', internal: 'completed' },
      { naver: 'CANCELED', internal: 'failed' },
      { naver: 'CANCELED_BY_NOPAYMENT', internal: 'failed' },
      { naver: 'RETURNED', internal: 'refunded' },
      { naver: 'EXCHANGED', internal: 'refunded' },
    ];

    test.each(statusMappings)(
      'should map $naver to $internal',
      ({ naver, internal }) => {
        expect(mapNaverStatusToInternal(naver)).toBe(internal);
      }
    );

    test('should default to pending for unknown status', () => {
      // @ts-expect-error - Testing edge case
      expect(mapNaverStatusToInternal('UNKNOWN_STATUS')).toBe('pending');
    });
  });

  // ============================================================================
  // validateInternalOrderForFulfillment Tests
  // ============================================================================

  describe('validateInternalOrderForFulfillment', () => {
    test('should validate a complete order', async () => {
      const naverOrder = createMockNaverOrder();
      const normalizeResult = await normalizeNaverOrder(naverOrder, mockProductMapper);

      expect(normalizeResult.success).toBe(true);
      const validation = validateInternalOrderForFulfillment(normalizeResult.data!);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject order missing customer email', () => {
      const order = {
        salesChannel: 'smartstore' as const,
        externalOrderId: 'po-123',
        customerEmail: '',
        customerName: 'Test',
        productId: 'prod-001',
        providerSku: 'sku-001',
        quantity: 1,
        amount: 10000,
        currency: 'KRW',
        paidAt: new Date(),
      };

      const validation = validateInternalOrderForFulfillment(order);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing customer email');
    });

    test('should reject order missing product ID', () => {
      const order = {
        salesChannel: 'smartstore' as const,
        externalOrderId: 'po-123',
        customerEmail: 'test@example.com',
        customerName: 'Test',
        productId: '',
        providerSku: 'sku-001',
        quantity: 1,
        amount: 10000,
        currency: 'KRW',
        paidAt: new Date(),
      };

      const validation = validateInternalOrderForFulfillment(order);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing product ID');
    });

    test('should reject order missing provider SKU', () => {
      const order = {
        salesChannel: 'smartstore' as const,
        externalOrderId: 'po-123',
        customerEmail: 'test@example.com',
        customerName: 'Test',
        productId: 'prod-001',
        providerSku: '',
        quantity: 1,
        amount: 10000,
        currency: 'KRW',
        paidAt: new Date(),
      };

      const validation = validateInternalOrderForFulfillment(order);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing provider SKU');
    });

    test('should reject order with invalid amount', () => {
      const order = {
        salesChannel: 'smartstore' as const,
        externalOrderId: 'po-123',
        customerEmail: 'test@example.com',
        customerName: 'Test',
        productId: 'prod-001',
        providerSku: 'sku-001',
        quantity: 1,
        amount: 0,
        currency: 'KRW',
        paidAt: new Date(),
      };

      const validation = validateInternalOrderForFulfillment(order);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid amount');
    });

    test('should reject order with invalid quantity', () => {
      const order = {
        salesChannel: 'smartstore' as const,
        externalOrderId: 'po-123',
        customerEmail: 'test@example.com',
        customerName: 'Test',
        productId: 'prod-001',
        providerSku: 'sku-001',
        quantity: 0,
        amount: 10000,
        currency: 'KRW',
        paidAt: new Date(),
      };

      const validation = validateInternalOrderForFulfillment(order);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid quantity');
    });

    test('should collect multiple validation errors', () => {
      const order = {
        salesChannel: 'smartstore' as const,
        externalOrderId: 'po-123',
        customerEmail: '',
        customerName: 'Test',
        productId: '',
        providerSku: '',
        quantity: -1,
        amount: -100,
        currency: 'KRW',
        paidAt: new Date(),
      };

      const validation = validateInternalOrderForFulfillment(order);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ============================================================================
  // createTestProductMapper Tests
  // ============================================================================

  describe('createTestProductMapper', () => {
    test('should return mapping when product exists', async () => {
      const mapper = createTestProductMapper({
        'prod-001': {
          internalProductId: 'internal-001',
          providerSku: 'sku-001',
          externalProductName: 'Test Product',
        },
      });

      const result = await mapper('prod-001');

      expect(result).toEqual({
        internalProductId: 'internal-001',
        providerSku: 'sku-001',
        externalProductName: 'Test Product',
      });
    });

    test('should return null for unknown product', async () => {
      const mapper = createTestProductMapper({});
      const result = await mapper('unknown-prod');

      expect(result).toBeNull();
    });
  });
});
