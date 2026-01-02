'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Skeleton,
  Alert,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  useInquiries,
  useInquiryMetrics,
  useChannelHealth,
  useSyncInquiries,
  getChannelInfo,
  getStatusInfo,
  getPriorityInfo,
  formatResponseTime,
  type InquiryChannel,
  type InquiryStatus,
  type InquiryItem,
} from '@/hooks/admin';

// =============================================================================
// Components
// =============================================================================

function MetricsCards() {
  const { data: metrics, isLoading } = useInquiryMetrics();

  if (isLoading) {
    return (
      <Grid container spacing={2} mb={3}>
        {[1, 2, 3, 4].map((i) => (
          <Grid key={i} size={{ xs: 6, md: 3 }}>
            <Skeleton variant="rectangular" height={100} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!metrics) return null;

  const cards = [
    { label: 'Open', value: metrics.totalOpen, color: 'warning.main' },
    { label: 'Resolved', value: metrics.totalResolved, color: 'success.main' },
    { label: 'Avg Response', value: formatResponseTime(metrics.avgResponseTime), color: 'info.main' },
    { label: 'Total', value: metrics.totalOpen + metrics.totalResolved, color: 'text.secondary' },
  ];

  return (
    <Grid container spacing={2} mb={3}>
      {cards.map((card) => (
        <Grid key={card.label} size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {card.label}
              </Typography>
              <Typography variant="h4" fontWeight={600} sx={{ color: card.color }}>
                {card.value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

function ChannelHealthBar() {
  const { data: health } = useChannelHealth();

  if (!health) return null;

  return (
    <Box display="flex" gap={1} mb={2}>
      {health.map((ch) => {
        const info = getChannelInfo(ch.channel);
        return (
          <Tooltip
            key={ch.channel}
            title={ch.error || (ch.healthy ? 'Connected' : 'Not configured')}
          >
            <Chip
              label={info.label}
              size="small"
              sx={{
                bgcolor: ch.enabled && ch.healthy ? info.color : 'grey.300',
                color: ch.enabled && ch.healthy ? 'white' : 'text.secondary',
              }}
            />
          </Tooltip>
        );
      })}
    </Box>
  );
}

function InquiryRow({ inquiry, onClick }: { inquiry: InquiryItem; onClick: () => void }) {
  const channelInfo = getChannelInfo(inquiry.channel);
  const statusInfo = getStatusInfo(inquiry.status);
  const priorityInfo = getPriorityInfo(inquiry.priority);

  return (
    <TableRow
      hover
      onClick={onClick}
      sx={{ cursor: 'pointer' }}
    >
      <TableCell>
        <Tooltip title={channelInfo.label}>
          <span style={{ fontSize: '1.2rem' }}>{channelInfo.icon}</span>
        </Tooltip>
      </TableCell>
      <TableCell>
        <Box>
          <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 300 }}>
            {inquiry.subject}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {inquiry.customerName || 'Unknown'}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          label={statusInfo.label}
          size="small"
          color={statusInfo.color}
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Chip
          label={priorityInfo.label}
          size="small"
          color={priorityInfo.color}
          variant="filled"
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {inquiry.assignedTo || '-'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {new Date(inquiry.created).toLocaleString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography>
      </TableCell>
      <TableCell>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onClick(); }}>
          <OpenInNewIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function InquiriesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<InquiryChannel | ''>('');
  const [status, setStatus] = useState<InquiryStatus | ''>('');

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useInquiries({
    search: search || undefined,
    channel: channel || undefined,
    status: status || undefined,
    limit: 50,
  });

  const { mutate: syncInquiries, isPending: isSyncing } = useSyncInquiries();

  const handleSync = useCallback(() => {
    syncInquiries(undefined);
  }, [syncInquiries]);

  const handleRowClick = useCallback((id: string) => {
    router.push(`/admin/inquiries/${id}`);
  }, [router]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          Customer Inquiries
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={isSyncing ? <CircularProgress size={16} /> : <SyncIcon />}
            onClick={handleSync}
            disabled={isSyncing}
          >
            Sync
          </Button>
          <IconButton onClick={() => refetch()}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      <MetricsCards />
      <ChannelHealthBar />

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search inquiries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Channel</InputLabel>
                <Select
                  value={channel}
                  label="Channel"
                  onChange={(e) => setChannel(e.target.value as InquiryChannel | '')}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="smartstore">SmartStore</MenuItem>
                  <MenuItem value="kakao">Kakao</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="talktalk">TalkTalk</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={status}
                  label="Status"
                  onChange={(e) => setStatus(e.target.value as InquiryStatus | '')}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="new">New</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load inquiries: {error.message}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={50}>CH</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell width={100}>Status</TableCell>
                <TableCell width={100}>Priority</TableCell>
                <TableCell width={120}>Assigned</TableCell>
                <TableCell width={120}>Created</TableCell>
                <TableCell width={50}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                    <TableCell key={j}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Inquiries Table */}
      {!isLoading && data && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={50}>CH</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell width={100}>Status</TableCell>
                <TableCell width={100}>Priority</TableCell>
                <TableCell width={120}>Assigned</TableCell>
                <TableCell width={120}>Created</TableCell>
                <TableCell width={50}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No inquiries found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((inquiry) => (
                  <InquiryRow
                    key={inquiry.id}
                    inquiry={inquiry}
                    onClick={() => handleRowClick(inquiry.id)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination Info */}
      {data && (
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Typography variant="body2" color="text.secondary">
            Showing {data.items.length} of {data.totalItems} inquiries
          </Typography>
        </Box>
      )}
    </Box>
  );
}
