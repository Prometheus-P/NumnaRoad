'use client';

import React, { memo } from 'react';
import { Box, Card, CardContent, Typography, Skeleton, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  loading?: boolean;
  color: string;
  isAlert?: boolean;
  vsYesterdayLabel?: string;
  alertLabel?: string;
}

export const StatCard = memo(function StatCard({
  title,
  value,
  change,
  icon,
  loading,
  color,
  isAlert,
  vsYesterdayLabel,
  alertLabel,
}: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            {loading ? (
              <Skeleton width={80} height={40} />
            ) : (
              <Typography variant="h4" fontWeight={600}>
                {value}
              </Typography>
            )}
            {change !== undefined && !loading && (
              <Box display="flex" alignItems="center" mt={1}>
                {change >= 0 ? (
                  <TrendingUpIcon color="success" fontSize="small" />
                ) : (
                  <TrendingDownIcon color="error" fontSize="small" />
                )}
                <Typography
                  variant="body2"
                  color={change >= 0 ? 'success.main' : 'error.main'}
                  ml={0.5}
                >
                  {vsYesterdayLabel || '전일 대비'} {change >= 0 ? '+' : ''}{change}%
                </Typography>
              </Box>
            )}
            {isAlert && (
              <Chip
                label={alertLabel || 'Alert'}
                color="error"
                size="small"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: `${color}15`,
              color: color,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
});
