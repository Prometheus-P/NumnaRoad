/**
 * Provider Circuit Breaker Reset API
 *
 * POST /api/admin/providers/[id]/reset
 * Resets the circuit breaker state to CLOSED for a provider.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Collections } from '@/lib/pocketbase';
import { withAdminAuth } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  return withAdminAuth(request, async (pb) => {
    try {
      // Fetch current provider
      const provider = await pb.collection(Collections.ESIM_PROVIDERS).getOne(id);
      const previousState = provider.circuit_breaker_state || 'CLOSED';
      const previousFailures = provider.consecutive_failures || 0;

      // Already in CLOSED state
      if (previousState === 'CLOSED' && previousFailures === 0) {
        return NextResponse.json({
          success: true,
          message: 'Circuit breaker is already in CLOSED state',
          provider: {
            id: provider.id,
            name: provider.name,
            circuitBreakerState: previousState,
            consecutiveFailures: previousFailures,
          },
        });
      }

      // Reset circuit breaker
      const updatedProvider = await pb.collection(Collections.ESIM_PROVIDERS).update(id, {
        circuit_breaker_state: 'CLOSED',
        consecutive_failures: 0,
        last_failure_at: null,
      });

      // Log the reset action
      try {
        await pb.collection(Collections.AUTOMATION_LOGS).create({
          orderId: 'SYSTEM',
          stepName: 'circuit_breaker_reset',
          status: 'success',
          providerName: provider.name,
          metadata: {
            providerId: id,
            previousState,
            previousFailures,
            newState: 'CLOSED',
            initiatedBy: 'admin',
          },
        });
      } catch {
        // Log failure doesn't block reset
        logger.warn('automation_log_create_failed', { providerId: id, stepName: 'circuit_breaker_reset' });
      }

      logger.info('admin_provider_circuit_breaker_reset', {
        providerId: id,
        providerName: provider.name,
        previousState,
        previousFailures,
      });

      return NextResponse.json({
        success: true,
        message: 'Circuit breaker reset successfully',
        provider: {
          id: updatedProvider.id,
          name: updatedProvider.name,
          slug: updatedProvider.slug,
          circuitBreakerState: updatedProvider.circuit_breaker_state,
          consecutiveFailures: updatedProvider.consecutive_failures,
          previousState,
          previousFailures,
        },
      });
    } catch (error) {
      logger.error('admin_provider_reset_failed', error, { providerId: id });

      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
      }

      return NextResponse.json(
        { error: 'Failed to reset circuit breaker' },
        { status: 500 }
      );
    }
  });
}
