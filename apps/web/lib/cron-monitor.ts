/**
 * Cron Job Monitoring Module
 *
 * Provides execution tracking, failure detection, and alerting for cron jobs.
 *
 * Features:
 * - Execution logging with duration tracking
 * - Failure and timeout detection
 * - Discord alerts for failures
 * - Statistics and history queries
 *
 * Usage:
 * ```typescript
 * import { withCronMonitor } from '@/lib/cron-monitor';
 *
 * export const POST = withCronMonitor('sync-orders', async (request, monitor) => {
 *   const orders = await syncOrders();
 *   monitor.setItemsProcessed(orders.length);
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase } from './pocketbase';
import { logger } from './logger';
import { getInstanceId } from './cron-lock';

// =============================================================================
// Types
// =============================================================================

export type CronStatus = 'running' | 'success' | 'failed' | 'timeout' | 'skipped';

export interface CronExecutionLog {
  id: string;
  job_name: string;
  instance_id: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  status: CronStatus;
  error_message: string | null;
  items_processed: number | null;
  metadata: Record<string, unknown> | null;
}

export interface CronMonitorContext {
  /** Set the number of items processed (for statistics) */
  setItemsProcessed: (count: number) => void;
  /** Add metadata to the execution log */
  addMetadata: (key: string, value: unknown) => void;
  /** Mark the job as skipped (e.g., lock held) */
  markSkipped: (reason: string) => void;
}

export interface CronMonitorOptions {
  /** Expected max duration in ms (alerts if exceeded, default: 60s) */
  expectedDurationMs?: number;
  /** Send Discord alert on failure (default: true) */
  alertOnFailure?: boolean;
  /** Send Discord alert on timeout (default: true) */
  alertOnTimeout?: boolean;
}

export interface CronStats {
  jobName: string;
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  timeoutCount: number;
  successRate: number;
  avgDurationMs: number;
  lastExecution: CronExecutionLog | null;
  lastSuccess: CronExecutionLog | null;
  lastFailure: CronExecutionLog | null;
}

// =============================================================================
// Configuration
// =============================================================================

const COLLECTION_NAME = 'cron_execution_logs';
const DEFAULT_EXPECTED_DURATION_MS = 60 * 1000; // 1 minute
const RETENTION_DAYS = 30;

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Start tracking a cron job execution.
 */
export async function startExecution(jobName: string): Promise<string | null> {
  try {
    const pb = await getAdminPocketBase();
    const instanceId = getInstanceId();

    const record = await pb.collection(COLLECTION_NAME).create({
      job_name: jobName,
      instance_id: instanceId,
      started_at: new Date().toISOString(),
      status: 'running',
    });

    return record.id;
  } catch (error) {
    logger.error('cron_monitor_start_failed', error, { jobName });
    return null;
  }
}

/**
 * Complete a cron job execution with success.
 */
