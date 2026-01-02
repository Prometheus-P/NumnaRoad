/**
 * eSIM Usage Query API
 *
 * Fetches real-time usage data for an eSIM from Airalo.
 * Rate limited: 96 requests/day per SIM
 *
 * GET /api/esim/{iccid}/usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { AiraloProvider } from '@services/esim-providers/airalo';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { getAdminPocketBase, Collections } from '@/lib/pocketbase';
import type { EsimProvider } from '@services/esim-providers/types';
import { logger } from '@/lib/logger';

// Cache for usage data (15 minutes)
const usageCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Rate limit config for usage queries (stricter than default)
const USAGE_RATE_LIMIT = {
  interval: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute per IP
};

// Per-SIM daily rate limit (Airalo limit: 96/day)
const SIM_DAILY_RATE_LIMIT = {
  interval: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 90, // Leave buffer below Airalo's 96
};

function getAiraloConfig(): EsimProvider {
  return {
    id: 'airalo',
    name: 'Airalo',
    slug: 'airalo',
    priority: 1,
    apiEndpoint: process.env.AIRALO_API_URL || 'https://partners-api.airalo.com/v2',
    apiKeyEnvVar: 'AIRALO_API_KEY',
    timeoutMs: 30000,
    maxRetries: 3,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ iccid: string }> }
) {
  const { iccid } = await params;

  if (!iccid || iccid.length < 10) {
    return NextResponse.json(
      { error: 'Invalid ICCID' },
      { status: 400 }
    );
  }

  // Check IP-based rate limit
  const clientIP = getClientIP(request);
  const ipRateLimitResult = checkRateLimit(`usage:ip:${clientIP}`, USAGE_RATE_LIMIT);

  if (!ipRateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: ipRateLimitResult.retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': String(ipRateLimitResult.retryAfter),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // Check per-SIM daily rate limit
  const simRateLimitResult = checkRateLimit(`usage:sim:${iccid}`, SIM_DAILY_RATE_LIMIT);

  if (!simRateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Daily usage query limit exceeded for this eSIM',
        retryAfter: simRateLimitResult.retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(simRateLimitResult.retryAfter),
        },
      }
    );
  }

  // Check cache first
  const cacheKey = `usage:${iccid}`;
  const cached = usageCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({
      success: true,
      cached: true,
      data: cached.data,
      cacheAge: Math.floor((now - cached.timestamp) / 1000),
    });
  }

  try {
    // Verify the ICCID belongs to a valid order (optional security check)
    const pb = await getAdminPocketBase();
    try {
      const orders = await pb.collection(Collections.ORDERS).getList(1, 1, {
        filter: `esimIccid = "${iccid}"`,
      });

      if (orders.items.length === 0) {
        return NextResponse.json(
          { error: 'eSIM not found in our records' },
          { status: 404 }
        );
      }
    } catch (dbError) {
      logger.warn('esim_usage_db_check_failed', { iccid, error: dbError instanceof Error ? dbError.message : 'Unknown' });
    }

    // Fetch usage from Airalo
    const provider = new AiraloProvider(getAiraloConfig());
    const usage = await provider.getSimUsage(iccid);

    // Update cache
    usageCache.set(cacheKey, { data: usage.data, timestamp: now });

    return NextResponse.json({
      success: true,
      cached: false,
      data: usage.data,
      rateLimitRemaining: simRateLimitResult.remaining,
    });
  } catch (error) {
    logger.error('esim_usage_fetch_failed', error, { iccid });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch usage data',
      },
      { status: 500 }
    );
  }
}
