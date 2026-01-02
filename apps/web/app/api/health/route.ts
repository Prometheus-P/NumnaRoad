import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint
 *
 * Provides system health status for external monitoring (e.g., UptimeRobot).
 * Returns 200 OK if all critical services are healthy.
 * Returns 503 Service Unavailable if any critical service is down.
 *
 * Checks:
 * - PocketBase connectivity
 * - Stuck order count
 * - Failed webhook count
 *
 * GET /api/health
 */

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    pocketbase: {
      status: 'ok' | 'error';
      latencyMs?: number;
      error?: string;
    };
    orders: {
      status: 'ok' | 'warning' | 'error';
      stuckCount: number;
      failedCount: number;
    };
    webhookInbox: {
      status: 'ok' | 'warning' | 'error';
      pendingCount: number;
      failedCount: number;
    };
  };
  version?: string;
}

// Thresholds for health status
const STUCK_ORDER_WARNING_THRESHOLD = 3;
const STUCK_ORDER_ERROR_THRESHOLD = 10;
const WEBHOOK_PENDING_WARNING_THRESHOLD = 10;

export async function GET() {
  const startTime = Date.now();

  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      pocketbase: { status: 'ok' },
      orders: { status: 'ok', stuckCount: 0, failedCount: 0 },
      webhookInbox: { status: 'ok', pendingCount: 0, failedCount: 0 },
    },
    version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'dev',
  };

  try {
    // Dynamic import to handle cases where PocketBase might not be configured
    const { getAdminPocketBase } = await import('@/lib/pocketbase');

    // Check PocketBase connectivity
    const pbStart = Date.now();
    try {
      const pb = await getAdminPocketBase();
      // Simple health check query
      await pb.health.check();
      result.checks.pocketbase.latencyMs = Date.now() - pbStart;
    } catch (error) {
      result.checks.pocketbase.status = 'error';
      result.checks.pocketbase.error =
        error instanceof Error ? error.message : 'Unknown error';
      result.status = 'unhealthy';
    }

    // If PocketBase is up, check orders and webhooks
    if (result.checks.pocketbase.status === 'ok') {
      const pb = await getAdminPocketBase();

      // Check stuck orders (stuck in intermediate states for > 5 minutes)
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const stuckOrders = await pb.collection('orders').getList(1, 1, {
          filter: `(status = "fulfillment_started" || status = "payment_received") && updated < "${fiveMinutesAgo}"`,
          fields: 'id',
        });

        const failedOrders = await pb.collection('orders').getList(1, 1, {
          filter: `status = "failed" || status = "provider_failed"`,
          fields: 'id',
        });

        result.checks.orders.stuckCount = stuckOrders.totalItems;
        result.checks.orders.failedCount = failedOrders.totalItems;

        if (result.checks.orders.stuckCount >= STUCK_ORDER_ERROR_THRESHOLD) {
          result.checks.orders.status = 'error';
          result.status = 'unhealthy';
        } else if (result.checks.orders.stuckCount >= STUCK_ORDER_WARNING_THRESHOLD) {
          result.checks.orders.status = 'warning';
          if (result.status === 'healthy') {
            result.status = 'degraded';
          }
        }
      } catch (error) {
        console.error('Health check orders error:', error);
        // Non-critical, continue
      }

      // Check webhook inbox
      try {
        const pendingWebhooks = await pb.collection('webhook_inbox').getList(1, 1, {
          filter: `status = "pending"`,
          fields: 'id',
        });

        const failedWebhooks = await pb.collection('webhook_inbox').getList(1, 1, {
          filter: `status = "failed"`,
          fields: 'id',
        });

        result.checks.webhookInbox.pendingCount = pendingWebhooks.totalItems;
        result.checks.webhookInbox.failedCount = failedWebhooks.totalItems;

        if (result.checks.webhookInbox.failedCount > 0) {
          result.checks.webhookInbox.status = 'warning';
          if (result.status === 'healthy') {
            result.status = 'degraded';
          }
        }

        if (result.checks.webhookInbox.pendingCount >= WEBHOOK_PENDING_WARNING_THRESHOLD) {
          result.checks.webhookInbox.status = 'warning';
          if (result.status === 'healthy') {
            result.status = 'degraded';
          }
        }
      } catch (error) {
        // webhook_inbox collection might not exist yet - not critical
        console.error('Health check webhook_inbox error:', error);
      }
    }
  } catch (error) {
    console.error('Health check error:', error);
    result.status = 'unhealthy';
  }

  // Add total latency
  const totalLatency = Date.now() - startTime;

  // Return appropriate status code
  const statusCode = result.status === 'unhealthy' ? 503 : 200;

  return NextResponse.json(
    {
      ...result,
      latencyMs: totalLatency,
    },
    { status: statusCode }
  );
}

// HEAD method for simple uptime checks
export async function HEAD() {
  try {
    const { getAdminPocketBase } = await import('@/lib/pocketbase');
    const pb = await getAdminPocketBase();
    await pb.health.check();
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
