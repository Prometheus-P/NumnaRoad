/**
 * Admin Dashboard Home Page
 *
 * Main dashboard with order stats and provider health summary.
 *
 * Tasks: T106, T111
 */

import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { OrderStatsCard } from '@/components/ui/OrderStatsCard';
import { ProviderHealthCard } from '@/components/ui/ProviderHealthCard';
import type { ProviderHealth } from '@/components/ui/ProviderHealthCard';

/**
 * Mock data for initial implementation
 * TODO: Replace with actual PocketBase data fetching (T111)
 */
const mockStats = {
  today: {
    total: 45,
    pending: 5,
    processing: 3,
    completed: 35,
    failed: 2,
    revenue: 675000,
  },
  previousDay: {
    total: 38,
    pending: 4,
    processing: 2,
    completed: 30,
    failed: 2,
    revenue: 570000,
  },
};

const mockProviders: ProviderHealth[] = [
  {
    slug: 'airalo',
    name: 'Airalo',
    priority: 100,
    isActive: true,
    circuitState: 'closed',
    successRate: 98.5,
    totalRequests: 4500,
    lastSuccessAt: new Date().toISOString(),
    lastFailureAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    failureCount: 0,
  },
  {
    slug: 'esimcard',
    name: 'eSIMCard',
    priority: 50,
    isActive: true,
    circuitState: 'half-open',
    successRate: 85.2,
    totalRequests: 890,
    lastSuccessAt: new Date(Date.now() - 3600000).toISOString(),
    lastFailureAt: new Date(Date.now() - 1800000).toISOString(),
    failureCount: 2,
  },
  {
    slug: 'mobimatter',
    name: 'MobiMatter',
    priority: 25,
    isActive: false,
    circuitState: 'open',
    successRate: 45.0,
    totalRequests: 120,
    lastSuccessAt: new Date(Date.now() - 86400000).toISOString(),
    lastFailureAt: new Date(Date.now() - 3600000).toISOString(),
    failureCount: 5,
  },
];

/**
 * Admin Dashboard Page
 */
export default function AdminDashboardPage() {
  return (
    <Box>
      {/* Page Header */}
      <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 700 }}>
        Dashboard
      </Typography>

      {/* Stats Cards */}
      <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
        Today&apos;s Overview
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <OrderStatsCard
            type="total"
            value={mockStats.today.total}
            previousValue={mockStats.previousDay.total}
            period="today"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <OrderStatsCard
            type="pending"
            value={mockStats.today.pending}
            previousValue={mockStats.previousDay.pending}
            period="today"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <OrderStatsCard
            type="processing"
            value={mockStats.today.processing}
            previousValue={mockStats.previousDay.processing}
            period="today"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <OrderStatsCard
            type="completed"
            value={mockStats.today.completed}
            previousValue={mockStats.previousDay.completed}
            period="today"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <OrderStatsCard
            type="failed"
            value={mockStats.today.failed}
            previousValue={mockStats.previousDay.failed}
            period="today"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <OrderStatsCard
            type="revenue"
            value={mockStats.today.revenue}
            previousValue={mockStats.previousDay.revenue}
            period="today"
          />
        </Grid>
      </Grid>

      {/* Provider Health */}
      <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
        Provider Health
      </Typography>
      <Grid container spacing={3} data-testid="provider-health-summary">
        {mockProviders.map((provider) => (
          <Grid item xs={12} md={6} lg={4} key={provider.slug}>
            <ProviderHealthCard provider={provider} />
          </Grid>
        ))}
      </Grid>

      {/* Recent Orders Section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
          Recent Orders
        </Typography>
        <Paper
          sx={{ p: 3, borderRadius: 3 }}
          data-testid="recent-orders"
        >
          <Typography variant="body2" color="text.secondary">
            Order list will be implemented in T107
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}

/**
 * Generate metadata
 */
export const metadata = {
  title: 'Dashboard - NumnaRoad Admin',
  description: 'Admin dashboard for order and provider management',
};
