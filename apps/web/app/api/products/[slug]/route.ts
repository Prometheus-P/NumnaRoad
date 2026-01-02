import { NextRequest, NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';
import { logger } from '@/lib/logger';

/**
 * GET /api/products/[slug]
 * 상품 상세 조회
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    // slug로 상품 조회
    const product = await pb.collection('esim_products').getFirstListItem(
      `slug="${slug}" && is_active=true`
    );

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    logger.error('product_detail_api_error', error, { slug });

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
