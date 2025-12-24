'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Box, Grid, Typography, CircularProgress, Alert } from '@mui/material';
import OrderStatsCard from '../../../components/ui/OrderStatsCard';
import ProviderHealthCard from '../../../components/ui/ProviderHealthCard';
import DataTable from '../../../components/ui/DataTable';
import { Column } from '../../../components/ui/DataTable';
import { useTheme } from '@mui/material/styles';
import pb from '../../lib/pocketbase';
import { Order as PBOrder, EsimProductsRecord, EsimProvider as PBProviderRecord } from '../../types/pocketbase-types';
import StatusChip from '../../../components/ui/StatusChip';

// Types from tests/integration/admin-dashboard.test.ts
interface OrderStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  revenue: number;
}

interface ProviderHealth extends PBProviderRecord {
  circuitState: 'closed' | 'open' | 'half-open'; // Extend from PBProviderRecord
  successRate: number;
  totalRequests: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  failureCount: number;
}

interface DashboardData {
  stats: {
    today: OrderStats;
    week: OrderStats;
    month: OrderStats;
    all: OrderStats;
  };
  providers: ProviderHealth[];
  recentOrders: Array<{
    id: string;
    status: string;
    customerEmail: string;
    createdAt: string;
  }>;
}

// Helper to calculate stats
function calculateOrderStats(orders: PBOrder[]): OrderStats {
  const stats: OrderStats = {
    total: orders.length,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    revenue: 0,
  };

  orders.forEach(order => {
    switch (order.status) {
      case 'pending': stats.pending++; break;
      case 'processing': stats.processing++; break;
      case 'completed': stats.completed++; break;
      case 'failed': stats.failed++; break;
    }
    // Assuming revenue comes from product price for completed orders, needs more complex logic for actual revenue
    // For simplicity, summing up mock revenue
    stats.revenue += (order.expand?.product_id as EsimProductsRecord)?.price || 0;
  });

  return stats;
}

// Function to transform PocketBase provider record to ProviderHealth for UI
// This is duplicated from admin/providers/page.tsx - should be centralized
function transformPbProviderToUIProvider(pbProvider: PBProviderRecord): ProviderHealth {
    // Mock circuit breaker state and other dynamic data for now
    // In a real app, this would come from a backend API that monitors provider health
    const mockCircuitStates: Record<string, ProviderHealth['circuitState']> = {
        'airalo': 'closed',
        'esimcard': 'half-open',
        'mobimatter': 'open',
    };
    const mockSuccessRates: Record<string, number> = {
        'airalo': 98.5,
        'esimcard': 85.2,
        'mobimatter': 45.0,
    };
    const mockTotalRequests: Record<string, number> = {
        'airalo': 4500,
        'esimcard': 890,
        'mobimatter': 120,
    };
    const mockLastSuccessAt: Record<string, string | null> = {
        'airalo': '2024-01-20T10:30:00Z',
        'esimcard': '2024-01-20T09:45:00Z',
        'mobimatter': '2024-01-19T14:00:00Z',
    };
    const mockLastFailureAt: Record<string, string | null> = {
        'airalo': null,
        'esimcard': '2024-01-20T09:30:00Z',
        'mobimatter': '2024-01-20T10:00:00Z',
    };
    const mockFailureCount: Record<string, number> = {
        'airalo': 0,
        'esimcard': 2,
        'mobimatter': 5,
    };


    return {
        ...pbProvider,
        circuitState: mockCircuitStates[pbProvider.slug] || 'closed',
        successRate: mockSuccessRates[pbProvider.slug] || 100,
        totalRequests: mockTotalRequests[pbProvider.slug] || 0,
        lastSuccessAt: mockLastSuccessAt[pbProvider.slug] || null,
        lastFailureAt: mockLastFailureAt[pbProvider.slug] || null,
        failureCount: mockFailureCount[pbProvider.slug] || 0,
    };
}


