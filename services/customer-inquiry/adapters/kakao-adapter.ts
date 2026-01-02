/**
 * Kakao Inquiry Channel Adapter
 *
 * Uses Kakao BizMessage API for customer inquiry management.
 * Kakao channel messages are received via webhook and replies are sent via API.
 */

import type {
  InquiryChannelAdapter,
  ExternalInquiry,
  ReplyContent,
  ReplyResult,
  FetchOptions,
} from './types';

// =============================================================================
// Configuration
// =============================================================================

const KAKAO_API_BASE = 'https://api.bizppurio.com';

// =============================================================================
// Types
// =============================================================================

interface KakaoMessage {
  messageId: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  content: string;
  type: 'text' | 'image' | 'file';
  timestamp: string;
  channelId: string;
}

interface KakaoApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// =============================================================================
// Kakao Adapter
// =============================================================================

export class KakaoInquiryAdapter implements InquiryChannelAdapter {
  readonly channel = 'kakao' as const;
  readonly displayName = 'Kakao Channel';

  private getApiKey(): string {
    const apiKey = process.env.KAKAO_BIZMSG_API_KEY;
    if (!apiKey) {
      throw new Error('KAKAO_BIZMSG_API_KEY is not configured');
    }
    return apiKey;
  }

  private getSenderKey(): string {
    const senderKey = process.env.KAKAO_BIZMSG_SENDER_KEY;
    if (!senderKey) {
      throw new Error('KAKAO_BIZMSG_SENDER_KEY is not configured');
    }
    return senderKey;
  }

  /**
   * Fetch inquiries from Kakao channel.
   * Note: Kakao messages are pushed via webhook, so this returns empty.
   */
  async fetchInquiries(_options?: FetchOptions): Promise<ExternalInquiry[]> {
    // Kakao messages are pushed via webhook, not pulled
    return [];
  }

  /**
   * Send a reply message to the customer via Kakao
   */
  async sendReply(externalId: string, reply: ReplyContent): Promise<ReplyResult> {
    try {
      const apiKey = this.getApiKey();
      const senderKey = this.getSenderKey();

      // externalId format: "kakao:userId:timestamp"
      const parts = externalId.split(':');
      if (parts.length < 2) {
        return {
          success: false,
          error: 'Invalid external ID format',
          deliveryStatus: 'failed',
        };
      }

      const userId = parts[1];

      // Send message via Kakao BizMessage API
      const response = await fetch(`${KAKAO_API_BASE}/v1/message/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          senderKey,
          userId,
          messageType: 'text',
          content: reply.content,
        }),
      });

      const result: KakaoApiResponse<{ messageId: string }> = await response.json();

      if (!result.success || !response.ok) {
        console.error('[KakaoAdapter] Failed to send reply:', result.error);
        return {
          success: false,
          error: result.error?.message || 'Failed to send Kakao message',
          deliveryStatus: 'failed',
        };
      }

      return {
        success: true,
        externalMessageId: result.data?.messageId,
        deliveryStatus: 'sent',
      };
    } catch (error) {
      console.error('[KakaoAdapter] sendReply error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryStatus: 'failed',
      };
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const apiKey = process.env.KAKAO_BIZMSG_API_KEY;
      const senderKey = process.env.KAKAO_BIZMSG_SENDER_KEY;

      if (!apiKey || !senderKey) {
        return { healthy: false, error: 'Kakao BizMessage credentials not configured' };
      }

      // Check API connection
      const response = await fetch(`${KAKAO_API_BASE}/v1/channel/info`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        return { healthy: false, error: `API returned status ${response.status}` };
      }

      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async isEnabled(): Promise<boolean> {
    const apiKey = process.env.KAKAO_BIZMSG_API_KEY;
    const senderKey = process.env.KAKAO_BIZMSG_SENDER_KEY;
    return !!(apiKey && senderKey);
  }
}

// =============================================================================
// Webhook Payload Types
// =============================================================================

export interface KakaoWebhookPayload {
  event: 'message' | 'follow' | 'unfollow';
  timestamp: string;
  channelId: string;
  user: {
    userId: string;
    userName?: string;
    phone?: string;
  };
  message?: {
    messageId: string;
    type: 'text' | 'image' | 'file';
    content: string;
    attachments?: Array<{
      type: string;
      url: string;
    }>;
  };
}

/**
 * Parse Kakao webhook payload into ExternalInquiry
 */
export function parseKakaoWebhook(payload: KakaoWebhookPayload): ExternalInquiry | null {
  if (payload.event !== 'message' || !payload.message) {
    return null;
  }

  return {
    externalId: `kakao:${payload.user.userId}:${Date.now()}`,
    channel: 'kakao',
    subject: 'Kakao Channel Inquiry',
    content: payload.message.content,
    customerName: payload.user.userName,
    customerPhone: payload.user.phone,
    createdAt: new Date(payload.timestamp),
    metadata: {
      messageId: payload.message.messageId,
      channelId: payload.channelId,
      messageType: payload.message.type,
      hasAttachments: (payload.message.attachments?.length || 0) > 0,
    },
  };
}

// =============================================================================
// Singleton
// =============================================================================

let adapterInstance: KakaoInquiryAdapter | null = null;

export function getKakaoInquiryAdapter(): KakaoInquiryAdapter {
  if (!adapterInstance) {
    adapterInstance = new KakaoInquiryAdapter();
  }
  return adapterInstance;
}
