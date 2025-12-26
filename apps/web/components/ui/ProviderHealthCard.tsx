'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  IconButton,
  Chip,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import HealthAndSafetyOutlinedIcon from '@mui/icons-material/HealthAndSafetyOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import RefreshIcon from '@mui/icons-material/Refresh';

// Types for ProviderHealthCard (from tests/unit/components/ProviderHealthCard.test.tsx)
export type CircuitState = 'closed' | 'open' | 'half-open';

export interface ProviderHealth {
  slug: string;
  name: string;
  priority: number;
  isActive: boolean;
  circuitState: CircuitState;
  successRate: number;
  totalRequests: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  failureCount: number;
}

export interface ProviderHealthCardProps {
  provider: ProviderHealth;
  onToggleActive?: (slug: string, isActive: boolean) => void;
  onResetCircuit?: (slug: string) => void;
  loading?: boolean;
  labels?: {
    priorityHigh?: string;
    priorityMedium?: string;
    priorityLow?: string;
    activeLabel?: string;
    inactiveLabel?: string;
    circuitClosed?: string;
    circuitOpen?: string;
    circuitHalfOpen?: string;
    lastSuccess?: string;
    lastFailure?: string;
    totalRequests?: string;
    successRate?: string;
    failureCount?: string;
    resetCircuit?: string;
    toggleActive?: string;
  };
}

// Helper for formatting dates
const formatDateTime = (isoString: string | null): string => {
  if (!isoString) return 'N/A';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
};

/**
 * M3 Provider Health Card Component
 * Displays the health status of an eSIM provider, including circuit breaker state.
 */
export function ProviderHealthCard({
  provider,
  onToggleActive,
  onResetCircuit,
  loading = false,
  labels = {},
}: ProviderHealthCardProps) {
  const theme = useTheme();

  const defaultLabels = {
    priorityHigh: 'High',
    priorityMedium: 'Medium',
    priorityLow: 'Low',
    activeLabel: 'Active',
    inactiveLabel: 'Inactive',
    circuitClosed: 'Closed',
    circuitOpen: 'Open',
    circuitHalfOpen: 'Half-Open',
    lastSuccess: 'Last Success',
    lastFailure: 'Last Failure',
    totalRequests: 'Total Requests',
    successRate: 'Success Rate',
    failureCount: 'Failure Count',
    resetCircuit: 'Reset Circuit',
    toggleActive: 'Toggle Active',
  };

  const currentLabels = { ...defaultLabels, ...labels };

  const getPriorityLabel = (priority: number): string => {
    if (priority >= 75) return currentLabels.priorityHigh;
    if (priority >= 50) return currentLabels.priorityMedium;
    return currentLabels.priorityLow;
  };

  const getCircuitStateColor = (state: CircuitState): string => {
    if (state === 'closed') return theme.palette.success.main;
    if (state === 'half-open') return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getCircuitStateIcon = (state: CircuitState) => {
    if (state === 'closed') return <CheckCircleOutlinedIcon />;
    if (state === 'half-open') return <WarningAmberOutlinedIcon />;
    return <ErrorOutlineIcon />;
  };

  const getSuccessRateColor = (rate: number): 'success' | 'warning' | 'error' => {
    if (rate >= 95) return 'success';
    if (rate >= 80) return 'warning';
    return 'error';
  };

  const handleToggle = () => {
    onToggleActive && onToggleActive(provider.slug, !provider.isActive);
  };

  const handleReset = () => {
    onResetCircuit && onResetCircuit(provider.slug);
  };

  return (
    <Card
      role="region"
      aria-labelledby={`provider-${provider.slug}-name`}
      sx={{
        width: '100%',
        maxWidth: 400,
        borderRadius: 3,
        boxShadow: theme.shadows[1],
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" component="h2" id={`provider-${provider.slug}-name`}>
            {provider.name}
          </Typography>
          {loading ? (
            <CircularProgress size={20} aria-label="Loading provider status" />
          ) : (
            <Chip
              label={getPriorityLabel(provider.priority)}
              size="small"
              color={
                provider.priority >= 75
                  ? 'success'
                  : provider.priority >= 50
                  ? 'warning'
                  : 'error'
              }
            />
          )}
        </Box>

        <Box display="flex" alignItems="center" mb={1}>
          <Typography variant="body2" color="text.secondary" mr={1}>
            {currentLabels.activeLabel}:
          </Typography>
          <Switch
            checked={provider.isActive}
            onChange={handleToggle}
            disabled={loading || !onToggleActive}
            inputProps={{ 'aria-label': `${currentLabels.toggleActive} ${provider.name}` }}
            size="small"
          />
        </Box>

        <Box display="flex" alignItems="center" mb={1}>
          <Typography variant="body2" color="text.secondary" mr={1}>
            Circuit:
          </Typography>
          <Chip
            label={currentLabels[`circuit${provider.circuitState.charAt(0).toUpperCase() + provider.circuitState.slice(1)}` as keyof typeof currentLabels]}
            size="small"
            icon={getCircuitStateIcon(provider.circuitState)}
            sx={{ bgcolor: getCircuitStateColor(provider.circuitState), color: theme.palette.getContrastText(getCircuitStateColor(provider.circuitState)) }}
            aria-label={`Circuit state: ${provider.circuitState}`}
            data-circuit-state={provider.circuitState}
          />
          {provider.circuitState !== 'closed' && (
            <Chip
              label={`${currentLabels.failureCount}: ${provider.failureCount}`}
              size="small"
              sx={{ ml: 1, bgcolor: theme.palette.error.main, color: theme.palette.error.contrastText }}
              aria-label={`Failure count: ${provider.failureCount}`}
            />
          )}
          {provider.circuitState === 'open' && (
            <IconButton
              onClick={handleReset}
              disabled={loading || !onResetCircuit}
              aria-label={`${currentLabels.resetCircuit} ${provider.name}`}
              size="small"
              sx={{ ml: 1 }}
            >
              <RefreshIcon fontSize="inherit" />
            </IconButton>
          )}
        </Box>

        <Box mt={2}>
          <Typography variant="body2" color="text.secondary">
            {currentLabels.successRate}:{' '}
            <Typography component="span" variant="body2" color={getSuccessRateColor(provider.successRate)}>
              {provider.successRate.toFixed(1)}%
            </Typography>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentLabels.totalRequests}: {provider.totalRequests}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentLabels.lastSuccess}: {formatDateTime(provider.lastSuccessAt)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentLabels.lastFailure}: {formatDateTime(provider.lastFailureAt)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default ProviderHealthCard;