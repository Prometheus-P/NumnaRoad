'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Grid,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import pb from '../../../../lib/pocketbase';
import type {
  ProductBundle,
  ProductBundlesRecord,
  EsimProductsRecord,
} from '../../../../types/pocketbase-types';

type BundleWithProducts = ProductBundlesRecord & {
  id: string;
  created: string;
  updated: string;
  expand?: {
    products: EsimProductsRecord[];
  };
};

const bundleTypeLabels: Record<string, { label: string; color: 'primary' | 'secondary' | 'success' | 'warning' }> = {
  multi_country: { label: 'Multi-Country', color: 'primary' },
  data_package: { label: 'Data Package', color: 'secondary' },
  travel_kit: { label: 'Travel Kit', color: 'success' },
  custom: { label: 'Custom', color: 'warning' },
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function BundleCard({
  bundle,
  onToggleActive,
  onToggleFeatured,
  onEdit,
  onView,
}: {
  bundle: BundleWithProducts;
  onToggleActive: (id: string, isActive: boolean) => void;
  onToggleFeatured: (id: string, isFeatured: boolean) => void;
  onEdit: (id: string) => void;
  onView: (slug: string) => void;
}) {
  const products = bundle.expand?.products || [];
  const typeInfo = bundleTypeLabels[bundle.bundle_type] || { label: bundle.bundle_type, color: 'primary' as const };
  const savingsPercent = bundle.individual_price_sum > 0
    ? Math.round(((bundle.individual_price_sum - bundle.bundle_price) / bundle.individual_price_sum) * 100)
    : 0;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
            {bundle.name}
          </Typography>
          <Tooltip title={bundle.is_featured ? 'Featured' : 'Not Featured'}>
            <IconButton
              size="small"
              onClick={() => onToggleFeatured(bundle.id, !bundle.is_featured)}
              color={bundle.is_featured ? 'warning' : 'default'}
            >
              {bundle.is_featured ? <StarIcon /> : <StarBorderIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip label={typeInfo.label} color={typeInfo.color} size="small" />
          {bundle.region && <Chip label={bundle.region} variant="outlined" size="small" />}
          <Chip
            label={bundle.is_active ? 'Active' : 'Inactive'}
            color={bundle.is_active ? 'success' : 'default'}
            size="small"
          />
        </Stack>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {bundle.total_duration_days} days • {bundle.total_data || 'Unlimited'}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
            {formatCurrency(bundle.individual_price_sum, bundle.currency)}
          </Typography>
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
              {formatCurrency(bundle.bundle_price, bundle.currency)}
            </Typography>
            {savingsPercent > 0 && (
              <Chip label={`-${savingsPercent}%`} color="error" size="small" />
            )}
          </Stack>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {products.length} products included:
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          {products.slice(0, 3).map((product) => (
            <Chip
              key={product.slug}
              label={product.name}
              size="small"
              variant="outlined"
            />
          ))}
          {products.length > 3 && (
            <Chip label={`+${products.length - 3} more`} size="small" />
          )}
        </Stack>

        {bundle.max_purchases && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Purchases: {bundle.current_purchases} / {bundle.max_purchases}
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={bundle.is_active}
              onChange={(e) => onToggleActive(bundle.id, e.target.checked)}
              size="small"
            />
          }
          label="Active"
        />
        <Box>
          <Tooltip title="View">
            <IconButton size="small" onClick={() => onView(bundle.slug)}>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onEdit(bundle.id)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </CardActions>
    </Card>
  );
}

export default function AdminBundlesPage() {
  const [bundles, setBundles] = useState<BundleWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBundles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pb.collection('product_bundles').getFullList<BundleWithProducts>({
        sort: '-is_featured,sort_order,name',
        expand: 'products',
      });
      setBundles(result);
    } catch (err) {
      console.error('Failed to fetch bundles:', err);
      setError('Failed to load bundles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  const handleToggleActive = useCallback(async (id: string, isActive: boolean) => {
    try {
      await pb.collection('product_bundles').update(id, { is_active: isActive });
      fetchBundles();
    } catch (err) {
      console.error(`Failed to toggle active status:`, err);
      setError('Failed to update bundle status.');
    }
  }, [fetchBundles]);

  const handleToggleFeatured = useCallback(async (id: string, isFeatured: boolean) => {
    try {
      await pb.collection('product_bundles').update(id, { is_featured: isFeatured });
      fetchBundles();
    } catch (err) {
      console.error(`Failed to toggle featured status:`, err);
      setError('Failed to update bundle status.');
    }
  }, [fetchBundles]);

  const handleEdit = useCallback((id: string) => {
    // TODO: Navigate to edit page or open modal
    console.log('Edit bundle:', id);
  }, []);

  const handleView = useCallback((slug: string) => {
    window.open(`/api/bundles/${slug}`, '_blank');
  }, []);

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Product Bundles
        </Typography>
        <Button variant="contained" color="primary">
          Create Bundle
        </Button>
      </Box>

      {bundles.length === 0 ? (
        <Alert severity="info">
          No bundles found. Create your first bundle to get started.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {bundles.map((bundle) => (
            <Grid item xs={12} sm={6} md={4} key={bundle.id}>
              <BundleCard
                bundle={bundle}
                onToggleActive={handleToggleActive}
                onToggleFeatured={handleToggleFeatured}
                onEdit={handleEdit}
                onView={handleView}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
