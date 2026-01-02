import { NextRequest, NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';
import { logger } from '@/lib/logger';

/**
 * GET /api/bundles/[slug]
 * Bundle detail endpoint with products expansion
 *
 * Returns bundle with:
 * - Full bundle data
 * - Expanded products array
 * - Calculated savings percentage
 * - Availability status
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Fetch bundle by slug with products expansion
    const bundle = await pb.collection('product_bundles').getFirstListItem(
      `slug="${slug}" && is_active=true`,
      { expand: 'products' }
    );

    // Check validity period
    const now = new Date();
    if (bundle.valid_from && new Date(bundle.valid_from) > now) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bundle is not yet available',
        },
        { status: 404 }
      );
    }

    if (bundle.valid_until && new Date(bundle.valid_until) < now) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bundle is no longer available',
        },
        { status: 404 }
      );
    }

    // Check purchase limits
    const isAvailable = !bundle.max_purchases || bundle.current_purchases < bundle.max_purchases;

    // Calculate savings percentage
    const savingsPercent = bundle.individual_price_sum > 0
      ? Math.round(((bundle.individual_price_sum - bundle.bundle_price) / bundle.individual_price_sum) * 100)
      : 0;

    // Transform response
    const responseData = {
      ...bundle,
      savingsPercent,
      isAvailable,
      products: bundle.expand?.products || [],
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    logger.error('bundle_detail_fetch_failed', error);

    // 404 처리
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bundle not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bundle',
      },
      { status: 500 }
    );
  }
}
