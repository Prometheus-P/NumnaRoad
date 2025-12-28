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
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

// Format time ago
function formatTimeAgo(date?: string): string {
  if (!date) return '-';
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

// Provider Card Component
function ProviderCard({
  provider,
  onReset,
  isResetting,
}: {
  provider: Provider;
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
                Success Rate
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {provider.successRate.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={provider.successRate}
              sx={{ height: 8, borderRadius: 4 }}
              color={
                provider.successRate >= 90
                  ? 'success'
                  : provider.successRate >= 70
                  ? 'warning'
                  : 'error'
              }
            />
          </Box>

          {/* Stats */}
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

          {/* API Endpoint */}
          {provider.apiEndpoint && (
            <Box mt={2}>
              <Typography variant="caption" color="text.secondary">
                API Endpoint
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {provider.apiEndpoint}
              </Typography>
            </Box>
          )}

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

export default function ProvidersPage() {
  const queryClient = useQueryClient();

  const { data: providers, isLoading, refetch } = useQuery<Provider[]>({
    queryKey: ['admin', 'providers'],
    queryFn: async () => {
      const res = await fetch('/api/admin/providers');
      if (!res.ok) throw new Error('Failed to fetch providers');
      return res.json();
    },
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          Provider Status
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={() => refetch()}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Circuit Breaker Legend */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} mb={1}>
          Circuit Breaker States
        </Typography>
        <Box display="flex" gap={3} flexWrap="wrap">
          <Box display="flex" alignItems="center" gap={1}>
            <Chip label="CLOSED" color="success" size="small" />
            <Typography variant="body2">Normal operation, all requests allowed</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip label="HALF_OPEN" color="warning" size="small" />
            <Typography variant="body2">Testing mode, limited requests allowed</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip label="OPEN" color="error" size="small" />
            <Typography variant="body2">Blocked, all requests rejected</Typography>
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
                  <Skeleton height={200} />
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : providers && providers.length > 0 ? (
          providers.map((provider) => (
            <Grid key={provider.id} size={{ xs: 12, md: 4 }}>
              <ProviderCard
                provider={provider}
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
    </Box>
  );
}
