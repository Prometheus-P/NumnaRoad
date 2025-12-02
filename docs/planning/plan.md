---
title: NumnaRoad - TDD Development Plan
version: 1.0.0
status: Active
owner: @Prometheus-P
created: 2024-12-01
updated: 2024-12-01
---

# plan.md

> **TDD-Based Development Task List**
>
> 이 문서는 NumnaRoad 프로젝트의 개발 태스크를 TDD (Test-Driven Development) 사이클로 관리합니다.
> 각 태스크는 Red → Green → Refactor 순서로 진행됩니다.

## 📊 전체 진행 상황

```
Phase 1: MVP Development (6주)
  ████████░░░░░░░░░░░░░░░░ 30% 완료

  Week 1-2: Backend Setup        [██████████] 100%
  Week 3-4: Frontend Development [████░░░░░░]  40%
  Week 5-6: Integration & Test   [░░░░░░░░░░]   0%
```

**마지막 업데이트**: 2024-12-01
**현재 스프린트**: Sprint 1 (Backend Foundation)
**다음 스프린트**: Sprint 2 (Frontend Core)

---

## 🎯 Sprint 1: Backend Foundation (Week 1-2)

**목표**: PocketBase 설정 및 핵심 Collections 생성
**기간**: 2024-12-01 ~ 2024-12-14

### Task 1.1: PocketBase 로컬 환경 설정

**Status**: ✅ DONE
**Owner**: @Prometheus-P
**Priority**: P0 (Critical)

#### RED (실패하는 테스트)
```bash
# 테스트: PocketBase가 정상적으로 실행되는가?
curl http://localhost:8090/api/health
# Expected: {"status": "ok"}
# Actual: Connection refused (아직 설치 안됨)
```

#### GREEN (최소 구현)
```bash
# 1. PocketBase 다운로드
cd pocketbase
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_linux_amd64.zip
unzip pocketbase_0.22.0_linux_amd64.zip
chmod +x pocketbase

# 2. 실행
./pocketbase serve

# 3. 테스트
curl http://localhost:8090/api/health
# Actual: {"status": "ok"} ✅
```

#### REFACTOR
- ✅ `.gitignore`에 `pb_data/` 추가
- ✅ `README.md`에 설치 가이드 추가

---

### Task 1.2: esim_products Collection 생성

**Status**: 🔄 IN PROGRESS
**Owner**: @Prometheus-P
**Priority**: P0 (Critical)
**Depends on**: Task 1.1

#### RED (실패하는 테스트)
```bash
# 테스트: esim_products Collection이 존재하는가?
curl http://localhost:8090/api/collections/esim_products/records
# Expected: {"items": [], ...}
# Actual: 404 Not Found (Collection 없음)
```

