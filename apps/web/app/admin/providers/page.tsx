'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, CircularProgress, Alert, Grid } from '@mui/material';
import ProviderHealthCard from '../../../../components/ui/ProviderHealthCard';
import pb from '../../../../lib/pocketbase';
import { EsimProvider as PBProvider } from '../../../../types/pocketbase-types';
import { ProviderHealth } from '../../../../components/ui/ProviderHealthCard'; // Re-use the interface from OrderStatsCard's test

// Function to transform PocketBase provider record to ProviderHealth for UI
function transformPbProviderToUIProvider(pbProvider: PBProvider): ProviderHealth {
    // Mock circuit breaker state and other dynamic data for now
    // In a real app, this would come from a backend API that monitors provider health
    const mockCircuitStates: Record<string, ProviderHealth['circuitState']> = {
        'airalo': 'closed',
        'esimcard': 'half-open',
        'mobimatter': 'open',
    };
    const mockSuccessRates: Record<string, number> = {
        'airalo': 98.5,
        'esimcard': 85.2,
        'mobimatter': 45.0,
    };
    const mockTotalRequests: Record<string, number> = {
        'airalo': 4500,
        'esimcard': 890,
        'mobimatter': 120,
    };
    const mockLastSuccessAt: Record<string, string | null> = {
        'airalo': '2024-01-20T10:30:00Z',
        'esimcard': '2024-01-20T09:45:00Z',
        'mobimatter': '2024-01-19T14:00:00Z',
    };
    const mockLastFailureAt: Record<string, string | null> = {
        'airalo': null,
        'esimcard': '2024-01-20T09:30:00Z',
        'mobimatter': '2024-01-20T10:00:00Z',
    };
    const mockFailureCount: Record<string, number> = {
        'airalo': 0,
        'esimcard': 2,
        'mobimatter': 5,
    };


    return {
        slug: pbProvider.slug,
        name: pbProvider.name,
        priority: pbProvider.priority,
        isActive: pbProvider.isActive,
        circuitState: mockCircuitStates[pbProvider.slug] || 'closed',
        successRate: mockSuccessRates[pbProvider.slug] || 100,
        totalRequests: mockTotalRequests[pbProvider.slug] || 0,
        lastSuccessAt: mockLastSuccessAt[pbProvider.slug] || null,
        lastFailureAt: mockLastFailureAt[pbProvider.slug] || null,
        failureCount: mockFailureCount[pbProvider.slug] || 0,
    };
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pb.collection('esim_providers').getFullList<PBProvider>();
      setProviders(result.map(transformPbProviderToUIProvider));
    } catch (err) {
      console.error('Failed to fetch providers:', err);
      setError('Failed to load providers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleToggleActive = useCallback(async (slug: string, isActive: boolean) => {
    console.log(`Toggling active status for ${slug} to ${isActive}`);
    // In a real app, this would update PocketBase or call an API endpoint
    // For now, just re-fetch to reflect potential changes (or update state optimistically)
    try {
        await pb.collection('esim_providers').update(slug, { isActive: isActive });
        fetchProviders(); // Re-fetch to update UI
    } catch (err) {
        console.error(`Failed to toggle active status for ${slug}:`, err);
        setError(`Failed to update ${slug} status.`);
    }
  }, [fetchProviders]);

  const handleResetCircuit = useCallback(async (slug: string) => {
    console.log(`Resetting circuit for ${slug}`);
    // In a real app, this would call an API endpoint to reset the circuit breaker
    // For now, just re-fetch
    try {
        // Assume an API call or PocketBase update for resetting circuit state
        // await pb.collection('esim_providers').update(slug, { circuitState: 'closed' });
        fetchProviders(); // Re-fetch to update UI
    } catch (err) {
        console.error(`Failed to reset circuit for ${slug}:`, err);
        setError(`Failed to reset circuit for ${slug}.`);
    }
  }, [fetchProviders]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Provider Health
      </Typography>

      <Grid container spacing={2} sx={{ mt: 3 }}>
        {providers.map((provider) => (
          <Grid item xs={12} sm={6} md={4} key={provider.slug}>
            <ProviderHealthCard
              provider={provider}
              onToggleActive={handleToggleActive}
              onResetCircuit={handleResetCircuit}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}