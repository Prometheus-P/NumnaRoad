'use client';

import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import StatusChip, { OrderStatus } from './StatusChip';
import QRCodeDisplay from './QRCodeDisplay';
import OrderProgress from './OrderProgress'; // Import the new OrderProgress component

export interface Order {
  id: string;
  productName: string;
  country: string;
  dataLimit: string;
  durationDays: number;
  status: OrderStatus;
  createdAt: Date | string;
  completedAt?: Date | string;
  qrCodeUrl?: string;
  iccid?: string;
  activationCode?: string;
  errorMessage?: string;
  installationInstructions?: string;
}

export interface OrderCardProps {
  order: Order;
  labels?: {
    orderId?: string;
    orderDate?: string;
    product?: string;
    data?: string;
    validity?: string;
    days?: string;
    activationCode?: string;
    installationInstructionsTitle?: string;
    supportContact?: string;
    processingMessage?: string; // Add new label for OrderProgress
  };
}

/**
 * M3 Order Card Component
 * Displays order information with status, QR code (if completed), and details
 * Mobile-first responsive design
 */
export function OrderCard({ order, labels = {} }: OrderCardProps) {
  const {
    orderId = 'Order ID',
    orderDate = 'Order Date',
    product: _product = 'Product',
    data = 'Data',
    validity = 'Validity',
    days = 'days',
    activationCode = 'Activation Code',
    installationInstructionsTitle = 'Installation Instructions',
    supportContact = 'Please contact support for assistance.',
    processingMessage = 'Order is being processed...', // Default label for OrderProgress
  } = labels;

  const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };

  const showQrCodeSection = order.status === 'completed' && order.qrCodeUrl;
  const showProcessingSection = order.status === 'processing';
  const showFailedSection = order.status === 'failed' && order.errorMessage;

  return (
    <Card
      role="article"
      aria-labelledby={`order-${order.id}-title`}
      sx={{
        maxWidth: { xs: '100%', sm: 400 },
        mx: 'auto',
        borderRadius: 3,
      }}
    >
      <CardContent>
        {/* Header with Order ID and Status */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography
            id={`order-${order.id}-title`}
            variant="subtitle2"
            color="text.secondary"
          >
            {orderId}: {order.id}
          </Typography>
          <StatusChip status={order.status} />
        </Box>

        {/* Product Info */}
        <Typography variant="h6" component="h2" gutterBottom>
          {order.productName}
        </Typography>

        {/* Order Details Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 2,
            my: 2,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              {data}
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {order.dataLimit}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {validity}
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {order.durationDays} {days}
            </Typography>
          </Box>
        </Box>

        {/* Order Date */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {orderDate}: {formatDate(order.createdAt)}
        </Typography>

        {/* Processing Indicator (only for processing orders) */}
        {showProcessingSection && (
          <OrderProgress status={order.status as 'pending' | 'processing'} labels={{ processingMessage }} />
        )}

        {/* QR Code Section (only for completed orders) */}
        {showQrCodeSection && (
          <QRCodeDisplay
            qrCodeUrl={order.qrCodeUrl as string}
            activationCode={order.activationCode}
            installationInstructions={order.installationInstructions}
            labels={{ activationCode: activationCode, installationInstructionsTitle: installationInstructionsTitle }}
          />
        )}

        {/* Error Message (only for failed orders) */}
        {showFailedSection && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                bgcolor: 'error.light',
                color: 'error.contrastText',
                p: 2,
                borderRadius: 2,
              }}
            >
              <Typography variant="body2">{order.errorMessage} {supportContact}</Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default OrderCard;
