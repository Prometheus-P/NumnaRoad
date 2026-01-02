import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import {
  getSettingsAuditLogs,
  type SettingCategory,
} from '@/lib/services/settings-service';

/**
 * GET /api/admin/settings/audit
 * Get settings audit logs
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (pb) => {
    try {
      const { searchParams } = new URL(request.url);

      const category = searchParams.get('category') as SettingCategory | undefined;
      const key = searchParams.get('key') || undefined;
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);

      const result = await getSettingsAuditLogs(pb, {
        category,
        key,
        limit,
        offset,
      });

      return NextResponse.json({
        success: true,
        data: result.items,
        totalItems: result.totalItems,
      });
    } catch (error) {
      console.error('[Settings Audit API] GET error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    }
  });
}
