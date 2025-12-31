import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';

export async function GET(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();

    // Execute all queries in parallel for better performance
    const [allOrders, pendingOrders, failedOrders, completedOrders] = await Promise.all([
      pb.collection(Collections.ORDERS).getList(1, 1),
      pb.collection(Collections.ORDERS).getList(1, 1, {
        filter: `status = "pending" || status = "payment_received" || status = "fulfillment_started"`,
      }),
      pb.collection(Collections.ORDERS).getList(1, 1, {
        filter: `status = "failed" || status = "provider_failed"`,
      }),
      pb.collection(Collections.ORDERS).getFullList({
        filter: `status = "completed" || status = "delivered" || status = "email_sent"`,
      }),
    ]);

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
