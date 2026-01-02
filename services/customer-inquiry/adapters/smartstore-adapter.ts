/**
 * SmartStore Inquiry Channel Adapter
 *
 * Wraps the existing SmartStore client to provide unified inquiry management.
 */

import { getSmartStoreClient } from '../../sales-channels/smartstore/client';
import type { NaverInquiry } from '../../sales-channels/smartstore/types';
import type {
  InquiryChannelAdapter,
  ExternalInquiry,
  ReplyContent,
  ReplyResult,
  FetchOptions,
  InquiryType,
} from './types';

// =============================================================================
// Type Mapping
// =============================================================================

function mapNaverInquiryType(naverType: NaverInquiry['inquiryType']): InquiryType {
  const mapping: Record<NaverInquiry['inquiryType'], InquiryType> = {
    PRODUCT: 'product',
    DELIVERY: 'delivery',
    EXCHANGE_RETURN: 'refund',
    OTHER: 'general',
  };
  return mapping[naverType] || 'general';
}

function mapNaverInquiry(inquiry: NaverInquiry): ExternalInquiry {
  return {
    externalId: inquiry.inquiryId,
    channel: 'smartstore',
    subject: inquiry.title,
    content: inquiry.content,
    customerName: inquiry.inquirer.name,
    inquiryType: mapNaverInquiryType(inquiry.inquiryType),
    linkedOrderId: undefined, // SmartStore doesn't link directly to order in inquiry
    createdAt: new Date(inquiry.createdDate),
    updatedAt: inquiry.answeredDate ? new Date(inquiry.answeredDate) : undefined,
    metadata: {
      productId: inquiry.productId,
      productName: inquiry.productName,
      isAnswered: inquiry.isAnswered,
      memberId: inquiry.inquirer.memberId,
    },
  };
}

// =============================================================================
// SmartStore Adapter
// =============================================================================

export class SmartStoreInquiryAdapter implements InquiryChannelAdapter {
  readonly channel = 'smartstore' as const;
  readonly displayName = 'SmartStore';

  private client = getSmartStoreClient();

  async fetchInquiries(options?: FetchOptions): Promise<ExternalInquiry[]> {
    const result = await this.client.getInquiries({
      answered: options?.includeReplied ? undefined : false,
      pageSize: options?.limit || 50,
    });

    if (!result.success || !result.data) {
      console.error('[SmartStoreAdapter] Failed to fetch inquiries:', result.errorMessage);
      return [];
    }

    const inquiries = result.data.map(mapNaverInquiry);

    // Filter by date if provided
    if (options?.since) {
      return inquiries.filter((i) => i.createdAt >= options.since!);
    }

    return inquiries;
  }

  async sendReply(externalId: string, reply: ReplyContent): Promise<ReplyResult> {
    const result = await this.client.replyToInquiry(externalId, reply.content);

    if (!result.success) {
      return {
        success: false,
        error: result.errorMessage || 'Failed to send reply',
        deliveryStatus: 'failed',
      };
    }

    return {
      success: true,
      deliveryStatus: 'delivered',
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const isHealthy = await this.client.healthCheck();
      return { healthy: isHealthy };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async isEnabled(): Promise<boolean> {
    // Check if SmartStore credentials are configured
    const appKey = process.env.SMARTSTORE_APP_KEY;
    const appSecret = process.env.SMARTSTORE_APP_SECRET;
    return !!(appKey && appSecret);
  }
}

// =============================================================================
// Singleton
// =============================================================================

let adapterInstance: SmartStoreInquiryAdapter | null = null;

export function getSmartStoreInquiryAdapter(): SmartStoreInquiryAdapter {
  if (!adapterInstance) {
    adapterInstance = new SmartStoreInquiryAdapter();
  }
  return adapterInstance;
}
