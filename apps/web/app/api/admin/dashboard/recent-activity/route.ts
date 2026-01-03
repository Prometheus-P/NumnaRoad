/**
 * Recent Activity API
 *
 * GET /api/admin/dashboard/recent-activity
 * Returns recent orders and events for the dashboard activity feed.
 *
 * Query Parameters:
 * - limit: number (default: 20)
 */

import { NextRequest, NextResponse } from 'next/server';
import { Collections } from '@/lib/pocketbase';
import { withAdminAuth } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';

interface Activity {
  id: string;
  type: 'order' | 'fulfillment' | 'error' | 'refund';
  title: string;
  description: string;
  status: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (pb) => {
    try {
      const { searchParams } = new URL(request.url);
      const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

      // Fetch recent orders
      const recentOrders = await pb.collection(Collections.ORDERS).getList(1, limit, {
        sort: '-updated',
      });

      // Build activity feed from orders
      const activities: Activity[] = recentOrders.items.map((order) => {
        const isError = ['failed', 'provider_failed'].includes(order.status);
        const isRefund = order.status === 'refunded' || order.payment_status === 'refunded';
        const isDelivered = ['delivered', 'completed', 'email_sent'].includes(order.status);

        let type: Activity['type'] = 'order';
        let title = '주문 접수';
        let description = `${order.product_name || 'Unknown Product'}`;

        if (isRefund) {
          type = 'refund';
          title = '환불 처리됨';
          description = `주문 ${order.order_number || order.id} 환불 완료`;
        } else if (isError) {
          type = 'error';
          title = '처리 실패';
          description = order.error_message || `주문 ${order.order_number || order.id} 실패`;
        } else if (isDelivered) {
          type = 'fulfillment';
          title = '배송 완료';
          description = `${order.product_name || 'eSIM'} - ${order.customer_email}`;
        } else if (order.status === 'pending_manual_fulfillment') {
          type = 'order';
          title = '수동 처리 대기';
          description = `${order.product_name || 'eSIM'} - 관리자 처리 필요`;
        }

        return {
          id: order.id,
          type,
          title,
          description,
          status: order.status,
          timestamp: order.updated || order.created,
          metadata: {
            orderId: order.id,
            orderNumber: order.order_number,
            customerEmail: order.customer_email,
            productName: order.product_name,
            amount: order.total_price || order.amount,
            salesChannel: order.sales_channel,
          },
        };
      });

      // Sort by timestamp (most recent first)
      activities.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return NextResponse.json({
        activities: activities.slice(0, limit),
        hasMore: recentOrders.totalItems > limit,
      });
    } catch (error) {
      logger.error('admin_dashboard_recent_activity_fetch_failed', error);
      return NextResponse.json(
        { error: 'Failed to fetch recent activity' },
        { status: 500 }
      );
    }
  });
}
