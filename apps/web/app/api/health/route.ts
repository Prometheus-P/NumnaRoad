import { NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';

/**
 * Health Check Endpoint
 *
 * Checks the health of all critical services.
 * Returns 200 if all services are healthy, 503 if any service is down.
 *
 * GET /api/health
 */

interface ServiceStatus {
  status: 'ok' | 'error';
  latencyMs?: number;
  error?: string;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    pocketbase: ServiceStatus;
    stripe: ServiceStatus;
  };
  uptime: number;
}

const startTime = Date.now();

/**
 * Check PocketBase health
 */
async function checkPocketBase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    // Try to fetch health info from PocketBase
    await pb.health.check();
    return {
      status: 'ok',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Stripe API health
 */
async function checkStripe(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    // Check if Stripe key is configured
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return {
        status: 'error',
        latencyMs: Date.now() - start,
        error: 'Stripe API key not configured',
      };
    }

    // Verify key format (starts with sk_)
    if (!stripeKey.startsWith('sk_')) {
      return {
        status: 'error',
        latencyMs: Date.now() - start,
        error: 'Invalid Stripe API key format',
      };
    }

    return {
      status: 'ok',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  // Run health checks in parallel
  const [pocketbaseStatus, stripeStatus] = await Promise.all([
    checkPocketBase(),
    checkStripe(),
  ]);

  const services = {
    pocketbase: pocketbaseStatus,
    stripe: stripeStatus,
  };

  // Determine overall health status
  const allOk = Object.values(services).every((s) => s.status === 'ok');
  const anyOk = Object.values(services).some((s) => s.status === 'ok');

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (allOk) {
    status = 'healthy';
  } else if (anyOk) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  const response: HealthCheckResponse = {
    status,
    timestamp,
    version: process.env.npm_package_version || '1.0.0',
    services,
    uptime,
  };

  // Return appropriate HTTP status code
  const httpStatus = status === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, { status: httpStatus });
}
