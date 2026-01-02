import { NextRequest, NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';

/**
 * GET /api/orders/[id]
 * 주문 상세 조회
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // order_id로 조회
    const order = await pb.collection('orders').getFirstListItem(
      `order_id="${id}"`,
      {
        expand: 'product',
      }
    );

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Order detail API error:', error);

    // 404 처리
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch order',
      },
      { status: 500 }
    );
  }
}
