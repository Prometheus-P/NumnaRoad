/**
 * Unified Inquiry Service
 *
 * Manages customer inquiries across multiple channels.
 * Provides CRUD operations and sync functionality.
 */

import type PocketBase from 'pocketbase';
import { logger } from '../logger';
import type {
  InquiryChannelAdapter,
  InquiryChannel,
  InquiryStatus,
  InquiryPriority,
  Inquiry,
  InquiryMessage,
  InquiryListOptions,
  InquiryListResult,
  InquiryMetrics,
  ExternalInquiry,
  ReplyContent,
  ReplyResult,
} from './adapters/types';
// Import adapters lazily to avoid circular dependencies
function getSmartStoreAdapter() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getSmartStoreInquiryAdapter } = require('./adapters/smartstore-adapter');
  return getSmartStoreInquiryAdapter();
}

function getEmailAdapter() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getEmailInquiryAdapter } = require('./adapters/email-adapter');
  return getEmailInquiryAdapter();
}

function getKakaoAdapter() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getKakaoInquiryAdapter } = require('./adapters/kakao-adapter');
  return getKakaoInquiryAdapter();
}

function getTalkTalkAdapter() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getTalkTalkInquiryAdapter } = require('./adapters/talktalk-adapter');
  return getTalkTalkInquiryAdapter();
}

// =============================================================================
// Types
// =============================================================================

interface InquiryRecord {
  id: string;
  external_id: string;
  channel: InquiryChannel;
  status: InquiryStatus;
  priority: InquiryPriority;
  subject: string;
  content: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  inquiry_type?: string;
  linked_order_id?: string;
  assigned_to?: string;
  first_response_at?: string;
  resolved_at?: string;
  metadata?: Record<string, unknown>;
  created: string;
  updated: string;
}

interface MessageRecord {
  id: string;
  inquiry_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  sender_type: 'customer' | 'agent' | 'system';
  sender_name?: string;
  template_id?: string;
  delivery_status?: string;
  external_message_id?: string;
  metadata?: Record<string, unknown>;
  created: string;
}

// =============================================================================
// Adapters Registry
// =============================================================================

const adapters: Map<InquiryChannel, InquiryChannelAdapter> = new Map();

function registerAdapter(adapter: InquiryChannelAdapter): void {
  adapters.set(adapter.channel, adapter);
}

function getAdapter(channel: InquiryChannel): InquiryChannelAdapter | undefined {
  return adapters.get(channel);
}

async function getEnabledAdapters(): Promise<InquiryChannelAdapter[]> {
  const enabled: InquiryChannelAdapter[] = [];
  for (const adapter of adapters.values()) {
    if (await adapter.isEnabled()) {
      enabled.push(adapter);
    }
  }
  return enabled;
}

// Initialize adapters - use lazy loading to avoid issues
let adaptersInitialized = false;

function initializeAdapters() {
  if (adaptersInitialized) return;

  // SmartStore adapter
  try {
    registerAdapter(getSmartStoreAdapter());
  } catch {
    logger.warn('inquiry_adapter_not_available', { adapter: 'smartstore' });
  }

  // Email adapter
  try {
    registerAdapter(getEmailAdapter());
  } catch {
    logger.warn('inquiry_adapter_not_available', { adapter: 'email' });
  }

  // Kakao adapter
  try {
    registerAdapter(getKakaoAdapter());
  } catch {
    logger.warn('inquiry_adapter_not_available', { adapter: 'kakao' });
  }

  // TalkTalk adapter
  try {
    registerAdapter(getTalkTalkAdapter());
  } catch {
    logger.warn('inquiry_adapter_not_available', { adapter: 'talktalk' });
  }

  adaptersInitialized = true;
}

// =============================================================================
// Record Mapping
// =============================================================================

function recordToInquiry(record: InquiryRecord): Inquiry {
  return {
    id: record.id,
    externalId: record.external_id,
    channel: record.channel,
    status: record.status,
    priority: record.priority,
    subject: record.subject,
    content: record.content,
    customerName: record.customer_name,
    customerEmail: record.customer_email,
    customerPhone: record.customer_phone,
    inquiryType: record.inquiry_type as Inquiry['inquiryType'],
    linkedOrderId: record.linked_order_id,
    assignedTo: record.assigned_to,
    firstResponseAt: record.first_response_at,
    resolvedAt: record.resolved_at,
    metadata: record.metadata,
    created: record.created,
    updated: record.updated,
  };
}

function recordToMessage(record: MessageRecord): InquiryMessage {
  return {
    id: record.id,
    inquiryId: record.inquiry_id,
    direction: record.direction,
    content: record.content,
    senderType: record.sender_type,
    senderName: record.sender_name,
    templateId: record.template_id,
    deliveryStatus: record.delivery_status as InquiryMessage['deliveryStatus'],
    externalMessageId: record.external_message_id,
    metadata: record.metadata,
    created: record.created,
  };
}

