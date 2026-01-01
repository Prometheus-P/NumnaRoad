import { NextRequest, NextResponse } from 'next/server';
import { Collections } from '@/lib/pocketbase';
import { withAdminAuth, escapeFilterValue } from '@/lib/admin-auth';

// Allowed sort fields (whitelist)
const ALLOWED_SORT_FIELDS = ['created', 'name', 'country', 'retail_price', 'sort_order'];

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (pb) => {
    try {
      const { searchParams } = new URL(request.url);

      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Cap at 100
      const search = searchParams.get('search');
      const country = searchParams.get('country');
      const provider = searchParams.get('provider');
      const sortParam = searchParams.get('sort') || '-created';

      // Validate sort parameter
      const sortField = sortParam.replace(/^-/, '');
      const sort = ALLOWED_SORT_FIELDS.includes(sortField)
        ? sortParam
        : '-created';

      // Build filter with proper escaping
      const filters: string[] = [];

      if (search) {
        const escaped = escapeFilterValue(search);
        filters.push(`(name ~ "${escaped}" || country ~ "${escaped}")`);
      }

      if (country) {
        const escaped = escapeFilterValue(country);
        filters.push(`country = "${escaped}"`);
      }

      if (provider) {
        // Provider ID should be alphanumeric only
        if (/^[a-zA-Z0-9]+$/.test(provider)) {
          filters.push(`provider = "${provider}"`);
        }
      }

      const filter = filters.length > 0 ? filters.join(' && ') : '';

      const products = await pb.collection(Collections.ESIM_PRODUCTS).getList(page, limit, {
        filter,
        sort,
      });

      const items = products.items.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        country: product.country,
        dataLimit: product.data_limit,
        durationDays: product.duration,
        providerId: product.provider,
        providerSku: product.provider_product_id,
        costPrice: product.wholesale_price || 0,
        price: product.retail_price,
        isActive: product.is_active !== false,
        isFeatured: product.is_featured === true,
        stockCount: product.stock || 999,
        sortOrder: product.sort_order || 0,
        created: product.created,
        updated: product.updated,
      }));

      return NextResponse.json({
        items,
        page: products.page,
        perPage: products.perPage,
        totalItems: products.totalItems,
        totalPages: products.totalPages,
      });
    } catch (error) {
      console.error('Failed to fetch products:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (pb) => {
    try {
      const body = await request.json();

      const product = await pb.collection(Collections.ESIM_PRODUCTS).create(body);

      return NextResponse.json({
        success: true,
        product,
      });
    } catch (error) {
      console.error('Failed to create product:', error);
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      );
    }
  });
}
