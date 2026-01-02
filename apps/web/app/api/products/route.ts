import { NextRequest, NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';
import { logger } from '@/lib/logger';

/**
 * GET /api/products
 * 상품 목록 조회
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('perPage') || '20');
  const country = searchParams.get('country');
  const search = searchParams.get('search');

  try {

    // 필터 구성
    const filters: string[] = ['is_active=true'];

    if (country) {
      filters.push(`country="${country}"`);
    }

    if (search) {
      filters.push(`(name~"${search}" || country_name~"${search}")`);
    }

    const filter = filters.join(' && ');

    // PocketBase 조회
    const result = await pb.collection('esim_products').getList(page, perPage, {
      filter,
      sort: '-is_featured,sort_order,name',
    });

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        perPage: result.perPage,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    logger.error('products_api_error', error, { page, perPage, country, search });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
      },
      { status: 500 }
    );
  }
}
