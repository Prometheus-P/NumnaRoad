import { NextRequest, NextResponse } from 'next/server';
import { Collections } from '@/lib/pocketbase';
import { withAdminAuth } from '@/lib/admin-auth';
import { logger } from '@/lib/logger';

/**
 * Provider Health Statistics API
 * GET /api/admin/providers/stats
 *
 * Returns aggregated provider health data from automation_logs
 */

interface ProviderStats {
  providerId: string;
  providerName: string;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  recentErrors: {
    message: string;
    count: number;
    lastOccurred: string;
  }[];
  hourlyStats: {
    hour: string;
    success: number;
    failure: number;
  }[];
}

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (pb) => {
    try {
      const { searchParams } = new URL(request.url);
      const hoursBack = Math.min(parseInt(searchParams.get('hours') || '24', 10), 168); // Cap at 1 week

      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

      // Fetch automation logs from the last N hours
      let logs: Array<{
        id: string;
        stepName: string;
        status: string;
        providerName?: string;
        errorMessage?: string;
        created: string;
      }> = [];

      try {
        const logsResult = await pb.collection(Collections.AUTOMATION_LOGS).getList(1, 1000, {
          filter: `created >= "${cutoffTime}" && (stepName ~ "provider" || stepName ~ "fulfillment")`,
          sort: '-created',
        });
        logs = logsResult.items.map((log) => ({
          id: log.id,
          stepName: log.stepName,
          status: log.status,
          providerName: log.providerName,
          errorMessage: log.errorMessage,
          created: log.created,
        }));
      } catch {
        // Collection might not exist or be empty
        logger.debug('automation_logs_not_available');
      }

      // Aggregate stats by provider
      const providerMap = new Map<string, {
        successCount: number;
        failureCount: number;
        errors: Map<string, { count: number; lastOccurred: string }>;
        hourlyData: Map<string, { success: number; failure: number }>;
      }>();

      for (const log of logs) {
        const providerName = log.providerName || 'unknown';

        if (!providerMap.has(providerName)) {
          providerMap.set(providerName, {
            successCount: 0,
            failureCount: 0,
            errors: new Map(),
            hourlyData: new Map(),
          });
        }

        const stats = providerMap.get(providerName)!;

        // Count success/failure
        if (log.status === 'success') {
          stats.successCount++;
        } else if (log.status === 'error' || log.status === 'failure') {
          stats.failureCount++;

          // Track error messages
          if (log.errorMessage) {
            const errorKey = log.errorMessage.slice(0, 100); // Truncate for grouping
            const existing = stats.errors.get(errorKey);
            if (existing) {
              existing.count++;
              if (log.created > existing.lastOccurred) {
                existing.lastOccurred = log.created;
              }
            } else {
              stats.errors.set(errorKey, { count: 1, lastOccurred: log.created });
            }
          }
        }

        // Aggregate by hour
        const hour = log.created.slice(0, 13) + ':00:00'; // YYYY-MM-DDTHH:00:00
        const hourStats = stats.hourlyData.get(hour) || { success: 0, failure: 0 };
        if (log.status === 'success') {
          hourStats.success++;
        } else {
          hourStats.failure++;
        }
        stats.hourlyData.set(hour, hourStats);
      }

      // Build response
      const result: ProviderStats[] = [];

      providerMap.forEach((stats, providerName) => {
        const totalRequests = stats.successCount + stats.failureCount;
        const successRate = totalRequests > 0 ? (stats.successCount / totalRequests) * 100 : 100;

        // Sort errors by count
        const recentErrors: ProviderStats['recentErrors'] = [];
        stats.errors.forEach((data, message) => {
          recentErrors.push({
            message,
            count: data.count,
            lastOccurred: data.lastOccurred,
          });
        });
        recentErrors.sort((a, b) => b.count - a.count);
        const topErrors = recentErrors.slice(0, 5);

        // Sort hourly stats chronologically
        const hourlyStats: ProviderStats['hourlyStats'] = [];
        stats.hourlyData.forEach((data, hour) => {
          hourlyStats.push({
            hour,
            success: data.success,
            failure: data.failure,
          });
        });
        hourlyStats.sort((a, b) => a.hour.localeCompare(b.hour));

        result.push({
          providerId: providerName.toLowerCase().replace(/\s+/g, '_'),
          providerName,
          totalRequests,
          successCount: stats.successCount,
          failureCount: stats.failureCount,
          successRate,
          recentErrors: topErrors,
          hourlyStats,
        });
      });

      // Sort by failure count (most failures first)
      result.sort((a, b) => b.failureCount - a.failureCount);

      return NextResponse.json({
        period: `${hoursBack}h`,
        generatedAt: new Date().toISOString(),
        providers: result,
      });
    } catch (error) {
      logger.error('admin_provider_stats_fetch_failed', error);
      return NextResponse.json(
        { error: 'Failed to fetch provider stats' },
        { status: 500 }
      );
    }
  });
}
