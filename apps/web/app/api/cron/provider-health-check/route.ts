/**
 * Provider Health Check Cron Job
 *
 * Runs periodic health checks on all eSIM providers.
 * Logs results and sends Discord alerts on degradation.
 *
 * Runs every 5 minutes via Vercel Cron.
 *
 * POST /api/cron/provider-health-check
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';
import { verifyCronAuth } from '@/lib/admin-auth';
import { acquireLock, releaseLock } from '@/lib/cron-lock';
import { withCronMonitor, CronMonitorContext } from '@/lib/cron-monitor';
import { logger } from '@/lib/logger';
import {
  createProvider,
  type EsimProvider,
} from '@services/esim-providers/provider-factory';
import type { ProviderSlug } from '@services/esim-providers/types';

const JOB_NAME = 'provider-health-check';
const LOCK_TTL_MS = 2 * 60 * 1000; // 2 minutes

// Health check thresholds
const DEGRADED_RESPONSE_TIME_MS = 5000; // 5 seconds
const RETENTION_DAYS = 7;

type HealthStatus = 'healthy' | 'unhealthy' | 'degraded' | 'unknown';

interface HealthCheckResult {
  providerSlug: string;
  providerName: string;
  status: HealthStatus;
  responseTimeMs?: number;
  errorMessage?: string;
}

interface ProviderRecord {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  apiEndpoint: string;
  apiKeyEnvVar: string;
  priority: number;
  timeoutMs: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

async function runHealthCheck(provider: EsimProvider): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const adapter = createProvider(provider);
    const isHealthy = await adapter.healthCheck();
    const responseTimeMs = Date.now() - startTime;

    // Determine status based on health and response time
    let status: HealthStatus;
    if (!isHealthy) {
      status = 'unhealthy';
    } else if (responseTimeMs > DEGRADED_RESPONSE_TIME_MS) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      providerSlug: provider.slug,
      providerName: provider.name,
      status,
      responseTimeMs,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      providerSlug: provider.slug,
      providerName: provider.name,
      status: 'unhealthy',
      responseTimeMs,
      errorMessage,
    };
  }
}

async function sendDiscordAlert(
  results: HealthCheckResult[],
  unhealthyProviders: HealthCheckResult[]
): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl || unhealthyProviders.length === 0) return;

  const healthySummary = results.filter((r) => r.status === 'healthy').length;
  const degradedSummary = results.filter((r) => r.status === 'degraded').length;
  const unhealthySummary = unhealthyProviders.length;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: '⚠️ Provider Health Alert',
            color: unhealthySummary > 0 ? 0xff0000 : 0xffa500,
            fields: [
              {
                name: 'Summary',
                value: `✅ Healthy: ${healthySummary} | ⚠️ Degraded: ${degradedSummary} | ❌ Unhealthy: ${unhealthySummary}`,
                inline: false,
              },
              ...unhealthyProviders.map((p) => ({
                name: `${p.status === 'unhealthy' ? '❌' : '⚠️'} ${p.providerName}`,
                value: p.errorMessage || `Response: ${p.responseTimeMs}ms`,
                inline: true,
              })),
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (error) {
    logger.error('health_check_discord_alert_failed', error);
  }
}

async function handleHealthCheck(
  request: NextRequest,
  monitor: CronMonitorContext
): Promise<NextResponse> {
  // Verify cron secret
  const authResult = verifyCronAuth(request);
  if (!authResult.valid) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.error === 'Server misconfigured' ? 500 : 401 }
    );
  }

  // Acquire distributed lock
  const lockResult = await acquireLock(JOB_NAME, { ttlMs: LOCK_TTL_MS });

  if (!lockResult.acquired) {
    logger.info('cron_job_skipped', {
      job: JOB_NAME,
      reason: 'lock_held',
      heldBy: lockResult.heldBy,
    });

    monitor.markSkipped(`Lock held by ${lockResult.heldBy}`);

    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'Lock held by another instance',
    });
  }

  try {
    const pb = await getAdminPocketBase();

    // Get all active providers
    const providersResult = await pb.collection(Collections.ESIM_PROVIDERS).getFullList<ProviderRecord>({
      filter: 'isActive = true',
      sort: '-priority',
    });

    if (providersResult.length === 0) {
      monitor.setItemsProcessed(0);
      return NextResponse.json({
        success: true,
        message: 'No active providers to check',
        checked: 0,
      });
    }

    // Convert to EsimProvider format
    const providers: EsimProvider[] = providersResult.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug as ProviderSlug,
      priority: p.priority,
      apiEndpoint: p.apiEndpoint,
      apiKeyEnvVar: p.apiKeyEnvVar,
      timeoutMs: p.timeoutMs,
      maxRetries: p.maxRetries,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    // Run health checks in parallel
    const results = await Promise.all(
      providers.map((provider) => runHealthCheck(provider))
    );

    // Log results to database
    const checkedAt = new Date().toISOString();
    for (const result of results) {
      try {
        await pb.collection('provider_health_logs').create({
          provider_slug: result.providerSlug,
          provider_name: result.providerName,
          status: result.status,
          response_time_ms: result.responseTimeMs,
          error_message: result.errorMessage,
          checked_at: checkedAt,
        });
      } catch (error) {
        logger.error('health_check_log_failed', error, {
          providerSlug: result.providerSlug,
        });
      }
    }

    // Send Discord alert for unhealthy/degraded providers
    const unhealthyProviders = results.filter(
      (r) => r.status === 'unhealthy' || r.status === 'degraded'
    );

    if (unhealthyProviders.length > 0) {
      await sendDiscordAlert(results, unhealthyProviders);
    }

    // Cleanup old logs
    const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    try {
      const oldLogs = await pb.collection('provider_health_logs').getList(1, 100, {
        filter: `checked_at < "${cutoffDate}"`,
      });

      for (const log of oldLogs.items) {
        await pb.collection('provider_health_logs').delete(log.id);
      }
    } catch {
      // Ignore cleanup errors
    }

    // Update monitor
    monitor.setItemsProcessed(results.length);
    monitor.addMetadata('healthy', results.filter((r) => r.status === 'healthy').length);
    monitor.addMetadata('unhealthy', unhealthyProviders.length);

    logger.info('health_check_completed', {
      checked: results.length,
      healthy: results.filter((r) => r.status === 'healthy').length,
      degraded: results.filter((r) => r.status === 'degraded').length,
      unhealthy: results.filter((r) => r.status === 'unhealthy').length,
    });

    return NextResponse.json({
      success: true,
      message: `Checked ${results.length} providers`,
      results: results.map((r) => ({
        provider: r.providerSlug,
        status: r.status,
        responseTimeMs: r.responseTimeMs,
      })),
      summary: {
        healthy: results.filter((r) => r.status === 'healthy').length,
        degraded: results.filter((r) => r.status === 'degraded').length,
        unhealthy: results.filter((r) => r.status === 'unhealthy').length,
      },
    });
  } finally {
    await releaseLock(JOB_NAME, lockResult.lockId);
  }
}

export const POST = withCronMonitor(JOB_NAME, handleHealthCheck, {
  expectedDurationMs: 60000,
  alertOnFailure: true,
  alertOnTimeout: true,
});

export async function GET(request: NextRequest) {
  return POST(request);
}
