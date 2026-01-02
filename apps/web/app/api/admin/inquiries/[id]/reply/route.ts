import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { createInquiryService } from '@services/customer-inquiry/inquiry-service';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/inquiries/[id]/reply
 * Send a reply to an inquiry
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, async (pb) => {
    try {
      const { id } = await params;
      const body = await request.json();

      const { content, templateId } = body as {
        content: string;
        templateId?: string;
      };

      if (!content || content.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Reply content is required' },
          { status: 400 }
        );
      }

      const agentName = pb.authStore.model?.email || 'Admin';
      const service = createInquiryService(pb);

      const result = await service.sendReply(
        id,
        { content, templateId },
        agentName
      );

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Reply sent successfully',
      });
    } catch (error) {
      logger.error('admin_inquiry_reply_failed', error);
      return NextResponse.json(
        { success: false, error: 'Failed to send reply' },
        { status: 500 }
      );
    }
  });
}
