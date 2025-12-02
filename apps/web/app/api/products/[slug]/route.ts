import { NextRequest, NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';

/**
 * GET /api/products/[slug]
 * 상품 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // slug로 상품 조회
    const product = await pb.collection('esim_products').getFirstListItem(
      `slug="${slug}" && is_active=true`
    );

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Product detail API error:', error);

    // 404 처리
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch product',
      },
      { status: 500 }
    );
  }
}
