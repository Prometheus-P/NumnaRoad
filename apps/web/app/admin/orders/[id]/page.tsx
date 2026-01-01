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
import EditIcon from '@mui/icons-material/Edit';
import EmailIcon from '@mui/icons-material/Email';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminLanguage } from '@/lib/i18n';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';
import { StatusBadge, InfoRow } from '@/components/admin';

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

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, locale } = useAdminLanguage();
  const orderId = params.id as string;

  const [retryDialogOpen, setRetryDialogOpen] = React.useState(false);
  const [manualDialogOpen, setManualDialogOpen] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [manualForm, setManualForm] = React.useState({
    esimIccid: '',
    esimActivationCode: '',
    esimQrCode: '',
    providerUsed: 'manual',
  });

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

  const manualFulfillmentMutation = useMutation({
    mutationFn: async (data: typeof manualForm) => {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_fulfillment',
          ...data,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Manual fulfillment failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', orderId] });
      setManualDialogOpen(false);
      setManualForm({
        esimIccid: '',
        esimActivationCode: '',
        esimQrCode: '',
        providerUsed: 'manual',
      });
    },
  });

  const resendEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/orders/${orderId}/resend-email`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to resend email');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', orderId] });
      setSnackbar({
        open: true,
        message: t.orders.detail.emailResent,
        severity: 'success',
      });
    },
    onError: (error: Error) => {
      setSnackbar({
        open: true,
        message: error.message || t.orders.detail.emailResendFailed,
        severity: 'error',
      });
    },
  });

  if (error) {
    return (
      <Box>
        <Alert severity="error">{t.orders.detail.orderNotFound}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/orders')}
          sx={{ mt: 2 }}
        >
          {t.orders.detail.backToList}
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
            {t.orders.detail.back}
          </Button>
          <Typography variant="h5" fontWeight={600}>
            {t.orders.detail.title}
          </Typography>
          {order && <StatusBadge status={order.status} statusLabels={t.orders.statuses} />}
        </Box>
        <Box display="flex" gap={1}>
          {(order?.status === 'pending_manual_fulfillment' ||
            order?.status === 'provider_failed' ||
            order?.status === 'failed') && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<EditIcon />}
              onClick={() => setManualDialogOpen(true)}
            >
              {t.orders.detail.manualProcess}
            </Button>
          )}
          {(order?.status === 'failed' || order?.status === 'provider_failed') && (
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => setRetryDialogOpen(true)}
            >
              {t.orders.detail.retryOrder}
            </Button>
          )}
          {order?.esimIccid && order?.esimActivationCode && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={resendEmailMutation.isPending ? <CircularProgress size={16} /> : <EmailIcon />}
              onClick={() => resendEmailMutation.mutate()}
              disabled={resendEmailMutation.isPending}
            >
              {t.orders.detail.resendEmail}
            </Button>
          )}
        </Box>
      </Box>

      {/* Error Message */}
      {order?.errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600}>{t.orders.detail.error}:</Typography>
          {order.errorMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Order Info */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                {t.orders.detail.orderInfo}
              </Typography>
              {isLoading ? (
                <Box>
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} height={40} />
                  ))}
                </Box>
              ) : (
                <>
                  <InfoRow label={t.orders.orderNumber} value={order?.orderNumber} copyable />
                  {order?.externalOrderId && (
                    <InfoRow label={t.orders.detail.externalOrderNumber} value={order.externalOrderId} copyable />
                  )}
                  <InfoRow label={t.common.status} value={t.orders.statuses[order?.status as keyof typeof t.orders.statuses] || order?.status} />
                  <InfoRow label={t.orders.detail.paymentStatus} value={t.orders.statuses[order?.paymentStatus as keyof typeof t.orders.statuses] || order?.paymentStatus || t.orders.statuses.payment_received} />
                  <InfoRow label={t.orders.detail.paymentAmount} value={formatCurrency(order?.totalPrice || 0, order?.currency)} />
                  <InfoRow label={t.orders.detail.paymentChannel} value={t.orders.channels[order?.salesChannel as keyof typeof t.orders.channels] || order?.salesChannel} />
                  <InfoRow label={t.orders.detail.orderDate} value={order?.created ? formatDateTime(order.created) : '-'} />
                  <InfoRow label={t.orders.detail.updatedDate} value={order?.updated ? formatDateTime(order.updated) : '-'} />
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
                {t.orders.detail.customerInfo}
              </Typography>
              {isLoading ? (
                <Box>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} height={40} />
                  ))}
                </Box>
              ) : (
                <>
                  <InfoRow label={t.orders.detail.customerEmail} value={order?.customerEmail} copyable />
                  <InfoRow label={t.orders.detail.customerName} value={order?.customerName} />
                  <InfoRow label={t.orders.detail.phone} value={order?.customerPhone} />
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
                {t.orders.detail.productInfo}
              </Typography>
              {isLoading ? (
                <Box>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} height={40} />
                  ))}
                </Box>
              ) : (
                <>
                  <InfoRow label={t.orders.productName} value={order?.productName} />
                  <InfoRow label={t.orders.detail.quantity} value={order?.quantity} />
                  <InfoRow label={t.orders.detail.provider} value={order?.providerUsed} />
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
                {t.orders.detail.esimInfo}
              </Typography>
              {isLoading ? (
                <Box>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} height={40} />
                  ))}
                </Box>
              ) : order?.esimIccid ? (
                <>
                  <InfoRow label={t.orders.detail.iccid} value={order.esimIccid} copyable />
                  <InfoRow label={t.orders.detail.activationCode} value={order.esimActivationCode} copyable />
                  {order.esimQrCode && (
                    <Box mt={2}>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        {t.orders.detail.qrCode}
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
                  {t.orders.detail.noEsimInfo}
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
                {t.orders.detail.orderHistory}
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
                                {t.orders.detail.provider}: {log.providerName} |{' '}
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
                  {t.orders.detail.noHistory}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Retry Dialog */}
      <Dialog open={retryDialogOpen} onClose={() => setRetryDialogOpen(false)}>
        <DialogTitle>{t.orders.detail.retryConfirmTitle}</DialogTitle>
        <DialogContent>
          <Typography>
            {t.orders.detail.retryConfirmMessage}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRetryDialogOpen(false)}>{t.common.cancel}</Button>
          <Button
            variant="contained"
            onClick={() => retryMutation.mutate()}
            disabled={retryMutation.isPending}
          >
            {retryMutation.isPending ? <CircularProgress size={20} /> : t.common.retry}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual Fulfillment Dialog */}
      <Dialog
        open={manualDialogOpen}
        onClose={() => setManualDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t.orders.detail.manualProcessTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t.orders.detail.manualProcessMessage}
          </Typography>
          {manualFulfillmentMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {(manualFulfillmentMutation.error as Error)?.message || 'Failed to process'}
            </Alert>
          )}
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label={t.orders.detail.iccidLabel}
              value={manualForm.esimIccid}
              onChange={(e) => setManualForm({ ...manualForm, esimIccid: e.target.value })}
              required
              fullWidth
              placeholder="89012345678901234567"
              helperText={t.orders.detail.iccidHelper}
            />
            <TextField
              label={t.orders.detail.activationCodeLabel}
              value={manualForm.esimActivationCode}
              onChange={(e) => setManualForm({ ...manualForm, esimActivationCode: e.target.value })}
              required
              fullWidth
              placeholder="LPA:1$..."
              helperText={t.orders.detail.activationCodeHelper}
            />
            <TextField
              label={t.orders.detail.qrCodeUrl}
              value={manualForm.esimQrCode}
              onChange={(e) => setManualForm({ ...manualForm, esimQrCode: e.target.value })}
              fullWidth
              placeholder="https://..."
              helperText={t.orders.detail.qrCodeHelper}
            />
            <TextField
              label={t.orders.detail.providerName}
              value={manualForm.providerUsed}
              onChange={(e) => setManualForm({ ...manualForm, providerUsed: e.target.value })}
              fullWidth
              placeholder="manual"
              helperText={t.orders.detail.providerHelper}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualDialogOpen(false)}>{t.common.cancel}</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => manualFulfillmentMutation.mutate(manualForm)}
            disabled={
              manualFulfillmentMutation.isPending ||
              !manualForm.esimIccid ||
              !manualForm.esimActivationCode
            }
          >
            {manualFulfillmentMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              t.orders.detail.completeProcess
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
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
