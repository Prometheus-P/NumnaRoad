/**
 * Dashboard Chart API
 *
 * GET /api/admin/dashboard/chart
 * Returns time-series data for dashboard charts.
 *
 * Query Parameters:
 * - period: '7d' | '30d' | '90d' (default: '7d')
 * - type: 'revenue' | 'orders' | 'status' (default: 'orders')
 */

import { NextRequest, NextResponse } from 'next/server';
import { Collections } from '@/lib/pocketbase';
import { withAdminAuth } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';

type ChartPeriod = '7d' | '30d' | '90d';
type ChartType = 'revenue' | 'orders' | 'status';

interface DailyDataPoint {
  date: string;
  value: number;
  label: string;
}

interface StatusDataPoint {
  status: string;
  count: number;
  percentage: number;
}

interface ChartResponse {
  period: ChartPeriod;
  type: ChartType;
  data: DailyDataPoint[] | StatusDataPoint[];
  summary: {
    total: number;
    average: number;
    change: number;
    changePercent: number;
  };
}

function getPeriodDays(period: ChartPeriod): number {
  switch (period) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    default: return 7;
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getDateLabel(date: Date, period: ChartPeriod): string {
  if (period === '90d') {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (pb) => {
    try {
      const { searchParams } = new URL(request.url);
      const period = (searchParams.get('period') || '7d') as ChartPeriod;
      const type = (searchParams.get('type') || 'orders') as ChartType;

      // Validate parameters
      if (!['7d', '30d', '90d'].includes(period)) {
        return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
      }
      if (!['revenue', 'orders', 'status'].includes(type)) {
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
      }

      const days = getPeriodDays(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - days);

      // Fetch orders for the current and previous periods
      const [currentOrders, previousOrders] = await Promise.all([
        pb.collection(Collections.ORDERS).getFullList({
          filter: `created >= "${startDate.toISOString()}"`,
          sort: 'created',
        }),
        pb.collection(Collections.ORDERS).getFullList({
          filter: `created >= "${previousStartDate.toISOString()}" && created < "${startDate.toISOString()}"`,
        }),
      ]);

      if (type === 'status') {
        // Status distribution chart
        const statusCounts: Record<string, number> = {};
        for (const order of currentOrders) {
          const status = order.status || 'unknown';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        }

        const total = currentOrders.length;
        const statusData: StatusDataPoint[] = Object.entries(statusCounts)
          .map(([status, count]) => ({
            status,
            count,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count);

        return NextResponse.json({
          period,
          type,
          data: statusData,
          summary: {
            total,
            average: 0,
            change: total - previousOrders.length,
            changePercent: previousOrders.length > 0
              ? Math.round(((total - previousOrders.length) / previousOrders.length) * 100)
              : 0,
          },
        } as ChartResponse);
      }

      // Daily aggregation for revenue and orders charts
      const dailyData: Record<string, { orders: number; revenue: number }> = {};

      // Initialize all days with zero
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        dailyData[formatDate(date)] = { orders: 0, revenue: 0 };
      }

      // Aggregate current period data
      for (const order of currentOrders) {
        const orderDate = formatDate(new Date(order.created));
        if (dailyData[orderDate]) {
          dailyData[orderDate].orders += 1;
          dailyData[orderDate].revenue += order.total_price || order.amount || 0;
        }
      }

      // Build data points
      const dataPoints: DailyDataPoint[] = Object.entries(dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          value: type === 'revenue' ? data.revenue : data.orders,
          label: getDateLabel(new Date(date), period),
        }));

      // Calculate summary
      const currentTotal = type === 'revenue'
        ? currentOrders.reduce((sum, o) => sum + (o.total_price || o.amount || 0), 0)
        : currentOrders.length;

      const previousTotal = type === 'revenue'
        ? previousOrders.reduce((sum, o) => sum + (o.total_price || o.amount || 0), 0)
        : previousOrders.length;

      const average = days > 0 ? Math.round(currentTotal / days) : 0;
      const change = currentTotal - previousTotal;
      const changePercent = previousTotal > 0
        ? Math.round((change / previousTotal) * 100)
        : 0;

      return NextResponse.json({
        period,
        type,
        data: dataPoints,
        summary: {
          total: currentTotal,
          average,
          change,
          changePercent,
        },
      } as ChartResponse);
    } catch (error) {
      logger.error('admin_dashboard_chart_fetch_failed', error);
      return NextResponse.json(
        { error: 'Failed to fetch chart data' },
        { status: 500 }
      );
    }
  });
}
