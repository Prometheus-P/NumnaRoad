import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import {
  getSettingsByCategory,
  updateSettings,
  type SettingCategory,
} from '@/lib/services/settings-service';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/settings
 * Get all settings grouped by category
 */
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (pb) => {
    try {
      const settings = await getSettingsByCategory(pb);

      return NextResponse.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      logger.error('admin_settings_fetch_failed', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/admin/settings
 * Batch update multiple settings
 */
export async function PUT(request: NextRequest) {
  return withAdminAuth(request, async (pb) => {
    try {
      const body = await request.json();

      if (!body.updates || !Array.isArray(body.updates)) {
        return NextResponse.json(
          { success: false, error: 'Invalid request body: updates array required' },
          { status: 400 }
        );
      }

      // Validate updates
      for (const update of body.updates) {
        if (!update.category || !update.key || update.value === undefined) {
          return NextResponse.json(
            { success: false, error: 'Each update must have category, key, and value' },
            { status: 400 }
          );
        }
      }

      const updatedBy = pb.authStore.model?.email || 'admin';

      const results = await updateSettings(
        pb,
        body.updates.map((u: { category: SettingCategory; key: string; value: unknown }) => ({
          category: u.category,
          key: u.key,
          value: u.value as string | number | boolean | object,
        })),
        updatedBy
      );

      return NextResponse.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error('admin_settings_update_failed', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update settings' },
        { status: 500 }
      );
    }
  });
}
