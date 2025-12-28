import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';

export async function GET(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');
    const country = searchParams.get('country');
    const provider = searchParams.get('provider');
    const sort = searchParams.get('sort') || '-created';

    // Build filter
    const filters: string[] = [];

    if (search) {
      filters.push(`(name ~ "${search}" || country ~ "${search}")`);
    }

    if (country) {
      filters.push(`country = "${country}"`);
    }

    if (provider) {
      filters.push(`providerId = "${provider}"`);
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
      dataLimit: product.dataLimit,
      durationDays: product.durationDays,
      providerId: product.providerId,
      providerSku: product.providerSku,
      costPrice: product.costPrice || 0,
      price: product.price,
      isActive: product.isActive !== false,
      isFeatured: product.isFeatured === true,
      stockCount: product.stockCount || 999,
      sortOrder: product.sortOrder || 0,
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
}

export async function POST(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();
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
}
