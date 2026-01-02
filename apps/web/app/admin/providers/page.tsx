'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatTimeAgo } from '@/lib/utils/formatters';

interface Provider {
  id: string;
  name: string;
  priority: number;
  state: 'CLOSED' | 'HALF_OPEN' | 'OPEN';
  successRate: number;
  consecutiveFailures: number;
  lastFailureAt?: string;
  isActive: boolean;
  apiEndpoint?: string;
}

interface ProviderStats {
  providerId: string;
  providerName: string;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  recentErrors: {
    message: string;
    count: number;
    lastOccurred: string;
  }[];
  hourlyStats: {
    hour: string;
    success: number;
    failure: number;
  }[];
}

interface StatsResponse {
  period: string;
  generatedAt: string;
  providers: ProviderStats[];
}

// Get state color and label
function getStateInfo(state: string): { color: 'success' | 'warning' | 'error'; label: string; icon: string } {
  switch (state) {
    case 'CLOSED':
      return { color: 'success', label: 'Normal', icon: '🟢' };
    case 'HALF_OPEN':
      return { color: 'warning', label: 'Testing', icon: '🟡' };
    case 'OPEN':
      return { color: 'error', label: 'Blocked', icon: '🔴' };
    default:
      return { color: 'success', label: 'Unknown', icon: '⚪' };
  }
}

