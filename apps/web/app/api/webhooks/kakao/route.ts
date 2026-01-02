import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase } from '@/lib/pocketbase';
import { createHmac } from 'crypto';
import {
  parseKakaoWebhook,
  type KakaoWebhookPayload,
} from '@services/customer-inquiry/adapters/kakao-adapter';
import { logger } from '@/lib/logger';

/**
 * Verify Kakao webhook signature
 */
function verifyKakaoSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hmac = createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

/**
 * POST /api/webhooks/kakao
 * Receive incoming messages from Kakao Channel
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-kakao-signature') || '';
    const webhookSecret = process.env.KAKAO_WEBHOOK_SECRET;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      if (!verifyKakaoSignature(body, signature, webhookSecret)) {
        logger.error('kakao_webhook_invalid_signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload: KakaoWebhookPayload = JSON.parse(body);

    // Parse webhook into inquiry format
    const inquiry = parseKakaoWebhook(payload);

    if (!inquiry) {
      // Non-message event, just acknowledge
      return NextResponse.json({ success: true });
    }

    // Store inquiry in database
    const pb = await getAdminPocketBase();

    // Check if inquiry already exists (same user within 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const existingInquiry = await pb.collection('inquiries').getList(1, 1, {
      filter: `channel = "kakao" && external_id ~ "${payload.user.userId}" && created >= "${oneHourAgo}" && status != "closed"`,
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

      logger.info('kakao_webhook_message_added', { inquiryId: existingInquiry.items[0].id });
    } else {
      // Create new inquiry
      const newInquiry = await pb.collection('inquiries').create({
        external_id: inquiry.externalId,
        channel: 'kakao',
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

      logger.info('kakao_webhook_inquiry_created', { inquiryId: newInquiry.id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('kakao_webhook_error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/kakao
 * Health check for Kakao webhook
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Kakao webhook endpoint is active',
  });
}
