/**
 * Admin Orders Page
 *
 * Orders list with DataTable, filtering, and search.
 *
 * Tasks: T107, T108
 */

'use client';

import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/ui/DataTable';
import { StatusChip, OrderStatus } from '@/components/ui/StatusChip';

/**
 * Order data type
 */
interface Order {
  id: string;
  status: OrderStatus;
  customerEmail: string;
  productName: string;
  country: string;
  amount: number;
  provider: string;
  createdAt: string;
  completedAt: string | null;
}

/**
 * Mock orders data
 */
const mockOrders: Order[] = [
  {
    id: 'abc123def456ghi',
    status: 'completed',
    customerEmail: 'john@example.com',
    productName: 'Korea 5GB - 7 Days',
    country: 'KR',
    amount: 15000,
    provider: 'airalo',
    createdAt: '2024-01-17T10:30:00Z',
    completedAt: '2024-01-17T10:32:00Z',
  },
  {
    id: 'def456ghi789jkl',
    status: 'processing',
    customerEmail: 'jane@example.com',
    productName: 'Japan 10GB - 14 Days',
    country: 'JP',
    amount: 25000,
    provider: 'esimcard',
    createdAt: '2024-01-17T11:00:00Z',
    completedAt: null,
  },
  {
    id: 'ghi789jkl012mno',
    status: 'pending',
    customerEmail: 'bob@example.com',
    productName: 'Thailand 3GB - 7 Days',
    country: 'TH',
    amount: 10000,
    provider: 'airalo',
    createdAt: '2024-01-17T11:30:00Z',
    completedAt: null,
  },
  {
    id: 'jkl012mno345pqr',
    status: 'failed',
    customerEmail: 'alice@example.com',
    productName: 'Vietnam 5GB - 7 Days',
    country: 'VN',
    amount: 12000,
    provider: 'mobimatter',
    createdAt: '2024-01-17T12:00:00Z',
    completedAt: null,
  },
  {
    id: 'mno345pqr678stu',
    status: 'completed',
    customerEmail: 'charlie@example.com',
    productName: 'Singapore 10GB - 30 Days',
    country: 'SG',
    amount: 35000,
    provider: 'airalo',
    createdAt: '2024-01-16T09:00:00Z',
    completedAt: '2024-01-16T09:05:00Z',
  },
];

/**
 * Format date for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format amount
 */
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
}

/**
 * Column definitions
 */
const columns: GridColDef<Order>[] = [
  {
    field: 'id',
    headerName: 'Order ID',
    width: 150,
    renderCell: (params) => (
      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
        {params.value.slice(0, 8)}...
      </Typography>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 120,
    renderCell: (params) => <StatusChip status={params.value} />,
  },
  {
    field: 'customerEmail',
    headerName: 'Customer',
    width: 200,
    flex: 1,
  },
  {
    field: 'productName',
    headerName: 'Product',
    width: 200,
    flex: 1,
  },
  {
    field: 'country',
    headerName: 'Country',
    width: 80,
    align: 'center',
    headerAlign: 'center',
  },
  {
    field: 'amount',
    headerName: 'Amount',
    width: 120,
    align: 'right',
    headerAlign: 'right',
    renderCell: (params) => formatAmount(params.value),
  },
  {
    field: 'provider',
    headerName: 'Provider',
    width: 100,
    renderCell: (params) => (
      <Chip label={params.value} size="small" variant="outlined" />
    ),
  },
  {
    field: 'createdAt',
    headerName: 'Created',
    width: 160,
    renderCell: (params) => formatDate(params.value),
  },
];

/**
 * Admin Orders Page
 */
export default function AdminOrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');

  // Filter orders
  const filteredOrders = useMemo(() => {
    return mockOrders.filter((order) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          order.customerEmail.toLowerCase().includes(query) ||
          order.productName.toLowerCase().includes(query) ||
          order.id.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      // Provider filter
      if (providerFilter !== 'all' && order.provider !== providerFilter) {
        return false;
      }

      return true;
    });
  }, [searchQuery, statusFilter, providerFilter]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setProviderFilter('all');
  };

  const handleRowClick = (row: Order) => {
    // TODO: Open order detail dialog (T109)
    console.log('Order clicked:', row.id);
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Orders
        </Typography>
        <Button startIcon={<RefreshIcon />} variant="outlined">
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search */}
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by email, product, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              data-testid="search-input"
              aria-label="Search orders"
            />
          </Grid>

          {/* Status Filter */}
          <Grid size={{ xs: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
                data-testid="filter-status"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="processing">Processing</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Provider Filter */}
          <Grid size={{ xs: 6, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Provider</InputLabel>
              <Select
                value={providerFilter}
                label="Provider"
                onChange={(e) => setProviderFilter(e.target.value)}
                data-testid="filter-provider"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="airalo">Airalo</MenuItem>
                <MenuItem value="esimcard">eSIMCard</MenuItem>
                <MenuItem value="mobimatter">MobiMatter</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Reset Button */}
          <Grid size={{ xs: 12, md: 2 }}>
            <Button
              startIcon={<FilterListIcon />}
              onClick={handleResetFilters}
              fullWidth
              data-testid="filter-reset"
            >
              Reset Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Results Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredOrders.length} of {mockOrders.length} orders
      </Typography>

      {/* Data Table */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          rows={filteredOrders}
          onRowClick={handleRowClick}
          pageSize={10}
          height={600}
        />
      </Paper>
    </Box>
  );
}
