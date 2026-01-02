/**
 * SmartStore Products API
 *
 * GET  - List all products with sync status
 * POST - Register a product to SmartStore
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';
import { createProductSyncService } from '@services/sales-channels/smartstore/product-sync';
import type { ProductSyncRecord, EsimProduct } from '@services/sales-channels/smartstore/product-types';
import { logger } from '@/lib/logger';

interface ProductWithSyncStatus {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  dataLimit: string;
  durationDays: number;
  price: number;
  isActive: boolean;
  provider: string;
  syncStatus: string;
  smartstoreProductNo: string | null;
  lastSyncAt: string | null;
  autoSync: boolean;
  lastError: string | null;
}

/**
 * GET /api/admin/smartstore/products
 *
 * List all eSIM products with their SmartStore sync status.
 */
export async function GET(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('perPage') || '20', 10);
    const syncStatus = searchParams.get('syncStatus');
    const search = searchParams.get('search');

    // Build filter for esim_products
    let productFilter = '';
    if (search) {
      productFilter = `name ~ "${search}" || country ~ "${search}"`;
    }

    // Get all products
    const products = await pb.collection(Collections.ESIM_PRODUCTS).getList<EsimProduct>(
      page,
      perPage,
      {
        filter: productFilter || undefined,
        sort: '-created',
      }
    );

    // Get sync records for these products
    const productIds = products.items.map((p) => p.id);
    const syncRecords = await pb.collection(Collections.SMARTSTORE_PRODUCTS).getFullList<ProductSyncRecord>({
      filter: productIds.map((id) => `internalProductId = "${id}"`).join(' || ') || 'id = ""',
    });

    // Create a map for quick lookup
    const syncMap = new Map<string, ProductSyncRecord>();
    for (const record of syncRecords) {
      syncMap.set(record.internalProductId, record);
    }

    // Combine data
    let result: ProductWithSyncStatus[] = products.items.map((product) => {
      const syncRecord = syncMap.get(product.id);
      return {
        id: product.id,
        name: product.name,
        country: product.country,
        countryCode: product.countryCode,
        dataLimit: product.dataLimit,
        durationDays: product.durationDays,
        price: product.price,
        isActive: product.isActive,
        provider: product.provider,
        syncStatus: syncRecord?.syncStatus || 'not_synced',
        smartstoreProductNo: syncRecord?.smartstoreProductNo || null,
        lastSyncAt: syncRecord?.lastSyncAt || null,
        autoSync: syncRecord?.autoSync ?? false,
        lastError: syncRecord?.lastError || null,
      };
    });

    // Filter by sync status if specified
    if (syncStatus) {
      result = result.filter((p) => p.syncStatus === syncStatus);
    }

    return NextResponse.json({
      items: result,
      page: products.page,
      perPage: products.perPage,
      totalItems: products.totalItems,
      totalPages: products.totalPages,
    });
  } catch (error) {
    logger.error('smartstore_products_fetch_failed', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/smartstore/products
 *
 * Register a product to SmartStore.
 */
export async function POST(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();
    const body = await request.json();

    const { productId, categoryId, autoSync = true } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const syncService = createProductSyncService(pb);
    const result = await syncService.syncProduct(productId, { categoryId });

    // Set auto-sync preference
    if (result.success) {
      await syncService.setAutoSync(productId, autoSync);
    }

    return NextResponse.json({
      success: result.success,
      productId: result.productId,
      smartstoreProductNo: result.smartstoreProductNo,
      action: result.action,
      errorMessage: result.errorMessage,
    });
  } catch (error) {
    logger.error('smartstore_product_register_failed', error);
    return NextResponse.json(
      { error: 'Failed to register product' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/smartstore/products
 *
 * Update sync settings for a product.
 */
export async function PATCH(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();
    const body = await request.json();

    const { productId, autoSync } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const syncService = createProductSyncService(pb);

    if (autoSync !== undefined) {
      await syncService.setAutoSync(productId, autoSync);
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    logger.error('smartstore_product_settings_update_failed', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/smartstore/products
 *
 * Remove a product from SmartStore.
 */
export async function DELETE(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const syncService = createProductSyncService(pb);
    const result = await syncService.unsyncProduct(productId);

    return NextResponse.json({
      success: result.success,
      action: result.action,
      errorMessage: result.errorMessage,
    });
  } catch (error) {
    logger.error('smartstore_product_remove_failed', error);
    return NextResponse.json(
      { error: 'Failed to remove product' },
      { status: 500 }
    );
  }
}
