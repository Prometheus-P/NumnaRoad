'use client';

import React, { memo } from 'react';
import { Chip, type ChipProps } from '@mui/material';

interface StatusBadgeProps {
  status: string;
  statusLabels: Record<string, string>;
  size?: 'small' | 'medium';
}

/**
 * Unified status badge for order statuses.
 *
 * Colors:
 * - success (green): completed, delivered, email_sent
 * - warning (yellow): pending, payment_received, awaiting_confirmation
 * - info (blue): processing, fulfillment_started, provider_confirmed
 * - error (red): failed, provider_failed, refund_needed
 */
export const StatusBadge = memo(function StatusBadge({
  status,
  statusLabels,
  size = 'small',
}: StatusBadgeProps) {
  const getColor = (): ChipProps['color'] => {
    switch (status) {
      case 'completed':
      case 'delivered':
      case 'email_sent':
      case 'refunded':
        return 'success';
      case 'pending':
      case 'payment_received':
      case 'awaiting_confirmation':
      case 'pending_manual_fulfillment':
        return 'warning';
      case 'processing':
      case 'fulfillment_started':
      case 'provider_confirmed':
        return 'info';
      case 'failed':
      case 'provider_failed':
      case 'refund_needed':
        return 'error';
      default:
        return 'default';
    }
  };

  const label = statusLabels[status] || status.replace(/_/g, ' ');

  return <Chip label={label} color={getColor()} size={size} />;
});
