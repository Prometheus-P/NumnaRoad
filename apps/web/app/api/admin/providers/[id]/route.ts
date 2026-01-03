/**
 * Individual Provider API
 *
 * GET /api/admin/providers/[id]
 * Returns details for a specific provider.
 *
 * PATCH /api/admin/providers/[id]
 * Updates provider settings (priority, isActive).
 */

import { NextRequest, NextResponse } from 'next/server';
import { Collections } from '@/lib/pocketbase';
import { withAdminAuth } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(request, async (pb) => {
    try {
      const provider = await pb.collection(Collections.ESIM_PROVIDERS).getOne(id);

      return NextResponse.json({
        id: provider.id,
        name: provider.name,
        slug: provider.slug,
        priority: provider.priority,
        apiEndpoint: provider.api_endpoint,
        apiKeyEnvVar: provider.api_key_env_var,
        isActive: provider.is_active !== false,
        successRate: provider.success_rate || 1,
        circuitBreakerState: provider.circuit_breaker_state || 'CLOSED',
        consecutiveFailures: provider.consecutive_failures || 0,
        lastFailureAt: provider.last_failure_at,
        created: provider.created,
        updated: provider.updated,
      });
    } catch (error) {
      logger.error('admin_provider_fetch_failed', error, { providerId: id });

      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
      }

      return NextResponse.json(
        { error: 'Failed to fetch provider' },
        { status: 500 }
      );
    }
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(request, async (pb) => {
    try {
      const body = await request.json();

      // Only allow specific fields to be updated
      const allowedFields = ['priority', 'is_active', 'api_endpoint'];
      const updateData: Record<string, unknown> = {};

      if (body.priority !== undefined) {
        const priority = Number(body.priority);
        if (isNaN(priority) || priority < 0) {
          return NextResponse.json({ error: 'Invalid priority value' }, { status: 400 });
        }
        updateData.priority = priority;
      }

      if (body.isActive !== undefined) {
        updateData.is_active = Boolean(body.isActive);
      }

      if (body.apiEndpoint !== undefined) {
        // Validate URL format
        try {
          new URL(body.apiEndpoint);
          updateData.api_endpoint = body.apiEndpoint;
        } catch {
          return NextResponse.json({ error: 'Invalid API endpoint URL' }, { status: 400 });
        }
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: 'No valid fields to update', allowedFields },
          { status: 400 }
        );
      }

      const provider = await pb.collection(Collections.ESIM_PROVIDERS).update(id, updateData);

      logger.info('admin_provider_updated', {
        providerId: id,
        updates: Object.keys(updateData),
      });

      return NextResponse.json({
        success: true,
        provider: {
          id: provider.id,
          name: provider.name,
          slug: provider.slug,
          priority: provider.priority,
          isActive: provider.is_active,
          apiEndpoint: provider.api_endpoint,
          circuitBreakerState: provider.circuit_breaker_state,
          updated: provider.updated,
        },
      });
    } catch (error) {
      logger.error('admin_provider_update_failed', error, { providerId: id });

      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
      }

      return NextResponse.json(
        { error: 'Failed to update provider' },
        { status: 500 }
      );
    }
  });
}
