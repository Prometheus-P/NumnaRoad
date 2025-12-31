'use client';

import React, { memo } from 'react';
import { Chip } from '@mui/material';

interface StatusBadgeProps {
  status: string;
  statusLabels: Record<string, string>;
}

export const StatusBadge = memo(function StatusBadge({ status, statusLabels }: StatusBadgeProps) {
  const getColor = () => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return 'success';
      case 'pending':
      case 'payment_received':
        return 'warning';
      case 'processing':
      case 'fulfillment_started':
        return 'info';
      case 'failed':
      case 'provider_failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const label = statusLabels[status] || status.replace(/_/g, ' ');

  return (
    <Chip
      label={label}
      color={getColor()}
      size="small"
    />
  );
});