#### GREEN (최소 구현)
**작업 절차**:
1. PocketBase Admin UI 접속 (http://localhost:8090/_/)
2. Admin 계정 생성
3. Collections → New Collection
4. Schema 정의 (아래 참조)

**Schema**:
```typescript
Collection: esim_products
Type: Base

Fields:
- name (text, required) - 상품명 (예: "일본 7일 무제한")
- slug (text, unique, required) - URL 슬러그 (예: "japan-7day-unlimited")
- country (text, required) - 국가 코드 (예: "JP")
- country_name (text, required) - 국가 이름 (예: "일본")
- duration (number, required) - 일 단위 (예: 7)
- data_limit (text, required) - 데이터 제한 (예: "무제한", "10GB")
- speed (text) - 속도 (예: "4G LTE")
- provider (select, required) - 공급사 (eSIM Card, MobiMatter, Airalo)
- provider_product_id (text, required) - 공급사 상품 ID
- wholesale_price (number, required) - 도매가 (USD)
- retail_price (number, required) - 판매가 (KRW)
- margin_percent (number) - 마진율 (자동 계산)
- stock (number, default: 0) - 재고 수량
- is_active (bool, default: true) - 판매 활성화
- is_featured (bool, default: false) - 추천 상품
- image (file, max: 1) - 상품 이미지
- description (editor) - 상세 설명 (HTML)
- features (json) - 특징 목록 (배열)
- installation_guide (editor) - 설치 가이드 (HTML)
- sort_order (number, default: 0) - 정렬 순서
```

**API Rules**:
```javascript
{
  "listRule": "",  // 누구나 조회 가능
  "viewRule": "",
  "createRule": "@request.auth.role = 'admin'",
  "updateRule": "@request.auth.role = 'admin'",
  "deleteRule": "@request.auth.role = 'admin'"
}
```

**Indexes**:
- `country` (조회 성능)
- `is_active` (활성 상품 필터)
- `slug` (unique 검증)

#### REFACTOR
- [ ] Validation 규칙 추가 (slug 패턴, price 양수 등)
- [ ] margin_percent 자동 계산 Hook 추가
- [ ] 샘플 데이터 10개 생성 (scripts/seed-products.ts)

---

### Task 1.3: orders Collection 생성

**Status**: 📋 TODO
**Owner**: @Prometheus-P
**Priority**: P0 (Critical)
**Depends on**: Task 1.2

#### RED (실패하는 테스트)
```bash
# 테스트: orders Collection이 존재하고 관계 설정이 올바른가?
curl http://localhost:8090/api/collections/orders/records?expand=product
# Expected: {"items": [], ...}
# Actual: 404 Not Found
```

#### GREEN (최소 구현)
**Schema**:
```typescript
Collection: orders
Type: Base

Fields:
- order_id (text, unique, required) - UUID
- user (relation, users, optional) - 사용자 (게스트 허용)
- product (relation, esim_products, required) - 상품
- status (select, required) - 주문 상태
  * pending (대기)
  * processing (처리 중)
  * completed (완료)
  * failed (실패)
  * refunded (환불)
- payment_status (select, required) - 결제 상태
  * pending
  * paid
  * failed
  * refunded
- payment_method (select, required) - 결제 수단
  * card
  * paypal
  * bank_transfer
- payment_id (text) - Stripe payment_intent_id
- amount (number, required) - 결제 금액 (KRW)
- currency (text, default: "KRW")
- esim_qr_code (file, max: 1) - QR 코드 이미지
- esim_qr_code_url (url) - QR 코드 URL (외부)
- esim_activation_code (text) - LPA 활성화 코드
- esim_iccid (text) - eSIM ICCID
- esim_provider_order_id (text) - 공급사 주문 ID
- customer_email (email, required)
- customer_name (text)
- customer_phone (text)
- delivered_at (date) - 발급 완료 시간
- email_sent_at (date) - 이메일 발송 시간
- error_message (text) - 실패 시 에러
- retry_count (number, default: 0) - 재시도 횟수
```

**API Rules**:
```javascript
{
  "listRule": "@request.auth.id = user.id || @request.auth.role = 'admin'",
  "viewRule": "@request.auth.id = user.id || @request.auth.role = 'admin'",
  "createRule": "@request.auth.id != ''",
  "updateRule": "@request.auth.role = 'admin'",
  "deleteRule": null  // 삭제 불가
}
```

#### REFACTOR
- [ ] order_id 자동 생성 Hook (UUID v4)
- [ ] status 변경 시 타임스탬프 자동 업데이트
- [ ] payment_status = paid 시 n8n Webhook 트리거

---

### Task 1.4: PocketBase Webhook 구현 (orders.pb.js)

**Status**: 📋 TODO
**Owner**: @Prometheus-P
**Priority**: P0 (Critical)
**Depends on**: Task 1.3

#### RED (실패하는 테스트)
```javascript
// 테스트: 주문 생성 시 n8n이 호출되는가?
const mockN8nServer = setupMockServer(5678);

// 주문 생성
const order = await pb.collection('orders').create({
  order_id: '550e8400-e29b-41d4-a716-446655440000',
  product: 'PRODUCT_ID',
  payment_status: 'paid',
  customer_email: 'test@example.com',
  amount: 12000
});

// n8n 호출 확인
expect(mockN8nServer.calls).toHaveLength(1);
expect(mockN8nServer.calls[0].body.order_id).toBe(order.order_id);

// Actual: mockN8nServer.calls.length = 0 (Hook 없음)
```

#### GREEN (최소 구현)
```javascript
// pocketbase/pb_hooks/orders.pb.js
onRecordAfterCreateRequest((e) => {
  const order = e.record;

  if (order.get('payment_status') !== 'paid') {
    return;
  }

  try {
    const n8nUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678';

    $http.send({
      url: `${n8nUrl}/webhook/order-paid`,
      method: 'POST',
      body: JSON.stringify({
        order_id: order.get('order_id'),
        product_id: order.get('product'),
        customer_email: order.get('customer_email'),
        amount: order.get('amount'),
      }),
      headers: { 'content-type': 'application/json' },
      timeout: 120,
    });

    $app.logger().info('n8n triggered', 'order_id', order.get('order_id'));
  } catch (error) {
    $app.logger().error('n8n trigger failed', 'error', error.message);
  }
}, 'orders');
```

#### REFACTOR
- [ ] 환경 변수 `.env`로 분리
- [ ] 재시도 로직 추가 (exponential backoff)
- [ ] automation_logs Collection에 실행 기록

---

## 🎯 Sprint 2: Frontend Core (Week 3-4)

**목표**: Next.js 웹 앱 기본 구조 및 상품 페이지
**기간**: 2024-12-15 ~ 2024-12-28

### Task 2.1: Next.js 프로젝트 초기화

**Status**: 📋 TODO
**Priority**: P0 (Critical)

#### RED
```bash
# 테스트: Next.js 개발 서버가 실행되는가?
cd apps/web
npm run dev
# Expected: Server running on http://localhost:3000
# Actual: 프로젝트 없음
```

#### GREEN
```bash
cd apps/web
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --src-dir=false \
  --import-alias="@/*"

npm install pocketbase @tanstack/react-query zod
npm install -D @types/node
```

#### REFACTOR
- [ ] `tsconfig.json` 경로 별칭 설정
- [ ] TailwindCSS 커스텀 테마 설정
- [ ] `app/layout.tsx`에 React Query Provider 추가

---

### Task 2.2: PocketBase SDK 통합

**Status**: 📋 TODO
**Priority**: P0 (Critical)
**Depends on**: Task 2.1

#### RED
```typescript
// 테스트: PocketBase 클라이언트로 상품을 가져올 수 있는가?
import { getPocketBase } from '@/lib/pocketbase';

const pb = getPocketBase();
const products = await pb.collection('esim_products').getList(1, 10);

expect(products.items).toBeInstanceOf(Array);
// Actual: ReferenceError: getPocketBase is not defined
```

#### GREEN
```typescript
// apps/web/lib/pocketbase.ts
import PocketBase from 'pocketbase';

const PB_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090';

let pbInstance: PocketBase | null = null;

export function getPocketBase(): PocketBase {
  if (!pbInstance) {
    pbInstance = new PocketBase(PB_URL);
    pbInstance.autoCancellation(false);
  }
  return pbInstance;
}

export const pb = getPocketBase();
```

```typescript
// apps/web/lib/types/product.ts
export interface Product {
  id: string;
  name: string;
  slug: string;
  country: string;
  country_name: string;
  duration: number;
  data_limit: string;
  retail_price: number;
  image?: string;
  is_active: boolean;
  created: string;
  updated: string;
}
```

#### REFACTOR
- [ ] TypeScript 타입 생성 자동화 (pocketbase-typegen)
- [ ] React Query 래퍼 함수 작성
- [ ] 에러 바운더리 추가

---

### Task 2.3: 상품 목록 페이지 (/products)

**Status**: 📋 TODO
**Priority**: P1 (High)
**Depends on**: Task 2.2

#### RED
```typescript
// 테스트: 상품 목록이 렌더링되는가?
import { render, screen } from '@testing-library/react';
import ProductsPage from '@/app/products/page';

render(<ProductsPage />);

const heading = screen.getByRole('heading', { name: /eSIM 상품 목록/i });
expect(heading).toBeInTheDocument();

const productCards = screen.getAllByTestId('product-card');
expect(productCards.length).toBeGreaterThan(0);

// Actual: ProductsPage is not defined
```

#### GREEN
```typescript
// apps/web/app/products/page.tsx
import { pb } from '@/lib/pocketbase';
import { Product } from '@/lib/types/product';

export default async function ProductsPage() {
  const products = await pb.collection('esim_products').getList<Product>(1, 20, {
    filter: 'is_active = true',
    sort: '-is_featured,sort_order',
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">eSIM 상품 목록</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.items.map((product) => (
          <div key={product.id} data-testid="product-card" className="border rounded-lg p-4">
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <p className="text-gray-600">{product.country_name}</p>
            <p className="text-lg font-bold mt-2">{product.retail_price.toLocaleString()}원</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### REFACTOR
- [ ] ProductCard 컴포넌트로 분리
- [ ] 이미지 최적화 (Next.js Image)
- [ ] 로딩 스켈레톤 추가
- [ ] 국가별 필터 UI 추가
- [ ] 페이지네이션 구현

---

## 🎯 Sprint 3: Payment Integration (Week 5)

**목표**: Stripe 결제 통합 및 자동화
**기간**: 2024-12-29 ~ 2025-01-04

### Task 3.1: Stripe Checkout 통합

**Status**: 📋 TODO
**Priority**: P0 (Critical)

#### RED
```typescript
// 테스트: Stripe Checkout Session이 생성되는가?
const response = await fetch('/api/checkout/create-session', {
  method: 'POST',
  body: JSON.stringify({
    productId: 'PRODUCT_ID',
    email: 'customer@example.com',
  }),
});

const data = await response.json();
expect(data.sessionId).toBeDefined();
expect(data.url).toContain('checkout.stripe.com');

// Actual: 404 Not Found
```

#### GREEN
```typescript
// apps/web/app/api/checkout/create-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { pb } from '@/lib/pocketbase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const { productId, email } = await req.json();

  // 상품 조회
  const product = await pb.collection('esim_products').getOne(productId);

  // Checkout Session 생성
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'krw',
          product_data: {
            name: product.name,
            description: `${product.country_name} ${product.duration}일 ${product.data_limit}`,
          },
          unit_amount: product.retail_price,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/products/${product.slug}`,
    customer_email: email,
    metadata: {
      product_id: productId,
    },
  });

  return NextResponse.json({ sessionId: session.id, url: session.url });
}
```

#### REFACTOR
- [ ] Zod 스키마로 입력 검증
- [ ] 에러 핸들링 강화
- [ ] 로깅 추가

---

## 📈 진행 상황 추적

### 완료된 태스크
- ✅ Task 1.1: PocketBase 로컬 환경 설정

### 진행 중 태스크
- 🔄 Task 1.2: esim_products Collection 생성

### 대기 중 태스크
- 📋 Task 1.3: orders Collection 생성
- 📋 Task 1.4: PocketBase Webhook 구현
- 📋 Task 2.1: Next.js 프로젝트 초기화
- 📋 Task 2.2: PocketBase SDK 통합
- 📋 Task 2.3: 상품 목록 페이지
- 📋 Task 3.1: Stripe Checkout 통합

---

## 🚫 블로커 (Blockers)

현재 블로커 없음

---

## 📝 다음 액션 (Next Actions)

1. **지금 당장**: Task 1.2 완료 (esim_products Collection 생성)
2. **오늘 내**: Task 1.3 시작 (orders Collection)
3. **이번 주**: Task 1.4 완료 (Webhook 구현)

---

## 🎯 Definition of Done (DoD)

각 태스크는 다음 조건을 모두 만족해야 완료로 간주:

- [ ] RED: 실패하는 테스트 작성 및 실행 확인
- [ ] GREEN: 테스트 통과하는 최소 코드 구현
- [ ] REFACTOR: 코드 품질 개선 (중복 제거, 명확한 이름, 단순화)
- [ ] 코드 리뷰 완료 (자가 검토 또는 peer review)
- [ ] 문서 업데이트 (README, API_SPEC 등)
- [ ] Git 커밋 (Conventional Commits)
- [ ] plan.md 상태 업데이트

---

**마지막 업데이트**: 2024-12-01 16:15 KST
**다음 업데이트 예정**: Task 1.2 완료 시
