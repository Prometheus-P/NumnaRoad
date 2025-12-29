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
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Button,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import ErrorIcon from '@mui/icons-material/Error';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import InfoIcon from '@mui/icons-material/Info';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useAdminLanguage } from '@/lib/i18n';

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

interface ChartDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

// Generate demo data for the last 7 days
function generateDemoChartData(): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayName = date.toLocaleDateString('ko-KR', { weekday: 'short' });

    // Generate realistic demo data
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

// Generate demo stats
function generateDemoStats(): DashboardStats {
  return {
    todayOrders: 5,
    todayRevenue: 245000,
    pendingOrders: 2,
    failedOrders: 0,
    todayOrdersChange: 25,
    todayRevenueChange: 15,
  };
}

// Generate demo recent orders
function generateDemoOrders(): RecentOrder[] {
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

// Generate demo providers
function generateDemoProviders(): ProviderStatus[] {
  return [
    { name: 'Airalo', state: 'CLOSED', successRate: 98, consecutiveFailures: 0 },
    { name: 'RedteaGO', state: 'CLOSED', successRate: 95, consecutiveFailures: 0 },
    { name: 'eSIMCard', state: 'HALF_OPEN', successRate: 72, consecutiveFailures: 2 },
  ];
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
  vsYesterdayLabel,
  alertLabel,
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  loading?: boolean;
  color: string;
  isAlert?: boolean;
  vsYesterdayLabel?: string;
  alertLabel?: string;
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
                  {vsYesterdayLabel || '전일 대비'} {change >= 0 ? '+' : ''}{change}%
                </Typography>
              </Box>
            )}
            {isAlert && (
              <Chip
                label={alertLabel || 'Alert'}
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

// Status Badge with translations
function StatusBadge({ status, statusLabels }: { status: string; statusLabels: Record<string, string> }) {
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

  const label = statusLabels[status] || status.replace(/_/g, ' ');

  return (
    <Chip
      label={label}
      color={getColor()}
      size="small"
    />
  );
}

// Provider Status Card with translations
function ProviderStatusCard({
  provider,
  stateLabels,
  successRateLabel,
  consecutiveFailuresLabel,
}: {
  provider: ProviderStatus;
  stateLabels: { closed: string; halfOpen: string; open: string };
  successRateLabel: string;
  consecutiveFailuresLabel: string;
}) {
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
        return stateLabels.closed;
      case 'HALF_OPEN':
        return stateLabels.halfOpen;
      case 'OPEN':
        return stateLabels.open;
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
            {successRateLabel}
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
          {consecutiveFailuresLabel}: {provider.consecutiveFailures}
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

// Format time ago with translations
function formatTimeAgo(
  date: string,
  timeAgoLabels: { justNow: string; minutesAgo: string; hoursAgo: string; daysAgo: string }
): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return timeAgoLabels.justNow;
  if (diffMins < 60) return `${diffMins}${timeAgoLabels.minutesAgo}`;
  if (diffHours < 24) return `${diffHours}${timeAgoLabels.hoursAgo}`;
  return `${diffDays}${timeAgoLabels.daysAgo}`;
}

// Revenue Chart Component
function RevenueChart({
  data,
  loading,
  chartType,
}: {
  data: ChartDataPoint[];
  loading: boolean;
  chartType: 'area' | 'bar';
}) {
  if (loading) {
    return <Skeleton variant="rounded" height={300} />;
  }

  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 2,
          }}
        >
          <Typography variant="subtitle2" fontWeight={600}>
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Typography key={index} variant="body2" color={entry.dataKey === 'revenue' ? 'primary.main' : 'secondary.main'}>
              {entry.dataKey === 'revenue' ? '매출: ' : '주문: '}
              {entry.dataKey === 'revenue' ? formatCurrency(entry.value) : `${entry.value}건`}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar yAxisId="left" dataKey="revenue" name="매출 (₩)" fill="#6366F1" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="right" dataKey="orders" name="주문 (건)" fill="#10B981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          name="매출"
          stroke="#6366F1"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorRevenue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

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
  const chartData = demoData.chartData; // Always use demo chart data for now
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

      {/* Demo Mode Alert */}
      {demoMode && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
          <Typography variant="body2">
            <strong>{locale === 'ko' ? '데모 모드:' : 'Demo Mode:'}</strong> {locale === 'ko' ? '샘플 데이터로 대시보드 기능을 미리 체험할 수 있습니다.' : 'Preview dashboard features with sample data.'}
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
