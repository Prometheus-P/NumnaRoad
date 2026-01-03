/**
 * Provider Health Status API
 *
 * GET /api/admin/providers/health
 * Returns current health status for all providers.
 *
 * Query Parameters:
 * - hours: Number of hours of history (default: 24)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { checkRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit';
import { getAdminPocketBase } from '@/lib/pocketbase';

interface HealthLog {
  id: string;
  provider_slug: string;
  provider_name: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  response_time_ms: number | null;
  error_message: string | null;
  checked_at: string;
}

interface ProviderHealthSummary {
  providerSlug: string;
  providerName: string;
  currentStatus: string;
  lastChecked: string;
  avgResponseTimeMs: number;
  uptimePercent: number;
  recentChecks: Array<{
    status: string;
    responseTimeMs: number | null;
    checkedAt: string;
  }>;
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = checkRateLimit(request, {
    limit: 60,
    keyPrefix: 'admin-health',
  });

  if (!rateLimitResult.success) {
    return rateLimitExceededResponse(rateLimitResult);
  }

  // Admin auth
  const authResult = await verifyAdminToken(request);
  if (!authResult.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24', 10);
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const pb = await getAdminPocketBase();

    // Get recent health logs
    const logs = await pb.collection('provider_health_logs').getFullList<HealthLog>({
      filter: `checked_at >= "${cutoff}"`,
      sort: '-checked_at',
    });

    // Group by provider
    const providerLogs = new Map<string, HealthLog[]>();
    for (const log of logs) {
      const existing = providerLogs.get(log.provider_slug) || [];
      existing.push(log);
      providerLogs.set(log.provider_slug, existing);
    }

    // Calculate summaries
    const summaries: ProviderHealthSummary[] = [];

    for (const [slug, providerLogList] of providerLogs) {
      if (providerLogList.length === 0) continue;

      const latestLog = providerLogList[0];
      const healthyCount = providerLogList.filter((l) => l.status === 'healthy').length;
      const uptimePercent = (healthyCount / providerLogList.length) * 100;

      const responseTimes = providerLogList
        .filter((l) => l.response_time_ms !== null)
        .map((l) => l.response_time_ms as number);

      const avgResponseTimeMs =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
          : 0;

      summaries.push({
        providerSlug: slug,
        providerName: latestLog.provider_name,
        currentStatus: latestLog.status,
        lastChecked: latestLog.checked_at,
        avgResponseTimeMs: Math.round(avgResponseTimeMs),
        uptimePercent: Math.round(uptimePercent * 100) / 100,
        recentChecks: providerLogList.slice(0, 10).map((l) => ({
          status: l.status,
          responseTimeMs: l.response_time_ms,
          checkedAt: l.checked_at,
        })),
      });
    }

    // Sort by current status (unhealthy first) then by name
    summaries.sort((a, b) => {
      const statusOrder: Record<string, number> = {
        unhealthy: 0,
        degraded: 1,
        unknown: 2,
        healthy: 3,
      };
      const aOrder = statusOrder[a.currentStatus] ?? 2;
      const bOrder = statusOrder[b.currentStatus] ?? 2;

      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.providerName.localeCompare(b.providerName);
    });

    // Overall summary
    const totalProviders = summaries.length;
    const healthyProviders = summaries.filter((s) => s.currentStatus === 'healthy').length;
    const degradedProviders = summaries.filter((s) => s.currentStatus === 'degraded').length;
    const unhealthyProviders = summaries.filter((s) => s.currentStatus === 'unhealthy').length;

    return NextResponse.json({
      providers: summaries,
      summary: {
        total: totalProviders,
        healthy: healthyProviders,
        degraded: degradedProviders,
        unhealthy: unhealthyProviders,
        overallStatus:
          unhealthyProviders > 0
            ? 'unhealthy'
            : degradedProviders > 0
            ? 'degraded'
            : 'healthy',
      },
      period: {
        hours,
        from: cutoff,
        to: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
