import { NextRequest, NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';
import { logger } from '@/lib/logger';

/**
 * GET /api/bundles
 * Bundle list endpoint with filtering and pagination
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - perPage: Items per page (default: 20)
 * - bundle_type: Filter by bundle type (multi_country, data_package, travel_kit, custom)
 * - featured: Filter featured bundles only (true/false)
 * - search: Search in name and description
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');
    const bundleType = searchParams.get('bundle_type');
    const featured = searchParams.get('featured');
    const search = searchParams.get('search');

    // Build filter conditions
    const filters: string[] = ['is_active=true'];

    // Check validity period
    const now = new Date().toISOString();
    filters.push(`(valid_from="" || valid_from<="${now}")`);
    filters.push(`(valid_until="" || valid_until>="${now}")`);

    // Check purchase limits
    filters.push(`(max_purchases=0 || max_purchases=null || current_purchases<max_purchases)`);

    if (bundleType) {
      filters.push(`bundle_type="${bundleType}"`);
    }

    if (featured === 'true') {
      filters.push('is_featured=true');
    }

    if (search) {
      filters.push(`(name~"${search}" || description~"${search}")`);
    }

    const filter = filters.join(' && ');

    // Fetch bundles with products expansion
    const result = await pb.collection('product_bundles').getList(page, perPage, {
      filter,
      sort: '-is_featured,sort_order,name',
      expand: 'products',
    });

    // Transform response to include calculated fields
    const bundles = result.items.map((bundle) => ({
      ...bundle,
      // Calculate savings percentage for display
      savingsPercent: bundle.individual_price_sum > 0
        ? Math.round(((bundle.individual_price_sum - bundle.bundle_price) / bundle.individual_price_sum) * 100)
        : 0,
      // Check if bundle is still available for purchase
      isAvailable: !bundle.max_purchases || bundle.current_purchases < bundle.max_purchases,
      // Include expanded products if available
      products: bundle.expand?.products || [],
    }));

    return NextResponse.json({
      success: true,
      data: bundles,
      pagination: {
        page: result.page,
        perPage: result.perPage,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    logger.error('bundles_list_fetch_failed', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bundles',
      },
      { status: 500 }
    );
  }
}
