import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';

export async function GET(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();

    // Fetch all orders to calculate stats
    // Note: orders collection doesn't have 'created' field, so we use status-based filtering only
    const allOrders = await pb.collection(Collections.ORDERS).getList(1, 1);

    // Fetch pending orders
    const pendingOrders = await pb.collection(Collections.ORDERS).getList(1, 1, {
      filter: `status = "pending" || status = "payment_received" || status = "fulfillment_started"`,
    });

    // Fetch failed orders
    const failedOrders = await pb.collection(Collections.ORDERS).getList(1, 1, {
      filter: `status = "failed" || status = "provider_failed"`,
    });

    // Calculate total revenue (sum of amount for completed orders)
    const completedOrders = await pb.collection(Collections.ORDERS).getFullList({
      filter: `status = "completed" || status = "delivered" || status = "email_sent"`,
    });

    const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.amount || 0), 0);

    return NextResponse.json({
      todayOrders: allOrders.totalItems, // Total orders as we can't filter by date
      todayRevenue: totalRevenue,
      pendingOrders: pendingOrders.totalItems,
      failedOrders: failedOrders.totalItems,
      todayOrdersChange: 0, // Can't calculate without date filtering
      todayRevenueChange: 0,
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
