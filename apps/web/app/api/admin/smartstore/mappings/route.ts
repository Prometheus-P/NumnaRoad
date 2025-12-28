import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';

export async function GET(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();

    const mappings = await pb.collection(Collections.PRODUCT_MAPPINGS).getFullList({
      filter: 'sales_channel = "smartstore"',
      expand: 'internal_product',
    });

    const result = mappings.map((mapping) => ({
      id: mapping.id,
      smartstoreProductName: mapping.external_product_name || mapping.external_product_id,
      smartstoreProductId: mapping.external_product_id,
      internalProductId: mapping.internal_product,
      internalProductName: mapping.expand?.internal_product?.name,
      providerSku: mapping.expand?.internal_product?.providerSku,
      isActive: mapping.is_active !== false,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch mappings:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();
    const body = await request.json();

    const mapping = await pb.collection(Collections.PRODUCT_MAPPINGS).create({
      sales_channel: 'smartstore',
      external_product_id: body.smartstoreProductId,
      external_product_name: body.smartstoreProductName,
      internal_product: body.internalProductId,
      is_active: true,
    });

    return NextResponse.json({
      success: true,
      mapping,
    });
  } catch (error) {
    console.error('Failed to create mapping:', error);
    return NextResponse.json(
      { error: 'Failed to create mapping' },
      { status: 500 }
    );
  }
}
