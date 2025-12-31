'use client';

import React, { memo } from 'react';
import { Box, Card, CardContent, Typography, Chip, LinearProgress } from '@mui/material';

export interface ProviderStatus {
  name: string;
  state: 'CLOSED' | 'HALF_OPEN' | 'OPEN';
  successRate: number;
  consecutiveFailures: number;
}

interface ProviderStatusCardProps {
  provider: ProviderStatus;
  stateLabels: { closed: string; halfOpen: string; open: string };
  successRateLabel: string;
  consecutiveFailuresLabel: string;
}

export const ProviderStatusCard = memo(function ProviderStatusCard({
  provider,
  stateLabels,
  successRateLabel,
  consecutiveFailuresLabel,
}: ProviderStatusCardProps) {
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
});
