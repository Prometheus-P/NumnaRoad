'use client';

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
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
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridRowId, GridRowSelectionModel } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ReplayIcon from '@mui/icons-material/Replay';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Order {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName?: string;
  productName: string;
  totalPrice: number;
  status: string;
  salesChannel: string;
  created: string;
}

interface OrdersResponse {
  items: Order[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
  const getColor = (): 'success' | 'warning' | 'info' | 'error' | 'default' => {
    switch (status) {
      case 'completed':
      case 'delivered':
      case 'email_sent':
        return 'success';
      case 'pending':
      case 'payment_received':
        return 'warning';
      case 'processing':
      case 'fulfillment_started':
      case 'provider_confirmed':
        return 'info';
      case 'failed':
      case 'provider_failed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Chip
      label={status.replace(/_/g, ' ')}
      color={getColor()}
      size="small"
      sx={{ textTransform: 'capitalize' }}
    />
  );
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(value);
}

// Format date
function formatDate(date: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

// Copyable Order ID component
function CopyableOrderId({ orderId }: { orderId: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box display="flex" alignItems="center" gap={0.5}>
      <Tooltip title={orderId} placement="top">
        <Typography
          variant="body2"
          fontWeight={500}
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            maxWidth: 100,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {orderId}
        </Typography>
      </Tooltip>
      <Tooltip title={copied ? 'Copied!' : 'Copy ID'}>
        <IconButton
          size="small"
          onClick={handleCopy}
          sx={{
            p: 0.25,
            '& .MuiSvgIcon-root': { fontSize: '0.9rem' },
          }}
        >
          {copied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// Retryable order states
const RETRYABLE_STATES = [
  'failed',
  'provider_failed',
  'pending_manual_fulfillment',
  'fulfillment_started',
  'payment_received',
];

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);
  const [search, setSearch] = React.useState(searchParams.get('search') || '');
  const [status, setStatus] = React.useState(searchParams.get('status') || '');
  const [channel, setChannel] = React.useState(searchParams.get('channel') || '');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [selectedRowIds, setSelectedRowIds] = React.useState<GridRowId[]>([]);

  // Handle row selection model changes (MUI X v8 uses { type, ids } structure)
  const handleSelectionChange = React.useCallback((model: GridRowSelectionModel) => {
    setSelectedRowIds(Array.from(model.ids));
  }, []);

  // Convert selectedRowIds back to GridRowSelectionModel for DataGrid
  const rowSelectionModel: GridRowSelectionModel = React.useMemo(() => ({
    type: 'include' as const,
    ids: new Set(selectedRowIds),
  }), [selectedRowIds]);
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState(search);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, refetch } = useQuery<OrdersResponse>({
    queryKey: ['admin', 'orders', page, pageSize, debouncedSearch, status, channel, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      params.set('limit', String(pageSize));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status) params.set('status', status);
      if (channel) params.set('channel', channel);
      if (fromDate) params.set('from', new Date(fromDate).toISOString());
      if (toDate) params.set('to', new Date(toDate).toISOString());

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
  });

  // Bulk retry mutation
  const bulkRetryMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const res = await fetch('/api/admin/orders/bulk-retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Bulk retry failed');
      }
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setSelectedRowIds([]);
      setSnackbar({
        open: true,
        message: `${result.retried}건 재시도 요청됨 (스킵: ${result.skipped}, 실패: ${result.failed})`,
        severity: result.retried > 0 ? 'success' : 'info',
      });
    },
    onError: (error: Error) => {
      setSnackbar({
        open: true,
        message: error.message || '벌크 재시도에 실패했습니다.',
        severity: 'error',
      });
    },
  });

  // Get retryable selected orders
  const retryableSelectedOrders = React.useMemo(() => {
    if (!data?.items || selectedRowIds.length === 0) return [];
    return data.items.filter(
      (order) => selectedRowIds.includes(order.id) && RETRYABLE_STATES.includes(order.status)
    );
  }, [data?.items, selectedRowIds]);

  const handleBulkRetry = () => {
    if (retryableSelectedOrders.length === 0) return;
    bulkRetryMutation.mutate(retryableSelectedOrders.map((o) => o.id));
  };

  const columns: GridColDef[] = [
    {
      field: 'orderNumber',
      headerName: 'Order ID',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <CopyableOrderId orderId={params.value || params.row.id} />
      ),
    },
    {
      field: 'customerEmail',
      headerName: 'Customer',
      flex: 1,
      minWidth: 180,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography variant="body2" noWrap>
            {params.row.customerName || params.value}
          </Typography>
          {params.row.customerName && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {params.value}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'productName',
      headerName: 'Product',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'totalPrice',
      headerName: 'Amount',
      width: 120,
      renderCell: (params: GridRenderCellParams) => formatCurrency(params.value),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params: GridRenderCellParams) => <StatusBadge status={params.value} />,
    },
    {
      field: 'salesChannel',
      headerName: 'Channel',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          size="small"
          variant="outlined"
          sx={{ textTransform: 'capitalize' }}
        />
      ),
    },
    {
      field: 'created',
      headerName: 'Date',
      width: 160,
      renderCell: (params: GridRenderCellParams) => formatDate(params.value),
    },
  ];

  return (
    <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h5" fontWeight={600}>
              Orders
            </Typography>
            {selectedRowIds.length > 0 && (
              <Chip
                label={`${selectedRowIds.length} selected`}
                size="small"
                onDelete={() => setSelectedRowIds([])}
              />
            )}
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {retryableSelectedOrders.length > 0 && (
              <Button
                variant="contained"
                color="warning"
                size="small"
                startIcon={bulkRetryMutation.isPending ? <CircularProgress size={16} /> : <ReplayIcon />}
                onClick={handleBulkRetry}
                disabled={bulkRetryMutation.isPending}
              >
                Retry Selected ({retryableSelectedOrders.length})
              </Button>
            )}
            <Tooltip title="Refresh">
              <IconButton onClick={() => refetch()}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" gap={2} flexWrap="wrap">
              <TextField
                placeholder="Search by order ID or email..."
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
                <InputLabel>Status</InputLabel>
                <Select
                  value={status}
                  label="Status"
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Channel</InputLabel>
                <Select
                  value={channel}
                  label="Channel"
                  onChange={(e) => setChannel(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="stripe">Stripe</MenuItem>
                  <MenuItem value="smartstore">SmartStore</MenuItem>
                  <MenuItem value="tosspay">TossPay</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="From"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                size="small"
                sx={{ width: 160 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="To"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                size="small"
                sx={{ width: 160 }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </CardContent>
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
            pageSizeOptions={[10, 25, 50, 100]}
            checkboxSelection
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={handleSelectionChange}
            onRowClick={(params, event) => {
              // Don't navigate if clicking checkbox
              const target = event.target as HTMLElement;
              if (target.closest('.MuiCheckbox-root')) return;
              router.push(`/admin/orders/${params.id}`);
            }}
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

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
    </Box>
  );
}
