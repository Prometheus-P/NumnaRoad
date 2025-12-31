import type { ChartDataPoint } from '@/components/admin/RevenueChart';
import type { ProviderStatus } from '@/components/admin/ProviderStatusCard';

export interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  failedOrders: number;
  todayOrdersChange: number;
  todayRevenueChange: number;
}

export interface RecentOrder {
  id: string;
  customerEmail: string;
  productName: string;
  totalPrice: number;
  status: string;
  created: string;
  salesChannel: string;
}

/**
 * Generate demo chart data for the last 7 days.
 */
export function generateDemoChartData(): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayName = date.toLocaleDateString('ko-KR', { weekday: 'short' });

    const baseRevenue = 150000 + Math.random() * 300000;
    const baseOrders = 3 + Math.floor(Math.random() * 8);

    data.push({
      date: dayName,
      revenue: Math.round(baseRevenue),
      orders: baseOrders,
    });
  }

  return data;
}

/**
 * Generate demo dashboard stats.
 */
export function generateDemoStats(): DashboardStats {
  return {
    todayOrders: 5,
    todayRevenue: 245000,
    pendingOrders: 2,
    failedOrders: 0,
    todayOrdersChange: 25,
    todayRevenueChange: 15,
  };
}

/**
 * Generate demo recent orders.
 */
export function generateDemoOrders(): RecentOrder[] {
  const countries = ['일본', '미국', '태국', '베트남', '유럽'];
  const statuses = ['completed', 'pending', 'processing'];
  const channels = ['stripe', 'smartstore'];

  return Array.from({ length: 5 }, (_, i) => ({
    id: `demo-${Date.now()}-${i}`,
    customerEmail: `user${i + 1}@example.com`,
    productName: `${countries[i % countries.length]} eSIM 5GB`,
    totalPrice: 15000 + Math.floor(Math.random() * 30000),
    status: statuses[i % statuses.length],
    created: new Date(Date.now() - i * 3600000).toISOString(),
    salesChannel: channels[i % channels.length],
  }));
}

/**
 * Generate demo provider statuses.
 */
export function generateDemoProviders(): ProviderStatus[] {
  return [
    { name: 'Airalo', state: 'CLOSED', successRate: 98, consecutiveFailures: 0 },
    { name: 'RedteaGO', state: 'CLOSED', successRate: 95, consecutiveFailures: 0 },
    { name: 'eSIMCard', state: 'HALF_OPEN', successRate: 72, consecutiveFailures: 2 },
  ];
}
