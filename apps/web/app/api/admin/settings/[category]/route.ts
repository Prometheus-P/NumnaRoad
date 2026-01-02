import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-auth';
import {
  getSettingsByCategory,
  updateSetting,
  type SettingCategory,
} from '@/lib/services/settings-service';

const VALID_CATEGORIES: SettingCategory[] = [
  'general',
  'esim_providers',
  'notifications',
  'integrations',
];

/**
 * GET /api/admin/settings/[category]
 * Get settings for a specific category
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  return withAdminAuth(request, async (pb) => {
    try {
      const { category } = await params;

      if (!VALID_CATEGORIES.includes(category as SettingCategory)) {
        return NextResponse.json(
          { success: false, error: 'Invalid category' },
          { status: 400 }
        );
      }

      const allSettings = await getSettingsByCategory(pb);
      const categorySettings = allSettings[category as SettingCategory];

      return NextResponse.json({
        success: true,
        data: categorySettings,
      });
    } catch (error) {
      console.error('[Settings API] GET category error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch category settings' },
        { status: 500 }
      );
    }
  });
}

/**
 * PATCH /api/admin/settings/[category]
 * Update a single setting in a category
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  return withAdminAuth(request, async (pb) => {
    try {
      const { category } = await params;

      if (!VALID_CATEGORIES.includes(category as SettingCategory)) {
        return NextResponse.json(
          { success: false, error: 'Invalid category' },
          { status: 400 }
        );
      }

      const body = await request.json();

      if (!body.key || body.value === undefined) {
        return NextResponse.json(
          { success: false, error: 'key and value are required' },
          { status: 400 }
        );
      }

      const updatedBy = pb.authStore.model?.email || 'admin';

      const result = await updateSetting(
        pb,
        category as SettingCategory,
        body.key,
        body.value,
        updatedBy
      );

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[Settings API] PATCH error:', error);

      if (error instanceof Error && error.message.includes('Unknown setting')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Failed to update setting' },
        { status: 500 }
      );
    }
  });
}
