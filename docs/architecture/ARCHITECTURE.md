# 🏗️ NumnaRoad 시스템 아키텍처

---

## 📋 Document Metadata

| 항목 | 내용 |
|------|------|
| **문서 유형** | Technical Specification |
| **대상 독자** | 개발자, DevOps, 시스템 아키텍트 |
| **최종 수정** | 2025-12-28 |
| **버전** | 3.0.0 |
| **연관 문서** | [PRD.md](../planning/PRD.md), [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md), [API_DOCS.md](../api/API_DOCS.md) |
| **우선순위** | ⭐⭐⭐ (Core) |

---

## 📚 Quick Links

- 📋 **[PRD.md](./PRD.md)** - Product Requirements Document
- 🗄️ **[DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)** - DB 스키마
- 📡 **[API_DOCS.md](./docs/API_DOCS.md)** - API 문서
- 🎯 **[CONTEXT.md](./CONTEXT.md)** - 프로젝트 맥락

---

## 목차
1. [시스템 개요](#시스템-개요)
2. [아키텍처 다이어그램](#아키텍처-다이어그램)
3. [기술 스택 상세](#기술-스택-상세)
4. [자동화 워크플로우](#자동화-워크플로우)
5. [데이터 플로우](#데이터-플로우)
6. [보안 설계](#보안-설계)
7. [확장성 설계](#확장성-설계)
8. [모니터링 및 로깅](#모니터링-및-로깅)

---

## 시스템 개요

### 설계 원칙

1. **자동화 우선 (Automation First)**
   - 모든 프로세스는 인간 개입 없이 자동 실행
   - 예외 상황만 알림으로 관리자에게 통지

2. **단순성 (Simplicity)**
   - 복잡한 마이크로서비스 대신 모놀리식 구조
   - PocketBase 단일 바이너리로 백엔드 완성

3. **비용 최소화 (Cost Minimization)**
   - 월 운영비 $10 이하 목표
   - 무료 티어 최대 활용

4. **장애 대응 (Fault Tolerance)**
   - 공급사 장애 시 자동 전환
   - 결제 실패 시 자동 재시도
   - 데이터 백업 자동화

5. **확장 가능성 (Scalability)**
   - 월 100건 → 10,000건까지 아키텍처 변경 없이 확장
   - 수평 확장 가능 설계

---

## 아키텍처 다이어그램

### 전체 시스템 구조 (v3.0 - 2025.12)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           고객 (Customer)                                │
└────────┬────────────────────────────────────────────────────────┬───────┘
         │                                                        │
         ▼                                                        ▼
┌─────────────────────┐                                ┌──────────────────┐
│   Next.js 14 App    │                                │  네이버 스마트스토어  │
│   (Vercel)          │                                │  (SmartStore)     │
│   numnaroad.vercel  │                                │                   │
│   .app              │                                │                   │
└──────────┬──────────┘                                └────────┬─────────┘
           │                                                    │
           │  Stripe Webhook                                    │ (IP 화이트리스트 필요)
           │                                                    │
           ▼                                                    ▼
┌────────────────────────────────────────────┐    ┌──────────────────────────┐
│           Vercel Serverless API            │    │   Oracle Cloud VM        │
│  ┌──────────────────────────────────────┐  │    │   (161.118.129.219)      │
│  │ /api/webhooks/stripe                 │  │    │  ┌────────────────────┐  │
│  │ /api/orders/[id]/fulfill             │  │    │  │ smartstore-sync    │  │
│  │ /api/cron/retry-stuck-orders         │  │    │  │ (cron: 5분마다)     │  │
│  └──────────────────────────────────────┘  │    │  └─────────┬──────────┘  │
└────────────────────┬───────────────────────┘    └────────────┼─────────────┘
                     │                                         │
                     │                                         │ Naver Commerce API
                     │                                         │
                     ▼                                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      PocketBase Backend (Railway)                         │
│                  pocketbase-production-2413.up.railway.app               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────────────┐  │
│  │ Auth       │  │ Database   │  │ File       │  │ Collections       │  │
│  │ System     │  │ (SQLite)   │  │ Storage    │  │ - orders          │  │
│  └────────────┘  └────────────┘  └────────────┘  │ - esim_products   │  │
│                                                   │ - automation_logs │  │
│                                                   └───────────────────┘  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
          ▼                          ▼                          ▼
┌─────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│  eSIM Providers     │  │  Email Service       │  │  Notifications       │
│  (Priority Order)   │  │                      │  │                      │
│  1. Airalo (주력)   │  │  Resend              │  │  Discord Webhooks    │
│  2. eSIMCard        │  │  (re_...)            │  │  (장애 알림)          │
│  3. MobiMatter      │  │                      │  │                      │
│  4. Manual Fallback │  │                      │  │                      │
└─────────────────────┘  └──────────────────────┘  └──────────────────────┘
          │
          ▼
┌─────────────────────┐
│  Payment Gateway    │
│  - Stripe (주력)    │
│  - SmartStore 결제  │
└─────────────────────┘
```

### v2.0 → v3.0 주요 변경사항

| 항목 | v2.0 (이전) | v3.0 (현재) |
|------|------------|-------------|
| **주문 처리** | n8n Workflow | Inline Fulfillment (Vercel API) |
| **SmartStore 연동** | Vercel에서 직접 호출 | Oracle Cloud VM (고정 IP) |
| **주력 eSIM 공급사** | eSIMCard | Airalo (OAuth 2.0) |
| **이메일 서비스** | Mailgun 백업 포함 | Resend 단일 |
| **배포 플랫폼** | Railway/Vercel | Vercel + Railway + Oracle Cloud |

### 자동화 파이프라인 (v3.0 - Inline Fulfillment)

#### A. Stripe 결제 Flow (주력)

```
고객 결제 완료
   ↓
Stripe Webhook (checkout.session.completed)
   ↓
Vercel API: /api/webhooks/stripe
   ↓
├─ Webhook 서명 검증
├─ 중복 처리 방지 (payment_intent_id)
└─ Order 생성/업데이트 (status: payment_received)
   ↓
Inline Fulfillment Service 시작
   ↓
Provider Failover Loop (10초 타임아웃/공급사)
   ├─ 1순위: Airalo API 호출
   ├─ 2순위: eSIMCard API 호출
   ├─ 3순위: MobiMatter API 호출
   └─ 최종: Manual Fallback (Discord 알림)
   ↓
성공 시:
   ├─ Order 업데이트 (status: provider_confirmed)
   ├─ eSIM 정보 저장 (QR URL, ICCID, Activation Code)
   ├─ Resend로 이메일 발송
   └─ Order 완료 (status: email_sent → delivered)
   ↓
실패 시:
   ├─ status: provider_failed
   ├─ Discord 알림 발송
   └─ Cron Job이 재시도 (/api/cron/retry-stuck-orders)
```

#### B. SmartStore 주문 Flow (네이버 판매)

```
SmartStore 결제 완료
   ↓
Oracle Cloud VM (5분마다 cron 실행)
   ↓
/opt/numnaroad/sync.js 실행
   ↓
├─ Naver Commerce API 토큰 발급 (bcrypt 서명)
├─ 주문 상태 변경 조회 (PAYED 상태)
└─ 신규 주문 감지
   ↓
각 주문에 대해:
   ├─ PocketBase에 Order 생성
   └─ Vercel API 호출: /api/orders/{id}/fulfill
   ↓
(이후 Stripe Flow와 동일한 Fulfillment 처리)
```

#### C. 장애 복구 Flow

```
Cron Job: /api/cron/retry-stuck-orders (10분마다)
   ↓
stuck 상태 주문 조회:
   ├─ fulfillment_started (30분 이상 경과)
   ├─ provider_failed (재시도 횟수 < 3)
   └─ payment_received (미처리)
   ↓
각 주문에 대해 Fulfillment 재시도
```

---

## 기술 스택 상세

### Frontend

#### Next.js 14 (App Router)

**선택 이유:**
- SSR/ISR로 SEO 최적화 (구글 검색 1페이지 목표)
- API Routes로 백엔드 로직 간소화 가능
- Vercel 배포 시 자동 CI/CD

**주요 기능:**
```typescript
// app/products/[country]/page.tsx
export async function generateStaticParams() {
  // 인기 국가 미리 렌더링 (ISR)
  return [
    { country: 'japan' },
    { country: 'georgia' },
    { country: 'korea' },
  ];
}

export const revalidate = 3600; // 1시간마다 재검증
```

**디렉토리 구조:**
```
app/
├── (auth)/
│   ├── login/
│   └── register/
├── products/
│   ├── page.tsx              # 상품 목록
│   └── [country]/
│       └── page.tsx          # 국가별 상품
├── checkout/
│   └── page.tsx              # 결제 페이지
├── orders/
│   ├── page.tsx              # 주문 내역
│   └── [orderId]/
│       └── page.tsx          # 주문 상세
└── api/
    ├── webhook/
    │   └── stripe/route.ts   # Stripe Webhook
    └── health/route.ts       # 헬스체크
```

#### TailwindCSS + shadcn/ui

**장점:**
- 빠른 프로토타이핑 (디자인 시간 80% 절감)
- 반응형 디자인 자동화
- 접근성(a11y) 기본 내장

**커스터마이징:**
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6', // 파란색 (신뢰감)
        secondary: '#10B981', // 초록색 (성공)
        accent: '#F59E0B', // 주황색 (강조)
      },
    },
  },
};
```

#### React Query (TanStack Query)

**자동 재시도 설정:**
```typescript
// lib/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5분
      cacheTime: 10 * 60 * 1000, // 10분
    },
  },
});
```

---

### Backend

#### PocketBase 0.22

**선택 이유:**
- **단일 바이너리**: 설치 5분, 의존성 없음
- **내장 Admin UI**: DB 관리 GUI 무료
- **파일 저장소**: eSIM QR 코드 저장 추가 비용 없음
- **Realtime**: WebSocket 내장 (주문 상태 실시간 업데이트)
- **저비용**: 월 $5 (Railway 기본 플랜)

**배포 구조:**
```
Railway 컨테이너
├── pocketbase (실행 파일)
├── pb_data/
│   ├── data.db (SQLite)
│   ├── storage/ (파일 저장소)
│   └── logs/
├── pb_migrations/ (DB 마이그레이션)
└── pb_hooks/ (Webhook 로직)
```

**API 엔드포인트:**
```
GET  /api/collections/esim_products/records
POST /api/collections/orders/records
GET  /api/collections/orders/records/:id
PATCH /api/collections/orders/records/:id
```

**Webhook Hooks 예시:**
```javascript
// pb_hooks/orders.pb.js
onRecordAfterCreateRequest((e) => {
  const order = e.record;
  
  // 결제 완료 시에만 n8n 호출
  if (order.get('payment_status') === 'paid') {
    $http.send({
      url: 'https://n8n.yourdomain.com/webhook/order-paid',
      method: 'POST',
      body: JSON.stringify({
        order_id: order.get('order_id'),
        product_id: order.get('product'),
        customer_email: order.get('customer_email'),
        amount: order.get('amount'),
      }),
      headers: {'content-type': 'application/json'},
    });
  }
}, 'orders');
```

---

### Automation

#### n8n (자체 호스팅)

**워크플로우 구성:**

**1. Order Processing (주문 처리)**
```
Webhook Trigger
  ↓
PocketBase: Get Order Details
  ↓
HTTP Request: eSIM Card API
  ↓
IF: API Success?
  ├─ Yes: PocketBase Update Order
  │         ↓
  │       Resend: Send Email with QR
  │         ↓
  │       Slack: Success Notification
  │
  └─ No: Wait 10s → Retry (max 3x)
           ↓
         IF: Still Failed?
           ├─ Yes: Try MobiMatter API
           │         ↓
           │       IF: Still Failed?
           │         ├─ Yes: Slack Alert + Refund
           │         └─ No: Success Flow
           └─ No: Success Flow
```

**2. Inventory Sync (재고 동기화)**
```
Cron Trigger (매 1시간)
  ↓
Loop: 모든 공급사
  ├─ HTTP Request: eSIM Card API (재고 조회)
  ├─ HTTP Request: MobiMatter API (재고 조회)
  └─ HTTP Request: Airalo API (재고 조회)
  ↓
PocketBase: Batch Update Products (재고 수량)
  ↓
IF: 재고 < 10개?
  ├─ Yes: Slack Alert
  └─ No: Continue
  ↓
PocketBase: Create Sync Log
```

**3. Marketing Automation (마케팅 자동화)**
```
Cron Trigger (매일 10:00)
  ↓
PocketBase: Get Orders (created 7 days ago)
  ↓
Loop: 각 주문
  ↓
Resend: Send Survey Email
  ↓
Wait 30 days
  ↓
Resend: Send Coupon Email (10% 할인)
```

**비용:**
- n8n 오픈소스: 무료
- Railway 배포: $5/월 (PocketBase와 같은 컨테이너)

---

### Payment

#### Stripe

**Webhook 처리:**
```typescript
// app/api/webhook/stripe/route.ts
import Stripe from 'stripe';
import { pb } from '@/lib/pocketbase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')!;
  const body = await req.text();
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    // PocketBase에 주문 생성
    await pb.collection('orders').create({
      order_id: crypto.randomUUID(),
      payment_id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      payment_status: 'paid',
      status: 'pending', // n8n이 처리할 예정
      customer_email: paymentIntent.receipt_email,
      product: paymentIntent.metadata.product_id,
    });
  }
  
  return Response.json({ received: true });
}
```

**수수료:**
- 국내 카드: 3.1% + 30원
- 해외 카드: 3.6% + 30원

#### 토스페이먼츠 (선택사항)

한국 고객 대상 추가 옵션:
- 계좌이체, 가상계좌, 카카오페이 지원
- 수수료: 2.8-3.2%

---

### eSIM Providers

#### eSIM Card

**API 엔드포인트:**
```
POST https://api.esimcard.com/v1/orders
GET  https://api.esimcard.com/v1/products
GET  https://api.esimcard.com/v1/inventory
```

**주문 요청 예시:**
```typescript
const response = await fetch('https://api.esimcard.com/v1/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.ESIM_CARD_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    product_id: 'jp-7day-unlimited',
    customer_email: 'customer@example.com',
  }),
});

const data = await response.json();
// {
//   order_id: "abc123",
//   qr_code_url: "https://cdn.esimcard.com/qr/abc123.png",
//   activation_code: "LPA:1$...",
// }
```

#### MobiMatter (백업)

API 구조 유사, 대량 구매 시 할인율 높음

#### Airalo (최종 백업)

API 문서: https://www.airalo.com/partners

---

## 자동화 워크플로우

### 주문 → 발급 → 전송 (10초 완성)

```typescript
// n8n 워크플로우 JSON 구조
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "order-paid"
      }
    },
    {
      "name": "Get Order",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://pocketbase.yourdomain.com/api/collections/orders/records/{{$json.order_id}}",
        "method": "GET"
      }
    },
    {
      "name": "Issue eSIM",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.esimcard.com/v1/orders",
        "method": "POST",
        "body": {
          "product_id": "{{$json.product.provider_product_id}}",
          "customer_email": "{{$json.customer_email}}"
        }
      }
    },
    {
      "name": "Update Order",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://pocketbase.yourdomain.com/api/collections/orders/records/{{$json.order_id}}",
        "method": "PATCH",
        "body": {
          "status": "completed",
          "esim_qr_code": "{{$json.qr_code_url}}",
          "esim_activation_code": "{{$json.activation_code}}"
        }
      }
    },
    {
      "name": "Send Email",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "to": "{{$json.customer_email}}",
        "subject": "Your eSIM is Ready!",
        "html": "<h1>eSIM QR Code</h1><img src='{{$json.qr_code_url}}'>"
      }
    }
  ]
}
```

---

## 데이터 플로우

### 주문 생성 플로우

```
1. 고객이 "구매하기" 클릭
   ↓
2. Next.js: Stripe Checkout Session 생성
   ↓
3. Stripe: 결제 페이지 리다이렉트
   ↓
4. 고객: 카드 정보 입력
   ↓
5. Stripe: 결제 처리
   ↓
6. Stripe Webhook: payment_intent.succeeded
   ↓
7. Next.js API: PocketBase에 Order 생성
   ↓
8. PocketBase Hook: n8n Webhook 호출
   ↓
9. n8n: eSIM 발급 워크플로우 실행
   ↓
10. n8n: PocketBase Order 업데이트
   ↓
11. n8n: Email 발송
   ↓
12. 고객: 이메일에서 QR 코드 확인
```

### 재고 동기화 플로우

```
Cron (매 1시간)
  ↓
n8n: 공급사 API 호출 (재고 조회)
  ↓
PocketBase: 상품 재고 업데이트
  ↓
IF: 재고 < 10개?
  ├─ Yes: Slack 알림
  └─ No: 로그만 기록
```

---

## 보안 설계

### API 키 관리

```bash
# .env.example
POCKETBASE_URL=https://pocketbase.yourdomain.com
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=strong_password_here

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

ESIM_CARD_API_KEY=abc123...
MOBIMATTER_API_KEY=def456...
AIRALO_API_KEY=ghi789...

N8N_WEBHOOK_URL=https://n8n.yourdomain.com

RESEND_API_KEY=re_...
```

**주의사항:**
- `.env` 파일은 `.gitignore`에 추가
- 프로덕션 환경변수는 Railway Dashboard에서 설정
- API 키는 주기적으로 로테이션 (3개월마다)

### PocketBase API Rules

```javascript
// esim_products Collection
{
  "listRule": "",  // 누구나 조회 가능
  "viewRule": "",
  "createRule": "@request.auth.role = 'admin'",
  "updateRule": "@request.auth.role = 'admin'",
  "deleteRule": "@request.auth.role = 'admin'"
}

// orders Collection
{
  "listRule": "@request.auth.id = user.id",  // 본인 주문만
  "viewRule": "@request.auth.id = user.id",
  "createRule": "@request.auth.id != ''",  // 로그인 사용자만
  "updateRule": "@request.auth.role = 'admin'",
  "deleteRule": null  // 삭제 불가
}
```

### HTTPS 강제

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};
```

---

## 확장성 설계

### 트래픽 증가 시나리오

**월 100건 → 1,000건 (10배 증가)**
- PocketBase: Railway $5 플랜 유지 (충분)
- n8n: Railway $10 플랜 업그레이드
- **총 비용: $15/월**

**월 1,000건 → 10,000건 (100배 증가)**
- PocketBase: Railway $20 플랜 (4GB RAM)
- n8n: Railway $20 플랜
- CDN 도입 (Cloudflare - 무료)
- **총 비용: $40/월**

**월 10,000건 이상**
- PocketBase → PostgreSQL + Redis (Supabase)
- n8n → 자체 서버 (AWS EC2 또는 Hetzner)
- 이미지 CDN (Cloudinary)
- **총 비용: $100-200/월**

### 데이터베이스 최적화

```sql
-- 자주 조회하는 필드에 인덱스 추가
CREATE INDEX idx_country_active ON esim_products(country, is_active);
CREATE INDEX idx_order_status ON orders(status, created);
CREATE INDEX idx_user_orders ON orders(user, created DESC);
```

---

## 모니터링 및 로깅

### Uptime Robot (무료)

```
Monitor 1: PocketBase API
- URL: https://pocketbase.yourdomain.com/api/health
- Interval: 5분
- Alert: 이메일 + Slack

Monitor 2: n8n Webhook
- URL: https://n8n.yourdomain.com/webhook-test/health
- Interval: 5분
- Alert: 이메일 + Slack
```

### Sentry (에러 추적)

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10%만 추적 (비용 절감)
  environment: process.env.NODE_ENV,
});
```

### 로그 수집

```javascript
// pb_hooks/logging.pb.js
onRecordAfterCreateRequest((e) => {
  const record = e.record;
  
  // 중요 이벤트만 로그
  if (record.collection().name === 'orders') {
    $app.logger().info(
      'Order created',
      'order_id', record.get('order_id'),
      'amount', record.get('amount'),
      'status', record.get('status')
    );
  }
}, '*');
```

---

## 아키텍처 리뷰 (2025-12-28)

### ✅ 강점 (Strengths)

| 항목 | 평가 | 설명 |
|------|------|------|
| **관심사 분리** | ⭐⭐⭐⭐⭐ | services/, apps/, scripts/ 명확한 분리 |
| **Provider Failover** | ⭐⭐⭐⭐⭐ | 다중 공급사 자동 전환으로 안정성 확보 |
| **State Machine** | ⭐⭐⭐⭐ | 주문 상태 관리가 명확하고 추적 가능 |
| **Correlation ID** | ⭐⭐⭐⭐ | 분산 추적 가능한 로깅 구조 |
| **TypeScript Strict** | ⭐⭐⭐⭐ | 타입 안정성 확보 |
| **Multi-Channel** | ⭐⭐⭐⭐ | Stripe + SmartStore 통합 완료 |

### ⚠️ 개선 필요 (Areas for Improvement)

| 우선순위 | 항목 | 현재 상태 | 권장 사항 |
|---------|------|----------|----------|
| 🔴 **Critical** | 하드코딩된 시크릿 | scripts/*.js에 평문 저장 | 환경변수로 이동 |
| 🔴 **Critical** | Git 히스토리 내 시크릿 | 커밋에 노출됨 | git-filter-repo로 정리 |
| 🟠 **High** | API Rate Limiting | 미구현 | Vercel Edge Config 사용 |
| 🟠 **High** | PocketBase 확장성 | SQLite 단일 인스턴스 | 10K+ 주문 시 PostgreSQL 전환 |
| 🟡 **Medium** | API 문서화 | 수동 관리 | OpenAPI/Swagger 자동 생성 |
| 🟡 **Medium** | 에러 핸들링 | 분산됨 | 중앙집중식 에러 핸들러 |
| 🟢 **Low** | n8n 레거시 코드 | 사용 안함 | 제거 또는 문서화 |

### 🔒 보안 이슈 (Security Issues)

#### 🔴 즉시 조치 필요

**1. 하드코딩된 시크릿 발견**

```
파일: scripts/smartstore-sync-standalone.js
- NAVER_APP_SECRET (Base64 인코딩됨)
- POCKETBASE_ADMIN_PASSWORD
- CRON_SECRET
```

**조치 방법:**
```bash
# 1. 시크릿을 환경변수로 이동
ssh -i ssh-key-*.key ubuntu@161.118.129.219
export NAVER_COMMERCE_APP_SECRET="..."
export POCKETBASE_ADMIN_PASSWORD="..."
export CRON_SECRET="..."

# 2. 코드에서 하드코딩 제거
# 3. Git 히스토리 정리 (git-filter-repo)
# 4. 모든 시크릿 로테이션
```

**2. SSH 키 관리**
- 현재 위치: 프로젝트 루트 (`ssh-key-2025-12-28.key`)
- 권장: `~/.ssh/` 디렉토리로 이동, 절대 Git에 커밋 금지

### 📊 확장성 로드맵

| 월간 주문량 | 현재 아키텍처 | 변경 필요 사항 |
|------------|-------------|---------------|
| 0-1,000 | ✅ 충분 | - |
| 1,000-5,000 | ⚠️ 모니터링 필요 | PocketBase 리소스 증가 |
| 5,000-10,000 | 🔄 마이그레이션 필요 | PostgreSQL + Redis 전환 |
| 10,000+ | 🏗️ 재설계 필요 | 마이크로서비스 분리 |

### 🛠️ 권장 다음 단계

1. **즉시 (이번 주)**
   - [ ] 하드코딩된 시크릿 제거 및 환경변수화
   - [ ] Git 히스토리에서 시크릿 정리
   - [ ] 모든 API 키 로테이션

2. **단기 (1개월)**
   - [ ] API Rate Limiting 구현
   - [ ] OpenAPI 문서 자동 생성 설정
   - [ ] 중앙집중식 에러 핸들러 구현

3. **중기 (3개월)**
   - [ ] 모니터링 대시보드 구축
   - [ ] 자동화된 테스트 커버리지 확대
   - [ ] 성능 벤치마킹 및 최적화

---

## 인프라 구성 요약

| 컴포넌트 | 서비스 | 비용 | 역할 |
|---------|-------|------|------|
| Frontend + API | Vercel | Free~$20/월 | Next.js 호스팅 |
| Database | Railway (PocketBase) | $5/월 | SQLite 데이터 저장 |
| SmartStore Sync | Oracle Cloud | Free | 고정 IP로 Naver API 호출 |
| Email | Resend | Free~$20/월 | 주문 확인 이메일 |
| Monitoring | Sentry | Free | 에러 추적 |
| Alerts | Discord | Free | 장애 알림 |

**총 예상 비용: $5-45/월**

---

**자동화가 완성되면, 잠자는 동안에도 돈을 번다.** 🚀
