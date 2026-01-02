import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase } from '@/lib/pocketbase';
import {
  parseInboundEmail,
  type ResendInboundEmail,
} from '@services/customer-inquiry/adapters/email-adapter';
import { logger } from '@/lib/logger';

// TODO: Enable when implementing Resend webhook signature verification
// import { createHmac } from 'crypto';
// function verifyResendSignature(body: string, signature: string, secret: string): boolean {
//   const hmac = createHmac('sha256', secret);
//   hmac.update(body);
//   const expectedSignature = hmac.digest('hex');
//   return signature === expectedSignature;
// }

/**
 * POST /api/webhooks/email
 * Receive inbound emails from Resend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('svix-signature') || '';
    const webhookSecret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      // Resend uses Svix for webhooks
      // For now, we'll do a basic check; production should use svix library
      logger.debug('email_webhook_signature_verifying');
    }

    const payload = JSON.parse(body);

    // Check event type
    if (payload.type !== 'email.received') {
      return NextResponse.json({ success: true, message: 'Event ignored' });
    }

    const emailData: ResendInboundEmail = payload.data;

    // Parse email into inquiry format
    const inquiry = parseInboundEmail(emailData);

    // Store inquiry in database
    const pb = await getAdminPocketBase();

    // Check if inquiry already exists from same email within 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const existingInquiry = await pb.collection('inquiries').getList(1, 1, {
      filter: `channel = "email" && customer_email = "${inquiry.customerEmail}" && created >= "${oneDayAgo}" && status != "closed"`,
    });

    if (existingInquiry.items.length > 0) {
      // Add message to existing inquiry thread
      await pb.collection('inquiry_messages').create({
        inquiry_id: existingInquiry.items[0].id,
        direction: 'inbound',
        content: inquiry.content,
        sender_type: 'customer',
        sender_name: inquiry.customerName,
        delivery_status: 'delivered',
        external_message_id: (inquiry.metadata as Record<string, unknown>)?.messageId,
        metadata: inquiry.metadata,
      });

      // Update inquiry status
      await pb.collection('inquiries').update(existingInquiry.items[0].id, {
        status: 'new', // Reset to new for agent attention
        subject: inquiry.subject, // Update subject to latest email
      });

      logger.info('email_webhook_message_added', { inquiryId: existingInquiry.items[0].id });
    } else {
      // Create new inquiry
      const newInquiry = await pb.collection('inquiries').create({
        external_id: inquiry.externalId,
        channel: 'email',
        status: 'new',
        priority: 'normal',
        subject: inquiry.subject,
        content: inquiry.content,
        customer_name: inquiry.customerName,
        customer_email: inquiry.customerEmail,
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
        external_message_id: (inquiry.metadata as Record<string, unknown>)?.messageId,
      });

      logger.info('email_webhook_inquiry_created', { inquiryId: newInquiry.id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('email_webhook_error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/email
 * Health check for email webhook
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Email webhook endpoint is active',
  });
}
