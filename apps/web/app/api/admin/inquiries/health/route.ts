import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { createInquiryService } from '@services/customer-inquiry/inquiry-service';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/inquiries/health
 * Get channel health status
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (pb) => {
    try {
      const service = createInquiryService(pb);
      const health = await service.getChannelHealth();

      return NextResponse.json({
        success: true,
        data: health,
      });
    } catch (error) {
      logger.error('admin_inquiry_health_fetch_failed', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch health status' },
        { status: 500 }
      );
    }
  });
}