// Mini bar chart for hourly stats
function HourlyStatsChart({ stats }: { stats: { hour: string; success: number; failure: number }[] }) {
  // Show last 12 hours
  const last12 = stats.slice(-12);
  const maxValue = Math.max(...last12.map((s) => s.success + s.failure), 1);

  if (last12.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No data available
      </Typography>
    );
  }

  return (
    <Box display="flex" alignItems="end" gap={0.5} height={40}>
      {last12.map((stat, idx) => {
        const total = stat.success + stat.failure;
        const height = (total / maxValue) * 100;
        const successHeight = total > 0 ? (stat.success / total) * height : 0;
        const hour = stat.hour.slice(11, 13);

        return (
          <Tooltip
            key={idx}
            title={`${hour}:00 - Success: ${stat.success}, Failure: ${stat.failure}`}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column-reverse',
                width: 12,
                height: '100%',
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: `${successHeight}%`,
                  bgcolor: 'success.main',
                  borderRadius: '2px 2px 0 0',
                }}
              />
              <Box
                sx={{
                  width: '100%',
                  height: `${height - successHeight}%`,
                  bgcolor: 'error.main',
                  borderRadius: stat.success > 0 ? 0 : '2px 2px 0 0',
                }}
              />
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

// Provider Card Component
function ProviderCard({
  provider,
  stats,
  onReset,
  isResetting,
}: {
  provider: Provider;
  stats?: ProviderStats;
  onReset: () => void;
  isResetting: boolean;
}) {
  const stateInfo = getStateInfo(provider.state);
  const [showResetDialog, setShowResetDialog] = React.useState(false);

  return (
    <>
      <Card
        sx={{
          height: '100%',
          borderLeft: 4,
          borderColor: `${stateInfo.color}.main`,
        }}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Typography variant="h6" fontWeight={600}>
                  {stateInfo.icon} {provider.name}
                </Typography>
                <Chip
                  label={`Priority: ${provider.priority}`}
                  size="small"
                  variant="outlined"
                />
              </Box>
              <Chip
                label={stateInfo.label}
                color={stateInfo.color}
                size="small"
              />
            </Box>
            <Box>
              <Tooltip title="Reset Circuit Breaker">
                <IconButton
                  size="small"
                  onClick={() => setShowResetDialog(true)}
                  disabled={provider.state === 'CLOSED'}
                >
                  <RestartAltIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Settings">
                <IconButton size="small">
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Success Rate */}
          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" color="text.secondary">
                Success Rate (24h)
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {stats ? stats.successRate.toFixed(1) : provider.successRate.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={stats?.successRate ?? provider.successRate}
              sx={{ height: 8, borderRadius: 4 }}
              color={
                (stats?.successRate ?? provider.successRate) >= 90
                  ? 'success'
                  : (stats?.successRate ?? provider.successRate) >= 70
                  ? 'warning'
                  : 'error'
              }
            />
          </Box>

          {/* Stats from API */}
          {stats && (
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="caption" color="text.secondary">
                  Last 24h: {stats.totalRequests} requests
                </Typography>
                <Typography variant="caption">
                  <Typography component="span" variant="caption" color="success.main">
                    {stats.successCount} OK
                  </Typography>
                  {' / '}
                  <Typography component="span" variant="caption" color="error.main">
                    {stats.failureCount} Failed
                  </Typography>
                </Typography>
              </Box>
              <HourlyStatsChart stats={stats.hourlyStats} />
            </Box>
          )}

          {/* Circuit Breaker Stats */}
          <Grid container spacing={2}>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary">
                Consecutive Failures
              </Typography>
              <Typography variant="h6" fontWeight={600}>
                {provider.consecutiveFailures}
              </Typography>
            </Grid>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary">
                Last Failure
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {formatTimeAgo(provider.lastFailureAt)}
              </Typography>
            </Grid>
          </Grid>

          {/* Status */}
          <Box mt={2} display="flex" alignItems="center" gap={1}>
            <Typography variant="caption" color="text.secondary">
              Status:
            </Typography>
            <Chip
              label={provider.isActive ? 'Active' : 'Inactive'}
              color={provider.isActive ? 'success' : 'default'}
              size="small"
              variant="outlined"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onClose={() => setShowResetDialog(false)}>
        <DialogTitle>Reset Circuit Breaker</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to reset the circuit breaker for <strong>{provider.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            This will reset the state to CLOSED and clear consecutive failure count.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResetDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              onReset();
              setShowResetDialog(false);
            }}
            disabled={isResetting}
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// Recent Errors Table Component
function RecentErrorsTable({ stats }: { stats: ProviderStats[] }) {
  const allErrors = stats.flatMap((provider) =>
    provider.recentErrors.map((error) => ({
      ...error,
      providerName: provider.providerName,
    }))
  );

  // Sort by count descending
  allErrors.sort((a, b) => b.count - a.count);

  if (allErrors.length === 0) {
    return (
      <Alert severity="success" icon={<TrendingUpIcon />}>
        No errors in the last 24 hours. All providers operating normally.
      </Alert>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Provider</TableCell>
            <TableCell>Error Message</TableCell>
            <TableCell align="center">Count</TableCell>
            <TableCell>Last Occurred</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {allErrors.slice(0, 10).map((error, idx) => (
            <TableRow key={idx}>
              <TableCell>
                <Chip label={error.providerName} size="small" variant="outlined" />
              </TableCell>
              <TableCell>
                <Typography
                  variant="body2"
                  sx={{
                    maxWidth: 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={error.message}
                >
                  {error.message}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Chip
                  label={error.count}
                  size="small"
                  color={error.count >= 10 ? 'error' : error.count >= 5 ? 'warning' : 'default'}
                />
              </TableCell>
              <TableCell>{formatTimeAgo(error.lastOccurred)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function ProvidersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState(0);

  const { data: providers, isLoading, refetch } = useQuery<Provider[]>({
    queryKey: ['admin', 'providers'],
    queryFn: async () => {
      const res = await fetch('/api/admin/providers');
      if (!res.ok) throw new Error('Failed to fetch providers');
      return res.json();
    },
  });

  const { data: statsData } = useQuery<StatsResponse>({
    queryKey: ['admin', 'providers', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/providers/stats?hours=24');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const resetMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const res = await fetch(`/api/admin/providers/${providerId}/reset`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Reset failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'providers'] });
    },
  });

  // Map stats to providers
  const getProviderStats = (providerId: string): ProviderStats | undefined => {
    return statsData?.providers.find(
      (s) => s.providerId === providerId || s.providerName.toLowerCase() === providerId.toLowerCase()
    );
  };

  // Calculate overall stats
  const overallStats = React.useMemo(() => {
    if (!statsData?.providers) return null;
    const totals = statsData.providers.reduce(
      (acc, p) => ({
        requests: acc.requests + p.totalRequests,
        success: acc.success + p.successCount,
        failures: acc.failures + p.failureCount,
      }),
      { requests: 0, success: 0, failures: 0 }
    );
    return {
      ...totals,
      successRate: totals.requests > 0 ? (totals.success / totals.requests) * 100 : 100,
    };
  }, [statsData]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          Provider Health Dashboard
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={() => refetch()}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Overall Stats Summary */}
      {overallStats && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Total Requests (24h)
                </Typography>
                <Typography variant="h4" fontWeight={600}>
                  {overallStats.requests}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Success Rate
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight={600}
                  color={overallStats.successRate >= 90 ? 'success.main' : 'error.main'}
                >
                  {overallStats.successRate.toFixed(1)}%
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Successful
                </Typography>
                <Typography variant="h4" fontWeight={600} color="success.main">
                  {overallStats.success}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Failed
                </Typography>
                <Typography variant="h4" fontWeight={600} color="error.main">
                  {overallStats.failures}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Provider Status" />
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <ErrorOutlineIcon fontSize="small" />
                Recent Errors
                {statsData?.providers && statsData.providers.some((p) => p.failureCount > 0) && (
                  <Chip
                    label={statsData.providers.reduce((sum, p) => sum + p.failureCount, 0)}
                    size="small"
                    color="error"
                    sx={{ height: 20 }}
                  />
                )}
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <>
          {/* Circuit Breaker Legend */}
          <Card sx={{ mb: 3, p: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Circuit Breaker States
            </Typography>
            <Box display="flex" gap={3} flexWrap="wrap">
              <Box display="flex" alignItems="center" gap={1}>
                <Chip label="CLOSED" color="success" size="small" />
                <Typography variant="body2">Normal operation</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip label="HALF_OPEN" color="warning" size="small" />
                <Typography variant="body2">Testing mode</Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip label="OPEN" color="error" size="small" />
                <Typography variant="body2">Blocked</Typography>
              </Box>
            </Box>
          </Card>

          {/* Provider Cards */}
          <Grid container spacing={3}>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <Grid key={i} size={{ xs: 12, md: 4 }}>
                  <Card>
                    <CardContent>
                      <Skeleton height={250} />
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : providers && providers.length > 0 ? (
              providers.map((provider) => (
                <Grid key={provider.id} size={{ xs: 12, md: 4 }}>
                  <ProviderCard
                    provider={provider}
                    stats={getProviderStats(provider.id)}
                    onReset={() => resetMutation.mutate(provider.id)}
                    isResetting={resetMutation.isPending}
                  />
                </Grid>
              ))
            ) : (
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body1" color="text.secondary" textAlign="center">
                      No providers configured
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Recent Errors (Last 24 Hours)
            </Typography>
            {statsData?.providers ? (
              <RecentErrorsTable stats={statsData.providers} />
            ) : (
              <Skeleton height={200} />
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
