'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Switch,
  Divider,
  Alert,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Product {
  id: string;
  name: string;
  slug: string;
  country: string;
  dataLimit: string;
  durationDays: number;
  speed?: string;
  providerId: string;
  providerSku: string;
  costPrice: number;
  price: number;
  isActive: boolean;
  isFeatured: boolean;
  stockCount: number;
  sortOrder: number;
  description?: string;
  features?: string[];
}

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const productId = params.id as string;
  const isNew = productId === 'new';

  const [formData, setFormData] = React.useState<Partial<Product>>({
    name: '',
    slug: '',
    country: '',
    dataLimit: '',
    durationDays: 7,
    speed: '4G LTE',
    providerId: 'airalo',
    providerSku: '',
    costPrice: 0,
    price: 0,
    isActive: true,
    isFeatured: false,
    stockCount: 999,
    sortOrder: 0,
    description: '',
    features: [],
  });

  const [featuresText, setFeaturesText] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ['admin', 'product', productId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/products/${productId}`);
      if (!res.ok) throw new Error('Product not found');
      return res.json();
    },
    enabled: !isNew,
  });

  // Populate form when product loads
  React.useEffect(() => {
    if (product) {
      setFormData(product);
      setFeaturesText(product.features?.join('\n') || '');
    }
  }, [product]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const url = isNew ? '/api/admin/products' : `/api/admin/products/${productId}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          features: featuresText.split('\n').filter((f) => f.trim()),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save product');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      router.push('/admin/products');
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete product');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      router.push('/admin/products');
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleChange = (field: keyof Product, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    saveMutation.mutate(formData);
  };

  // Calculate margin
  const marginPercent = formData.costPrice && formData.price
    ? (((formData.price - formData.costPrice * 1400) / (formData.costPrice * 1400)) * 100).toFixed(1)
    : '0';

  if (!isNew && isLoading) {
    return (
      <Box>
        <Skeleton height={60} />
        <Skeleton height={400} />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/admin/products')}
          >
            Back
          </Button>
          <Typography variant="h5" fontWeight={600}>
            {isNew ? 'New Product' : 'Edit Product'}
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          {!isNew && (
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => {
                if (confirm('Are you sure you want to delete this product?')) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saveMutation.isPending}
          >
            Save
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Basic Info */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Basic Information
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Product Name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Slug"
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
                    fullWidth
                    required
                    helperText="URL-friendly identifier"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Country Code"
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value.toUpperCase())}
                    fullWidth
                    required
                    inputProps={{ maxLength: 2 }}
                    helperText="ISO 2-letter code (e.g., JP, US)"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" fontWeight={600} mb={2}>
                Product Specs
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Data Limit"
                    value={formData.dataLimit}
                    onChange={(e) => handleChange('dataLimit', e.target.value)}
                    fullWidth
                    required
                    helperText="e.g., Unlimited, 10GB"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Duration (Days)"
                    type="number"
                    value={formData.durationDays}
                    onChange={(e) => handleChange('durationDays', parseInt(e.target.value) || 0)}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Speed"
                    value={formData.speed}
                    onChange={(e) => handleChange('speed', e.target.value)}
                    fullWidth
                    helperText="e.g., 4G LTE, 5G"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" fontWeight={600} mb={2}>
                Pricing
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>Provider</InputLabel>
                    <Select
                      value={formData.providerId}
                      label="Provider"
                      onChange={(e) => handleChange('providerId', e.target.value)}
                    >
                      <MenuItem value="airalo">Airalo</MenuItem>
                      <MenuItem value="esimcard">eSIM Card</MenuItem>
                      <MenuItem value="mobimatter">MobiMatter</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    label="Provider SKU"
                    value={formData.providerSku}
                    onChange={(e) => handleChange('providerSku', e.target.value)}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Cost Price"
                    type="number"
                    value={formData.costPrice}
                    onChange={(e) => handleChange('costPrice', parseFloat(e.target.value) || 0)}
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Sale Price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                    fullWidth
                    required
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₩</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Margin"
                    value={`${marginPercent}%`}
                    fullWidth
                    disabled
                    helperText="Auto-calculated"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" fontWeight={600} mb={2}>
                Description
              </Typography>
              <TextField
                label="Product Description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                fullWidth
                multiline
                rows={4}
              />

              <Box mt={2}>
                <TextField
                  label="Features (one per line)"
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                  helperText="Enter each feature on a new line"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Status */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Status
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) => handleChange('isActive', e.target.checked)}
                    />
                  }
                  label="Active"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isFeatured}
                      onChange={(e) => handleChange('isFeatured', e.target.checked)}
                    />
                  }
                  label="Featured"
                />
                <TextField
                  label="Stock Count"
                  type="number"
                  value={formData.stockCount}
                  onChange={(e) => handleChange('stockCount', parseInt(e.target.value) || 0)}
                  fullWidth
                />
                <TextField
                  label="Sort Order"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => handleChange('sortOrder', parseInt(e.target.value) || 0)}
                  fullWidth
                  helperText="Lower numbers appear first"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
