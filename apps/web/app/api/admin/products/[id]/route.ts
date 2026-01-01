import { NextRequest, NextResponse } from 'next/server';
import { Collections } from '@/lib/pocketbase';
import { withAdminAuth } from '@/lib/admin-auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Validate ID format
  if (!/^[a-zA-Z0-9]{15}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid product ID format' }, { status: 400 });
  }

  return withAdminAuth(request, async (pb) => {
    try {
      const product = await pb.collection(Collections.ESIM_PRODUCTS).getOne(id);

      return NextResponse.json({
        id: product.id,
        name: product.name,
        slug: product.slug,
        country: product.country,
        dataLimit: product.dataLimit,
        durationDays: product.durationDays,
        speed: product.speed,
        providerId: product.providerId,
        providerSku: product.providerSku,
        costPrice: product.costPrice || 0,
        price: product.price,
        isActive: product.isActive !== false,
        isFeatured: product.isFeatured === true,
        stockCount: product.stockCount || 999,
        sortOrder: product.sortOrder || 0,
        description: product.description,
        features: product.features || [],
        created: product.created,
        updated: product.updated,
      });
    } catch (error) {
      console.error('Failed to fetch product:', error);
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Validate ID format
  if (!/^[a-zA-Z0-9]{15}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid product ID format' }, { status: 400 });
  }

  return withAdminAuth(request, async (pb) => {
    try {
      const body = await request.json();

      const product = await pb.collection(Collections.ESIM_PRODUCTS).update(id, body);

      return NextResponse.json({
        success: true,
        product,
      });
    } catch (error) {
      console.error('Failed to update product:', error);
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Validate ID format
  if (!/^[a-zA-Z0-9]{15}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid product ID format' }, { status: 400 });
  }

  return withAdminAuth(request, async (pb) => {
    try {
      await pb.collection(Collections.ESIM_PRODUCTS).delete(id);

      return NextResponse.json({
        success: true,
      });
    } catch (error) {
      console.error('Failed to delete product:', error);
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      );
    }
  });
}
