#!/usr/bin/env node
/**
 * SmartStore Connection Test Script
 *
 * Tests OAuth token generation and order query API.
 *
 * Required environment variables:
 * - NAVER_COMMERCE_APP_ID
 * - NAVER_COMMERCE_APP_SECRET
 */

const bcrypt = require("bcryptjs");

// Validate required environment variables
const REQUIRED_ENV = ['NAVER_COMMERCE_APP_ID', 'NAVER_COMMERCE_APP_SECRET'];
const missing = REQUIRED_ENV.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('[FATAL] Missing required environment variables:');
  missing.forEach(key => console.error(`  - ${key}`));
  console.error('\nUsage: NAVER_COMMERCE_APP_ID=xxx NAVER_COMMERCE_APP_SECRET=xxx node test-smartstore-connection.js');
  process.exit(1);
}

const APP_ID = process.env.NAVER_COMMERCE_APP_ID;
const APP_SECRET = process.env.NAVER_COMMERCE_APP_SECRET;

async function testConnection() {
  console.log("=== SmartStore 연결 테스트 ===\n");

  console.log("1. OAuth 토큰 발급...");
  const timestamp = Date.now().toString();
  const hashed = bcrypt.hashSync(APP_ID + "_" + timestamp, APP_SECRET);
  const signature = Buffer.from(hashed).toString("base64");

  const tokenRes = await fetch("https://api.commerce.naver.com/external/v1/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: APP_ID,
      timestamp,
      client_secret_sign: signature,
      grant_type: "client_credentials",
      type: "SELF",
    }).toString(),
  });

  if (!tokenRes.ok) {
    console.log("   ❌ 토큰 발급 실패:", await tokenRes.text());
    return;
  }

  const tokenData = await tokenRes.json();
  console.log("   ✅ 토큰 발급 성공");
  console.log("   - 만료:", new Date(Date.now() + tokenData.expires_in * 1000).toISOString());

  const token = tokenData.access_token;

  console.log("\n2. 주문 조회 API 테스트...");
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const to = new Date().toISOString();

  const ordersRes = await fetch(
    "https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/last-changed-statuses?lastChangedFrom=" + encodeURIComponent(from) + "&lastChangedTo=" + encodeURIComponent(to),
    { headers: { "Authorization": "Bearer " + token } }
  );

  if (!ordersRes.ok) {
    console.log("   ❌ 주문 조회 실패:", await ordersRes.text());
    return;
  }

  const ordersData = await ordersRes.json();
  const orders = ordersData.data?.lastChangeStatuses || [];
  console.log("   ✅ 주문 조회 성공");
  console.log("   - 최근 24시간 주문:", orders.length, "건");

  console.log("\n=== 테스트 완료 ===");
  console.log("SmartStore API 연결: ✅ 정상");
}

testConnection().catch(e => console.error("Error:", e.message));
