/**
 * Airalo 상품 CSV를 PocketBase에 동기화하는 스크립트
 *
 * Usage: npx ts-node scripts/sync-airalo-products.ts [csv-file-path]
 */

import fs from 'fs';
import path from 'path';
import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090');

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
  // Regional packages
  'Europe': 'EU',
  'Asia': 'AS',
  'Global': 'GL',
  'North America': 'NA',
  'South America': 'SA',
  'Africa': 'AF',
  'Middle East': 'ME',
  'Oceania': 'OC',
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

interface ProductData {
  name: string;
  slug: string;
  product_type: 'esim';
  country: string;
  country_name: string;
  region: string;
  duration: number;
  data_limit: string;
  speed: string;
  provider: 'Airalo';
  provider_product_id: string;
  wholesale_price: number;
  retail_price: number;
  margin_percent: number;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  description: string;
  features: string[];
  sort_order: number;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

function extractDuration(packageId: string): number {
  // Extract days from package ID like "change-in-7days-1gb" or "elan-30days-5gb"
  const match = packageId.match(/(\d+)days?/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 30; // Default to 30 days
}

function extractSpeed(networks: string): string {
  if (networks.includes('5G')) return '5G';
  if (networks.includes('LTE') || networks.includes('4G')) return '4G LTE';
  return '4G';
}

function generateFeatures(row: CsvRow, networks: string): string[] {
  const features: string[] = [];

  // Data feature
  if (row.data === 'Unlimited') {
    features.push('무제한 데이터');
  } else {
    features.push(`${row.data} 데이터`);
  }

  // Speed feature
  if (networks.includes('5G')) {
    features.push('5G 속도');
  } else {
    features.push('4G LTE 속도');
  }

  // SMS/Voice features
  if (row.sms > 0) {
    features.push(`SMS ${row.sms}건`);
  }
  if (row.voice > 0) {
    features.push(`통화 ${row.voice}분`);
  }

  // Duration feature
  const duration = extractDuration(row.packageId);
  features.push(`${duration}일 사용`);

  // Network feature
  const networkList = networks.split(',').map(n => n.trim().replace(/\s*\[.*?\]/g, ''));
  if (networkList.length > 0) {
    features.push(networkList.slice(0, 2).join(', ') + ' 네트워크');
  }

  return features;
}

function transformRowToProduct(row: CsvRow, index: number): ProductData | null {
  // Skip topup packages for now (only sync SIM packages)
  if (row.type === 'topup') {
    return null;
  }

  const countryCode = countryCodeMap[row.countryRegion] || 'XX';
  const duration = extractDuration(row.packageId);
  const speed = extractSpeed(row.networks);

  // Calculate margin percent
  const marginPercent = row.retailPrice > 0
    ? Math.round(((row.retailPrice - row.netPrice) / row.retailPrice) * 100 * 100) / 100
    : 0;

  // Convert retail price to KRW (approximate: 1 USD = 1300 KRW)
  const retailPriceKrw = Math.round(row.retailPrice * 1300);

  // Generate name
  const dataLabel = row.data === 'Unlimited' ? '무제한' : row.data;
  const name = `${row.countryRegion} ${duration}일 ${dataLabel}`;

  return {
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
    description: `<p>${row.countryRegion}에서 사용 가능한 ${duration}일 ${dataLabel} eSIM</p><p>네트워크: ${row.networks}</p>`,
    features: generateFeatures(row, row.networks),
    sort_order: index,
  };
}

async function syncProducts(csvPath: string) {
  console.log('🚀 Airalo 상품 동기화 시작\n');

  // Read CSV file
  const absolutePath = path.resolve(csvPath);
  console.log(`📂 CSV 파일: ${absolutePath}\n`);

  if (!fs.existsSync(absolutePath)) {
    console.error('❌ 파일을 찾을 수 없습니다:', absolutePath);
    process.exit(1);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // Skip header
  const dataLines = lines.slice(1);
  console.log(`📊 총 ${dataLines.length}개 행 발견\n`);

  // Parse CSV rows
  const rows: CsvRow[] = dataLines.map(line => {
    const cols = parseCsvLine(line);
    return {
      countryRegion: cols[0]?.replace(/"/g, '') || '',
      packageId: cols[1]?.replace(/"/g, '') || '',
      type: (cols[2]?.replace(/"/g, '') || 'sim') as 'sim' | 'topup',
      netPrice: parseFloat(cols[3]?.replace(/"/g, '') || '0'),
      retailPrice: parseFloat(cols[4]?.replace(/"/g, '') || '0'),
      data: cols[5]?.replace(/"/g, '') || '',
      sms: parseInt(cols[6]?.replace(/"/g, '') || '0', 10),
      voice: parseInt(cols[7]?.replace(/"/g, '') || '0', 10),
      networks: cols[8]?.replace(/"/g, '') || '',
    };
  });

  // Transform to products (skip topups)
  const products = rows
    .map((row, index) => transformRowToProduct(row, index))
    .filter((p): p is ProductData => p !== null);

  console.log(`📦 SIM 패키지: ${products.length}개 (topup 제외)\n`);

  // Authenticate with PocketBase
  if (process.env.POCKETBASE_ADMIN_EMAIL && process.env.POCKETBASE_ADMIN_PASSWORD) {
    console.log('🔐 PocketBase 인증 중...');
    try {
      await pb.collection('_superusers').authWithPassword(
        process.env.POCKETBASE_ADMIN_EMAIL,
        process.env.POCKETBASE_ADMIN_PASSWORD
      );
      console.log('✓ 인증 성공\n');
    } catch (error) {
      console.error('❌ 인증 실패:', error);
      process.exit(1);
    }
  } else {
    console.log('⚠️  인증 정보 없음 - 환경변수 설정 필요\n');
    console.log('   POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD\n');
  }

  // Sync products (upsert)
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const product of products) {
    try {
      // Check if product exists
      const existing = await pb.collection('esim_products').getList(1, 1, {
        filter: `slug = "${product.slug}"`,
      });

      if (existing.items.length > 0) {
        // Update existing
        await pb.collection('esim_products').update(existing.items[0].id, product);
        updated++;
        process.stdout.write(`\r⏳ 진행: ${created + updated + failed}/${products.length} (생성: ${created}, 업데이트: ${updated}, 실패: ${failed})`);
      } else {
        // Create new
        await pb.collection('esim_products').create(product);
        created++;
        process.stdout.write(`\r⏳ 진행: ${created + updated + failed}/${products.length} (생성: ${created}, 업데이트: ${updated}, 실패: ${failed})`);
      }
    } catch (error) {
      failed++;
      console.error(`\n❌ 실패 (${product.slug}):`, error instanceof Error ? error.message : error);
    }
  }

  console.log('\n\n✅ 동기화 완료!');
  console.log(`   생성: ${created}`);
  console.log(`   업데이트: ${updated}`);
  console.log(`   실패: ${failed}`);
  console.log(`   총: ${products.length}`);
}

// Get CSV path from command line or use default
const csvPath = process.argv[2] || './report_api_with_net_prices_2025-12-27 01_01.csv';
syncProducts(csvPath);
