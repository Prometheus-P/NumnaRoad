import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { createInquiryService } from '@services/customer-inquiry/inquiry-service';
import type { InquiryChannel, InquiryStatus, InquiryPriority } from '@services/customer-inquiry/adapters/types';

/**
 * GET /api/admin/inquiries
 * List inquiries with filtering
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (pb) => {
    try {
      const { searchParams } = new URL(request.url);

      const channel = searchParams.get('channel') as InquiryChannel | undefined;
      const status = searchParams.get('status') as InquiryStatus | undefined;
      const priority = searchParams.get('priority') as InquiryPriority | undefined;
      const assignedTo = searchParams.get('assignedTo') || undefined;
      const search = searchParams.get('search') || undefined;
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);
      const sortBy = searchParams.get('sortBy') as 'created' | 'updated' | 'priority' | undefined;
      const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | undefined;

      const service = createInquiryService(pb);
      const result = await service.listInquiries({
        channel,
        status,
        priority,
        assignedTo,
        search,
        limit,
        offset,
        sortBy,
        sortOrder,
      });

      return NextResponse.json({
        success: true,
        data: result.items,
        totalItems: result.totalItems,
        page: result.page,
        perPage: result.perPage,
      });
    } catch (error) {
      console.error('[Inquiries API] GET error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch inquiries' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/admin/inquiries
 * Trigger sync from channels
 */
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (pb) => {
    try {
      const body = await request.json();
      const { action, channel } = body as { action: string; channel?: InquiryChannel };

      if (action !== 'sync') {
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
      }

      const service = createInquiryService(pb);

      if (channel) {
        const result = await service.syncFromChannel(channel);
        return NextResponse.json({
          success: !result.error,
          synced: result.synced,
          error: result.error,
        });
      } else {
        const result = await service.syncFromAllChannels();
        return NextResponse.json({
          success: result.errors.length === 0,
          synced: result.synced,
          errors: result.errors,
        });
      }
    } catch (error) {
      console.error('[Inquiries API] POST error:', error);
      return NextResponse.json(
        { success: false, error: 'Sync failed' },
        { status: 500 }
      );
    }
  });
}
