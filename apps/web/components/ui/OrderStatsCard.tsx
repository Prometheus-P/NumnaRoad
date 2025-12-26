'use client';

import React from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Skeleton, Chip, SvgIcon } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

// Types for OrderStatsCard (from tests/unit/components/OrderStatsCard.test.tsx)
export type StatType = 'total' | 'pending' | 'processing' | 'completed' | 'failed' | 'revenue';
export type TimePeriod = 'today' | 'week' | 'month' | 'all';

export interface OrderStatsCardProps {
  type: StatType;
  value: number;
  previousValue?: number;
  period: TimePeriod;
  loading?: boolean;
  onClick?: () => void;
  labels?: {
    total?: string;
    pending?: string;
    processing?: string;
    completed?: string;
    failed?: string;
    revenue?: string;
    today?: string;
    week?: string;
    month?: string;
    all?: string;
    changeUp?: string;
    changeDown?: string;
    changeNeutral?: string;
  };
}

// Helper functions for logic (as tested in unit tests)
const getTrend = (current: number, previous: number): 'up' | 'down' | 'neutral' => {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'neutral';
};

const calculateChangePercentage = (current: number, previous?: number): number => {
  if (previous === undefined || previous === 0) {
    return current > 0 ? 100 : 0; // If no previous or previous is zero, and current is positive, 100% growth
  }
  return ((current - previous) / previous) * 100;
};

const formatNumber = (value: number, type: StatType, locale: string = 'ko-KR'): string => {
  if (type === 'revenue') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'KRW', // Assuming KRW for now, can be dynamic
    }).format(value);
  }
  return new Intl.NumberFormat(locale).format(value);
};

// Icon mapping
const IconMap: Record<StatType, React.ElementType> = {
  total: ShoppingCartIcon,
  pending: HourglassEmptyIcon,
  processing: SyncIcon,
  completed: CheckCircleIcon,
  failed: ErrorIcon,
  revenue: AttachMoneyIcon,
};

// Color mapping (using MUI palette names)
const ColorMap: Record<StatType, 'primary' | 'warning' | 'info' | 'success' | 'error' | 'secondary'> = {
  total: 'primary',
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'error',
  revenue: 'secondary',
};

/**
 * M3 Order Stats Card Component
 * Displays a single statistic (e.g., total orders, revenue) with trend indicators.
 */
export function OrderStatsCard({
  type,
  value,
  previousValue,
  period,
  loading = false,
  onClick,
  labels = {},
}: OrderStatsCardProps) {
  const theme = useTheme();
  const IconComponent = IconMap[type];
  const color = ColorMap[type];

  const defaultLabels = {
    total: 'Total Orders',
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    revenue: 'Revenue',
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    all: 'All Time',
    changeUp: 'increase',
    changeDown: 'decrease',
    changeNeutral: 'no change',
  };

  const statLabel = labels[type] || defaultLabels[type];
  const periodLabel = labels[period] || defaultLabels[period];

  const changePercentage = calculateChangePercentage(value, previousValue);
  const trend = getTrend(value, previousValue || 0);

  const getTrendIcon = () => {
    if (trend === 'up') return <ArrowUpwardIcon fontSize="inherit" />;
    if (trend === 'down') return <ArrowDownwardIcon fontSize="inherit" />;
    return <RemoveIcon fontSize="inherit" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return theme.palette.success.main;
    if (trend === 'down') return theme.palette.error.main;
    return theme.palette.text.secondary;
  };

  const getTrendDescription = () => {
    if (trend === 'up') return labels.changeUp || defaultLabels.changeUp;
    if (trend === 'down') return labels.changeDown || defaultLabels.changeDown;
    return labels.changeNeutral || defaultLabels.changeNeutral;
  };

  return (
    <Card
      sx={{
        width: '100%',
        borderRadius: 3,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { boxShadow: theme.shadows[4] } : {},
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${statLabel} ${formatNumber(value, type)} ${periodLabel}`}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {statLabel} ({periodLabel})
          </Typography>
          <SvgIcon component={IconComponent} color={color} />
        </Box>
        <Typography variant="h5" component="div">
          {loading ? <Skeleton width="60%" /> : formatNumber(value, type)}
        </Typography>

        {previousValue !== undefined && !loading && (
          <Box display="flex" alignItems="center" mt={1}>
            <Chip
              icon={getTrendIcon()}
              label={`${Math.abs(changePercentage).toFixed(1)}%`}
              size="small"
              sx={{
                bgcolor: getTrendColor(),
                color: theme.palette.getContrastText(getTrendColor()),
                mr: 1,
              }}
              aria-label={`${Math.abs(changePercentage).toFixed(1)} percent ${getTrendDescription()}`}
            />
            <Typography variant="caption" color="text.secondary" aria-live="polite">
              vs. prev {formatNumber(previousValue, type)}
            </Typography>
          </Box>
        )}
        {loading && <CircularProgress size={20} sx={{ mt: 1 }} aria-label="Loading statistics" />}
      </CardContent>
    </Card>
  );
}

export default OrderStatsCard;