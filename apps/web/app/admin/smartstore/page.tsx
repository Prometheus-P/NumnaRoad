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
  Paper,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SmartStoreStatus {
  isActive: boolean;
  sellerId: string;
  lastSyncAt?: string;
  syncInterval: number;
  totalMappings: number;
  activeMappings: number;
}

interface ProductMapping {
  id: string;
  smartstoreProductName: string;
  smartstoreProductId: string;
  internalProductId?: string;
  internalProductName?: string;
  providerSku?: string;
  isActive: boolean;
}

interface SyncLog {
  timestamp: string;
  message: string;
  ordersFound: number;
}

// Format time ago
function formatTimeAgo(date?: string): string {
  if (!date) return 'Never';
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  return `${diffHours}h ago`;
}

export default function SmartStorePage() {
  const queryClient = useQueryClient();
  const [mappingDialogOpen, setMappingDialogOpen] = React.useState(false);
  const [selectedMapping, setSelectedMapping] = React.useState<ProductMapping | null>(null);

  // Fetch SmartStore status
  const { data: status, isLoading: statusLoading } = useQuery<SmartStoreStatus>({
    queryKey: ['admin', 'smartstore', 'status'],
    queryFn: async () => {
      const res = await fetch('/api/admin/smartstore/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      return res.json();
    },
  });

  // Fetch product mappings
  const { data: mappings, isLoading: mappingsLoading } = useQuery<ProductMapping[]>({
    queryKey: ['admin', 'smartstore', 'mappings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/smartstore/mappings');
      if (!res.ok) throw new Error('Failed to fetch mappings');
      return res.json();
    },
  });

  // Fetch sync logs
  const { data: logs, isLoading: logsLoading } = useQuery<SyncLog[]>({
    queryKey: ['admin', 'smartstore', 'logs'],
    queryFn: async () => {
      // Mock data for now - would need API endpoint
      return [
        { timestamp: new Date().toISOString(), message: 'Sync completed', ordersFound: 0 },
        { timestamp: new Date(Date.now() - 300000).toISOString(), message: 'Sync completed', ordersFound: 2 },
        { timestamp: new Date(Date.now() - 600000).toISOString(), message: 'Sync completed', ordersFound: 1 },
      ];
    },
  });

  // Manual sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/smartstore/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'smartstore'] });
    },
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          SmartStore Integration
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            startIcon={<SyncIcon />}
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            Manual Sync
          </Button>
          <Tooltip title="Refresh">
            <IconButton onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'smartstore'] })}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {syncMutation.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Sync completed successfully
        </Alert>
      )}

      {syncMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Sync failed. Please try again.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Connection Status */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Connection Status
              </Typography>
              {statusLoading ? (
                <Skeleton height={100} />
              ) : (
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      label={status?.isActive ? 'Active' : 'Inactive'}
                      color={status?.isActive ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      Seller ID
                    </Typography>
                    <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace' }}>
                      {status?.sellerId || 'Not configured'}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      Last Sync
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {formatTimeAgo(status?.lastSyncAt)}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Sync Interval
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      Every {status?.syncInterval || 5} minutes
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Mapping Summary */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Product Mappings
              </Typography>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Box textAlign="center" p={2} bgcolor="action.hover" borderRadius={2}>
                    <Typography variant="h4" fontWeight={600} color="primary">
                      {status?.totalMappings || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Mappings
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={6}>
                  <Box textAlign="center" p={2} bgcolor="action.hover" borderRadius={2}>
                    <Typography variant="h4" fontWeight={600} color="success.main">
                      {status?.activeMappings || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Product Mappings Table */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={600}>
                  Product Mappings
                </Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSelectedMapping(null);
                    setMappingDialogOpen(true);
                  }}
                >
                  Add Mapping
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>SmartStore Product</TableCell>
                      <TableCell>Internal Product</TableCell>
                      <TableCell>Provider SKU</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mappingsLoading ? (
                      [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(5)].map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : mappings && mappings.length > 0 ? (
                      mappings.map((mapping) => (
                        <TableRow key={mapping.id}>
                          <TableCell>{mapping.smartstoreProductName}</TableCell>
                          <TableCell>
                            {mapping.internalProductName || (
                              <Typography color="warning.main" variant="body2">
                                Not linked
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {mapping.providerSku || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={mapping.internalProductId ? <LinkIcon /> : <LinkOffIcon />}
                              label={mapping.isActive ? 'Active' : 'Inactive'}
                              color={mapping.isActive && mapping.internalProductId ? 'success' : 'warning'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              onClick={() => {
                                setSelectedMapping(mapping);
                                setMappingDialogOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary">
                            No product mappings found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Sync Logs */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Recent Sync Logs
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell align="right">Orders Found</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logsLoading ? (
                      [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                          {[...Array(3)].map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : logs && logs.length > 0 ? (
                      logs.map((log, i) => (
                        <TableRow key={i}>
                          <TableCell>{formatTimeAgo(log.timestamp)}</TableCell>
                          <TableCell>{log.message}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={log.ordersFound}
                              size="small"
                              color={log.ordersFound > 0 ? 'primary' : 'default'}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography color="text.secondary">
                            No sync logs available
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Mapping Dialog */}
      <Dialog
        open={mappingDialogOpen}
        onClose={() => setMappingDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedMapping ? 'Edit Mapping' : 'Add Mapping'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="SmartStore Product Name"
              defaultValue={selectedMapping?.smartstoreProductName}
              fullWidth
              disabled={!!selectedMapping}
            />
            <TextField
              label="SmartStore Product ID"
              defaultValue={selectedMapping?.smartstoreProductId}
              fullWidth
              disabled={!!selectedMapping}
            />
            <FormControl fullWidth>
              <InputLabel>Internal Product</InputLabel>
              <Select
                label="Internal Product"
                defaultValue={selectedMapping?.internalProductId || ''}
              >
                <MenuItem value="">
                  <em>Not linked</em>
                </MenuItem>
                {/* Would need to fetch products list */}
                <MenuItem value="product1">Japan 7-Day Unlimited</MenuItem>
                <MenuItem value="product2">Thailand 15-Day 10GB</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMappingDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
