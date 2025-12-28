import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';

export async function GET(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();

    // Try to get SmartStore config
    let config;
    try {
      const configs = await pb.collection(Collections.SMARTSTORE_CONFIG).getList(1, 1);
      config = configs.items[0];
    } catch {
      // Config collection might not exist
    }

    // Count product mappings
    let totalMappings = 0;
    let activeMappings = 0;
    try {
      const mappings = await pb.collection(Collections.PRODUCT_MAPPINGS).getList(1, 1, {
        filter: 'sales_channel = "smartstore"',
      });
      totalMappings = mappings.totalItems;

      const activeMappingsResult = await pb.collection(Collections.PRODUCT_MAPPINGS).getList(1, 1, {
        filter: 'sales_channel = "smartstore" && is_active = true',
      });
      activeMappings = activeMappingsResult.totalItems;
    } catch {
      // Mappings collection might not exist
    }

    return NextResponse.json({
      isActive: config?.is_active ?? true,
      sellerId: process.env.SMARTSTORE_SELLER_ID || 'ncp_1owkx8_01',
      lastSyncAt: config?.last_sync_at,
      syncInterval: 5, // minutes
      totalMappings,
      activeMappings,
    });
  } catch (error) {
    console.error('Failed to fetch SmartStore status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
