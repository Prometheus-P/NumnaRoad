/**
 * Airalo API Test Endpoint
 *
 * Tests the Airalo integration from the deployed environment.
 * Only accessible in development or with proper authorization.
 *
 * Usage:
 *   GET /api/test/airalo?action=health
 *   GET /api/test/airalo?action=packages
 *   POST /api/test/airalo?action=purchase
 */

import { NextRequest, NextResponse } from 'next/server';
import { AiraloProvider } from '@services/esim-providers/airalo';
import type { EsimProvider, AiraloPackageData, AiraloOperator, AiraloPackageDetails } from '@services/esim-providers/types';

// Airalo provider config
function getAiraloConfig(): EsimProvider {
  return {
    id: 'airalo-test',
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

// Check authorization
function isAuthorized(request: NextRequest): boolean {
  // Allow in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Check for internal API key
  const authHeader = request.headers.get('authorization');
  const internalApiKey = process.env.INTERNAL_API_KEY;

  if (internalApiKey && authHeader === `Bearer ${internalApiKey}`) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  // Check environment
  const apiKey = process.env.AIRALO_API_KEY;
  const apiSecret = process.env.AIRALO_API_SECRET_KEY;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing Airalo credentials',
        details: {
          AIRALO_API_KEY: apiKey ? 'set' : 'missing',
          AIRALO_API_SECRET_KEY: apiSecret ? 'set' : 'missing',
        },
      },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'health';

  const provider = new AiraloProvider(getAiraloConfig());

  try {
    switch (action) {
      case 'health': {
        try {
          const isHealthy = await provider.healthCheck();
          return NextResponse.json({
            success: true,
            action: 'health',
            result: {
              healthy: isHealthy,
              apiUrl: process.env.AIRALO_API_URL || 'https://partners-api.airalo.com/v2',
            },
          });
        } catch (healthError) {
          return NextResponse.json({
            success: true,
            action: 'health',
            result: {
              healthy: false,
              apiUrl: process.env.AIRALO_API_URL || 'https://partners-api.airalo.com/v2',
              error: healthError instanceof Error ? healthError.message : 'Unknown health check error',
            },
          });
        }
      }

      case 'token': {
        // Test getAccessToken through provider class
        try {
          // Access the private method via prototype for debugging
          const providerAny = provider as unknown as { getAccessToken: () => Promise<string>; tokenUrl: string; apiUrl: string };
          const token = await providerAny.getAccessToken();
          return NextResponse.json({
            success: true,
            action: 'token',
            result: {
              tokenReceived: true,
              tokenLength: token.length,
            },
          });
        } catch (tokenError) {
          return NextResponse.json({
            success: false,
            action: 'token',
            error: tokenError instanceof Error ? tokenError.message : 'Unknown token error',
          });
        }
      }

      case 'debug': {
        // Direct token test with detailed error reporting
        const apiUrl = process.env.AIRALO_API_URL || 'https://partners-api.airalo.com/v2';
        const tokenUrl = `${apiUrl}/token`;
        const formData = new FormData();
        formData.append('grant_type', 'client_credentials');
        formData.append('client_id', process.env.AIRALO_API_KEY || '');
        formData.append('client_secret', process.env.AIRALO_API_SECRET_KEY || '');

        try {
          const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            body: formData,
          });

          const responseText = await response.text();
          let responseJson = null;
          try {
            responseJson = JSON.parse(responseText);
          } catch {
            // Not JSON
          }

          return NextResponse.json({
            success: true,
            action: 'debug',
            result: {
              tokenUrl,
              status: response.status,
              statusText: response.statusText,
              responseText: responseText.substring(0, 1000),
              responseJson,
            },
          });
        } catch (err) {
          return NextResponse.json({
            success: false,
            action: 'debug',
            error: err instanceof Error ? err.message : 'Unknown error',
            tokenUrl,
          });
        }
      }

      case 'packages': {
        const packagesResponse = await provider.getPackages();
        const summary = {
          total: packagesResponse.meta.total,
          currentPage: packagesResponse.meta.current_page,
          lastPage: packagesResponse.meta.last_page,
          pricingModel: packagesResponse.pricing.model,
          discountPercentage: packagesResponse.pricing.discount_percentage,
        };

        // Return first 10 packages for review
        const samplePackages = packagesResponse.data.slice(0, 10).map((pkg: AiraloPackageData) => ({
          slug: pkg.slug,
          countryCode: pkg.country_code,
          title: pkg.title,
          operatorCount: pkg.operators.length,
          operators: pkg.operators.map((op: AiraloOperator) => ({
            id: op.id,
            title: op.title,
            esimType: op.esim_type,
            packageCount: op.packages.length,
            packages: op.packages.slice(0, 3).map((p: AiraloPackageDetails) => ({
              id: p.id,
              title: p.title,
              data: p.data,
              days: p.day,
              priceUSD: p.prices.net_price.USD,
            })),
          })),
        }));

        return NextResponse.json({
          success: true,
          action: 'packages',
          result: {
            summary,
            samplePackages,
          },
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown action: ${action}`,
            availableActions: ['health', 'token', 'debug', 'packages'],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Authorization required for purchase
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.AIRALO_API_KEY;
  const apiSecret = process.env.AIRALO_API_SECRET_KEY;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing Airalo credentials',
      },
      { status: 500 }
    );
  }

  const provider = new AiraloProvider(getAiraloConfig());

  try {
    const body = await request.json();
    const { packageId, quantity = 1 } = body;

    if (!packageId) {
      // Find a cheap package automatically
      const packagesResponse = await provider.getPackages();
      let testPackageId: string | null = null;
      let testPackageInfo: Record<string, unknown> = {};

      for (const country of packagesResponse.data) {
        for (const operator of country.operators) {
          for (const pkg of operator.packages) {
            if (pkg.prices.net_price.USD <= 5) {
              testPackageId = pkg.id;
              testPackageInfo = {
                country: country.title,
                operator: operator.title,
                package: pkg.title,
                data: pkg.data,
                days: pkg.day,
                priceUSD: pkg.prices.net_price.USD,
              };
              break;
            }
          }
          if (testPackageId) break;
        }
        if (testPackageId) break;
      }

      if (!testPackageId) {
        const first = packagesResponse.data[0]?.operators[0]?.packages[0];
        if (first) {
          testPackageId = first.id;
          testPackageInfo = {
            country: packagesResponse.data[0].title,
            package: first.title,
            priceUSD: first.prices.net_price.USD,
          };
        }
      }

      if (!testPackageId) {
        return NextResponse.json({
          success: false,
          error: 'No packages available for testing',
        });
      }

      // Proceed with purchase
      const result = await provider.purchase({
        providerSku: testPackageId,
        quantity: quantity,
        customerEmail: 'test@numnaroad.com',
        correlationId: `test-${Date.now()}`,
      });

      return NextResponse.json({
        success: true,
        action: 'purchase',
        packageInfo: testPackageInfo,
        result,
      });
    }

    // Use provided packageId
    const result = await provider.purchase({
      providerSku: packageId,
      quantity: quantity,
      customerEmail: 'test@numnaroad.com',
      correlationId: `test-${Date.now()}`,
    });

    return NextResponse.json({
      success: true,
      action: 'purchase',
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
