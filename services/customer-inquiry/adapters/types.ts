/**
 * Customer Inquiry Channel Adapter Types
 *
 * Common interfaces for unified inquiry management across channels.
 */

// =============================================================================
// Core Types
// =============================================================================

export type InquiryChannel = 'smartstore' | 'kakao' | 'email' | 'talktalk';
export type InquiryStatus = 'new' | 'in_progress' | 'resolved' | 'closed';
export type InquiryPriority = 'low' | 'normal' | 'high' | 'urgent';
export type InquiryType = 'product' | 'delivery' | 'refund' | 'installation' | 'general';
export type MessageDirection = 'inbound' | 'outbound';
export type SenderType = 'customer' | 'agent' | 'system';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed';

// =============================================================================
// External Inquiry (from channel)
// =============================================================================

export interface ExternalInquiry {
  externalId: string;
  channel: InquiryChannel;
  subject: string;
  content: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  inquiryType?: InquiryType;
  linkedOrderId?: string;
  createdAt: Date;
  updatedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ExternalMessage {
  externalId: string;
  content: string;
  direction: MessageDirection;
  senderName?: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Internal Inquiry (stored in DB)
// =============================================================================

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
  metadata?: Record<string, unknown>;
  created: string;
  updated: string;
}

export interface InquiryMessage {
  id: string;
  inquiryId: string;
  direction: MessageDirection;
  content: string;
  senderType: SenderType;
  senderName?: string;
  templateId?: string;
  deliveryStatus?: DeliveryStatus;
  externalMessageId?: string;
  metadata?: Record<string, unknown>;
  created: string;
}

// =============================================================================
// Reply
// =============================================================================

export interface ReplyContent {
  content: string;
  templateId?: string;
  attachments?: Array<{
    name: string;
    url: string;
    mimeType: string;
  }>;
}

export interface ReplyResult {
  success: boolean;
  externalMessageId?: string;
  error?: string;
  deliveryStatus: DeliveryStatus;
}

// =============================================================================
// Fetch Options
// =============================================================================

export interface FetchOptions {
  since?: Date;
  limit?: number;
  status?: string[];
  includeReplied?: boolean;
}

// =============================================================================
// Channel Adapter Interface
// =============================================================================

export interface InquiryChannelAdapter {
  /** Channel identifier */
  readonly channel: InquiryChannel;

  /** Human-readable channel name */
  readonly displayName: string;

  /**
   * Fetch new inquiries from the channel
   */
  fetchInquiries(options?: FetchOptions): Promise<ExternalInquiry[]>;

  /**
   * Fetch messages for a specific inquiry
   */
  fetchMessages?(externalId: string): Promise<ExternalMessage[]>;

  /**
   * Send a reply to an inquiry
   */
  sendReply(externalId: string, reply: ReplyContent): Promise<ReplyResult>;

  /**
   * Check if the adapter is properly configured and working
   */
  healthCheck(): Promise<{ healthy: boolean; error?: string }>;

  /**
   * Check if this adapter is enabled
   */
  isEnabled(): Promise<boolean>;
}

// =============================================================================
// Adapter Factory
// =============================================================================

export interface AdapterConfig {
  channel: InquiryChannel;
  enabled: boolean;
  credentials?: Record<string, string>;
}

export type AdapterFactory = (config: AdapterConfig) => InquiryChannelAdapter;

// =============================================================================
// Service Types
// =============================================================================

export interface InquiryListOptions {
  channel?: InquiryChannel;
  status?: InquiryStatus | InquiryStatus[];
  priority?: InquiryPriority;
  assignedTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'created' | 'updated' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

export interface InquiryListResult {
  items: Inquiry[];
  totalItems: number;
  page: number;
  perPage: number;
}

export interface InquiryMetrics {
  totalOpen: number;
  totalResolved: number;
  avgResponseTime: number; // in minutes
  byChannel: Record<InquiryChannel, number>;
  byStatus: Record<InquiryStatus, number>;
}
