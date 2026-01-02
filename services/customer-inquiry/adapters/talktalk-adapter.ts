/**
 * Naver TalkTalk Inquiry Channel Adapter
 *
 * Uses Naver Partner Center API for TalkTalk messaging.
 * TalkTalk messages are received via webhook and replies are sent via API.
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

const TALKTALK_API_BASE = 'https://gw.talk.naver.com';

// =============================================================================
// Types
// =============================================================================

interface TalkTalkTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface TalkTalkMessageResponse {
  success: boolean;
  resultCode: string;
  resultMessage: string;
  messageId?: string;
}

// =============================================================================
// TalkTalk Adapter
// =============================================================================

export class TalkTalkInquiryAdapter implements InquiryChannelAdapter {
  readonly channel = 'talktalk' as const;
  readonly displayName = 'Naver TalkTalk';

  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private getClientId(): string {
    const clientId = process.env.NAVER_TALKTALK_CLIENT_ID;
    if (!clientId) {
      throw new Error('NAVER_TALKTALK_CLIENT_ID is not configured');
    }
    return clientId;
  }

  private getClientSecret(): string {
    const clientSecret = process.env.NAVER_TALKTALK_CLIENT_SECRET;
    if (!clientSecret) {
      throw new Error('NAVER_TALKTALK_CLIENT_SECRET is not configured');
    }
    return clientSecret;
  }

  private getChannelId(): string {
    const channelId = process.env.NAVER_TALKTALK_CHANNEL_ID;
    if (!channelId) {
      throw new Error('NAVER_TALKTALK_CHANNEL_ID is not configured');
    }
    return channelId;
  }

  /**
   * Get OAuth2 access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    const response = await fetch(`${TALKTALK_API_BASE}/oauth2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get TalkTalk access token: ${response.status}`);
    }

    const data: TalkTalkTokenResponse = await response.json();

    this.accessToken = data.access_token;
    // Set expiry with 5 minute buffer
    this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

    return this.accessToken;
  }

  /**
   * Fetch inquiries from TalkTalk.
   * Note: TalkTalk messages are pushed via webhook, so this returns empty.
   */
  async fetchInquiries(_options?: FetchOptions): Promise<ExternalInquiry[]> {
    // TalkTalk messages are pushed via webhook, not pulled
    return [];
  }

  /**
   * Send a reply message to the customer via TalkTalk
   */
  async sendReply(externalId: string, reply: ReplyContent): Promise<ReplyResult> {
    try {
      const accessToken = await this.getAccessToken();
      const channelId = this.getChannelId();

      // externalId format: "talktalk:userId:timestamp"
      const parts = externalId.split(':');
      if (parts.length < 2) {
        return {
          success: false,
          error: 'Invalid external ID format',
          deliveryStatus: 'failed',
        };
      }

      const userId = parts[1];

      // Send message via TalkTalk API
      const response = await fetch(`${TALKTALK_API_BASE}/v1/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          partnerId: channelId,
          userId,
          messageType: 'text',
          text: reply.content,
        }),
      });

      const result: TalkTalkMessageResponse = await response.json();

      if (!result.success || result.resultCode !== '00') {
        console.error('[TalkTalkAdapter] Failed to send reply:', result);
        return {
          success: false,
          error: result.resultMessage || 'Failed to send TalkTalk message',
          deliveryStatus: 'failed',
        };
      }

      return {
        success: true,
        externalMessageId: result.messageId,
        deliveryStatus: 'sent',
      };
    } catch (error) {
      console.error('[TalkTalkAdapter] sendReply error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryStatus: 'failed',
      };
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const clientId = process.env.NAVER_TALKTALK_CLIENT_ID;
      const clientSecret = process.env.NAVER_TALKTALK_CLIENT_SECRET;
      const channelId = process.env.NAVER_TALKTALK_CHANNEL_ID;

      if (!clientId || !clientSecret || !channelId) {
        return { healthy: false, error: 'TalkTalk credentials not configured' };
      }

      // Try to get access token to verify credentials
      await this.getAccessToken();

      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async isEnabled(): Promise<boolean> {
    const clientId = process.env.NAVER_TALKTALK_CLIENT_ID;
    const clientSecret = process.env.NAVER_TALKTALK_CLIENT_SECRET;
    const channelId = process.env.NAVER_TALKTALK_CHANNEL_ID;
    return !!(clientId && clientSecret && channelId);
  }
}

// =============================================================================
// Webhook Payload Types
// =============================================================================

export interface TalkTalkWebhookPayload {
  event: 'send' | 'open' | 'leave' | 'friend' | 'profile';
  user: string; // userId
  partnerId: string;
  options?: {
    inflow?: string;
    referer?: string;
  };
  textContent?: {
    text: string;
  };
  imageContent?: {
    imageUrl: string;
  };
  standbyTime: number;
}

/**
 * Parse TalkTalk webhook payload into ExternalInquiry
 */
export function parseTalkTalkWebhook(payload: TalkTalkWebhookPayload): ExternalInquiry | null {
  // Only process 'send' events (user messages)
  if (payload.event !== 'send') {
    return null;
  }

  const content = payload.textContent?.text || '[Image]';

  return {
    externalId: `talktalk:${payload.user}:${Date.now()}`,
    channel: 'talktalk',
    subject: 'TalkTalk Inquiry',
    content,
    createdAt: new Date(),
    metadata: {
      partnerId: payload.partnerId,
      hasImage: !!payload.imageContent,
      imageUrl: payload.imageContent?.imageUrl,
      inflow: payload.options?.inflow,
      referer: payload.options?.referer,
    },
  };
}

/**
 * Generate webhook signature for verification
 */
export function verifyTalkTalkSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('base64');
  return signature === expectedSignature;
}

// =============================================================================
// Singleton
// =============================================================================

let adapterInstance: TalkTalkInquiryAdapter | null = null;

export function getTalkTalkInquiryAdapter(): TalkTalkInquiryAdapter {
  if (!adapterInstance) {
    adapterInstance = new TalkTalkInquiryAdapter();
  }
  return adapterInstance;
}
