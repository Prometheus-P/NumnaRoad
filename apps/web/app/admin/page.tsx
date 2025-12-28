'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Skeleton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import ErrorIcon from '@mui/icons-material/Error';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useQuery } from '@tanstack/react-query';

interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  failedOrders: number;
  todayOrdersChange: number;
  todayRevenueChange: number;
}

interface RecentOrder {
  id: string;
  customerEmail: string;
  productName: string;
  totalPrice: number;
  status: string;
  created: string;
  salesChannel: string;
}

interface ProviderStatus {
  name: string;
  state: 'CLOSED' | 'HALF_OPEN' | 'OPEN';
  successRate: number;
  consecutiveFailures: number;
}

// Stat Card Component
function StatCard({
  title,
  value,
  change,
  icon,
  loading,
  color,
  isAlert,
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  loading?: boolean;
  color: string;
  isAlert?: boolean;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            {loading ? (
              <Skeleton width={80} height={40} />
            ) : (
              <Typography variant="h4" fontWeight={600}>
                {value}
              </Typography>
            )}
            {change !== undefined && !loading && (
              <Box display="flex" alignItems="center" mt={1}>
                {change >= 0 ? (
                  <TrendingUpIcon color="success" fontSize="small" />
                ) : (
                  <TrendingDownIcon color="error" fontSize="small" />
                )}
                <Typography
                  variant="body2"
                  color={change >= 0 ? 'success.main' : 'error.main'}
                  ml={0.5}
                >
                  {Math.abs(change)}% vs yesterday
                </Typography>
              </Box>
            )}
            {isAlert && (
              <Chip
                label="Alert"
                color="error"
                size="small"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: `${color}15`,
              color: color,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
  const getColor = () => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return 'success';
      case 'pending':
      case 'payment_received':
        return 'warning';
      case 'processing':
      case 'fulfillment_started':
        return 'info';
      case 'failed':
      case 'provider_failed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Chip
      label={status.replace(/_/g, ' ')}
      color={getColor()}
      size="small"
      sx={{ textTransform: 'capitalize' }}
    />
  );
}

// Provider Status Card
function ProviderStatusCard({ provider }: { provider: ProviderStatus }) {
  const getStateColor = () => {
    switch (provider.state) {
      case 'CLOSED':
        return 'success';
      case 'HALF_OPEN':
        return 'warning';
      case 'OPEN':
        return 'error';
    }
  };

  const getStateLabel = () => {
    switch (provider.state) {
      case 'CLOSED':
        return 'Normal';
      case 'HALF_OPEN':
        return 'Testing';
      case 'OPEN':
        return 'Blocked';
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1" fontWeight={600}>
            {provider.name}
          </Typography>
          <Chip
            label={getStateLabel()}
            color={getStateColor()}
            size="small"
          />
        </Box>
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Success Rate
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <LinearProgress
              variant="determinate"
              value={provider.successRate}
              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
              color={provider.successRate >= 90 ? 'success' : provider.successRate >= 70 ? 'warning' : 'error'}
            />
            <Typography variant="body2" fontWeight={600}>
              {provider.successRate}%
            </Typography>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Consecutive Failures: {provider.consecutiveFailures}
        </Typography>
      </CardContent>
    </Card>
  );
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(value);
}

// Format time ago
function formatTimeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function AdminDashboardPage() {
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/dashboard/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  // Fetch recent orders
  const { data: recentOrders, isLoading: ordersLoading } = useQuery<RecentOrder[]>({
    queryKey: ['admin', 'dashboard', 'recent-orders'],
    queryFn: async () => {
      const res = await fetch('/api/admin/orders?limit=10');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      return data.items || [];
    },
  });

  // Fetch provider status
  const { data: providers, isLoading: providersLoading } = useQuery<ProviderStatus[]>({
    queryKey: ['admin', 'providers'],
    queryFn: async () => {
      const res = await fetch('/api/admin/providers');
      if (!res.ok) throw new Error('Failed to fetch providers');
      return res.json();
    },
  });

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={3}>
        Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Today Orders"
            value={stats?.todayOrders ?? 0}
            change={stats?.todayOrdersChange}
            icon={<ShoppingCartIcon />}
            loading={statsLoading}
            color="#6366F1"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Today Revenue"
            value={formatCurrency(stats?.todayRevenue ?? 0)}
            change={stats?.todayRevenueChange}
            icon={<AttachMoneyIcon />}
            loading={statsLoading}
            color="#10B981"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Pending"
            value={stats?.pendingOrders ?? 0}
            icon={<PendingActionsIcon />}
            loading={statsLoading}
            color="#F59E0B"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Failed"
            value={stats?.failedOrders ?? 0}
            icon={<ErrorIcon />}
            loading={statsLoading}
            color="#EF4444"
            isAlert={(stats?.failedOrders ?? 0) > 0}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Orders */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Recent Orders
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Order ID</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Product</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Channel</TableCell>
                      <TableCell>Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ordersLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(7)].map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : recentOrders && recentOrders.length > 0 ? (
                      recentOrders.map((order) => (
                        <TableRow
                          key={order.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => window.location.href = `/admin/orders/${order.id}`}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {order.id.slice(0, 8)}...
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                              {order.customerEmail}
                            </Typography>
                          </TableCell>
                          <TableCell>{order.productName}</TableCell>
                          <TableCell>{formatCurrency(order.totalPrice)}</TableCell>
                          <TableCell>
                            <StatusBadge status={order.status} />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={order.salesChannel}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{formatTimeAgo(order.created)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No orders found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Provider Status */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Provider Status
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            {providersLoading ? (
              [...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent>
                    <Skeleton height={100} />
                  </CardContent>
                </Card>
              ))
            ) : providers && providers.length > 0 ? (
              providers.map((provider) => (
                <ProviderStatusCard key={provider.name} provider={provider} />
              ))
            ) : (
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    No providers configured
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
