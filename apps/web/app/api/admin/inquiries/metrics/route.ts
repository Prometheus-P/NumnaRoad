import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import { createInquiryService } from '@services/customer-inquiry/inquiry-service';

/**
 * GET /api/admin/inquiries/metrics
 * Get inquiry metrics
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (pb) => {
    try {
      const service = createInquiryService(pb);
      const metrics = await service.getMetrics();

      return NextResponse.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error('[Inquiry Metrics API] GET error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch metrics' },
        { status: 500 }
      );
    }
  });
}
