/**
 * OrderStatsCard Component
 *
 * Dashboard stats card showing order metrics with trend indicators.
 *
 * Task: T103
 */

'use client';

import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useTheme, alpha } from '@mui/material/styles';

/**
 * Stat types
 */
export type StatType = 'total' | 'pending' | 'processing' | 'completed' | 'failed' | 'revenue';
export type TimePeriod = 'today' | 'week' | 'month' | 'all';

/**
 * Component props
 */
export interface OrderStatsCardProps {
  type: StatType;
  value: number;
  previousValue?: number;
  period: TimePeriod;
  loading?: boolean;
  onClick?: () => void;
  label?: string;
}

/**
 * Configuration for each stat type
 */
const statConfig: Record<
  StatType,
  {
    icon: React.ReactNode;
    color: 'primary' | 'warning' | 'info' | 'success' | 'error' | 'secondary';
    labelKo: string;
    labelEn: string;
  }
> = {
  total: {
    icon: <ShoppingCartIcon />,
    color: 'primary',
    labelKo: '전체 주문',
    labelEn: 'Total Orders',
  },
  pending: {
    icon: <HourglassEmptyIcon />,
    color: 'warning',
    labelKo: '대기중',
    labelEn: 'Pending',
  },
  processing: {
    icon: <SyncIcon />,
    color: 'info',
    labelKo: '처리중',
    labelEn: 'Processing',
  },
  completed: {
    icon: <CheckCircleIcon />,
    color: 'success',
    labelKo: '완료',
    labelEn: 'Completed',
  },
  failed: {
    icon: <ErrorIcon />,
    color: 'error',
    labelKo: '실패',
    labelEn: 'Failed',
  },
  revenue: {
    icon: <AttachMoneyIcon />,
    color: 'secondary',
    labelKo: '매출',
    labelEn: 'Revenue',
  },
};

/**
 * Period labels
 */
const periodLabels: Record<TimePeriod, { ko: string; en: string }> = {
  today: { ko: '오늘', en: 'Today' },
  week: { ko: '이번 주', en: 'This Week' },
  month: { ko: '이번 달', en: 'This Month' },
  all: { ko: '전체', en: 'All Time' },
};

/**
 * Format number with separators
 */
function formatNumber(value: number, isRevenue: boolean = false): string {
  if (isRevenue) {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat('ko-KR').format(value);
}

/**
 * Calculate change percentage
 */
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Get trend direction
 */
function getTrend(current: number, previous: number): 'up' | 'down' | 'neutral' {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'neutral';
}

/**
 * OrderStatsCard Component
 */
export function OrderStatsCard({
  type,
  value,
  previousValue,
  period,
  loading = false,
  onClick,
  label,
}: OrderStatsCardProps) {
  const theme = useTheme();
  const config = statConfig[type];

  const changePercent = previousValue !== undefined ? calculateChange(value, previousValue) : null;
  const trend = previousValue !== undefined ? getTrend(value, previousValue) : null;

  const displayLabel = label || config.labelEn;
  const periodLabel = periodLabels[period].en;
  const isRevenue = type === 'revenue';

  // Trend color logic
  const getTrendColor = () => {
    if (!trend) return 'text.secondary';
    if (type === 'failed') {
      // For failed, down is good
      return trend === 'down' ? 'success.main' : trend === 'up' ? 'error.main' : 'text.secondary';
    }
    return trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'text.secondary';
  };

  const cardContent = (
    <CardContent sx={{ p: 2.5 }}>
      {loading ? (
        <>
          <Skeleton variant="circular" width={40} height={40} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height={36} />
          <Skeleton variant="text" width="50%" />
        </>
      ) : (
        <>
          {/* Icon */}
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: alpha(theme.palette[config.color].main, 0.12),
              color: `${config.color}.main`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1.5,
            }}
            aria-hidden="true"
          >
            {config.icon}
          </Box>

          {/* Label */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 0.5 }}
            id={`stat-label-${type}`}
          >
            {displayLabel}
          </Typography>

          {/* Value */}
          <Typography
            variant="h4"
            component="div"
            sx={{ fontWeight: 700, mb: 0.5 }}
            aria-labelledby={`stat-label-${type}`}
          >
            {formatNumber(value, isRevenue)}
          </Typography>

          {/* Period and Change */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {periodLabel}
            </Typography>

            {changePercent !== null && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.25,
                  color: getTrendColor(),
                }}
                role="status"
                aria-live="polite"
              >
                {trend === 'up' && <TrendingUpIcon fontSize="small" />}
                {trend === 'down' && <TrendingDownIcon fontSize="small" />}
                {trend === 'neutral' && <TrendingFlatIcon fontSize="small" />}
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  {changePercent >= 0 ? '+' : ''}
                  {changePercent.toFixed(1)}%
                </Typography>
              </Box>
            )}
          </Box>
        </>
      )}
    </CardContent>
  );

  if (onClick) {
    return (
      <Card
        data-testid={`stats-${type}`}
        sx={{
          height: '100%',
          borderRadius: 3,
        }}
        elevation={1}
      >
        <CardActionArea
          onClick={onClick}
          sx={{ height: '100%' }}
          role="button"
          aria-label={`View ${displayLabel} details`}
        >
          {cardContent}
        </CardActionArea>
      </Card>
    );
  }

  return (
    <Card
      data-testid={`stats-${type}`}
      sx={{
        height: '100%',
        borderRadius: 3,
      }}
      elevation={1}
    >
      {cardContent}
    </Card>
  );
}

export default OrderStatsCard;
