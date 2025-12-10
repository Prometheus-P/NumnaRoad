import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Container, Box, Typography, CircularProgress } from '@mui/material';
import OrderCard from '../../../components/ui/OrderCard';
import { Order as UIOrder } from '../../../components/ui/OrderCard';
import { Order, EsimProduct, OrderStatus } from '../../types/pocketbase-types';
import pb from '../../lib/pocketbase'; // Import the actual PocketBase client

// Transform PocketBase record to UI order model
function transformOrderForUI(pbOrder: Order): UIOrder {
  const product = pbOrder.expand?.product_id;
  return {
    id: pbOrder.id,
    status: pbOrder.status as UIOrder['status'],
    productName: product?.name || 'Unknown Product',
    country: product?.country || '',
    dataLimit: product?.data_limit || '',
    durationDays: product?.duration_days || 0,
    qrCodeUrl: pbOrder.esim_qr_code || undefined,
    iccid: pbOrder.esim_iccid || undefined,
    activationCode: pbOrder.esim_activation_code || undefined,
    errorMessage: pbOrder.error_message || undefined,
    installationInstructions: pbOrder.installation_instructions || undefined, // assuming this field is now on PB order
    createdAt: new Date(pbOrder.created_at),
    completedAt: pbOrder.completed_at ? new Date(pbOrder.completed_at) : undefined,
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
        const pbOrder: Order = await pb.collection('orders').getOne(orderId, { expand: 'product_id' });
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