/**
 * CS Reply Templates API
 *
 * CRUD operations for SmartStore customer service reply templates.
 * Templates support variable substitution like {{orderId}}, {{customerName}}.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase } from '@/lib/pocketbase';
import { logger } from '@/lib/logger';

// =============================================================================
// Types
// =============================================================================

interface TemplateRecord {
  id: string;
  title: string;
  category: 'delivery' | 'installation' | 'refund' | 'product' | 'general';
  content: string;
  variables: string[] | null;
  is_active: boolean;
  sort_order: number;
  created: string;
  updated: string;
}

interface CreateTemplateBody {
  title: string;
  category: 'delivery' | 'installation' | 'refund' | 'product' | 'general';
  content: string;
  variables?: string[];
  is_active?: boolean;
  sort_order?: number;
}

interface UpdateTemplateBody extends Partial<CreateTemplateBody> {
  id: string;
}

// =============================================================================
// Helper: Extract template variables
// =============================================================================

function extractVariables(content: string): string[] {
  const pattern = /\{\{(\w+)\}\}/g;
  const vars: string[] = [];
  let result;
  while ((result = pattern.exec(content)) !== null) {
    if (!vars.includes(result[1])) {
      vars.push(result[1]);
    }
  }
  return vars;
}

// =============================================================================
// GET /api/admin/smartstore/templates
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('active') === 'true';

    let filter = '';
    const filters: string[] = [];

    if (category) {
      filters.push(`category = "${category}"`);
    }
    if (activeOnly) {
      filters.push('is_active = true');
    }

    if (filters.length > 0) {
      filter = filters.join(' && ');
    }

    const templates = await pb.collection('cs_reply_templates').getFullList<TemplateRecord>({
      filter,
      sort: 'sort_order,title',
    });

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    logger.error('smartstore_templates_fetch_failed', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/admin/smartstore/templates
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();
    const body: CreateTemplateBody = await request.json();

    // Validation
    if (!body.title || !body.category || !body.content) {
      return NextResponse.json(
        { success: false, error: 'title, category, and content are required' },
        { status: 400 }
      );
    }

    const extractedVars = extractVariables(body.content);

    const template = await pb.collection('cs_reply_templates').create<TemplateRecord>({
      title: body.title,
      category: body.category,
      content: body.content,
      variables: extractedVars.length > 0 ? extractedVars : null,
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
    });

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    logger.error('smartstore_template_create_failed', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT /api/admin/smartstore/templates
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();
    const body: UpdateTemplateBody = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.content !== undefined) {
      updateData.content = body.content;
      const vars = extractVariables(body.content);
      updateData.variables = vars.length > 0 ? vars : null;
    }
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;

    const template = await pb.collection('cs_reply_templates').update<TemplateRecord>(
      body.id,
      updateData
    );

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    logger.error('smartstore_template_update_failed', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/admin/smartstore/templates
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const pb = await getAdminPocketBase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    await pb.collection('cs_reply_templates').delete(id);

    return NextResponse.json({
      success: true,
      message: 'Template deleted',
    });
  } catch (error) {
    logger.error('smartstore_template_delete_failed', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
