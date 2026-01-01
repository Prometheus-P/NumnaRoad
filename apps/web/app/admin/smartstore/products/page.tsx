'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  LinearProgress,
  Snackbar,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { formatTimeAgo, formatCurrency } from '@/lib/utils/formatters';

// ============================================================================
// Types
// ============================================================================

interface ProductWithSyncStatus {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  dataLimit: string;
  durationDays: number;
  price: number;
  isActive: boolean;
  provider: string;
  syncStatus: 'pending' | 'synced' | 'failed' | 'not_synced';
  smartstoreProductNo: string | null;
  lastSyncAt: string | null;
  autoSync: boolean;
  lastError: string | null;
}

interface ProductsResponse {
  items: ProductWithSyncStatus[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

interface SyncStatusSummary {
  total: number;
  synced: number;
  pending: number;
  failed: number;
  notSynced: number;
}

interface SyncResult {
  success: boolean;
  result?: {
    total: number;
    created: number;
    updated: number;
    failed: number;
    skipped: number;
    durationMs: number;
  };
  error?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getSyncStatusChip(status: string) {
  switch (status) {
    case 'synced':
      return <Chip icon={<CheckCircleIcon />} label="Synced" color="success" size="small" />;
    case 'pending':
      return <Chip icon={<PendingIcon />} label="Pending" color="warning" size="small" />;
    case 'failed':
      return <Chip icon={<ErrorIcon />} label="Failed" color="error" size="small" />;
    default:
      return <Chip icon={<CloudOffIcon />} label="Not Synced" color="default" size="small" />;
  }
}

// ============================================================================
// Component
// ============================================================================

export default function SmartStoreProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(20);
  const [search, setSearch] = React.useState('');
  const [syncDialogOpen, setSyncDialogOpen] = React.useState(false);
  const [selectedProducts, setSelectedProducts] = React.useState<string[]>([]);
  const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch products
  const { data: productsData, isLoading: productsLoading, refetch: refetchProducts } = useQuery<ProductsResponse>({
    queryKey: ['smartstore-products', page, rowsPerPage, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        perPage: rowsPerPage.toString(),
      });
      if (search) params.append('search', search);

      const res = await fetch(`/api/admin/smartstore/products?${params}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
  });

  // Fetch sync status summary
  const { data: syncStatus, refetch: refetchStatus } = useQuery<SyncStatusSummary>({
    queryKey: ['smartstore-sync-status'],
    queryFn: async () => {
      const res = await fetch('/api/admin/smartstore/products/sync');
      if (!res.ok) throw new Error('Failed to fetch sync status');
      return res.json();
    },
  });

  // Sync single product mutation
  const syncProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch('/api/admin/smartstore/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, autoSync: true }),
      });
      if (!res.ok) throw new Error('Failed to sync product');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartstore-products'] });
      queryClient.invalidateQueries({ queryKey: ['smartstore-sync-status'] });
      setSnackbar({ open: true, message: 'Product synced successfully', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ open: true, message: `Sync failed: ${error.message}`, severity: 'error' });
    },
  });

  // Batch sync mutation
  const batchSyncMutation = useMutation({
    mutationFn: async (mode: 'all' | 'auto' | 'selected') => {
      const body: { mode: string; productIds?: string[] } = { mode };
      if (mode === 'selected') {
        body.productIds = selectedProducts;
      }

      const res = await fetch('/api/admin/smartstore/products/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to sync products');
      return res.json() as Promise<SyncResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['smartstore-products'] });
      queryClient.invalidateQueries({ queryKey: ['smartstore-sync-status'] });
      setSyncDialogOpen(false);
      setSelectedProducts([]);

      if (data.result) {
        setSnackbar({
          open: true,
          message: `Sync complete: ${data.result.created} created, ${data.result.updated} updated, ${data.result.failed} failed`,
          severity: data.result.failed > 0 ? 'error' : 'success',
        });
      }
    },
    onError: (error) => {
      setSnackbar({ open: true, message: `Sync failed: ${error.message}`, severity: 'error' });
    },
  });

  // Toggle auto-sync mutation
  const toggleAutoSyncMutation = useMutation({
    mutationFn: async ({ productId, autoSync }: { productId: string; autoSync: boolean }) => {
      const res = await fetch('/api/admin/smartstore/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, autoSync }),
      });
      if (!res.ok) throw new Error('Failed to update auto-sync');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartstore-products'] });
    },
  });

  // Unsync product mutation
  const unsyncProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`/api/admin/smartstore/products?productId=${productId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to unsync product');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartstore-products'] });
      queryClient.invalidateQueries({ queryKey: ['smartstore-sync-status'] });
      setSnackbar({ open: true, message: 'Product removed from SmartStore', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ open: true, message: `Failed to unsync: ${error.message}`, severity: 'error' });
    },
  });

  const handleRefresh = () => {
    refetchProducts();
    refetchStatus();
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (productsData) {
      if (selectedProducts.length === productsData.items.length) {
        setSelectedProducts([]);
      } else {
        setSelectedProducts(productsData.items.map((p) => p.id));
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Link href="/admin/smartstore" passHref>
          <IconButton>
            <ArrowBackIcon />
          </IconButton>
        </Link>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          SmartStore Products
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={productsLoading}
        >
          Refresh
        </Button>
        <Button
          variant="contained"
          startIcon={<SyncIcon />}
          onClick={() => setSyncDialogOpen(true)}
          disabled={batchSyncMutation.isPending}
        >
          Sync Products
        </Button>
      </Box>

      {/* Status Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4">{syncStatus?.total ?? '-'}</Typography>
              <Typography color="text.secondary">Total</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main">
                {syncStatus?.synced ?? '-'}
              </Typography>
              <Typography color="text.secondary">Synced</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="warning.main">
                {syncStatus?.pending ?? '-'}
              </Typography>
              <Typography color="text.secondary">Pending</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="error.main">
                {syncStatus?.failed ?? '-'}
              </Typography>
              <Typography color="text.secondary">Failed</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="text.secondary">
                {syncStatus?.notSynced ?? '-'}
              </Typography>
              <Typography color="text.secondary">Not Synced</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by product name or country..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
      </Box>

      {/* Products Table */}
      <Card>
        {(productsLoading || batchSyncMutation.isPending) && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={productsData?.items.length === selectedProducts.length && selectedProducts.length > 0}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Data / Duration</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Sync Status</TableCell>
                <TableCell>Last Synced</TableCell>
                <TableCell>Auto Sync</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {productsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : productsData?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      No products found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                productsData?.items.map((product) => (
                  <TableRow
                    key={product.id}
                    sx={{
                      bgcolor: selectedProducts.includes(product.id) ? 'action.selected' : undefined,
                      opacity: product.isActive ? 1 : 0.6,
                    }}
                  >
                    <TableCell padding="checkbox">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => handleSelectProduct(product.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {product.name}
                      </Typography>
                      {!product.isActive && (
                        <Chip label="Inactive" size="small" color="default" sx={{ mt: 0.5 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={product.countryCode} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {product.dataLimit} / {product.durationDays}d
                    </TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell>
                      <Chip label={product.provider} size="small" />
                    </TableCell>
                    <TableCell>
                      {getSyncStatusChip(product.syncStatus)}
                      {product.lastError && (
                        <Tooltip title={product.lastError}>
                          <IconButton size="small" color="error">
                            <ErrorIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>{formatTimeAgo(product.lastSyncAt)}</TableCell>
                    <TableCell>
                      <Switch
                        size="small"
                        checked={product.autoSync}
                        onChange={(e) =>
                          toggleAutoSyncMutation.mutate({
                            productId: product.id,
                            autoSync: e.target.checked,
                          })
                        }
                        disabled={product.syncStatus === 'not_synced'}
                      />
                    </TableCell>
                    <TableCell>
                      {product.syncStatus === 'not_synced' || product.syncStatus === 'failed' ? (
                        <Tooltip title="Sync to SmartStore">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => syncProductMutation.mutate(product.id)}
                            disabled={syncProductMutation.isPending}
                          >
                            <CloudUploadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <>
                          <Tooltip title="Re-sync">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => syncProductMutation.mutate(product.id)}
                              disabled={syncProductMutation.isPending}
                            >
                              <SyncIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remove from SmartStore">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => unsyncProductMutation.mutate(product.id)}
                              disabled={unsyncProductMutation.isPending}
                            >
                              <CloudOffIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={productsData?.totalItems ?? 0}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </Card>

      {/* Sync Dialog */}
      <Dialog open={syncDialogOpen} onClose={() => setSyncDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Sync Products to SmartStore</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose how to sync products to SmartStore.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => batchSyncMutation.mutate('auto')}
              disabled={batchSyncMutation.isPending}
            >
              Sync Auto-Enabled Only ({syncStatus?.synced ?? 0} products)
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => batchSyncMutation.mutate('all')}
              disabled={batchSyncMutation.isPending}
            >
              Sync All Active Products
            </Button>
            {selectedProducts.length > 0 && (
              <Button
                variant="contained"
                fullWidth
                onClick={() => batchSyncMutation.mutate('selected')}
                disabled={batchSyncMutation.isPending}
              >
                Sync Selected ({selectedProducts.length} products)
              </Button>
            )}
          </Box>

          {batchSyncMutation.isPending && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Syncing products... This may take a while.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncDialogOpen(false)} disabled={batchSyncMutation.isPending}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
