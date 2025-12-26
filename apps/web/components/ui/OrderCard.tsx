'use client';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import StatusChip, { OrderStatus } from './StatusChip';

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

  const showQrCode = order.status === 'completed' && order.qrCodeUrl;

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

        {/* QR Code Section (only for completed orders) */}
        {showQrCode && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 2,
              }}
            >
              <Box
                component="img"
                src={order.qrCodeUrl}
                alt="QR Code for eSIM installation"
                role="img"
                sx={{
                  width: 200,
                  height: 200,
                  borderRadius: 2,
                  mb: 2,
                }}
              />
              {order.activationCode && (
                <Box sx={{ textAlign: 'center', width: '100%' }}>
                  <Typography variant="caption" color="text.secondary">
                    {activationCode}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      wordBreak: 'break-all',
                      bgcolor: 'action.hover',
                      p: 1,
                      borderRadius: 1,
                      mt: 0.5,
                    }}
                  >
                    {order.activationCode}
                  </Typography>
                </Box>
              )}
            </Box>
          </>
        )}

        {/* Error Message (only for failed orders) */}
        {order.status === 'failed' && order.errorMessage && (
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
              <Typography variant="body2">{order.errorMessage}</Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default OrderCard;
