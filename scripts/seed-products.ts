/**
 * PocketBase 샘플 데이터 생성 스크립트
 * Usage: npm run seed
 */

import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://127.0.0.1:8090');

// 샘플 상품 데이터
const sampleProducts = [
  {
    name: '일본 7일 무제한',
    slug: 'japan-7day-unlimited',
    country: 'JP',
    country_name: '일본',
    duration: 7,
    data_limit: '무제한',
    speed: '4G LTE',
    provider: 'eSIM Card',
    provider_product_id: 'jp-7day-unlimited',
    wholesale_price: 8,
    retail_price: 12000,
    margin_percent: 33.33,
    stock: 100,
    is_active: true,
    is_featured: true,
    description: '<p>일본 전역에서 사용 가능한 7일 무제한 데이터 eSIM</p>',
    features: ['무제한 데이터', '4G LTE 속도', '즉시 활성화', '테더링 가능'],
    sort_order: 1,
  },
  {
    name: '태국 15일 10GB',
    slug: 'thailand-15day-10gb',
    country: 'TH',
    country_name: '태국',
    duration: 15,
    data_limit: '10GB',
    speed: '4G LTE',
    provider: 'MobiMatter',
    provider_product_id: 'th-15day-10gb',
    wholesale_price: 12,
    retail_price: 18000,
    margin_percent: 33.33,
    stock: 50,
    is_active: true,
    is_featured: true,
    description: '<p>태국 여행에 최적화된 15일 10GB 데이터 플랜</p>',
    features: ['10GB 데이터', '4G LTE 속도', '15일 사용', '인기 상품'],
    sort_order: 2,
  },
  {
    name: '유럽 30일 20GB',
    slug: 'europe-30day-20gb',
    country: 'EU',
    country_name: '유럽',
    region: 'Europe',
    duration: 30,
    data_limit: '20GB',
    speed: '4G LTE',
    provider: 'Airalo',
    provider_product_id: 'eu-30day-20gb',
    wholesale_price: 25,
    retail_price: 35000,
    margin_percent: 28.57,
    stock: 80,
    is_active: true,
    is_featured: true,
    description: '<p>유럽 33개국에서 사용 가능한 30일 20GB 플랜</p>',
    features: ['20GB 데이터', '33개국 커버리지', '30일 사용', '4G LTE'],
    sort_order: 3,
  },
  {
    name: '미국 10일 15GB',
    slug: 'usa-10day-15gb',
    country: 'US',
    country_name: '미국',
    duration: 10,
    data_limit: '15GB',
    speed: '5G',
    provider: 'eSIM Card',
    provider_product_id: 'us-10day-15gb',
    wholesale_price: 18,
    retail_price: 25000,
    margin_percent: 28,
    stock: 60,
    is_active: true,
    is_featured: false,
    description: '<p>미국 전역 5G 네트워크 지원</p>',
    features: ['15GB 데이터', '5G 속도', '10일 사용', 'AT&T 네트워크'],
    sort_order: 4,
  },
  {
    name: '한국 30일 무제한',
    slug: 'korea-30day-unlimited',
    country: 'KR',
    country_name: '한국',
    duration: 30,
    data_limit: '무제한',
    speed: '5G',
    provider: 'MobiMatter',
    provider_product_id: 'kr-30day-unlimited',
    wholesale_price: 35,
    retail_price: 45000,
    margin_percent: 22.22,
    stock: 40,
    is_active: true,
    is_featured: false,
    description: '<p>한국 5G 무제한 데이터</p>',
    features: ['무제한 데이터', '5G 속도', '30일 사용', 'SKT/KT 네트워크'],
    sort_order: 5,
  },
];

async function seedProducts() {
  try {
    console.log('🌱 Starting product seeding...\n');

    // Admin 인증 (환경 변수에서)
    if (process.env.POCKETBASE_ADMIN_EMAIL && process.env.POCKETBASE_ADMIN_PASSWORD) {
      console.log('🔐 Authenticating as admin...');
      await pb.admins.authWithPassword(
        process.env.POCKETBASE_ADMIN_EMAIL,
        process.env.POCKETBASE_ADMIN_PASSWORD
      );
      console.log('✓ Authenticated\n');
    } else {
      console.log('⚠️  Running without authentication (may fail if collection requires auth)\n');
    }

    // 기존 상품 확인
    const existingProducts = await pb.collection('esim_products').getFullList();
    if (existingProducts.length > 0) {
      console.log(`⚠️  ${existingProducts.length} products already exist.`);
      console.log('   Skipping seed to avoid duplicates.\n');
      return;
    }

    // 상품 생성
    console.log(`📦 Creating ${sampleProducts.length} sample products...\n`);

    for (const product of sampleProducts) {
      try {
        const created = await pb.collection('esim_products').create(product);
        console.log(`✓ Created: ${product.name} (${created.id})`);
      } catch (error) {
        console.error(`✗ Failed to create ${product.name}:`, error);
      }
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`   ${sampleProducts.length} products created`);
    console.log(`   Visit: ${pb.baseUrl}/_/`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// 스크립트 실행
seedProducts();
