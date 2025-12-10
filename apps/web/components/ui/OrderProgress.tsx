'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';

interface OrderProgressProps {
  status: 'pending' | 'processing'; // Only for pending or processing orders
  labels?: {
    processingMessage?: string;
  };
}

export function OrderProgress({ status, labels = {} }: OrderProgressProps) {
  const { processingMessage = 'Order is being processed...' } = labels;

  // You can extend this logic to show different progress percentages for pending/processing
  // For now, it's a simple indeterminate progress for 'processing'
  const progressValue = status === 'processing' ? 50 : 25; // Example: 25% for pending, 50% for processing

  return (
    <>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ py: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          {processingMessage}
        </Typography>
        <LinearProgress
          color="primary"
          variant={status === 'processing' ? 'indeterminate' : 'determinate'} // Determinate for pending, indeterminate for processing
          value={status === 'pending' ? progressValue : undefined}
          sx={{ width: '80%', mx: 'auto' }}
          aria-label="Order processing progress"
        />
      </Box>
    </>
  );
}

export default OrderProgress;