import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase } from '@/lib/pocketbase';
import {
  parseTalkTalkWebhook,
  verifyTalkTalkSignature,
  type TalkTalkWebhookPayload,
} from '@services/customer-inquiry/adapters/talktalk-adapter';

/**
 * POST /api/webhooks/talktalk
 * Receive incoming messages from Naver TalkTalk
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-talk-signature') || '';
    const webhookSecret = process.env.NAVER_TALKTALK_WEBHOOK_SECRET;

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      if (!verifyTalkTalkSignature(body, signature, webhookSecret)) {
        console.error('[TalkTalk Webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload: TalkTalkWebhookPayload = JSON.parse(body);

    // Parse webhook into inquiry format
    const inquiry = parseTalkTalkWebhook(payload);

    if (!inquiry) {
      // Non-message event (e.g., friend, profile), just acknowledge
      return NextResponse.json({ success: true });
    }

    // Store inquiry in database
    const pb = await getAdminPocketBase();

    // Check if inquiry already exists (same user within 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const existingInquiry = await pb.collection('inquiries').getList(1, 1, {
      filter: `channel = "talktalk" && external_id ~ "${payload.user}" && created >= "${oneHourAgo}" && status != "closed"`,
    });

    if (existingInquiry.items.length > 0) {
      // Add message to existing inquiry
      await pb.collection('inquiry_messages').create({
        inquiry_id: existingInquiry.items[0].id,
        direction: 'inbound',
        content: inquiry.content,
        sender_type: 'customer',
        sender_name: inquiry.customerName,
        delivery_status: 'delivered',
        external_message_id: inquiry.externalId,
        metadata: inquiry.metadata,
      });

      // Update inquiry
      await pb.collection('inquiries').update(existingInquiry.items[0].id, {
        status: 'new', // Reset to new for agent attention
      });

      console.log('[TalkTalk Webhook] Added message to existing inquiry:', existingInquiry.items[0].id);
    } else {
      // Create new inquiry
      const newInquiry = await pb.collection('inquiries').create({
        external_id: inquiry.externalId,
        channel: 'talktalk',
        status: 'new',
        priority: 'normal',
        subject: inquiry.subject,
        content: inquiry.content,
        customer_name: inquiry.customerName,
        customer_phone: inquiry.customerPhone,
        metadata: inquiry.metadata,
      });

      // Add initial message
      await pb.collection('inquiry_messages').create({
        inquiry_id: newInquiry.id,
        direction: 'inbound',
        content: inquiry.content,
        sender_type: 'customer',
        sender_name: inquiry.customerName,
        delivery_status: 'delivered',
        external_message_id: inquiry.externalId,
      });

      console.log('[TalkTalk Webhook] Created new inquiry:', newInquiry.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TalkTalk Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/talktalk
 * Health check for TalkTalk webhook verification
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'TalkTalk webhook endpoint is active',
  });
}
