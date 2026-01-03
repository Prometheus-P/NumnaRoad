/**
 * Top Products API
 *
 * GET /api/admin/dashboard/top-products
 * Returns top-selling products for the dashboard.
 *
 * Query Parameters:
 * - period: '7d' | '30d' | '90d' (default: '30d')
 * - limit: number (default: 10)
 */

import { NextRequest, NextResponse } from 'next/server';
import { Collections } from '@/lib/pocketbase';
import { withAdminAuth } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';

type Period = '7d' | '30d' | '90d';

interface TopProduct {
  productId: string;
  productName: string;
  salesCount: number;
  revenue: number;
  averagePrice: number;
}

function getPeriodDays(period: Period): number {
  switch (period) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    default: return 30;
  }
}

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (pb) => {
    try {
      const { searchParams } = new URL(request.url);
      const period = (searchParams.get('period') || '30d') as Period;
      const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

      // Validate parameters
      if (!['7d', '30d', '90d'].includes(period)) {
        return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
      }

      const days = getPeriodDays(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch completed orders with valid status
      const orders = await pb.collection(Collections.ORDERS).getFullList({
        filter: `created >= "${startDate.toISOString()}" && (status = "delivered" || status = "completed" || status = "email_sent")`,
      });

      // Aggregate by product
      const productStats: Record<string, {
        productId: string;
        productName: string;
        salesCount: number;
        revenue: number;
      }> = {};

      for (const order of orders) {
        const productId = order.product_id || 'unknown';
        const productName = order.product_name || 'Unknown Product';
        const price = order.total_price || order.amount || 0;

        if (!productStats[productId]) {
          productStats[productId] = {
            productId,
            productName,
            salesCount: 0,
            revenue: 0,
          };
        }

        productStats[productId].salesCount += order.quantity || 1;
        productStats[productId].revenue += price;
      }

      // Sort and limit
      const topProducts: TopProduct[] = Object.values(productStats)
        .map((p) => ({
          ...p,
          averagePrice: p.salesCount > 0 ? Math.round(p.revenue / p.salesCount) : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);

      return NextResponse.json({
        period,
        products: topProducts,
        summary: {
          totalProducts: Object.keys(productStats).length,
          totalSales: orders.reduce((sum, o) => sum + (o.quantity || 1), 0),
          totalRevenue: orders.reduce((sum, o) => sum + (o.total_price || o.amount || 0), 0),
        },
      });
    } catch (error) {
      logger.error('admin_dashboard_top_products_fetch_failed', error);
      return NextResponse.json(
        { error: 'Failed to fetch top products' },
        { status: 500 }
      );
    }
  });
}
