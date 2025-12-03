/**
 * ProviderHealthCard Component
 *
 * Card showing provider health status with circuit breaker info.
 *
 * Task: T104
 */

'use client';

import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import FormControlLabel from '@mui/material/FormControlLabel';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import { useTheme, alpha } from '@mui/material/styles';

/**
 * Circuit breaker states
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Provider health data
 */
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

/**
 * Component props
 */
export interface ProviderHealthCardProps {
  provider: ProviderHealth;
  onToggleActive?: (slug: string, isActive: boolean) => void;
  onResetCircuit?: (slug: string) => void;
}

/**
 * Circuit state configuration
 */
const circuitConfig: Record<
  CircuitState,
  {
    icon: React.ReactNode;
    color: 'success' | 'error' | 'warning';
    label: string;
  }
> = {
  closed: {
    icon: <CheckCircleIcon fontSize="small" />,
    color: 'success',
    label: 'Closed',
  },
  open: {
    icon: <ErrorIcon fontSize="small" />,
    color: 'error',
    label: 'Open',
  },
  'half-open': {
    icon: <WarningIcon fontSize="small" />,
    color: 'warning',
    label: 'Half-Open',
  },
};

/**
 * Get priority label
 */
function getPriorityLabel(priority: number): string {
  if (priority >= 75) return 'High';
  if (priority >= 50) return 'Medium';
  return 'Low';
}

/**
 * Get success rate color
 */
function getSuccessRateColor(rate: number): 'success' | 'warning' | 'error' {
  if (rate >= 95) return 'success';
  if (rate >= 80) return 'warning';
  return 'error';
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * ProviderHealthCard Component
 */
export function ProviderHealthCard({
  provider,
  onToggleActive,
  onResetCircuit,
}: ProviderHealthCardProps) {
  const theme = useTheme();
  const circuitInfo = circuitConfig[provider.circuitState];
  const priorityLabel = getPriorityLabel(provider.priority);
  const successRateColor = getSuccessRateColor(provider.successRate);

  const canReset = provider.circuitState === 'open';

  return (
    <Card
      data-testid={`provider-card-${provider.slug}`}
      sx={{
        height: '100%',
        borderRadius: 3,
        opacity: provider.isActive ? 1 : 0.7,
      }}
      elevation={1}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* Header: Name and Active Toggle */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 2,
          }}
        >
          <Box>
            <Typography
              variant="h6"
              component="h3"
              sx={{ fontWeight: 600, mb: 0.5 }}
            >
              {provider.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={priorityLabel}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
              <Chip
                label={`Priority: ${provider.priority}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            </Box>
          </Box>

          {onToggleActive && (
            <FormControlLabel
              control={
                <Switch
                  checked={provider.isActive}
                  onChange={(e) => onToggleActive(provider.slug, e.target.checked)}
                  data-testid={`toggle-active-${provider.slug}`}
                  aria-label={`Toggle ${provider.name} active status`}
                />
              }
              label={provider.isActive ? 'Active' : 'Inactive'}
              labelPlacement="start"
              sx={{ mr: 0 }}
            />
          )}
        </Box>

        {/* Circuit Breaker Status */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Circuit Breaker
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={circuitInfo.icon as React.ReactElement}
              label={circuitInfo.label}
              color={circuitInfo.color}
              size="small"
              data-testid={`circuit-status-${provider.slug}`}
              role="status"
            />
            {provider.circuitState !== 'closed' && (
              <Typography variant="caption" color="text.secondary">
                Failures: {provider.failureCount}
              </Typography>
            )}
            {canReset && onResetCircuit && (
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => onResetCircuit(provider.slug)}
                data-testid={`reset-circuit-${provider.slug}`}
                aria-label={`Reset circuit breaker for ${provider.name}`}
                sx={{ ml: 'auto' }}
              >
                Reset
              </Button>
            )}
          </Box>
        </Box>

        {/* Success Rate */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Success Rate
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: `${successRateColor}.main`,
              }}
            >
              {provider.successRate.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={provider.successRate}
            color={successRateColor}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: alpha(theme.palette[successRateColor].main, 0.1),
            }}
          />
        </Box>

        {/* Stats */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1.5,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Requests
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {provider.totalRequests.toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Last Success
            </Typography>
            <Tooltip title={provider.lastSuccessAt || 'Never'}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'success.main' }}>
                {formatRelativeTime(provider.lastSuccessAt)}
              </Typography>
            </Tooltip>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Last Failure
            </Typography>
            <Tooltip title={provider.lastFailureAt || 'Never'}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'error.main' }}>
                {formatRelativeTime(provider.lastFailureAt)}
              </Typography>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default ProviderHealthCard;
