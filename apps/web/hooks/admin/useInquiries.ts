/**
 * Admin Inquiry Hooks
 *
 * Reusable hooks for unified inquiry management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// Types
// =============================================================================

export type InquiryChannel = 'smartstore' | 'kakao' | 'email' | 'talktalk';
export type InquiryStatus = 'new' | 'in_progress' | 'resolved' | 'closed';
export type InquiryPriority = 'low' | 'normal' | 'high' | 'urgent';
export type InquiryType = 'product' | 'delivery' | 'refund' | 'installation' | 'general';

export interface Inquiry {
  id: string;
  externalId: string;
  channel: InquiryChannel;
  status: InquiryStatus;
  priority: InquiryPriority;
  subject: string;
  content: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  inquiryType?: InquiryType;
  linkedOrderId?: string;
  assignedTo?: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  created: string;
  updated: string;
}

export interface InquiryMessage {
  id: string;
  inquiryId: string;
  direction: 'inbound' | 'outbound';
  content: string;
  senderType: 'customer' | 'agent' | 'system';
  senderName?: string;
  templateId?: string;
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
  created: string;
}

export interface InquiryDetail extends Inquiry {
  messages: InquiryMessage[];
}

export interface InquiryMetrics {
  totalOpen: number;
  totalResolved: number;
  avgResponseTime: number;
  byChannel: Record<InquiryChannel, number>;
  byStatus: Record<InquiryStatus, number>;
}

export interface ChannelHealth {
  channel: InquiryChannel;
  enabled: boolean;
  healthy: boolean;
  error?: string;
}

export interface InquiryListOptions {
  channel?: InquiryChannel;
  status?: InquiryStatus;
  priority?: InquiryPriority;
  assignedTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'created' | 'updated' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// Query Keys
// =============================================================================

export const inquiryKeys = {
  all: ['admin', 'inquiries'] as const,
  list: (options?: InquiryListOptions) => [...inquiryKeys.all, 'list', options] as const,
  detail: (id: string) => [...inquiryKeys.all, 'detail', id] as const,
  metrics: () => [...inquiryKeys.all, 'metrics'] as const,
  health: () => [...inquiryKeys.all, 'health'] as const,
};

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetch inquiries list with filtering.
 */
export function useInquiries(options?: InquiryListOptions) {
  const params = new URLSearchParams();
  if (options?.channel) params.set('channel', options.channel);
  if (options?.status) params.set('status', options.status);
  if (options?.priority) params.set('priority', options.priority);
  if (options?.assignedTo) params.set('assignedTo', options.assignedTo);
  if (options?.search) params.set('search', options.search);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.sortOrder) params.set('sortOrder', options.sortOrder);

  return useQuery<{ items: Inquiry[]; totalItems: number }>({
    queryKey: inquiryKeys.list(options),
    queryFn: async () => {
      const res = await fetch(`/api/admin/inquiries?${params}`);
      if (!res.ok) throw new Error('Failed to fetch inquiries');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch inquiries');
      return { items: json.data, totalItems: json.totalItems };
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch inquiry detail with messages.
 */
export function useInquiryDetail(id: string | undefined) {
  return useQuery<InquiryDetail>({
    queryKey: inquiryKeys.detail(id || ''),
    queryFn: async () => {
      const res = await fetch(`/api/admin/inquiries/${id}`);
      if (!res.ok) throw new Error('Failed to fetch inquiry');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch inquiry');
      return json.data;
    },
    enabled: !!id,
  });
}

/**
 * Update inquiry (status, priority, assignment).
 */
export function useUpdateInquiry() {
  const queryClient = useQueryClient();

  return useMutation<
    Inquiry,
    Error,
    {
      id: string;
      status?: InquiryStatus;
      priority?: InquiryPriority;
      assignedTo?: string;
      linkedOrderId?: string;
    }
  >({
    mutationFn: async ({ id, ...updates }) => {
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update inquiry');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to update inquiry');
      return json.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.all });
      queryClient.invalidateQueries({ queryKey: inquiryKeys.detail(id) });
    },
  });
}

/**
 * Send reply to unified inquiry.
 */
export function useSendInquiryReply() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { id: string; content: string; templateId?: string }
  >({
    mutationFn: async ({ id, content, templateId }) => {
      const res = await fetch(`/api/admin/inquiries/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, templateId }),
      });
      if (!res.ok) throw new Error('Failed to send reply');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to send reply');
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.all });
      queryClient.invalidateQueries({ queryKey: inquiryKeys.detail(id) });
    },
  });
}

/**
 * Trigger sync from channels.
 */
export function useSyncInquiries() {
  const queryClient = useQueryClient();

  return useMutation<
    { synced: number; errors?: Array<{ channel: InquiryChannel; error: string }> },
    Error,
    InquiryChannel | undefined
  >({
    mutationFn: async (channel) => {
      const res = await fetch('/api/admin/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', channel }),
      });
      if (!res.ok) throw new Error('Sync failed');
      const json = await res.json();
      return { synced: json.synced, errors: json.errors };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.all });
    },
  });
}

/**
 * Fetch inquiry metrics.
 */
export function useInquiryMetrics() {
  return useQuery<InquiryMetrics>({
    queryKey: inquiryKeys.metrics(),
    queryFn: async () => {
      const res = await fetch('/api/admin/inquiries/metrics');
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch metrics');
      return json.data;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch channel health status.
 */
export function useChannelHealth() {
  return useQuery<ChannelHealth[]>({
    queryKey: inquiryKeys.health(),
    queryFn: async () => {
      const res = await fetch('/api/admin/inquiries/health');
      if (!res.ok) throw new Error('Failed to fetch health');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch health');
      return json.data;
    },
    staleTime: 30 * 1000,
  });
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get channel display info.
 */
export function getChannelInfo(channel: InquiryChannel): {
  label: string;
  icon: string;
  color: string;
} {
  const info: Record<InquiryChannel, { label: string; icon: string; color: string }> = {
    smartstore: { label: 'SmartStore', icon: '🛒', color: '#03C75A' },
    kakao: { label: 'Kakao', icon: '💬', color: '#FEE500' },
    email: { label: 'Email', icon: '📧', color: '#4285F4' },
    talktalk: { label: 'TalkTalk', icon: '💭', color: '#00C73C' },
  };
  return info[channel];
}

/**
 * Get status display info.
 */
export function getStatusInfo(status: InquiryStatus): {
  label: string;
  color: 'default' | 'primary' | 'success' | 'warning' | 'error';
} {
  const info: Record<InquiryStatus, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
    new: { label: 'New', color: 'warning' },
    in_progress: { label: 'In Progress', color: 'primary' },
    resolved: { label: 'Resolved', color: 'success' },
    closed: { label: 'Closed', color: 'default' },
  };
  return info[status];
}

/**
 * Get priority display info.
 */
export function getPriorityInfo(priority: InquiryPriority): {
  label: string;
  color: 'default' | 'primary' | 'success' | 'warning' | 'error';
} {
  const info: Record<InquiryPriority, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
    low: { label: 'Low', color: 'default' },
    normal: { label: 'Normal', color: 'primary' },
    high: { label: 'High', color: 'warning' },
    urgent: { label: 'Urgent', color: 'error' },
  };
  return info[priority];
}

/**
 * Format response time.
 */
export function formatResponseTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}
