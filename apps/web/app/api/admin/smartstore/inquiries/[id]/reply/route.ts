/**
 * SmartStore Inquiry Reply API
 *
 * POST /api/admin/smartstore/inquiries/[id]/reply
 * Sends a reply to a customer inquiry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSmartStoreClient } from '@services/sales-channels/smartstore';
import { getAdminPocketBase } from '@/lib/pocketbase';
import { withAdminAuth } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: inquiryId } = await context.params;

  if (!inquiryId) {
    return NextResponse.json({ error: 'Inquiry ID is required' }, { status: 400 });
  }

  return withAdminAuth(request, async () => {
    try {
      const client = getSmartStoreClient();
      const body = await request.json();

      const { answer, templateId, variables } = body as {
        answer?: string;
        templateId?: string;
        variables?: Record<string, string>;
      };

      let replyContent = answer;

      // If templateId provided, fetch template and use its content
      if (templateId && !answer) {
        try {
          const pb = await getAdminPocketBase();
          const template = await pb.collection('cs_reply_templates').getOne(templateId);
          replyContent = template.content;
        } catch {
          return NextResponse.json(
            { error: 'Template not found' },
            { status: 404 }
          );
        }
      }

      if (!replyContent) {
        return NextResponse.json(
          { error: 'answer or templateId is required' },
          { status: 400 }
        );
      }

      // Apply variable substitutions if provided
      if (variables && typeof variables === 'object') {
        for (const [key, value] of Object.entries(variables)) {
          replyContent = replyContent.replace(
            new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
            String(value)
          );
        }
      }

      const result = await client.replyToInquiry(inquiryId, replyContent);

      if (!result.success) {
        return NextResponse.json(
          {
            error: result.errorMessage || 'Failed to send reply',
            errorType: result.errorType,
          },
          { status: 500 }
        );
      }

      logger.info('smartstore_inquiry_reply_sent', {
        inquiryId,
        templateUsed: !!templateId,
      });

      return NextResponse.json({
        success: true,
        message: 'Reply sent successfully',
      });
    } catch (error) {
      logger.error('smartstore_inquiry_reply_failed', error, { inquiryId });
      return NextResponse.json(
        { error: 'Failed to send reply' },
        { status: 500 }
      );
    }
  });
}
