/**
 * Admin Providers Page
 *
 * Provider health status cards with circuit breaker management.
 *
 * Task: T110
 */

'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import { ProviderHealthCard, ProviderHealth } from '@/components/ui/ProviderHealthCard';

/**
 * Initial mock providers data
 */
const initialProviders: ProviderHealth[] = [
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
 * Admin Providers Page
 */
export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<ProviderHealth[]>(initialProviders);
  const [alertMessage, setAlertMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  /**
   * Handle provider active toggle
   */
  const handleToggleActive = (slug: string, isActive: boolean) => {
    setProviders((prev) =>
      prev.map((p) => (p.slug === slug ? { ...p, isActive } : p))
    );

    const provider = providers.find((p) => p.slug === slug);
    setAlertMessage({
      type: 'success',
      message: `${provider?.name} has been ${isActive ? 'activated' : 'deactivated'}`,
    });

    setTimeout(() => setAlertMessage(null), 3000);
  };

  /**
   * Handle circuit breaker reset
   */
  const handleResetCircuit = (slug: string) => {
    setProviders((prev) =>
      prev.map((p) =>
        p.slug === slug
          ? { ...p, circuitState: 'half-open' as const, failureCount: 0 }
          : p
      )
    );

    const provider = providers.find((p) => p.slug === slug);
    setAlertMessage({
      type: 'info',
      message: `Circuit breaker for ${provider?.name} has been reset to half-open state`,
    });

    setTimeout(() => setAlertMessage(null), 3000);
  };

  /**
   * Refresh all providers
   */
  const handleRefresh = () => {
    // TODO: Fetch from API
    setAlertMessage({
      type: 'info',
      message: 'Provider health data refreshed',
    });
    setTimeout(() => setAlertMessage(null), 2000);
  };

  // Calculate summary stats
  const activeCount = providers.filter((p) => p.isActive).length;
  const healthyCount = providers.filter(
    (p) => p.isActive && p.circuitState === 'closed'
  ).length;
  const avgSuccessRate =
    providers.filter((p) => p.isActive).reduce((sum, p) => sum + p.successRate, 0) /
    (activeCount || 1);

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Provider Health
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          variant="outlined"
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </Box>

      {/* Alert */}
      {alertMessage && (
        <Alert
          severity={alertMessage.type}
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setAlertMessage(null)}
        >
          {alertMessage.message}
        </Alert>
      )}

      {/* Summary */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="body1" color="text.secondary">
          <strong>{activeCount}</strong> of {providers.length} providers active
          {' • '}
          <strong>{healthyCount}</strong> healthy (closed circuit)
          {' • '}
          Average success rate: <strong>{avgSuccessRate.toFixed(1)}%</strong>
        </Typography>
      </Box>

      {/* Provider Cards */}
      <Grid container spacing={3}>
        {providers.map((provider) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={provider.slug}>
            <ProviderHealthCard
              provider={provider}
              onToggleActive={handleToggleActive}
              onResetCircuit={handleResetCircuit}
            />
          </Grid>
        ))}
      </Grid>

      {/* Provider Priority Explanation */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Provider Priority & Failover
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Orders are processed using the highest priority provider first.
          If a provider fails or has an open circuit, the system automatically
          fails over to the next available provider. Circuit breakers open after
          5 consecutive failures and reset after 30 seconds to half-open state.
        </Typography>
      </Box>
    </Box>
  );
}
