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
  Autocomplete,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminLanguage } from '@/lib/i18n';
import {
  COUNTRIES,
  getCountryName,
  PROVIDER_IDS,
  DATA_OPTIONS,
  SPEED_OPTIONS,
} from '@/lib/data/countries';

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
  const { t, locale } = useAdminLanguage();
  const productId = params.id as string;
  const isNew = productId === 'new';

  const redirectTimeoutRef = React.useRef<NodeJS.Timeout>();

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const [formData, setFormData] = React.useState<Partial<Product>>({
    name: '',
    slug: '',
    country: '',
    dataLimit: '',
    durationDays: 7,
    speed: '4G LTE',
    providerId: 'redteago',
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

  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // 국가 선택 시 자동으로 slug 생성
  const generateSlug = (country: string, dataLimit: string, duration: number) => {
    const countryInfo = COUNTRIES.find(c => c.code === country);
    const countryName = countryInfo?.nameEn?.toLowerCase().replace(/\s+/g, '-') || country.toLowerCase();
    const data = dataLimit.toLowerCase().replace(/\s+/g, '-');
    return `${countryName}-${data}-${duration}d`;
  };

  // 국가 선택 시 자동으로 상품명 생성
  const generateName = (country: string, dataLimit: string, duration: number) => {
    const countryInfo = COUNTRIES.find(c => c.code === country);
    const countryName = countryInfo ? getCountryName(countryInfo, locale) : country;
    const daysLabel = locale === 'ko' ? '일' : 'days';
    return `${countryName} eSIM ${dataLimit} ${duration}${daysLabel}`;
  };

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
        throw new Error(error.error || t.products.saveFailed);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      setSuccessMessage(isNew ? t.products.detail.productCreated : t.products.detail.productUpdated);
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      redirectTimeoutRef.current = setTimeout(() => {
        router.push('/admin/products');
      }, 1000);
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
      if (!res.ok) throw new Error(t.products.detail.deleteFailed);
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

  // 상품 복사 기능
  const handleDuplicate = () => {
    const copyLabel = locale === 'ko' ? ' (복사본)' : ' (Copy)';
    const newFormData = {
      ...formData,
      name: formData.name + copyLabel,
      slug: formData.slug + '-copy',
    };
    setFormData(newFormData);
    router.push('/admin/products/new');
  };

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

  // 선택된 국가 정보
  const selectedCountry = COUNTRIES.find(c => c.code === formData.country);

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/admin/products')}
          >
            {t.products.detail.back}
          </Button>
          <Typography variant="h5" fontWeight={600}>
            {isNew ? t.products.newProduct : t.products.editProduct}
          </Typography>
          {selectedCountry && (
            <Chip
              label={`${selectedCountry.flag} ${getCountryName(selectedCountry, locale)}`}
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
        <Box display="flex" gap={1}>
          {!isNew && (
            <>
              <Button
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={handleDuplicate}
              >
                {t.products.detail.copy}
              </Button>
              <Button
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  if (confirm(t.products.deleteConfirm)) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                {t.common.delete}
              </Button>
            </>
          )}
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? t.products.detail.saving : t.common.save}
          </Button>
        </Box>
      </Box>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Basic Info */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                {t.products.detail.basicInfo}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Autocomplete
                    options={COUNTRIES}
                    getOptionLabel={(option) => `${option.flag} ${getCountryName(option, locale)} (${option.code})`}
                    value={COUNTRIES.find(c => c.code === formData.country) || null}
                    onChange={(_, newValue) => {
                      const countryCode = newValue?.code || '';
                      handleChange('country', countryCode);
                      // 자동으로 상품명과 slug 생성
                      if (isNew && countryCode && formData.dataLimit && formData.durationDays) {
                        handleChange('name', generateName(countryCode, formData.dataLimit, formData.durationDays));
                        handleChange('slug', generateSlug(countryCode, formData.dataLimit, formData.durationDays));
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t.products.detail.selectCountry}
                        required
                        placeholder={t.products.detail.selectCountryPlaceholder}
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option.code}>
                        <span style={{ marginRight: 8 }}>{option.flag}</span>
                        {getCountryName(option, locale)} ({option.code})
                      </li>
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label={t.products.productName}
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    fullWidth
                    required
                    placeholder={t.products.detail.productNamePlaceholder}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label={t.products.slug}
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
                    fullWidth
                    required
                    helperText={t.products.detail.slugHelper}
                    placeholder={t.products.detail.slugPlaceholder}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" fontWeight={600} mb={2}>
                {t.products.detail.productSpec}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Autocomplete
                    freeSolo
                    options={[...DATA_OPTIONS, t.products.unlimited]}
                    value={formData.dataLimit || ''}
                    onChange={(_, newValue) => {
                      handleChange('dataLimit', newValue || '');
                      // 자동으로 상품명과 slug 업데이트
                      if (isNew && formData.country && newValue && formData.durationDays) {
                        handleChange('name', generateName(formData.country, newValue, formData.durationDays));
                        handleChange('slug', generateSlug(formData.country, newValue, formData.durationDays));
                      }
                    }}
                    onInputChange={(_, newValue) => {
                      handleChange('dataLimit', newValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t.products.detail.dataCapacity}
                        required
                        placeholder={t.products.detail.dataPlaceholder}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label={t.products.detail.validityDays}
                    type="number"
                    value={formData.durationDays}
                    onChange={(e) => {
                      const days = parseInt(e.target.value) || 0;
                      handleChange('durationDays', days);
                      // 자동으로 상품명과 slug 업데이트
                      if (isNew && formData.country && formData.dataLimit && days) {
                        handleChange('name', generateName(formData.country, formData.dataLimit, days));
                        handleChange('slug', generateSlug(formData.country, formData.dataLimit, days));
                      }
                    }}
                    fullWidth
                    required
                    inputProps={{ min: 1, max: 365 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>{t.products.speed}</InputLabel>
                    <Select
                      value={formData.speed || '4G LTE'}
                      label={t.products.speed}
                      onChange={(e) => handleChange('speed', e.target.value)}
                    >
                      {SPEED_OPTIONS.map(speed => (
                        <MenuItem key={speed} value={speed}>{speed}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" fontWeight={600} mb={2}>
                {t.products.detail.providerAndPrice}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>{t.products.detail.providerLabel}</InputLabel>
                    <Select
                      value={formData.providerId}
                      label={t.products.detail.providerLabel}
                      onChange={(e) => handleChange('providerId', e.target.value)}
                    >
                      {PROVIDER_IDS.map(providerId => (
                        <MenuItem key={providerId} value={providerId}>
                          {t.products.providers[providerId as keyof typeof t.products.providers]}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    label={t.products.detail.providerSku}
                    value={formData.providerSku}
                    onChange={(e) => handleChange('providerSku', e.target.value)}
                    fullWidth
                    required
                    helperText={t.products.detail.providerSkuHelper}
                    placeholder={t.products.detail.providerSkuPlaceholder}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label={t.products.detail.costUsd}
                    type="number"
                    value={formData.costPrice}
                    onChange={(e) => handleChange('costPrice', parseFloat(e.target.value) || 0)}
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    inputProps={{ step: 0.01, min: 0 }}
                    helperText={t.products.detail.costHelper}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label={t.products.detail.priceKrw}
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                    fullWidth
                    required
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₩</InputAdornment>,
                    }}
                    inputProps={{ step: 100, min: 0 }}
                    helperText={t.products.detail.priceHelper}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label={t.products.detail.marginRate}
                    value={`${marginPercent}%`}
                    fullWidth
                    disabled
                    helperText={t.products.detail.marginHelper}
                    sx={{
                      '& .MuiInputBase-input': {
                        color: parseFloat(marginPercent) >= 30 ? 'success.main' : parseFloat(marginPercent) >= 15 ? 'warning.main' : 'error.main',
                        fontWeight: 600,
                      }
                    }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" fontWeight={600} mb={2}>
                {t.products.detail.productDescription}
              </Typography>
              <TextField
                label={t.products.description}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                fullWidth
                multiline
                rows={3}
                placeholder={t.products.detail.descriptionPlaceholder}
              />

              <Box mt={2}>
                <TextField
                  label={t.products.detail.features}
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                  helperText={t.products.detail.featuresHelper}
                  placeholder={t.products.detail.featuresPlaceholder}
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
                {t.products.detail.statusSettings}
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={(e) => handleChange('isActive', e.target.checked)}
                      color="success"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={500}>
                        {t.products.detail.active}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t.products.detail.activeHelper}
                      </Typography>
                    </Box>
                  }
                />
                <Divider />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isFeatured}
                      onChange={(e) => handleChange('isFeatured', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" fontWeight={500}>
                        {t.products.detail.featured}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t.products.detail.featuredHelper}
                      </Typography>
                    </Box>
                  }
                />
                <Divider />
                <TextField
                  label={t.products.detail.stockCount}
                  type="number"
                  value={formData.stockCount}
                  onChange={(e) => handleChange('stockCount', parseInt(e.target.value) || 0)}
                  fullWidth
                  inputProps={{ min: 0 }}
                  helperText={t.products.detail.stockHelper}
                />
                <TextField
                  label={t.products.detail.sortOrder}
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => handleChange('sortOrder', parseInt(e.target.value) || 0)}
                  fullWidth
                  inputProps={{ min: 0 }}
                  helperText={t.products.detail.sortHelper}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Quick Preview */}
          {formData.name && (formData.price ?? 0) > 0 && (
            <Card sx={{ mt: 2, bgcolor: 'primary.50' }}>
              <CardContent>
                <Typography variant="subtitle2" color="primary" mb={1}>
                  {t.products.preview}
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {formData.name}
                </Typography>
                <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                  {formData.dataLimit && (
                    <Chip size="small" label={formData.dataLimit} />
                  )}
                  {formData.durationDays && (
                    <Chip size="small" label={`${formData.durationDays}${t.products.days}`} />
                  )}
                  {formData.speed && (
                    <Chip size="small" label={formData.speed} color={formData.speed === '5G' ? 'success' : 'default'} />
                  )}
                </Box>
                <Typography variant="h5" color="primary" fontWeight={700} mt={2}>
                  {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(formData.price ?? 0)}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
