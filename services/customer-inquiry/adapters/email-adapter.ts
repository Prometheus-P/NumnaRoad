/**
 * Email Inquiry Channel Adapter
 *
 * Uses Resend for outbound emails and processes inbound emails via webhook.
 * Inbound emails are stored in the database and fetched from there.
 */

import { Resend } from 'resend';
import type {
  InquiryChannelAdapter,
  ExternalInquiry,
  ReplyContent,
  ReplyResult,
  FetchOptions,
} from './types';
import { logger } from '../../logger';

// =============================================================================
// Configuration
// =============================================================================

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@numnaroad.com';
const SUPPORT_FROM_NAME = process.env.SUPPORT_FROM_NAME || 'NumnaRoad Support';

// =============================================================================
// Email Adapter
// =============================================================================

export class EmailInquiryAdapter implements InquiryChannelAdapter {
  readonly channel = 'email' as const;
  readonly displayName = 'Email';

  private resend: Resend | null = null;

  private getResendClient(): Resend {
    if (!this.resend) {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new Error('RESEND_API_KEY is not configured');
      }
      this.resend = new Resend(apiKey);
    }
    return this.resend;
  }

  /**
   * Fetch inquiries from email channel.
   * Note: Email inquiries are stored via webhook, so we return empty array here.
   * The inquiry service handles fetching from the database.
   */
  async fetchInquiries(_options?: FetchOptions): Promise<ExternalInquiry[]> {
    // Email inquiries are pushed via webhook, not pulled
    // Return empty array as the service fetches from DB
    return [];
  }

  /**
   * Send a reply email to the customer
   */
  async sendReply(externalId: string, reply: ReplyContent): Promise<ReplyResult> {
    try {
      const resend = this.getResendClient();

      // externalId format: "email:customer@example.com:timestamp"
      const parts = externalId.split(':');
      if (parts.length < 2) {
        return {
          success: false,
          error: 'Invalid external ID format',
          deliveryStatus: 'failed',
        };
      }

      const customerEmail = parts[1];

      const { data, error } = await resend.emails.send({
        from: `${SUPPORT_FROM_NAME} <${SUPPORT_EMAIL}>`,
        to: [customerEmail],
        subject: 'Re: Your Inquiry - NumnaRoad',
        html: this.formatReplyHtml(reply.content),
        text: reply.content,
      });

      if (error) {
        logger.error('email_reply_failed', undefined, { errorMessage: error.message });
        return {
          success: false,
          error: error.message,
          deliveryStatus: 'failed',
        };
      }

      return {
        success: true,
        externalMessageId: data?.id,
        deliveryStatus: 'sent',
      };
    } catch (error) {
      logger.error('email_reply_error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryStatus: 'failed',
      };
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        return { healthy: false, error: 'RESEND_API_KEY not configured' };
      }

      // Try to get API key info to verify it's valid
      const resend = this.getResendClient();
      await resend.apiKeys.list();

      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async isEnabled(): Promise<boolean> {
    const apiKey = process.env.RESEND_API_KEY;
    const webhookSecret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
    return !!(apiKey && webhookSecret);
  }

  /**
   * Format reply content as HTML email
   */
  private formatReplyHtml(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .content {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .footer {
      font-size: 12px;
      color: #666;
      border-top: 1px solid #eee;
      padding-top: 15px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="content">
    ${content.replace(/\n/g, '<br>')}
  </div>
  <div class="footer">
    <p>This email was sent by NumnaRoad Support.</p>
    <p>If you have any further questions, please reply to this email.</p>
  </div>
</body>
</html>
    `.trim();
  }
}

// =============================================================================
// Webhook Payload Types
// =============================================================================

export interface ResendInboundEmail {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  date: string;
  messageId: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

/**
 * Parse inbound email webhook payload into ExternalInquiry
 */
export function parseInboundEmail(payload: ResendInboundEmail): ExternalInquiry {
  const fromMatch = payload.from.match(/(?:"?([^"]*)"?\s)?<?([^>]+)>?/);
  const customerName = fromMatch?.[1] || undefined;
  const customerEmail = fromMatch?.[2] || payload.from;

  return {
    externalId: `email:${customerEmail}:${Date.now()}`,
    channel: 'email',
    subject: payload.subject || 'No Subject',
    content: payload.text || stripHtml(payload.html || ''),
    customerName,
    customerEmail,
    createdAt: new Date(payload.date),
    metadata: {
      messageId: payload.messageId,
      hasAttachments: (payload.attachments?.length || 0) > 0,
      originalHtml: payload.html,
    },
  };
}

/**
 * Simple HTML to text conversion
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// =============================================================================
// Singleton
// =============================================================================

let adapterInstance: EmailInquiryAdapter | null = null;

export function getEmailInquiryAdapter(): EmailInquiryAdapter {
  if (!adapterInstance) {
    adapterInstance = new EmailInquiryAdapter();
  }
  return adapterInstance;
}
