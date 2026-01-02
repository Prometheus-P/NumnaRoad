/**
 * Admin API: Sync Airalo Products from CSV data
 *
 * POST /api/admin/sync-products
 * Body: { products: CsvRow[] }
 *
 * Requires INTERNAL_API_KEY authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminPocketBase } from '@/lib/pocketbase';
import { logger } from '@/lib/logger';

// 국가명 -> 국가코드 매핑
const countryCodeMap: Record<string, string> = {
  'United States': 'US',
  'France': 'FR',
  'China': 'CN',
  'Spain': 'ES',
  'Italy': 'IT',
  'Germany': 'DE',
  'United Kingdom': 'GB',
  'Japan': 'JP',
  'South Korea': 'KR',
  'Thailand': 'TH',
  'Vietnam': 'VN',
  'Singapore': 'SG',
  'Malaysia': 'MY',
  'Indonesia': 'ID',
  'Philippines': 'PH',
  'Australia': 'AU',
  'New Zealand': 'NZ',
  'Canada': 'CA',
  'Mexico': 'MX',
  'Brazil': 'BR',
  'India': 'IN',
  'Taiwan': 'TW',
  'Hong Kong': 'HK',
  'Macau': 'MO',
  'Turkey': 'TR',
  'Greece': 'GR',
  'Portugal': 'PT',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Switzerland': 'CH',
  'Austria': 'AT',
  'Czech Republic': 'CZ',
  'Poland': 'PL',
  'Hungary': 'HU',
  'Croatia': 'HR',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Ireland': 'IE',
  'UAE': 'AE',
  'United Arab Emirates': 'AE',
  'Saudi Arabia': 'SA',
  'Qatar': 'QA',
  'Egypt': 'EG',
  'South Africa': 'ZA',
  'Morocco': 'MA',
  'Russia': 'RU',
  'Ukraine': 'UA',
  'Israel': 'IL',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Peru': 'PE',
  'Europe': 'EU',
  'Asia': 'AS',
  'Global': 'GL',
};

interface CsvRow {
  countryRegion: string;
  packageId: string;
  type: 'sim' | 'topup';
  netPrice: number;
  retailPrice: number;
  data: string;
  sms: number;
  voice: number;
  networks: string;
}

function extractDuration(packageId: string): number {
  const match = packageId.match(/(\d+)days?/i);
  return match ? parseInt(match[1], 10) : 30;
}

function extractSpeed(networks: string): string {
  if (networks.includes('5G')) return '5G';
  if (networks.includes('LTE') || networks.includes('4G')) return '4G LTE';
  return '4G';
}

function generateFeatures(row: CsvRow, networks: string): string[] {
  const features: string[] = [];

  if (row.data === 'Unlimited') {
    features.push('무제한 데이터');
  } else {
    features.push(`${row.data} 데이터`);
  }

  features.push(networks.includes('5G') ? '5G 속도' : '4G LTE 속도');

  if (row.sms > 0) features.push(`SMS ${row.sms}건`);
  if (row.voice > 0) features.push(`통화 ${row.voice}분`);

  const duration = extractDuration(row.packageId);
  features.push(`${duration}일 사용`);

  return features;
}

export async function POST(request: NextRequest) {
  // Check authorization - fail closed if INTERNAL_API_KEY not configured
  const authHeader = request.headers.get('authorization');
  const internalApiKey = process.env.INTERNAL_API_KEY;

  if (!internalApiKey) {
    logger.error('internal_api_key_not_configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${internalApiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { products } = body as { products: CsvRow[] };

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: 'Missing products array in request body' },
        { status: 400 }
      );
    }

    // Filter to only SIM packages (skip topups)
    const simProducts = products.filter(p => p.type === 'sim');

    const pb = await getAdminPocketBase();

    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of simProducts) {
      try {
        const countryCode = countryCodeMap[row.countryRegion] || 'XX';
        const duration = extractDuration(row.packageId);
        const speed = extractSpeed(row.networks);
        const marginPercent = row.retailPrice > 0
          ? Math.round(((row.retailPrice - row.netPrice) / row.retailPrice) * 100 * 100) / 100
          : 0;
        const retailPriceKrw = Math.round(row.retailPrice * 1300);
        const dataLabel = row.data === 'Unlimited' ? '무제한' : row.data;
        const name = `${row.countryRegion} ${duration}일 ${dataLabel}`;

        const productData = {
          name,
          slug: row.packageId,
          product_type: 'esim',
          country: countryCode,
          country_name: row.countryRegion,
          region: '',
          duration,
          data_limit: row.data,
          speed,
          provider: 'Airalo',
          provider_product_id: row.packageId,
          wholesale_price: row.netPrice,
          retail_price: retailPriceKrw,
          margin_percent: marginPercent,
          stock: 999,
          is_active: true,
          is_featured: false,
          description: `<p>${row.countryRegion}에서 사용 가능한 ${duration}일 ${dataLabel} eSIM</p>`,
          features: generateFeatures(row, row.networks),
          sort_order: 0,
        };

        // Check if exists
        const existing = await pb.collection('esim_products').getList(1, 1, {
          filter: `slug = "${row.packageId}"`,
        });

        if (existing.items.length > 0) {
          await pb.collection('esim_products').update(existing.items[0].id, productData);
          updated++;
        } else {
          await pb.collection('esim_products').create(productData);
          created++;
        }
      } catch (error) {
        failed++;
        errors.push(`${row.packageId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: simProducts.length,
        created,
        updated,
        failed,
      },
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
