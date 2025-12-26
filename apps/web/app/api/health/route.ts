import { NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';

interface ServiceStatus {
  status: 'ok' | 'error';
  latencyMs?: number;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    pocketbase: ServiceStatus;
  };
  version?: string;
}

/**
 * GET /api/health
 * Health check endpoint for monitoring and deployment readiness
 *
 * Returns:
 * - 200: All services healthy
 * - 503: One or more services unhealthy
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  const startTime = Date.now();
  const services: HealthResponse['services'] = {
    pocketbase: { status: 'ok' },
  };

  // Check PocketBase connection
  try {
    const pbStart = Date.now();
    await pb.health.check();
    services.pocketbase = {
      status: 'ok',
      latencyMs: Date.now() - pbStart,
    };
  } catch (error) {
    services.pocketbase = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }

  // Determine overall status
  const allServicesOk = Object.values(services).every((s) => s.status === 'ok');
  const anyServiceOk = Object.values(services).some((s) => s.status === 'ok');

  let overallStatus: HealthResponse['status'];
  if (allServicesOk) {
    overallStatus = 'healthy';
  } else if (anyServiceOk) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'unhealthy';
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services,
    version: process.env.npm_package_version || '1.0.0',
  };

  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Response-Time': `${Date.now() - startTime}ms`,
    },
  });
}
