'use client';

import React from 'react';
import Chip from '@mui/material/Chip';
import { useTheme } from '@mui/material/styles';

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface StatusChipProps {
  status: OrderStatus;
  label?: string;
  size?: 'small' | 'medium';
}

/**
 * M3 Status Chip Component
 * Displays order status with semantic colors following Material Design 3 guidelines
 */
export function StatusChip({ status, label, size = 'small' }: StatusChipProps) {
  const theme = useTheme();

  // Default labels for each status (can be overridden by i18n)
  const defaultLabels: Record<OrderStatus, string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
  };

  // M3 color semantics mapping
  const colorMap: Record<OrderStatus, 'warning' | 'info' | 'success' | 'error'> = {
    pending: 'warning',
    processing: 'info',
    completed: 'success',
    failed: 'error',
  };

  const displayLabel = label || defaultLabels[status];
  const color = colorMap[status];

  return (
    <Chip
      label={displayLabel}
      color={color}
      size={size}
      role="status"
      aria-label={`Order status: ${displayLabel}`}
      data-status={status}
      sx={{
        fontWeight: 500,
        textTransform: 'capitalize',
      }}
    />
  );
}

export default StatusChip;
