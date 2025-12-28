'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Divider,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface OrderLog {
  id: string;
  stepName: string;
  status: string;
  providerName?: string;
  errorMessage?: string;
  durationMs?: number;
  created: string;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  externalOrderId?: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  currency: string;
  status: string;
  paymentStatus?: string;
  salesChannel: string;
  providerUsed?: string;
  esimIccid?: string;
  esimQrCode?: string;
  esimActivationCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  created: string;
  updated: string;
  logs: OrderLog[];
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
      sx={{ textTransform: 'capitalize' }}
    />
  );
}

// Format currency
function formatCurrency(value: number, currency: string = 'KRW'): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
  }).format(value);
}

// Format date
function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(date));
}

// Info Row Component
function InfoRow({ label, value, copyable }: { label: string; value?: string | number; copyable?: boolean }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" py={1}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="body2" fontWeight={500}>
          {value || '-'}
        </Typography>
        {copyable && value && (
          <Button
            size="small"
            onClick={handleCopy}
            sx={{ minWidth: 'auto', p: 0.5 }}
          >
            {copied ? <CheckCircleIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = params.id as string;

  const [retryDialogOpen, setRetryDialogOpen] = React.useState(false);

  const { data: order, isLoading, error } = useQuery<OrderDetail>({
    queryKey: ['admin', 'order', orderId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (!res.ok) throw new Error('Order not found');
      return res.json();
    },
  });

  const retryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/fulfill`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Retry failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', orderId] });
      setRetryDialogOpen(false);
    },
  });

  if (error) {
    return (
      <Box>
        <Alert severity="error">Order not found</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/orders')}
          sx={{ mt: 2 }}
        >
          Back to Orders
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/admin/orders')}
          >
            Back
          </Button>
          <Typography variant="h5" fontWeight={600}>
            Order Details
          </Typography>
          {order && <StatusBadge status={order.status} />}
        </Box>
        <Box display="flex" gap={1}>
          {order?.status === 'failed' || order?.status === 'provider_failed' ? (
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={() => setRetryDialogOpen(true)}
            >
              Retry Fulfillment
            </Button>
          ) : null}
        </Box>
      </Box>

      {/* Error Message */}
      {order?.errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600}>Error:</Typography>
          {order.errorMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Order Info */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Order Information
              </Typography>
              {isLoading ? (
                <Box>
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} height={40} />
                  ))}
                </Box>
              ) : (
                <>
                  <InfoRow label="Order ID" value={order?.orderNumber} copyable />
                  {order?.externalOrderId && (
                    <InfoRow label="External ID" value={order.externalOrderId} copyable />
                  )}
                  <InfoRow label="Status" value={order?.status} />
                  <InfoRow label="Payment" value={order?.paymentStatus || 'paid'} />
                  <InfoRow label="Amount" value={formatCurrency(order?.totalPrice || 0, order?.currency)} />
                  <InfoRow label="Channel" value={order?.salesChannel} />
                  <InfoRow label="Created" value={order?.created ? formatDateTime(order.created) : '-'} />
                  <InfoRow label="Updated" value={order?.updated ? formatDateTime(order.updated) : '-'} />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Customer Info */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Customer Information
              </Typography>
              {isLoading ? (
                <Box>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} height={40} />
                  ))}
                </Box>
              ) : (
                <>
                  <InfoRow label="Email" value={order?.customerEmail} copyable />
                  <InfoRow label="Name" value={order?.customerName} />
                  <InfoRow label="Phone" value={order?.customerPhone} />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Product Info */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Product Information
              </Typography>
              {isLoading ? (
                <Box>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} height={40} />
                  ))}
                </Box>
              ) : (
                <>
                  <InfoRow label="Product" value={order?.productName} />
                  <InfoRow label="Quantity" value={order?.quantity} />
                  <InfoRow label="Provider" value={order?.providerUsed} />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* eSIM Info */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                eSIM Information
              </Typography>
              {isLoading ? (
                <Box>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} height={40} />
                  ))}
                </Box>
              ) : order?.esimIccid ? (
                <>
                  <InfoRow label="ICCID" value={order.esimIccid} copyable />
                  <InfoRow label="Activation Code" value={order.esimActivationCode} copyable />
                  {order.esimQrCode && (
                    <Box mt={2}>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        QR Code
                      </Typography>
                      <Box
                        component="img"
                        src={order.esimQrCode}
                        alt="eSIM QR Code"
                        sx={{ maxWidth: 200, borderRadius: 2 }}
                      />
                    </Box>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No eSIM data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Processing Timeline */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                Processing Timeline
              </Typography>
              {isLoading ? (
                <Skeleton height={200} />
              ) : order?.logs && order.logs.length > 0 ? (
                <List sx={{ p: 0 }}>
                  {order.logs.map((log) => (
                    <ListItem
                      key={log.id}
                      sx={{
                        borderLeft: 2,
                        borderColor: log.status === 'success' ? 'success.main' :
                                     log.status === 'error' ? 'error.main' : 'grey.400',
                        mb: 1,
                        py: 1,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {log.status === 'success' ? (
                          <CheckCircleIcon color="success" />
                        ) : log.status === 'error' ? (
                          <ErrorIcon color="error" />
                        ) : (
                          <PendingIcon color="disabled" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={log.stepName}
                        secondary={
                          <Box component="span">
                            {log.providerName && (
                              <Typography variant="caption" color="text.secondary" component="span">
                                Provider: {log.providerName} |{' '}
                              </Typography>
                            )}
                            {log.errorMessage && (
                              <Typography variant="caption" color="error" component="span" sx={{ display: 'block' }}>
                                {log.errorMessage}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary" component="span">
                              {formatDateTime(log.created)}
                              {log.durationMs && ` (${log.durationMs}ms)`}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No processing logs available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Retry Dialog */}
      <Dialog open={retryDialogOpen} onClose={() => setRetryDialogOpen(false)}>
        <DialogTitle>Retry Fulfillment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to retry the fulfillment for this order?
            This will attempt to re-process the order and issue a new eSIM.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRetryDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => retryMutation.mutate()}
            disabled={retryMutation.isPending}
          >
            {retryMutation.isPending ? <CircularProgress size={20} /> : 'Retry'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
