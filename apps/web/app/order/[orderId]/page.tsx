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

<<<<<<< HEAD
/**
 * Loading skeleton for order page
 * Kept for potential use with React Suspense
 */
export function OrderPageSkeleton() {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Skeleton variant="text" width="60%" height={40} sx={{ mb: 2 }} />
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={100} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="70%" />
      </Paper>
    </Container>
  );
}

/**
 * Error state component
 * T090: Error state display with support contact
 */
function OrderErrorState({
  errorMessage,
  orderId,
}: {
  errorMessage?: string;
  orderId: string;
}) {
  return (
    <Alert
      severity="error"
      sx={{
        mt: 3,
        borderRadius: 2,
      }}
      role="alert"
      aria-live="polite"
    >
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        Order Processing Failed
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        {errorMessage || 'An unexpected error occurred while processing your order.'}
      </Typography>
      <Typography variant="body2">
        Order ID: <strong>{orderId}</strong>
      </Typography>
      <Divider sx={{ my: 2 }} />
      <Typography variant="body2">
        Please contact support for assistance:{' '}
        <Link
          href="mailto:support@numnaroad.com"
          sx={{ fontWeight: 500 }}
          aria-label="Email support at support@numnaroad.com"
        >
          support@numnaroad.com
        </Link>
      </Typography>
    </Alert>
  );
}

/**
 * Order Tracking Page Component
 * T092: Mobile-first responsive layout
 * T093: Accessibility attributes
 * T094: Light/dark mode support
 */
export default async function OrderPage({ params }: OrderPageProps) {
  const { orderId } = params;
  const order = await getOrderData(orderId);
=======
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
>>>>>>> origin/main

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
<<<<<<< HEAD
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: { xs: 2, sm: 4 },
        px: { xs: 2, sm: 3 },
      }}
      role="main"
      aria-label="Order tracking page"
    >
      <Container
        maxWidth="sm"
        sx={{
          // Mobile-first: Primary viewport 320px-428px
          px: { xs: 0, sm: 2 },
        }}
      >
        {/* Page Header */}
        <Typography
          variant="h5"
          component="h1"
          sx={{
            mb: 3,
            fontWeight: 600,
            textAlign: 'center',
          }}
          id="order-tracking-title"
        >
          Order Status
        </Typography>

        {/* Order Card */}
        <Paper
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            mb: 3,
          }}
          elevation={1}
          aria-labelledby="order-tracking-title"
        >
          <OrderCard order={order} />

          <Divider sx={{ my: 3 }} aria-hidden="true" />

          {/* Progress Section */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              sx={{ mb: 2, fontWeight: 600 }}
              id="progress-section-title"
            >
              Order Progress
            </Typography>
            <OrderProgress
              status={order.status}
              showLabels={!isFailed}
              compact={false}
            />
          </Box>

          {/* Error State */}
          {isFailed && (
            <OrderErrorState
              errorMessage={order.errorMessage}
              orderId={order.id}
            />
          )}
        </Paper>

        {/* QR Code Section - Only for completed orders */}
        {showQRCode && (
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 3,
              mb: 3,
            }}
            elevation={1}
            aria-label="eSIM QR Code section"
          >
            <Typography
              variant="subtitle2"
              sx={{ mb: 2, fontWeight: 600 }}
              id="qr-code-section-title"
            >
              Your eSIM QR Code
            </Typography>
            <QRCodeDisplay
              qrCodeUrl={order.qrCodeUrl!}
              activationCode={order.activationCode}
              iccid={order.iccid}
            />
          </Paper>
        )}

        {/* Installation Guide - Only for completed orders */}
        {isCompleted && (
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 3,
            }}
            elevation={1}
            aria-label="eSIM installation instructions"
          >
            <InstallationGuide compact={false} />
          </Paper>
        )}

        {/* Footer */}
        <Box
          sx={{
            mt: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Questions?{' '}
            <Link
              href="mailto:support@numnaroad.com"
              color="primary"
              aria-label="Contact support via email"
            >
              Contact Support
            </Link>
          </Typography>
        </Box>
      </Container>
    </Box>
=======
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <OrderCard order={order} />
    </Container>
>>>>>>> origin/main
  );
}