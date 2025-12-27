'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Container, Typography, CircularProgress } from '@mui/material';
import OrderCard from '../../../components/ui/OrderCard';
import { Order as UIOrder } from '../../../components/ui/OrderCard';
import { Order } from '@/types/pocketbase-types';
import pb from '@/lib/pocketbase';

// Transform PocketBase record to UI order model
function transformOrderForUI(pbOrder: Order): UIOrder {
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

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<UIOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError('Order ID is missing.');
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        const pbOrder: Order = await pb.collection('orders').getOne(orderId, { expand: 'productId' });
        setOrder(transformOrderForUI(pbOrder));
      } catch (err) {
        console.error('Failed to fetch order:', err);
        setError('Order not found or an error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress aria-label="Loading order details" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          {error}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Please check the order ID or contact support if the problem persists.
        </Typography>
      </Container>
    );
  }

  if (!order) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No order data available.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <OrderCard order={order} />
    </Container>
  );
}
