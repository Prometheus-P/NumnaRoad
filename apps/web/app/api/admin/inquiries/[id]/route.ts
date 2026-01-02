import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { createInquiryService } from '@services/customer-inquiry/inquiry-service';
import type { InquiryStatus, InquiryPriority } from '@services/customer-inquiry/adapters/types';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/inquiries/[id]
 * Get inquiry detail with messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, async (pb) => {
    try {
      const { id } = await params;
      const service = createInquiryService(pb);

      const inquiry = await service.getInquiry(id);
      if (!inquiry) {
        return NextResponse.json(
          { success: false, error: 'Inquiry not found' },
          { status: 404 }
        );
      }

      const messages = await service.getMessages(id);

      return NextResponse.json({
        success: true,
        data: {
          ...inquiry,
          messages,
        },
      });
    } catch (error) {
      logger.error('admin_inquiry_detail_fetch_failed', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch inquiry' },
        { status: 500 }
      );
    }
  });
}

/**
 * PATCH /api/admin/inquiries/[id]
 * Update inquiry status, priority, or assignment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(request, async (pb) => {
    try {
      const { id } = await params;
      const body = await request.json();

      const { status, priority, assignedTo, linkedOrderId } = body as {
        status?: InquiryStatus;
        priority?: InquiryPriority;
        assignedTo?: string;
        linkedOrderId?: string;
      };

      const service = createInquiryService(pb);

      const updated = await service.updateInquiry(id, {
        status,
        priority,
        assignedTo,
        linkedOrderId,
      });

      return NextResponse.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      logger.error('admin_inquiry_update_failed', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update inquiry' },
        { status: 500 }
      );
    }
  });
}
