/**
 * Order Tracking Page
 *
 * Customer-facing page to view order status and eSIM details.
 * Mobile-first design (320px-428px primary viewport).
 *
 * Tasks: T087, T088, T090, T092, T093, T094
 */

import React from 'react';
import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import { OrderCard } from '@/components/ui/OrderCard';
import { OrderProgress } from '@/components/ui/OrderProgress';
import { QRCodeDisplay } from '@/components/ui/QRCodeDisplay';
import { InstallationGuide } from '@/components/ui/InstallationGuide';
import type { OrderStatus } from '@/components/ui/StatusChip';

/**
 * Page props with dynamic route parameter
 */
interface OrderPageProps {
  params: {
    orderId: string;
  };
}

/**
 * Order data type from PocketBase
 */
interface OrderData {
  id: string;
  status: OrderStatus;
  productName: string;
  country: string;
  dataLimit: string;
  durationDays: number;
  createdAt: string;
  completedAt?: string;
  qrCodeUrl?: string;
  iccid?: string;
  activationCode?: string;
  errorMessage?: string;
  customerEmail?: string;
}

/**
 * Fetch order data from PocketBase
 * T088: Order data fetching implementation
 */
async function getOrderData(orderId: string): Promise<OrderData | null> {
  try {
    // Validate orderId format (PocketBase uses 15-char alphanumeric IDs)
    if (!/^[a-zA-Z0-9]{15}$/.test(orderId)) {
      return null;
    }

    const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
    const response = await fetch(`${pbUrl}/api/collections/orders/records/${orderId}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch order: ${response.status}`);
    }

    const data = await response.json();

    return {
      id: data.id,
      status: data.status as OrderStatus,
      productName: data.product_name || data.productName,
      country: data.country,
      dataLimit: data.data_limit || data.dataLimit,
      durationDays: data.duration_days || data.durationDays,
      createdAt: data.created,
      completedAt: data.completed_at,
      qrCodeUrl: data.qr_code_url || data.qrCodeUrl,
      iccid: data.iccid,
      activationCode: data.activation_code || data.activationCode,
      errorMessage: data.error_message || data.errorMessage,
      customerEmail: data.customer_email || data.customerEmail,
    };
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
}

/**
 * Loading skeleton for order page
 */
function OrderPageSkeleton() {
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

  if (!order) {
    notFound();
  }

  const isCompleted = order.status === 'completed';
  const isFailed = order.status === 'failed';
  const showQRCode = isCompleted && order.qrCodeUrl;

  return (
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
              qrCodeUrl={order.qrCodeUrl}
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
  );
}

/**
 * Generate metadata for the page
 */
export async function generateMetadata({ params }: OrderPageProps) {
  return {
    title: `Order ${params.orderId} - NumnaRoad`,
    description: 'Track your eSIM order status and access your QR code.',
    robots: 'noindex, nofollow', // Private page
  };
}
