'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Typography,
  Box,
  IconButton,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OrderCard from './OrderCard';
import { Order as UIOrder } from './OrderCard';
import pb from '../../lib/pocketbase';
import { Order as PBOrder } from '../../types/pocketbase-types';

interface OrderDetailDialogProps {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
}

// Transform PocketBase record to UI order model (similar to /order/[orderId]/page.tsx)
function transformPbOrderToUIOrder(pbOrder: PBOrder): UIOrder {
  const product = pbOrder.expand?.productId;
  return {
    id: pbOrder.id,
    status: pbOrder.status as UIOrder['status'],
    productName: product?.name || 'Unknown Product',
    country: product?.country || '',
    dataLimit: product?.dataLimit || '',
    durationDays: product?.durationDays || 0,
    qrCodeUrl: pbOrder.esimQrCode || undefined,
    iccid: pbOrder.esimIccid || undefined,
    activationCode: pbOrder.esimActivationCode || undefined,
    errorMessage: pbOrder.errorMessage || undefined,
    installationInstructions: pbOrder.installationInstructions || undefined,
    createdAt: new Date(pbOrder.created),
    completedAt: pbOrder.completedAt ? new Date(pbOrder.completedAt) : undefined,
  };
}

export function OrderDetailDialog({ orderId, open, onClose }: OrderDetailDialogProps) {
  const [order, setOrder] = useState<UIOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !orderId) {
      setOrder(null);
      setError(null);
      return;
    }

    const fetchOrderDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const pbOrder: PBOrder = await pb.collection('orders').getOne(orderId, { expand: 'productId' });
        setOrder(transformPbOrderToUIOrder(pbOrder));
      } catch (err) {
        console.error('Failed to fetch order details:', err);
        setError('Failed to load order details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Order Details
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}
        {order && !loading && (
          <OrderCard order={order} />
        )}
        {!order && !loading && !error && (
            <Typography variant="body1" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                No order details available.
            </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default OrderDetailDialog;
