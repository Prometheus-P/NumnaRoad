import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { createInquiryService } from '@services/customer-inquiry/inquiry-service';

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
      console.error('[Inquiry Health API] GET error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch health status' },
        { status: 500 }
      );
    }
  });
}
