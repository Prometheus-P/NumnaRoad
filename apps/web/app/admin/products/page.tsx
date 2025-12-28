'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Switch,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Product {
  id: string;
  name: string;
  slug: string;
  country: string;
  dataLimit: string;
  durationDays: number;
  providerId: string;
  providerSku: string;
  costPrice: number;
  price: number;
  isActive: boolean;
  isFeatured: boolean;
  stockCount: number;
  sortOrder: number;
}

interface ProductsResponse {
  items: Product[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

// Country flag emoji helper
function getCountryFlag(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return '';
  const offset = 127397;
  return String.fromCodePoint(
    code.charCodeAt(0) + offset,
    code.charCodeAt(1) + offset
  );
}

// Format currency
function formatCurrency(value: number, currency: string = 'KRW'): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
  }).format(value);
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(25);
  const [search, setSearch] = React.useState('');
  const [country, setCountry] = React.useState('');
  const [provider, setProvider] = React.useState('');

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState(search);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, refetch } = useQuery<ProductsResponse>({
    queryKey: ['admin', 'products', page, pageSize, debouncedSearch, country, provider],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      params.set('limit', String(pageSize));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (country) params.set('country', country);
      if (provider) params.set('provider', provider);

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error('Failed to update product');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/sync-products', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const columns: GridColDef[] = [
    {
      field: 'isActive',
      headerName: 'Active',
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Switch
          checked={params.value}
          onChange={(e) => {
            e.stopPropagation();
            toggleActiveMutation.mutate({ id: params.row.id, isActive: e.target.checked });
          }}
          size="small"
        />
      ),
    },
    {
      field: 'name',
      headerName: 'Product Name',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'country',
      headerName: 'Country',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Box display="flex" alignItems="center" gap={1}>
          <span>{getCountryFlag(params.value)}</span>
          <span>{params.value}</span>
        </Box>
      ),
    },
    {
      field: 'dataLimit',
      headerName: 'Data',
      width: 100,
    },
    {
      field: 'durationDays',
      headerName: 'Duration',
      width: 90,
      renderCell: (params: GridRenderCellParams) => `${params.value}d`,
    },
    {
      field: 'costPrice',
      headerName: 'Cost',
      width: 100,
      renderCell: (params: GridRenderCellParams) => formatUSD(params.value),
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 120,
      renderCell: (params: GridRenderCellParams) => formatCurrency(params.value),
    },
    {
      field: 'providerId',
      headerName: 'Provider',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={params.value || 'N/A'} size="small" variant="outlined" />
      ),
    },
    {
      field: 'stockCount',
      headerName: 'Stock',
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Typography
          variant="body2"
          color={params.value > 0 ? 'text.primary' : 'error'}
        >
          {params.value}
        </Typography>
      ),
    },
  ];

  // Get unique countries and providers for filters
  const countries = React.useMemo(() => {
    if (!data?.items) return [];
    return Array.from(new Set(data.items.map((p) => p.country))).sort();
  }, [data?.items]);

  const providers = React.useMemo(() => {
    if (!data?.items) return [];
    return Array.from(new Set(data.items.map((p) => p.providerId).filter(Boolean))).sort();
  }, [data?.items]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          Products
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            Sync Products
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/admin/products/new')}
          >
            Add Product
          </Button>
          <Tooltip title="Refresh">
            <IconButton onClick={() => refetch()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Box display="flex" gap={2} flexWrap="wrap">
          <TextField
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Country</InputLabel>
            <Select
              value={country}
              label="Country"
              onChange={(e) => setCountry(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {countries.map((c) => (
                <MenuItem key={c} value={c}>
                  {getCountryFlag(c)} {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Provider</InputLabel>
            <Select
              value={provider}
              label="Provider"
              onChange={(e) => setProvider(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {providers.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Card>

      {/* Data Grid */}
      <Card>
        <DataGrid
          rows={data?.items || []}
          columns={columns}
          loading={isLoading}
          paginationMode="server"
          rowCount={data?.totalItems || 0}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
          pageSizeOptions={[25, 50, 100]}
          disableRowSelectionOnClick
          onRowClick={(params) => router.push(`/admin/products/${params.id}`)}
          sx={{
            border: 'none',
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
            },
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
          autoHeight
        />
      </Card>
    </Box>
  );
}
