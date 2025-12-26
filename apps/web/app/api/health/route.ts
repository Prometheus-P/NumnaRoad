import { NextResponse } from 'next/server';
import { getAdminPocketBase } from '@/lib/pocketbase';

/**
 * Health Check Endpoint
 *
 * Checks the health of all critical services.
 * Returns 200 if all services are healthy, 503 if any service is down.
 *
 * GET /api/health
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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
    smartstore: ServiceStatus;
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
    const pb = await getAdminPocketBase();
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
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return {
        status: 'error',
        latencyMs: Date.now() - start,
        error: 'Stripe API key not configured',
      };
    }

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

/**
 * Check SmartStore API health
 */
async function checkSmartStore(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return {
        status: 'error',
        latencyMs: Date.now() - start,
        error: 'SmartStore credentials not configured',
      };
    }

    // Dynamically import to avoid build-time issues
    const { getSmartStoreClient } = await import(
      '@services/sales-channels/smartstore'
    );
    const client = getSmartStoreClient();
    const isHealthy = await client.healthCheck();

    return {
      status: isHealthy ? 'ok' : 'error',
      latencyMs: Date.now() - start,
      error: isHealthy ? undefined : 'SmartStore API health check failed',
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
  const [pocketbaseStatus, stripeStatus, smartstoreStatus] = await Promise.all([
    checkPocketBase(),
    checkStripe(),
    checkSmartStore(),
  ]);

  const services = {
    pocketbase: pocketbaseStatus,
    stripe: stripeStatus,
    smartstore: smartstoreStatus,
  };

  // Determine overall health status
  // PocketBase is critical, others are optional
  const criticalServices = [services.pocketbase];
  const optionalServices = [services.stripe, services.smartstore];

  const criticalOk = criticalServices.every((s) => s.status === 'ok');
  const optionalOk = optionalServices.every((s) => s.status === 'ok');

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (criticalOk && optionalOk) {
    status = 'healthy';
  } else if (criticalOk) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  const response: HealthCheckResponse = {
    status,
    timestamp,
    version: process.env.npm_package_version || '0.1.0',
    services,
    uptime,
  };

  // Return appropriate HTTP status code
  const httpStatus = status === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, { status: httpStatus });
}