// Define columns for recent orders DataTable
const recentOrdersColumns: Column<DashboardData['recentOrders'][0]>[] = [
  { field: 'id', headerName: 'Order ID', width: 150 },
  { field: 'customerEmail', headerName: 'Customer Email', flex: 1 },
  { field: 'status', headerName: 'Status', width: 120, renderCell: (params) => (
    <Chip label={params.value} size="small" variant="outlined" />
  )},
  { field: 'createdAt', headerName: 'Order Date', width: 180 },
];

export default function AdminDashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all orders
      const allOrders = await pb.collection('orders').getFullList<PBOrder>({ expand: 'product_id', sort: '-created_at' });

      // Aggregate stats (simplified for now, real-time might need backend aggregation)
      const statsAll = calculateOrderStats(allOrders);
      // For today, week, month, would need date filtering on allOrders
      const statsToday = calculateOrderStats(allOrders.filter(order => new Date(order.created_at).getDate() === new Date().getDate()));
      const statsWeek = calculateOrderStats(allOrders.filter(order => new Date(order.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
      const statsMonth = calculateOrderStats(allOrders.filter(order => new Date(order.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));

      // Fetch providers
      const pbProviders = await pb.collection('esim_providers').getFullList<PBProviderRecord>();
      const providers = pbProviders.map(transformPbProviderToUIProvider);

      // Recent orders (top 3)
      const recentOrders = allOrders.slice(0, 3).map(order => ({
        id: order.id,
        status: order.status,
        customerEmail: order.customer_email,
        createdAt: order.created_at,
      }));


      setDashboardData({
        stats: {
          today: statsToday,
          week: statsWeek,
          month: statsMonth,
          all: statsAll,
        },
        providers,
        recentOrders,
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Set up real-time subscriptions
    const unsubscribeOrders = pb.collection('orders').subscribe('*', (e) => {
      console.log('Real-time order update:', e);
      fetchDashboardData(); // Re-fetch all data on any order change
    });

    const unsubscribeProviders = pb.collection('esim_providers').subscribe('*', (e) => {
      console.log('Real-time provider update:', e);
      fetchDashboardData(); // Re-fetch all data on any provider change
    });

    return () => {
      unsubscribeOrders();
      unsubscribeProviders();
    };
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {error}
      </Alert>
    );
  }

  if (!dashboardData) {
    return (
      <Alert severity="info" sx={{ mt: 4 }}>
        No dashboard data available.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Dashboard
      </Typography>

      {/* Order Statistics */}
      <Typography variant="h6" component="h2" mt={4} mb={2}>
        Order Statistics
      </Typography>
      <Grid container spacing={theme.spacing(2)}>
        {/* Render OrderStatsCards */}
        <Grid item xs={12} sm={6} md={3}>
          <OrderStatsCard type="total" value={dashboardData.stats.all.total} period="all" labels={{total: 'Total Orders', all: 'All Time'}} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <OrderStatsCard type="completed" value={dashboardData.stats.today.completed} previousValue={dashboardData.stats.all.completed - dashboardData.stats.today.completed} period="today" labels={{completed: 'Completed Orders', today: 'Today'}} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <OrderStatsCard type="pending" value={dashboardData.stats.all.pending} period="all" labels={{pending: 'Pending Orders', all: 'All Time'}} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <OrderStatsCard type="failed" value={dashboardData.stats.all.failed} period="all" labels={{failed: 'Failed Orders', all: 'All Time'}} />
        </Grid>
      </Grid>


      {/* Provider Health */}
      <Typography variant="h6" component="h2" mt={4} mb={2}>
        Provider Health
      </Typography>
      <Grid container spacing={theme.spacing(2)}>
        {dashboardData.providers.map((provider) => (
          <Grid item xs={12} sm={6} md={4} key={provider.slug}>
            <ProviderHealthCard provider={provider} />
          </Grid>
        ))}
      </Grid>

      {/* Recent Orders */}
      <Typography variant="h6" component="h2" mt={4} mb={2}>
        Recent Orders
      </Typography>
      <Box sx={{ height: 400, width: '100%' }}>
        <DataTable
          rows={dashboardData.recentOrders}
          columns={recentOrdersColumns}
          pageSize={5}
          noRowsMessage="No recent orders found."
        />
      </Box>
    </Box>
  );
}