// =============================================================================
// Inquiry Service
// =============================================================================

export class InquiryService {
  constructor(private pb: PocketBase) {
    initializeAdapters();
  }

  // ===========================================================================
  // List & Get
  // ===========================================================================

  async listInquiries(options?: InquiryListOptions): Promise<InquiryListResult> {
    const filters: string[] = [];

    if (options?.channel) {
      filters.push(`channel="${options.channel}"`);
    }

    if (options?.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      const statusFilter = statuses.map((s) => `status="${s}"`).join(' || ');
      filters.push(`(${statusFilter})`);
    }

    if (options?.priority) {
      filters.push(`priority="${options.priority}"`);
    }

    if (options?.assignedTo) {
      filters.push(`assigned_to="${options.assignedTo}"`);
    }

    if (options?.search) {
      const escapedSearch = options.search.replace(/"/g, '\\"');
      filters.push(
        `(subject~"${escapedSearch}" || content~"${escapedSearch}" || customer_name~"${escapedSearch}")`
      );
    }

    const filter = filters.length > 0 ? filters.join(' && ') : undefined;

    const sortField = options?.sortBy || 'created';
    const sortOrder = options?.sortOrder === 'asc' ? '' : '-';
    const sort = `${sortOrder}${sortField}`;

    const perPage = options?.limit || 20;
    const page = Math.floor((options?.offset || 0) / perPage) + 1;

    const result = await this.pb.collection('inquiries').getList<InquiryRecord>(page, perPage, {
      filter,
      sort,
    });

    return {
      items: result.items.map(recordToInquiry),
      totalItems: result.totalItems,
      page: result.page,
      perPage: result.perPage,
    };
  }

  async getInquiry(id: string): Promise<Inquiry | null> {
    try {
      const record = await this.pb.collection('inquiries').getOne<InquiryRecord>(id);
      return recordToInquiry(record);
    } catch {
      return null;
    }
  }

  async getInquiryByExternalId(
    channel: InquiryChannel,
    externalId: string
  ): Promise<Inquiry | null> {
    try {
      const record = await this.pb
        .collection('inquiries')
        .getFirstListItem<InquiryRecord>(`channel="${channel}" && external_id="${externalId}"`);
      return recordToInquiry(record);
    } catch {
      return null;
    }
  }

  // ===========================================================================
  // Create & Update
  // ===========================================================================

  async createInquiry(external: ExternalInquiry): Promise<Inquiry> {
    const record = await this.pb.collection('inquiries').create<InquiryRecord>({
      external_id: external.externalId,
      channel: external.channel,
      status: 'new',
      priority: 'normal',
      subject: external.subject,
      content: external.content,
      customer_name: external.customerName,
      customer_email: external.customerEmail,
      customer_phone: external.customerPhone,
      inquiry_type: external.inquiryType,
      linked_order_id: external.linkedOrderId,
      metadata: external.metadata,
    });

    // Create initial message
    await this.pb.collection('inquiry_messages').create({
      inquiry_id: record.id,
      direction: 'inbound',
      content: external.content,
      sender_type: 'customer',
      sender_name: external.customerName,
      delivery_status: 'delivered',
    });

    return recordToInquiry(record);
  }

  async updateInquiry(
    id: string,
    updates: Partial<{
      status: InquiryStatus;
      priority: InquiryPriority;
      assignedTo: string;
      linkedOrderId: string;
    }>
  ): Promise<Inquiry> {
    const data: Partial<InquiryRecord> = {};

    if (updates.status) {
      data.status = updates.status;
      if (updates.status === 'resolved') {
        data.resolved_at = new Date().toISOString();
      }
    }
    if (updates.priority) data.priority = updates.priority;
    if (updates.assignedTo !== undefined) data.assigned_to = updates.assignedTo;
    if (updates.linkedOrderId !== undefined) data.linked_order_id = updates.linkedOrderId;

    const record = await this.pb.collection('inquiries').update<InquiryRecord>(id, data);
    return recordToInquiry(record);
  }

  // ===========================================================================
  // Messages
  // ===========================================================================

  async getMessages(inquiryId: string): Promise<InquiryMessage[]> {
    const records = await this.pb
      .collection('inquiry_messages')
      .getFullList<MessageRecord>({
        filter: `inquiry_id="${inquiryId}"`,
        sort: 'created',
      });

    return records.map(recordToMessage);
  }

  // ===========================================================================
  // Reply
  // ===========================================================================

  async sendReply(
    inquiryId: string,
    reply: ReplyContent,
    agentName?: string
  ): Promise<{ success: boolean; error?: string }> {
    const inquiry = await this.getInquiry(inquiryId);
    if (!inquiry) {
      return { success: false, error: 'Inquiry not found' };
    }

    const adapter = getAdapter(inquiry.channel);
    if (!adapter) {
      return { success: false, error: `No adapter for channel: ${inquiry.channel}` };
    }

    // Send reply via adapter
    const result: ReplyResult = await adapter.sendReply(inquiry.externalId, reply);

    // Record message
    await this.pb.collection('inquiry_messages').create({
      inquiry_id: inquiryId,
      direction: 'outbound',
      content: reply.content,
      sender_type: 'agent',
      sender_name: agentName,
      template_id: reply.templateId,
      delivery_status: result.deliveryStatus,
      external_message_id: result.externalMessageId,
    });

    // Update inquiry status and first response time
    const updates: Partial<InquiryRecord> = {
      status: 'in_progress',
    };

    if (!inquiry.firstResponseAt) {
      updates.first_response_at = new Date().toISOString();
    }

    await this.pb.collection('inquiries').update(inquiryId, updates);

    return { success: result.success, error: result.error };
  }

  // ===========================================================================
  // Sync
  // ===========================================================================

  async syncFromAllChannels(): Promise<{
    synced: number;
    errors: Array<{ channel: InquiryChannel; error: string }>;
  }> {
    const enabledAdapters = await getEnabledAdapters();
    let synced = 0;
    const errors: Array<{ channel: InquiryChannel; error: string }> = [];

    for (const adapter of enabledAdapters) {
      try {
        const external = await adapter.fetchInquiries({ includeReplied: false });

        for (const inquiry of external) {
          const existing = await this.getInquiryByExternalId(
            inquiry.channel,
            inquiry.externalId
          );

          if (!existing) {
            await this.createInquiry(inquiry);
            synced++;
          }
        }
      } catch (error) {
        errors.push({
          channel: adapter.channel,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { synced, errors };
  }

  async syncFromChannel(channel: InquiryChannel): Promise<{
    synced: number;
    error?: string;
  }> {
    const adapter = getAdapter(channel);
    if (!adapter) {
      return { synced: 0, error: `No adapter for channel: ${channel}` };
    }

    try {
      const external = await adapter.fetchInquiries({ includeReplied: false });
      let synced = 0;

      for (const inquiry of external) {
        const existing = await this.getInquiryByExternalId(
          inquiry.channel,
          inquiry.externalId
        );

        if (!existing) {
          await this.createInquiry(inquiry);
          synced++;
        }
      }

      return { synced };
    } catch (error) {
      return {
        synced: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ===========================================================================
  // Metrics
  // ===========================================================================

  async getMetrics(): Promise<InquiryMetrics> {
    const allInquiries = await this.pb
      .collection('inquiries')
      .getFullList<InquiryRecord>({ fields: 'id,channel,status,first_response_at,created' });

    const metrics: InquiryMetrics = {
      totalOpen: 0,
      totalResolved: 0,
      avgResponseTime: 0,
      byChannel: {
        smartstore: 0,
        kakao: 0,
        email: 0,
        talktalk: 0,
      },
      byStatus: {
        new: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0,
      },
    };

    let totalResponseTime = 0;
    let responseCount = 0;

    for (const inquiry of allInquiries) {
      // Count by channel
      if (inquiry.channel in metrics.byChannel) {
        metrics.byChannel[inquiry.channel]++;
      }

      // Count by status
      if (inquiry.status in metrics.byStatus) {
        metrics.byStatus[inquiry.status]++;
      }

      // Open/resolved counts
      if (inquiry.status === 'new' || inquiry.status === 'in_progress') {
        metrics.totalOpen++;
      } else {
        metrics.totalResolved++;
      }

      // Calculate response time
      if (inquiry.first_response_at) {
        const created = new Date(inquiry.created).getTime();
        const responded = new Date(inquiry.first_response_at).getTime();
        totalResponseTime += (responded - created) / (1000 * 60); // in minutes
        responseCount++;
      }
    }

    if (responseCount > 0) {
      metrics.avgResponseTime = Math.round(totalResponseTime / responseCount);
    }

    return metrics;
  }

  // ===========================================================================
  // Channel Health
  // ===========================================================================

  async getChannelHealth(): Promise<
    Array<{ channel: InquiryChannel; enabled: boolean; healthy: boolean; error?: string }>
  > {
    const results: Array<{
      channel: InquiryChannel;
      enabled: boolean;
      healthy: boolean;
      error?: string;
    }> = [];

    for (const adapter of adapters.values()) {
      const enabled = await adapter.isEnabled();
      let healthy = false;
      let error: string | undefined;

      if (enabled) {
        const healthResult = await adapter.healthCheck();
        healthy = healthResult.healthy;
        error = healthResult.error;
      }

      results.push({
        channel: adapter.channel,
        enabled,
        healthy,
        error,
      });
    }

    return results;
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createInquiryService(pb: PocketBase): InquiryService {
  return new InquiryService(pb);
}
