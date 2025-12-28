import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';

export async function GET(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStart = today.toISOString();
    const todayEnd = tomorrow.toISOString();
    const yesterdayStart = yesterday.toISOString();
    const yesterdayEnd = todayStart;

    // Fetch today's orders
    const todayOrders = await pb.collection(Collections.ORDERS).getList(1, 1, {
      filter: `created >= "${todayStart}" && created < "${todayEnd}"`,
    });

    // Fetch yesterday's orders for comparison
    const yesterdayOrders = await pb.collection(Collections.ORDERS).getList(1, 1, {
      filter: `created >= "${yesterdayStart}" && created < "${yesterdayEnd}"`,
    });

    // Fetch pending orders
    const pendingOrders = await pb.collection(Collections.ORDERS).getList(1, 1, {
      filter: `status = "pending" || status = "payment_received" || status = "fulfillment_started"`,
    });

    // Fetch failed orders
    const failedOrders = await pb.collection(Collections.ORDERS).getList(1, 1, {
      filter: `status = "failed" || status = "provider_failed"`,
    });

    // Calculate today's revenue (sum of total_price for completed orders today)
    const todayCompletedOrders = await pb.collection(Collections.ORDERS).getFullList({
      filter: `created >= "${todayStart}" && created < "${todayEnd}" && (status = "completed" || status = "delivered" || status = "email_sent")`,
    });

    const yesterdayCompletedOrders = await pb.collection(Collections.ORDERS).getFullList({
      filter: `created >= "${yesterdayStart}" && created < "${yesterdayEnd}" && (status = "completed" || status = "delivered" || status = "email_sent")`,
    });

    const todayRevenue = todayCompletedOrders.reduce((sum, order) => sum + (order.total_price || 0), 0);
    const yesterdayRevenue = yesterdayCompletedOrders.reduce((sum, order) => sum + (order.total_price || 0), 0);

    // Calculate change percentages
    const todayOrdersChange = yesterdayOrders.totalItems > 0
      ? Math.round(((todayOrders.totalItems - yesterdayOrders.totalItems) / yesterdayOrders.totalItems) * 100)
      : todayOrders.totalItems > 0 ? 100 : 0;

    const todayRevenueChange = yesterdayRevenue > 0
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
      : todayRevenue > 0 ? 100 : 0;

    return NextResponse.json({
      todayOrders: todayOrders.totalItems,
      todayRevenue,
      pendingOrders: pendingOrders.totalItems,
      failedOrders: failedOrders.totalItems,
      todayOrdersChange,
      todayRevenueChange,
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
