'use client';

import React, { useState, useCallback, use } from 'react';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Divider,
  IconButton,
  Skeleton,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import {
  useInquiryDetail,
  useUpdateInquiry,
  useSendInquiryReply,
  getChannelInfo,
  getStatusInfo,
  getPriorityInfo,
  type InquiryStatus,
  type InquiryPriority,
  type InquiryMessage,
} from '@/hooks/admin';

// =============================================================================
// Components
// =============================================================================

function MessageBubble({ message }: { message: InquiryMessage }) {
  const isCustomer = message.senderType === 'customer';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isCustomer ? 'flex-start' : 'flex-end',
        mb: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: '70%',
          p: 2,
          borderRadius: 2,
          bgcolor: isCustomer ? 'grey.100' : 'primary.main',
          color: isCustomer ? 'text.primary' : 'white',
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          {isCustomer ? (
            <PersonIcon fontSize="small" />
          ) : (
            <SupportAgentIcon fontSize="small" />
          )}
          <Typography variant="caption" fontWeight={500}>
            {message.senderName || (isCustomer ? 'Customer' : 'Agent')}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {new Date(message.created).toLocaleString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {message.content}
        </Typography>
        {message.deliveryStatus && message.deliveryStatus !== 'delivered' && (
          <Chip
            label={message.deliveryStatus}
            size="small"
            color={message.deliveryStatus === 'failed' ? 'error' : 'default'}
            sx={{ mt: 1 }}
          />
        )}
      </Box>
    </Box>
  );
}

function CustomerInfo({
  inquiry,
}: {
  inquiry: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    linkedOrderId?: string;
  };
}) {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle2" fontWeight={600} mb={2}>
          Customer Info
        </Typography>
        <Box display="flex" flexDirection="column" gap={1}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Name
            </Typography>
            <Typography variant="body2">
              {inquiry.customerName || '-'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body2">
              {inquiry.customerEmail || '-'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Phone
            </Typography>
            <Typography variant="body2">
              {inquiry.customerPhone || '-'}
            </Typography>
          </Box>
          {inquiry.linkedOrderId && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Order ID
              </Typography>
              <Typography variant="body2" color="primary">
                {inquiry.linkedOrderId}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [replyContent, setReplyContent] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const { data: inquiry, isLoading, error } = useInquiryDetail(id);
  const { mutate: updateInquiry, isPending: isUpdating } = useUpdateInquiry();
  const { mutate: sendReply, isPending: isSending } = useSendInquiryReply();

  const handleStatusChange = useCallback(
    (status: InquiryStatus) => {
      updateInquiry(
        { id, status },
        {
          onSuccess: () => {
            setSnackbar({
              open: true,
              message: 'Status updated',
              severity: 'success',
            });
          },
          onError: (err: Error) => {
            setSnackbar({
              open: true,
              message: err.message,
              severity: 'error',
            });
          },
        }
      );
    },
    [id, updateInquiry]
  );

  const handlePriorityChange = useCallback(
    (priority: InquiryPriority) => {
      updateInquiry(
        { id, priority },
        {
          onSuccess: () => {
            setSnackbar({
              open: true,
              message: 'Priority updated',
              severity: 'success',
            });
          },
          onError: (err: Error) => {
            setSnackbar({
              open: true,
              message: err.message,
              severity: 'error',
            });
          },
        }
      );
    },
    [id, updateInquiry]
  );

  const handleSendReply = useCallback(() => {
    if (!replyContent.trim()) return;

    sendReply(
      { id, content: replyContent },
      {
        onSuccess: () => {
          setReplyContent('');
          setSnackbar({
            open: true,
            message: 'Reply sent',
            severity: 'success',
          });
        },
        onError: (err: Error) => {
          setSnackbar({
            open: true,
            message: err.message,
            severity: 'error',
          });
        },
      }
    );
  }, [id, replyContent, sendReply]);

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rectangular" height={400} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error || !inquiry) {
    return (
      <Alert severity="error">
        {error?.message || 'Inquiry not found'}
      </Alert>
    );
  }

  const channelInfo = getChannelInfo(inquiry.channel);
  const statusInfo = getStatusInfo(inquiry.status);
  const priorityInfo = getPriorityInfo(inquiry.priority);

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => router.push('/admin/inquiries')}>
          <ArrowBackIcon />
        </IconButton>
        <Box flex={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <span style={{ fontSize: '1.5rem' }}>{channelInfo.icon}</span>
            <Typography variant="h6" fontWeight={600}>
              {inquiry.subject}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {channelInfo.label} • {new Date(inquiry.created).toLocaleString('ko-KR')}
          </Typography>
        </Box>
        <Chip
          label={statusInfo.label}
          color={statusInfo.color}
        />
        <Chip
          label={priorityInfo.label}
          color={priorityInfo.color}
          variant="outlined"
        />
      </Box>

      <Grid container spacing={3}>
        {/* Messages */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2, minHeight: 400, maxHeight: 600, overflow: 'auto' }}>
            {inquiry.messages.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                No messages yet
              </Typography>
            ) : (
              inquiry.messages.map((msg: InquiryMessage) => (
                <MessageBubble key={msg.id} message={msg} />
              ))
            )}
          </Paper>

          {/* Reply Input */}
          <Paper sx={{ p: 2, mt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Type your reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              disabled={isSending}
            />
            <Box display="flex" justifyContent="flex-end" mt={2}>
              <Button
                variant="contained"
                endIcon={isSending ? <CircularProgress size={16} /> : <SendIcon />}
                onClick={handleSendReply}
                disabled={!replyContent.trim() || isSending}
              >
                Send Reply
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box display="flex" flexDirection="column" gap={2}>
            {/* Status & Priority */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={2}>
                  Status & Priority
                </Typography>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={inquiry.status}
                    label="Status"
                    onChange={(e) => handleStatusChange(e.target.value as InquiryStatus)}
                    disabled={isUpdating}
                  >
                    <MenuItem value="new">New</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={inquiry.priority}
                    label="Priority"
                    onChange={(e) => handlePriorityChange(e.target.value as InquiryPriority)}
                    disabled={isUpdating}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <CustomerInfo inquiry={inquiry} />

            {/* Inquiry Details */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={2}>
                  Details
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      External ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {inquiry.externalId}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Type
                    </Typography>
                    <Typography variant="body2">
                      {inquiry.inquiryType || 'General'}
                    </Typography>
                  </Box>
                  {inquiry.firstResponseAt && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          First Response
                        </Typography>
                        <Typography variant="body2">
                          {new Date(inquiry.firstResponseAt).toLocaleString('ko-KR')}
                        </Typography>
                      </Box>
                    </>
                  )}
                  {inquiry.resolvedAt && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Resolved
                        </Typography>
                        <Typography variant="body2">
                          {new Date(inquiry.resolvedAt).toLocaleString('ko-KR')}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
