import { NextRequest, NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';

/**
 * POST /api/orders
 *
 * @deprecated This endpoint is disabled for security reasons.
 * Use /api/checkout/create-session for secure Stripe Checkout flow.
 *
 * Security Issue: This endpoint allowed order creation without payment verification,
 * enabling potential "Free Lunch" attacks where eSIMs could be provisioned without payment.
 */
export async function POST() {
  console.warn(JSON.stringify({
    level: 'warn',
    event: 'deprecated_endpoint_called',
    endpoint: '/api/orders',
    message: 'Attempted to use deprecated orders endpoint',
    timestamp: new Date().toISOString(),
  }));

  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint is deprecated. Use /api/checkout/create-session for secure payment flow.',
      documentation: 'https://github.com/numna-road/numnaroad/issues/94',
    },
    { status: 410 } // Gone - indicates resource no longer available
  );
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