export async function completeExecution(
  executionId: string | null,
  options: {
    itemsProcessed?: number;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> {
  if (!executionId) return;

  try {
    const pb = await getAdminPocketBase();
    const execution = await pb.collection(COLLECTION_NAME).getOne<CronExecutionLog>(executionId);

    const startedAt = new Date(execution.started_at);
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    await pb.collection(COLLECTION_NAME).update(executionId, {
      completed_at: completedAt.toISOString(),
      duration_ms: durationMs,
      status: 'success',
      items_processed: options.itemsProcessed ?? null,
      metadata: options.metadata ?? null,
    });

    logger.info('cron_execution_completed', {
      jobName: execution.job_name,
      durationMs,
      itemsProcessed: options.itemsProcessed,
    });
  } catch (error) {
    logger.error('cron_monitor_complete_failed', error, { executionId });
  }
}

/**
 * Mark a cron job execution as failed.
 */
export async function failExecution(
  executionId: string | null,
  errorMessage: string,
  options: {
    alertOnFailure?: boolean;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> {
  if (!executionId) return;

  const { alertOnFailure = true, metadata } = options;

  try {
    const pb = await getAdminPocketBase();
    const execution = await pb.collection(COLLECTION_NAME).getOne<CronExecutionLog>(executionId);

    const startedAt = new Date(execution.started_at);
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    await pb.collection(COLLECTION_NAME).update(executionId, {
      completed_at: completedAt.toISOString(),
      duration_ms: durationMs,
      status: 'failed',
      error_message: errorMessage.substring(0, 2000),
      metadata: metadata ?? null,
    });

    logger.error('cron_execution_failed', undefined, {
      jobName: execution.job_name,
      durationMs,
      errorMessage,
    });

    // Send Discord alert
    if (alertOnFailure) {
      await sendCronAlert(execution.job_name, 'failed', errorMessage, durationMs);
    }
  } catch (error) {
    logger.error('cron_monitor_fail_failed', error, { executionId });
  }
}

/**
 * Mark a cron job execution as skipped.
 */
export async function skipExecution(
  executionId: string | null,
  reason: string
): Promise<void> {
  if (!executionId) return;

  try {
    const pb = await getAdminPocketBase();

    await pb.collection(COLLECTION_NAME).update(executionId, {
      completed_at: new Date().toISOString(),
      duration_ms: 0,
      status: 'skipped',
      error_message: reason,
    });
  } catch (error) {
    logger.error('cron_monitor_skip_failed', error, { executionId });
  }
}

/**
 * Mark a cron job execution as timed out.
 */
export async function timeoutExecution(
  executionId: string | null,
  expectedDurationMs: number,
  options: {
    alertOnTimeout?: boolean;
  } = {}
): Promise<void> {
  if (!executionId) return;

  const { alertOnTimeout = true } = options;

  try {
    const pb = await getAdminPocketBase();
    const execution = await pb.collection(COLLECTION_NAME).getOne<CronExecutionLog>(executionId);

    const startedAt = new Date(execution.started_at);
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    await pb.collection(COLLECTION_NAME).update(executionId, {
      completed_at: completedAt.toISOString(),
      duration_ms: durationMs,
      status: 'timeout',
      error_message: `Exceeded expected duration of ${expectedDurationMs}ms`,
    });

    logger.warn('cron_execution_timeout', {
      jobName: execution.job_name,
      durationMs,
      expectedDurationMs,
    });

    // Send Discord alert
    if (alertOnTimeout) {
      await sendCronAlert(
        execution.job_name,
        'timeout',
        `Duration: ${durationMs}ms (expected: ${expectedDurationMs}ms)`,
        durationMs
      );
    }
  } catch (error) {
    logger.error('cron_monitor_timeout_failed', error, { executionId });
  }
}

// =============================================================================
// Discord Alerting
// =============================================================================

async function sendCronAlert(
  jobName: string,
  status: 'failed' | 'timeout',
  details: string,
  durationMs: number
): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.warn('cron_alert_no_webhook', { jobName });
    return;
  }

  const color = status === 'failed' ? 0xff0000 : 0xffa500; // Red for failed, orange for timeout
  const emoji = status === 'failed' ? '❌' : '⏰';

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: `${emoji} Cron Job ${status.toUpperCase()}: ${jobName}`,
            color,
            fields: [
              { name: 'Job Name', value: jobName, inline: true },
              { name: 'Status', value: status.toUpperCase(), inline: true },
              { name: 'Duration', value: `${durationMs}ms`, inline: true },
              { name: 'Details', value: details.substring(0, 1000) },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (error) {
    logger.error('cron_alert_send_failed', error, { jobName });
  }
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Get statistics for a cron job.
 */
export async function getCronStats(
  jobName: string,
  days: number = 7
): Promise<CronStats | null> {
  try {
    const pb = await getAdminPocketBase();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const executions = await pb.collection(COLLECTION_NAME).getFullList<CronExecutionLog>({
      filter: `job_name = "${jobName}" && started_at >= "${cutoff}"`,
      sort: '-started_at',
    });

    if (executions.length === 0) {
      return {
        jobName,
        totalExecutions: 0,
        successCount: 0,
        failedCount: 0,
        timeoutCount: 0,
        successRate: 0,
        avgDurationMs: 0,
        lastExecution: null,
        lastSuccess: null,
        lastFailure: null,
      };
    }

    const successCount = executions.filter((e) => e.status === 'success').length;
    const failedCount = executions.filter((e) => e.status === 'failed').length;
    const timeoutCount = executions.filter((e) => e.status === 'timeout').length;

    const completedExecutions = executions.filter((e) => e.duration_ms !== null);
    const avgDurationMs =
      completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => sum + (e.duration_ms || 0), 0) /
          completedExecutions.length
        : 0;

    return {
      jobName,
      totalExecutions: executions.length,
      successCount,
      failedCount,
      timeoutCount,
      successRate: (successCount / executions.length) * 100,
      avgDurationMs: Math.round(avgDurationMs),
      lastExecution: executions[0] || null,
      lastSuccess: executions.find((e) => e.status === 'success') || null,
      lastFailure: executions.find((e) => e.status === 'failed') || null,
    };
  } catch (error) {
    logger.error('cron_stats_failed', error, { jobName });
    return null;
  }
}

/**
 * Get all cron job statistics.
 */
export async function getAllCronStats(days: number = 7): Promise<CronStats[]> {
  try {
    const pb = await getAdminPocketBase();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get all unique job names
    const executions = await pb.collection(COLLECTION_NAME).getFullList<CronExecutionLog>({
      filter: `started_at >= "${cutoff}"`,
      sort: '-started_at',
    });

    const jobNames = [...new Set(executions.map((e) => e.job_name))];
    const stats: CronStats[] = [];

    for (const jobName of jobNames) {
      const jobStats = await getCronStats(jobName, days);
      if (jobStats) {
        stats.push(jobStats);
      }
    }

    return stats;
  } catch (error) {
    logger.error('cron_all_stats_failed', error);
    return [];
  }
}

// =============================================================================
// Cleanup
// =============================================================================

/**
 * Clean up old execution logs.
 */
export async function cleanupOldExecutionLogs(): Promise<number> {
  try {
    const pb = await getAdminPocketBase();
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const oldLogs = await pb.collection(COLLECTION_NAME).getList(1, 100, {
      filter: `started_at < "${cutoff}"`,
    });

    if (oldLogs.items.length === 0) {
      return 0;
    }

    let deleted = 0;
    for (const log of oldLogs.items) {
      try {
        await pb.collection(COLLECTION_NAME).delete(log.id);
        deleted++;
      } catch {
        // Ignore individual delete failures
      }
    }

    logger.info('cron_logs_cleanup_completed', {
      deleted,
      totalExpired: oldLogs.totalItems,
    });

    return deleted;
  } catch (error) {
    logger.error('cron_logs_cleanup_failed', error);
    return 0;
  }
}

// =============================================================================
// Higher-Order Function Wrapper
// =============================================================================

type CronHandler = (
  request: NextRequest,
  monitor: CronMonitorContext
) => Promise<NextResponse>;

/**
 * Wrap a cron job handler with monitoring.
 *
 * @param jobName - Unique name for the cron job
 * @param handler - The cron job handler function
 * @param options - Monitor options
 *
 * @example
 * ```typescript
 * export const POST = withCronMonitor('sync-orders', async (request, monitor) => {
 *   const orders = await syncOrders();
 *   monitor.setItemsProcessed(orders.length);
 *   return NextResponse.json({ success: true });
 * }, { expectedDurationMs: 30000 });
 * ```
 */
export function withCronMonitor(
  jobName: string,
  handler: CronHandler,
  options: CronMonitorOptions = {}
): (request: NextRequest) => Promise<NextResponse> {
  const {
    expectedDurationMs = DEFAULT_EXPECTED_DURATION_MS,
    alertOnFailure = true,
    alertOnTimeout = true,
  } = options;

  return async (request: NextRequest): Promise<NextResponse> => {
    const executionId = await startExecution(jobName);
    const startTime = Date.now();

    let itemsProcessed: number | undefined;
    let metadata: Record<string, unknown> = {};
    let skipped = false;
    let skipReason = '';

    const context: CronMonitorContext = {
      setItemsProcessed: (count: number) => {
        itemsProcessed = count;
      },
      addMetadata: (key: string, value: unknown) => {
        metadata[key] = value;
      },
      markSkipped: (reason: string) => {
        skipped = true;
        skipReason = reason;
      },
    };

    try {
      const response = await handler(request, context);

      const durationMs = Date.now() - startTime;

      // Check if marked as skipped
      if (skipped) {
        await skipExecution(executionId, skipReason);
        return response;
      }

      // Check for timeout (exceeded expected duration)
      if (durationMs > expectedDurationMs * 2) {
        await timeoutExecution(executionId, expectedDurationMs, { alertOnTimeout });
        return response;
      }

      // Success
      await completeExecution(executionId, {
        itemsProcessed,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await failExecution(executionId, errorMessage, {
        alertOnFailure,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      throw error;
    }
  };
}

// =============================================================================
// Detect Stuck Jobs
// =============================================================================

/**
 * Find jobs that are stuck in 'running' state.
 */
export async function findStuckJobs(maxRunningMinutes: number = 30): Promise<CronExecutionLog[]> {
  try {
    const pb = await getAdminPocketBase();
    const cutoff = new Date(Date.now() - maxRunningMinutes * 60 * 1000).toISOString();

    const stuckJobs = await pb.collection(COLLECTION_NAME).getFullList<CronExecutionLog>({
      filter: `status = "running" && started_at < "${cutoff}"`,
      sort: '-started_at',
    });

    if (stuckJobs.length > 0) {
      logger.warn('cron_stuck_jobs_found', {
        count: stuckJobs.length,
        jobs: stuckJobs.map((j) => j.job_name),
      });
    }

    return stuckJobs;
  } catch (error) {
    logger.error('cron_stuck_jobs_check_failed', error);
    return [];
  }
}

/**
 * Mark stuck jobs as failed.
 */
export async function cleanupStuckJobs(maxRunningMinutes: number = 30): Promise<number> {
  const stuckJobs = await findStuckJobs(maxRunningMinutes);

  let cleaned = 0;
  for (const job of stuckJobs) {
    await failExecution(
      job.id,
      `Job stuck in running state for over ${maxRunningMinutes} minutes`,
      { alertOnFailure: true }
    );
    cleaned++;
  }

  return cleaned;
}
