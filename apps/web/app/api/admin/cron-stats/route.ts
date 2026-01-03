/**
 * Cron Job Statistics API
 *
 * GET /api/admin/cron-stats
 * Returns execution statistics for all cron jobs.
 *
 * Query Parameters:
 * - days: Number of days to include (default: 7)
 * - job: Specific job name to filter (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { checkRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit';
import { getAllCronStats, getCronStats, findStuckJobs } from '@/lib/cron-monitor';

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = checkRateLimit(request, {
    limit: 60,
    keyPrefix: 'admin-cron-stats',
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
    const days = parseInt(searchParams.get('days') || '7', 10);
    const jobName = searchParams.get('job');

    // Get stats for specific job or all jobs
    if (jobName) {
      const stats = await getCronStats(jobName, days);
      if (!stats) {
        return NextResponse.json(
          { error: 'Failed to fetch cron stats' },
          { status: 500 }
        );
      }
      return NextResponse.json({ stats });
    }

    // Get all stats
    const allStats = await getAllCronStats(days);

    // Also get stuck jobs
    const stuckJobs = await findStuckJobs();

    return NextResponse.json({
      stats: allStats,
      stuckJobs: stuckJobs.map((job) => ({
        jobName: job.job_name,
        startedAt: job.started_at,
        instanceId: job.instance_id,
      })),
      summary: {
        totalJobs: allStats.length,
        totalExecutions: allStats.reduce((sum, s) => sum + s.totalExecutions, 0),
        overallSuccessRate:
          allStats.length > 0
            ? allStats.reduce((sum, s) => sum + s.successRate, 0) / allStats.length
            : 0,
        stuckJobsCount: stuckJobs.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
