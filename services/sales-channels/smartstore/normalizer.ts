/**
 * SmartStore Order Normalizer
 *
 * Converts Naver SmartStore orders to the internal order format
 * used by the fulfillment service.
 */

import type {
  NaverProductOrder,
  NaverOrderStatus,
  InternalOrder,
  SmartStoreResult,
} from './types';

/**
 * Product mapping entry from database
 */
interface ProductMapping {
  internalProductId: string;
  providerSku?: string;
  externalProductName: string;
}

/**
 * Product mapper function type
 */
export type ProductMapperFn = (
  naverProductId: string
) => Promise<ProductMapping | null>;

/**
 * Normalize a Naver product order to internal format.
 *
 * @param naverOrder - The order from Naver Commerce API
 * @param productMapper - Function to map Naver product ID to internal product
 * @returns Normalized internal order or error
 */
export async function normalizeNaverOrder(
  naverOrder: NaverProductOrder,
  productMapper: ProductMapperFn
): Promise<SmartStoreResult<InternalOrder>> {
  // Validate required fields
  if (!naverOrder.productOrderId) {
    return {
      success: false,
      errorType: 'validation',
      errorMessage: 'Missing productOrderId',
      isRetryable: false,
    };
  }

  if (!naverOrder.orderer?.email) {
    return {
      success: false,
      errorType: 'validation',
      errorMessage: 'Missing orderer email',
      isRetryable: false,
    };
  }

  // Map the Naver product to internal product
  const productMapping = await productMapper(naverOrder.productId);
  if (!productMapping) {
    return {
      success: false,
      errorType: 'not_found',
      errorMessage: `Product mapping not found for Naver product: ${naverOrder.productId}`,
      isRetryable: false,
    };
  }

  // Build the internal order
  const internalOrder: InternalOrder = {
    salesChannel: 'smartstore',
    externalOrderId: naverOrder.productOrderId,
    customerEmail: naverOrder.orderer.email,
    customerName: naverOrder.orderer.name,
    customerPhone: naverOrder.orderer.safeNumber || naverOrder.orderer.tel,
    productId: productMapping.internalProductId,
    providerSku: productMapping.providerSku,
    quantity: naverOrder.quantity || 1,
    amount: naverOrder.totalPaymentAmount,
    currency: 'KRW',
    paidAt: new Date(naverOrder.paymentDate),
    metadata: {
      naverOrderId: naverOrder.orderId,
      naverProductOrderId: naverOrder.productOrderId,
      naverProductName: naverOrder.productName,
      naverProductOption: naverOrder.productOption,
      naverOrderStatus: naverOrder.orderStatusType,
    },
  };

  return { success: true, data: internalOrder };
}

/**
 * Check if a Naver order status indicates payment is complete.
 */
export function isPaymentComplete(status: NaverOrderStatus): boolean {
  return [
    'PAYED',
    'DELIVERING',
    'DELIVERED',
    'PURCHASE_DECIDED',
  ].includes(status);
}

/**
 * Check if a Naver order status indicates the order is canceled.
 */
export function isCanceled(status: NaverOrderStatus): boolean {
  return [
    'CANCELED',
    'CANCELED_BY_NOPAYMENT',
    'RETURNED',
    'EXCHANGED',
  ].includes(status);
}

/**
 * Check if a Naver order is eligible for eSIM fulfillment.
 * Orders must be paid and not canceled/returned.
 */
export function isEligibleForFulfillment(order: NaverProductOrder): boolean {
  return (
    isPaymentComplete(order.orderStatusType) &&
    !isCanceled(order.orderStatusType) &&
    !order.claimStatusType
  );
}

/**
 * Map Naver order status to internal order status.
 */
export function mapNaverStatusToInternal(
  naverStatus: NaverOrderStatus
): 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' {
  switch (naverStatus) {
    case 'PAYMENT_WAITING':
      return 'pending';
    case 'PAYED':
      return 'processing';
    case 'DELIVERING':
    case 'DELIVERED':
    case 'PURCHASE_DECIDED':
      return 'completed';
    case 'CANCELED':
    case 'CANCELED_BY_NOPAYMENT':
      return 'failed';
    case 'RETURNED':
    case 'EXCHANGED':
      return 'refunded';
    default:
      return 'pending';
  }
}

/**
 * Normalize multiple orders at once.
 * Returns successful normalizations and collects errors.
 */
export async function normalizeNaverOrders(
  naverOrders: NaverProductOrder[],
  productMapper: ProductMapperFn
): Promise<{
  orders: InternalOrder[];
  errors: Array<{ productOrderId: string; error: string }>;
}> {
  const orders: InternalOrder[] = [];
  const errors: Array<{ productOrderId: string; error: string }> = [];

  for (const naverOrder of naverOrders) {
    const result = await normalizeNaverOrder(naverOrder, productMapper);
    if (result.success && result.data) {
      orders.push(result.data);
    } else {
      errors.push({
        productOrderId: naverOrder.productOrderId,
        error: result.errorMessage || 'Unknown error',
      });
    }
  }

  return { orders, errors };
}

/**
 * Create a simple in-memory product mapper for testing.
 */
export function createTestProductMapper(
  mappings: Record<string, ProductMapping>
): ProductMapperFn {
  return async (naverProductId: string) => {
    return mappings[naverProductId] || null;
  };
}

/**
 * Create a PocketBase-backed product mapper.
 */
export function createPocketBaseProductMapper(
  pb: { collection: (name: string) => { getFirstListItem: (filter: string) => Promise<Record<string, unknown>> } }
): ProductMapperFn {
  return async (naverProductId: string): Promise<ProductMapping | null> => {
    try {
      const mapping = await pb
        .collection('product_mappings')
        .getFirstListItem(
          `sales_channel='smartstore' && external_product_id='${naverProductId}'`
        );

      if (!mapping) {
        return null;
      }

      return {
        internalProductId: mapping.internal_product as string,
        providerSku: mapping.provider_sku as string | undefined,
        externalProductName: mapping.external_product_name as string,
      };
    } catch {
      // Record not found
      return null;
    }
  };
}

/**
 * Validate that an internal order has all required fields for fulfillment.
 */
export function validateInternalOrderForFulfillment(
  order: InternalOrder
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!order.customerEmail) {
    errors.push('Missing customer email');
  }
  if (!order.productId) {
    errors.push('Missing product ID');
  }
  if (!order.providerSku) {
    errors.push('Missing provider SKU');
  }
  if (order.amount <= 0) {
    errors.push('Invalid amount');
  }
  if (order.quantity <= 0) {
    errors.push('Invalid quantity');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
