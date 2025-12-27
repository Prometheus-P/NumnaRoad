/**
 * Airalo API Test Script
 *
 * Tests the Airalo integration:
 * 1. Health check (token retrieval)
 * 2. Fetch available packages
 * 3. Purchase eSIM (demo account)
 *
 * Usage: npx tsx scripts/test-airalo.ts [command]
 *
 * Commands:
 *   health   - Test API connection
 *   packages - Fetch available packages
 *   purchase - Test eSIM purchase (demo)
 *   all      - Run all tests
 */

import { AiraloProvider } from '../services/esim-providers/airalo';
import type { EsimProvider } from '../services/esim-providers/types';

// Airalo provider config for testing
const airaloConfig: EsimProvider = {
  id: 'airalo-test',
  name: 'Airalo',
  slug: 'airalo',
  priority: 1,
  apiEndpoint: process.env.AIRALO_API_URL || 'https://sandbox-partners-api.airalo.com/v2',
  apiKeyEnvVar: 'AIRALO_API_KEY',
  timeoutMs: 30000,
  maxRetries: 3,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function testHealthCheck(): Promise<boolean> {
  console.log('\n=== Testing Health Check ===');
  console.log('API URL:', airaloConfig.apiEndpoint);

  const provider = new AiraloProvider(airaloConfig);

  try {
    const isHealthy = await provider.healthCheck();
    if (isHealthy) {
      console.log('✅ Health check passed - OAuth token retrieved successfully');
      return true;
    } else {
      console.log('❌ Health check failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Health check error:', error);
    return false;
  }
}

async function testFetchPackages(): Promise<boolean> {
  console.log('\n=== Testing Fetch Packages ===');

  const provider = new AiraloProvider(airaloConfig);

  try {
    const packagesResponse = await provider.getPackages();

    console.log('✅ Packages fetched successfully');
    console.log(`Total packages: ${packagesResponse.meta.total}`);
    console.log(`Current page: ${packagesResponse.meta.current_page}/${packagesResponse.meta.last_page}`);
    console.log(`Pricing model: ${packagesResponse.pricing.model}`);
    console.log(`Discount: ${packagesResponse.pricing.discount_percentage}%`);

    // Show first 5 packages
    console.log('\n--- Sample Packages (first 5) ---');
    const samplePackages = packagesResponse.data.slice(0, 5);
    for (const pkg of samplePackages) {
      console.log(`\n📦 ${pkg.title} (${pkg.country_code})`);
      console.log(`   Slug: ${pkg.slug}`);
      if (pkg.operators.length > 0) {
        const op = pkg.operators[0];
        console.log(`   Operator: ${op.title}`);
        console.log(`   eSIM Type: ${op.esim_type}`);
        if (op.packages.length > 0) {
          const firstPkg = op.packages[0];
          console.log(`   First Package: ${firstPkg.title}`);
          console.log(`   - Data: ${firstPkg.data}`);
          console.log(`   - Duration: ${firstPkg.day} days`);
          console.log(`   - Price: $${firstPkg.prices.net_price.USD} USD`);
          console.log(`   - Package ID: ${firstPkg.id}`);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Fetch packages error:', error);
    return false;
  }
}

async function testPurchase(): Promise<boolean> {
  console.log('\n=== Testing eSIM Purchase (Demo) ===');

  const provider = new AiraloProvider(airaloConfig);

  try {
    // First, get a valid package ID
    console.log('Fetching packages to get a valid package ID...');
    const packagesResponse = await provider.getPackages();

    if (packagesResponse.data.length === 0 || packagesResponse.data[0].operators.length === 0) {
      console.log('❌ No packages available for testing');
      return false;
    }

    // Find a cheap package for testing (e.g., a 1GB package)
    let testPackageId: string | null = null;
    let testPackageInfo = '';

    for (const country of packagesResponse.data) {
      for (const operator of country.operators) {
        for (const pkg of operator.packages) {
          // Look for a small, cheap package
          if (pkg.prices.net_price.USD <= 5) {
            testPackageId = pkg.id;
            testPackageInfo = `${country.title} - ${pkg.title} ($${pkg.prices.net_price.USD})`;
            break;
          }
        }
        if (testPackageId) break;
      }
      if (testPackageId) break;
    }

    if (!testPackageId) {
      // Use the first available package
      const firstCountry = packagesResponse.data[0];
      const firstOp = firstCountry.operators[0];
      const firstPkg = firstOp.packages[0];
      testPackageId = firstPkg.id;
      testPackageInfo = `${firstCountry.title} - ${firstPkg.title} ($${firstPkg.prices.net_price.USD})`;
    }

    console.log(`Using package: ${testPackageInfo}`);
    console.log(`Package ID: ${testPackageId}`);

    // Test purchase
    console.log('\nAttempting purchase...');
    const result = await provider.purchase({
      providerSku: testPackageId,
      quantity: 1,
      customerEmail: 'test@numnaroad.com',
      correlationId: `test-${Date.now()}`,
    });

    if (result.success === true) {
      console.log('✅ Purchase successful!');
      console.log(`   Provider Order ID: ${result.providerOrderId}`);
      console.log(`   ICCID: ${result.iccid}`);
      console.log(`   QR Code URL: ${result.qrCodeUrl}`);
      console.log(`   Activation Code: ${result.activationCode}`);
      if (result.directAppleInstallationUrl) {
        console.log(`   Apple Install URL: ${result.directAppleInstallationUrl}`);
      }
      return true;
    } else if (result.success === false) {
      console.log('❌ Purchase failed');
      console.log(`   Error Type: ${result.errorType}`);
      console.log(`   Error Message: ${result.errorMessage}`);
      console.log(`   Retryable: ${result.isRetryable}`);
      return false;
    } else {
      console.log('⏳ Manual fulfillment pending');
      return false;
    }
  } catch (error) {
    console.error('❌ Purchase error:', error);
    return false;
  }
}

async function main() {
  console.log('=================================');
  console.log('   Airalo API Test Script');
  console.log('=================================');

  // Check environment variables
  const apiKey = process.env.AIRALO_API_KEY;
  const apiSecret = process.env.AIRALO_API_SECRET_KEY;

  if (!apiKey || !apiSecret) {
    console.error('\n❌ Missing environment variables:');
    if (!apiKey) console.error('   - AIRALO_API_KEY');
    if (!apiSecret) console.error('   - AIRALO_API_SECRET_KEY');
    console.log('\nPlease set these variables and try again.');
    process.exit(1);
  }

  console.log('\n✅ Environment variables found');
  console.log(`   API Key: ${apiKey.substring(0, 8)}...`);

  const command = process.argv[2] || 'all';

  let success = true;

  switch (command) {
    case 'health':
      success = await testHealthCheck();
      break;
    case 'packages':
      success = await testFetchPackages();
      break;
    case 'purchase':
      success = await testPurchase();
      break;
    case 'all':
    default:
      console.log('\nRunning all tests...');

      const healthOk = await testHealthCheck();
      if (!healthOk) {
        console.log('\n❌ Health check failed, skipping remaining tests');
        process.exit(1);
      }

      const packagesOk = await testFetchPackages();
      if (!packagesOk) {
        console.log('\n❌ Fetch packages failed, skipping purchase test');
        process.exit(1);
      }

      const purchaseOk = await testPurchase();
      success = healthOk && packagesOk && purchaseOk;
      break;
  }

  console.log('\n=================================');
  if (success) {
    console.log('   ✅ All tests passed!');
  } else {
    console.log('   ❌ Some tests failed');
  }
  console.log('=================================\n');

  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
