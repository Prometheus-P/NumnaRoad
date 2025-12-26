import { NextRequest, NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';
import { z } from 'zod';

/**
 * POST /api/orders
 * 주문 생성
 */

const orderSchema = z.object({
  productId: z.string(),
  customerEmail: z.string().email(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  couponCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    const validation = orderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { productId, customerEmail, customerName, customerPhone, couponCode } =
      validation.data;

    // 상품 조회
    const product = await pb.collection('esim_products').getOne(productId);

    if (!product.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product is not available',
        },
        { status: 400 }
      );
    }

    // 재고 확인
    if (product.stock <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product is out of stock',
        },
        { status: 400 }
      );
    }

    // 쿠폰 검증 (선택사항)
    let finalAmount = product.retail_price;
    if (couponCode) {
      // TODO: 쿠폰 검증 로직
    }

    // 주문 생성
    const orderId = crypto.randomUUID();
    const order = await pb.collection('orders').create({
      order_id: orderId,
      product: productId,
      status: 'pending',
      payment_status: 'pending',
      amount: finalAmount,
      currency: 'KRW',
      customer_email: customerEmail,
      customer_name: customerName,
      customer_phone: customerPhone,
      retry_count: 0,
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.order_id,
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    });
  } catch (error) {
    console.error('Create order API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create order',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders
 * 내 주문 목록 조회 (인증 필요)
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return unauthorizedResponse(authResult.error);
    }

    const userId = authResult.user.id;

    // 주문 목록 조회
    const orders = await pb.collection('orders').getList(1, 20, {
      filter: `user="${userId}"`,
      sort: '-created',
      expand: 'product',
    });

    return NextResponse.json({
      success: true,
      data: orders.items,
      pagination: {
        page: orders.page,
        perPage: orders.perPage,
        totalItems: orders.totalItems,
        totalPages: orders.totalPages,
      },
    });
  } catch (error) {
    console.error('Get orders API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch orders',
      },
      { status: 500 }
    );
  }
}
