'use client';

import React, { useState } from 'react';
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
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Button,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import { useQuery } from '@tanstack/react-query';
import { useAdminLanguage } from '@/lib/i18n';
import {
  StatCard,
  StatusBadge,
  ProviderStatusCard,
  RevenueChart,
} from '@/components/admin';
import type { ProviderStatus } from '@/components/admin';
import { formatCurrency, formatTimeAgo } from '@/lib/utils/formatters';
import {
  generateDemoStats,
  generateDemoOrders,
  generateDemoProviders,
  generateDemoChartData,
  type DashboardStats,
  type RecentOrder,
} from '@/lib/admin/demo-data';

export default function AdminDashboardPage() {
  const { t, locale } = useAdminLanguage();
  const [demoMode, setDemoMode] = useState(true);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Demo data (generated once)
  const [demoData] = useState(() => ({
    stats: generateDemoStats(),
    orders: generateDemoOrders(),
    providers: generateDemoProviders(),
    chartData: generateDemoChartData(),
  }));

  // Fetch dashboard stats
  const { data: apiStats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/dashboard/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: !demoMode,
  });

  // Fetch recent orders
  const { data: apiOrders, isLoading: ordersLoading } = useQuery<RecentOrder[]>({
    queryKey: ['admin', 'dashboard', 'recent-orders'],
    queryFn: async () => {
      const res = await fetch('/api/admin/orders?limit=10');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      return data.items || [];
    },
    enabled: !demoMode,
  });

  // Fetch provider status
  const { data: apiProviders, isLoading: providersLoading } = useQuery<ProviderStatus[]>({
    queryKey: ['admin', 'providers'],
    queryFn: async () => {
      const res = await fetch('/api/admin/providers');
      if (!res.ok) throw new Error('Failed to fetch providers');
      return res.json();
    },
    enabled: !demoMode,
  });

  // Use demo or real data
  const stats = demoMode ? demoData.stats : apiStats;
  const recentOrders = demoMode ? demoData.orders : apiOrders;
  const providers = demoMode ? demoData.providers : apiProviders;
  const chartData = demoData.chartData;
  const isLoading = !demoMode && (statsLoading || ordersLoading || providersLoading);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          {t.dashboard.title}
        </Typography>
        <Button
          variant={demoMode ? 'contained' : 'outlined'}
          size="small"
          startIcon={<InfoIcon />}
          onClick={() => setDemoMode(!demoMode)}
          color={demoMode ? 'primary' : 'inherit'}
        >
          {demoMode ? (locale === 'ko' ? '데모 모드 ON' : 'Demo Mode ON') : (locale === 'ko' ? '실제 데이터' : 'Real Data')}
        </Button>
      </Box>

      {demoMode && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
          <Typography variant="body2">
            <strong>{locale === 'ko' ? '데모 모드:' : 'Demo Mode:'}</strong>{' '}
            {locale === 'ko' ? '샘플 데이터로 대시보드 기능을 미리 체험할 수 있습니다.' : 'Preview dashboard features with sample data.'}
            {locale === 'ko' ? ' 실제 데이터를 보려면 "데모 모드 ON" 버튼을 클릭하세요.' : ' Click "Demo Mode ON" button to view real data.'}
          </Typography>
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title={t.dashboard.todayOrders}
            value={stats?.todayOrders ?? 0}
            change={stats?.todayOrdersChange}
            icon={<ShoppingCartIcon />}
            loading={isLoading}
            color="#6366F1"
            vsYesterdayLabel={t.common.vsYesterday}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title={t.dashboard.todayRevenue}
            value={formatCurrency(stats?.todayRevenue ?? 0)}
            change={stats?.todayRevenueChange}
            icon={<AttachMoneyIcon />}
            loading={isLoading}
            color="#10B981"
            vsYesterdayLabel={t.common.vsYesterday}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title={t.dashboard.pendingOrders}
            value={stats?.pendingOrders ?? 0}
            icon={<PendingActionsIcon />}
            loading={isLoading}
            color="#F59E0B"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title={t.dashboard.failedOrders}
            value={stats?.failedOrders ?? 0}
            icon={<ErrorIcon />}
            loading={isLoading}
            color="#EF4444"
            isAlert={(stats?.failedOrders ?? 0) > 0}
            alertLabel={locale === 'ko' ? '주의' : 'Alert'}
          />
        </Grid>
      </Grid>

      {/* Revenue Chart */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={600}>
              {locale === 'ko' ? '주간 매출 추이' : 'Weekly Revenue Trend'}
            </Typography>
            <ToggleButtonGroup
              value={chartType}
              exclusive
              onChange={(_, value) => value && setChartType(value)}
              size="small"
            >
              <ToggleButton value="area">{locale === 'ko' ? '영역' : 'Area'}</ToggleButton>
              <ToggleButton value="bar">{locale === 'ko' ? '막대' : 'Bar'}</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <RevenueChart data={chartData} loading={isLoading} chartType={chartType} />
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Recent Orders */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                {t.dashboard.recentOrders}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t.dashboard.orderNumber}</TableCell>
                      <TableCell>{t.orders.customerInfo}</TableCell>
                      <TableCell>{t.dashboard.product}</TableCell>
                      <TableCell>{t.dashboard.amount}</TableCell>
                      <TableCell>{t.common.status}</TableCell>
                      <TableCell>{t.orders.channel}</TableCell>
                      <TableCell>{t.dashboard.time}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isLoading ? (
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
                          onClick={() => (window.location.href = `/admin/orders/${order.id}`)}
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
                            <StatusBadge status={order.status} statusLabels={t.orders.statuses} />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={t.orders.channels[order.salesChannel as keyof typeof t.orders.channels] || order.salesChannel}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{formatTimeAgo(order.created, t.dashboard.timeAgo)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography variant="body2" color="text.secondary">
                            {t.dashboard.noRecentOrders}
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
            {t.dashboard.providerStatus}
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent>
                    <Skeleton height={100} />
                  </CardContent>
                </Card>
              ))
            ) : providers && providers.length > 0 ? (
              providers.map((provider) => (
                <ProviderStatusCard
                  key={provider.name}
                  provider={provider}
                  stateLabels={t.dashboard.providerStates}
                  successRateLabel={t.dashboard.successRate}
                  consecutiveFailuresLabel={locale === 'ko' ? '연속 실패' : 'Consecutive failures'}
                />
              ))
            ) : (
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    {locale === 'ko' ? '등록된 프로바이더가 없습니다' : 'No providers registered'}
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
