# 🗄️ Database Schema

## PocketBase Collections

### 1. users (기본 제공)

PocketBase 기본 Auth Collection

```typescript
interface User {
  id: string;                    // auto-generated
  email: string;                 // unique, required
  emailVisibility: boolean;      // default: false
  verified: boolean;             // default: false
  name?: string;
  avatar?: string;               // file upload
  created: string;               // ISO datetime
  updated: string;               // ISO datetime
}
```

**API Rules:**
```javascript
{
  "listRule": "",
  "viewRule": "@request.auth.id = id",
  "createRule": "",
  "updateRule": "@request.auth.id = id",
  "deleteRule": "@request.auth.id = id"
}
```

---

### 2. esim_products

상품 정보 관리

```typescript
interface EsimProduct {
  id: string;                         // auto-generated
  name: string;                       // 예: "일본 7일 무제한"
  slug: string;                       // URL-friendly name
  country: string;                    // 국가 코드 (ISO 3166-1 alpha-2)
  country_name: string;               // 국가 이름 (한글)
  region?: string;                    // 리전 (예: "Europe", "South America")
  duration: number;                   // 일 단위
  data_limit: string;                 // "무제한", "10GB", "50GB" 등
  speed: string;                      // "4G LTE", "5G" 등
  provider: string;                   // "eSIM Card", "MobiMatter", "Airalo"
  provider_product_id: string;        // 공급사 API의 상품 ID
  wholesale_price: number;            // 도매가 (USD)
  retail_price: number;               // 판매가 (KRW)
  margin_percent: number;             // 마진율 (%)
  stock: number;                      // 재고 수량
  is_active: boolean;                 // 판매 활성화 여부
  is_featured: boolean;               // 추천 상품 여부
  image?: string;                     // 상품 이미지 (file)
  images?: string[];                  // 추가 이미지들 (multiple files)
  description: string;                // 상세 설명 (HTML)
  features: string[];                 // 특징 목록 (JSON array)
  installation_guide: string;         // 설치 가이드 (HTML)
  coverage_countries?: string[];      // 커버리지 국가 목록 (멀티국가 플랜용)
  tags?: string[];                    // 태그 (검색 최적화)
  seo_title?: string;                 // SEO 제목
  seo_description?: string;           // SEO 설명
  sort_order: number;                 // 정렬 순서
  created: string;
  updated: string;
}
```

**Indexes:**
```javascript
[
  "country",
  "is_active",
  "is_featured",
  "slug",
  "sort_order"
]
```

**API Rules:**
```javascript
{
  "listRule": "",  // 누구나 조회 가능
  "viewRule": "",
  "createRule": "@request.auth.role = 'admin'",
  "updateRule": "@request.auth.role = 'admin'",
  "deleteRule": "@request.auth.role = 'admin'"
}
```

---

### 3. orders

주문 정보

```typescript
interface Order {
  id: string;                         // auto-generated
  order_id: string;                   // UUID, unique
  user?: string;                      // relation(users) - optional (게스트 주문 허용)
  product: string;                    // relation(esim_products)
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'card' | 'paypal' | 'bank_transfer' | 'kakaopay';
  payment_id: string;                 // Stripe payment_intent_id or 토스 결제 ID
  payment_receipt_url?: string;       // 결제 영수증 URL
  amount: number;                     // 결제 금액 (KRW)
  currency: string;                   // "KRW", "USD" 등
  
  // eSIM 정보
  esim_qr_code?: string;              // QR 코드 이미지 (file)
  esim_qr_code_url?: string;          // QR 코드 URL
  esim_activation_code?: string;      // LPA 활성화 코드
  esim_iccid?: string;                // eSIM ICCID
  esim_provider_order_id?: string;    // 공급사 주문 ID
  
  // 고객 정보
  customer_email: string;             // required
  customer_name?: string;
  customer_phone?: string;
  
  // 배송 정보 (이메일 발송)
  delivered_at?: string;              // 발급 완료 시간
  email_sent_at?: string;             // 이메일 발송 시간
  
  // 에러 로그
  error_message?: string;             // 실패 시 에러 메시지
  retry_count: number;                // 재시도 횟수 (default: 0)
  
  // 메타데이터
  ip_address?: string;                // 주문 시 IP
  user_agent?: string;                // User Agent
  utm_source?: string;                // 마케팅 소스
  utm_medium?: string;
  utm_campaign?: string;
  
  // 타임스탬프
  created: string;                    // 주문 생성 시간
  updated: string;
  completed_at?: string;              // 완료 시간
}
```

**Indexes:**
```javascript
[
  "order_id",
  "user",
  "status",
  "payment_status",
  "customer_email",
  "created"
]
```

**API Rules:**
```javascript
{
  "listRule": "@request.auth.id = user.id || @request.auth.role = 'admin'",
  "viewRule": "@request.auth.id = user.id || @request.auth.role = 'admin'",
  "createRule": "@request.auth.id != ''",  // 로그인 사용자만
  "updateRule": "@request.auth.role = 'admin'",
  "deleteRule": null  // 삭제 불가
}
```

---

### 4. coupons

쿠폰 및 할인 코드

```typescript
interface Coupon {
  id: string;
  code: string;                       // 쿠폰 코드 (unique)
  type: 'percentage' | 'fixed';       // 할인 타입
  discount_value: number;             // 할인 값 (%, 또는 고정 금액)
  min_purchase_amount?: number;       // 최소 구매 금액
  max_discount_amount?: number;       // 최대 할인 금액
  usage_limit?: number;               // 총 사용 가능 횟수
  usage_count: number;                // 현재 사용 횟수
  user_usage_limit: number;           // 사용자당 사용 가능 횟수 (default: 1)
  applicable_products?: string[];     // 적용 가능 상품 IDs (비어있으면 전체)
  applicable_countries?: string[];    // 적용 가능 국가 코드
  is_active: boolean;
  valid_from: string;                 // 유효 시작일
  valid_until?: string;               // 유효 종료일
  description?: string;
  created: string;
  updated: string;
}
```

**API Rules:**
```javascript
{
  "listRule": "@request.auth.role = 'admin'",
  "viewRule": "",  // 누구나 조회 가능 (쿠폰 코드 확인용)
  "createRule": "@request.auth.role = 'admin'",
  "updateRule": "@request.auth.role = 'admin'",
  "deleteRule": "@request.auth.role = 'admin'"
}
```

---

### 5. reviews

고객 리뷰

```typescript
interface Review {
  id: string;
  order: string;                      // relation(orders)
  user: string;                       // relation(users)
  product: string;                    // relation(esim_products)
  rating: number;                     // 1-5
  title?: string;
  content: string;
  images?: string[];                  // 리뷰 이미지 (multiple files)
  is_verified: boolean;               // 구매 인증 여부 (auto)
  is_approved: boolean;               // 관리자 승인 여부
  helpful_count: number;              // "도움이 됐어요" 카운트
  created: string;
  updated: string;
}
```

**API Rules:**
```javascript
{
  "listRule": "is_approved = true",
  "viewRule": "is_approved = true",
  "createRule": "@request.auth.id = user.id",
  "updateRule": "@request.auth.id = user.id && created > @now - 86400",  // 24시간 내 수정 가능
  "deleteRule": "@request.auth.id = user.id || @request.auth.role = 'admin'"
}
```

---

### 6. provider_sync_logs

공급사 동기화 로그

```typescript
interface ProviderSyncLog {
  id: string;
  provider: 'eSIM Card' | 'MobiMatter' | 'Airalo';
  sync_type: 'inventory' | 'price' | 'order';
  status: 'success' | 'failed' | 'partial';
  products_synced?: number;           // 동기화된 상품 수
  products_failed?: number;           // 실패한 상품 수
  data?: any;                         // JSON (상세 데이터)
  error_message?: string;
  execution_time_ms?: number;         // 실행 시간 (밀리초)
  synced_at: string;
  created: string;
}
```

**API Rules:**
```javascript
{
  "listRule": "@request.auth.role = 'admin'",
  "viewRule": "@request.auth.role = 'admin'",
  "createRule": null,  // n8n에서만 생성
  "updateRule": null,
  "deleteRule": "@request.auth.role = 'admin'"
}
```

---

### 7. automation_logs

자동화 실행 로그

```typescript
interface AutomationLog {
  id: string;
  event_type: 'order_created' | 'esim_issued' | 'email_sent' | 'inventory_synced' | 'payment_failed';
  order?: string;                     // relation(orders) - optional
  status: 'success' | 'failed';
  workflow_name?: string;             // n8n 워크플로우 이름
  execution_id?: string;              // n8n execution ID
  error_message?: string;
  data?: any;                         // JSON (추가 정보)
  execution_time_ms?: number;
  created: string;
}
```

**API Rules:**
```javascript
{
  "listRule": "@request.auth.role = 'admin'",
  "viewRule": "@request.auth.role = 'admin'",
  "createRule": null,  // n8n에서만 생성
  "updateRule": null,
  "deleteRule": "@request.auth.role = 'admin'"
}
```

---

### 8. email_logs

이메일 발송 로그

```typescript
interface EmailLog {
  id: string;
  order?: string;                     // relation(orders) - optional
  to: string;                         // 수신자 이메일
  from: string;                       // 발신자 이메일
  subject: string;
  template_name?: string;             // 이메일 템플릿 이름
  status: 'sent' | 'failed' | 'bounced' | 'opened' | 'clicked';
  provider: 'resend' | 'mailgun';
  provider_message_id?: string;
  error_message?: string;
  sent_at?: string;
  opened_at?: string;
  clicked_at?: string;
  created: string;
}
```

**API Rules:**
```javascript
{
  "listRule": "@request.auth.role = 'admin'",
  "viewRule": "@request.auth.role = 'admin'",
  "createRule": null,
  "updateRule": null,
  "deleteRule": "@request.auth.role = 'admin'"
}
```

---

### 9. cart_items

장바구니 (선택사항)

```typescript
interface CartItem {
  id: string;
  user?: string;                      // relation(users) - optional (게스트 장바구니)
  session_id?: string;                // 게스트 세션 ID
  product: string;                    // relation(esim_products)
  quantity: number;                   // default: 1
  created: string;
  updated: string;
}
```

---

### 10. wishlists

위시리스트

```typescript
interface Wishlist {
  id: string;
  user: string;                       // relation(users)
  product: string;                    // relation(esim_products)
  created: string;
}
```

---

## 관계도 (ERD)

```
users (1) ─────< (N) orders
                       │
                       │ (N)
                       │
                       v (1)
                 esim_products
                       │
                       │ (N)
                       │
                       v (1)
                    reviews

orders (1) ───< (N) automation_logs
orders (1) ───< (N) email_logs

users (1) ─────< (N) reviews
users (1) ─────< (N) cart_items
users (1) ─────< (N) wishlists
```

---

## 마이그레이션

PocketBase는 Admin UI에서 Collections를 생성하면 자동으로 마이그레이션 파일이 생성됩니다.

**수동 마이그레이션 (선택사항):**

```javascript
// pb_migrations/1234567890_create_esim_products.js
migrate((db) => {
  const collection = new Collection({
    name: 'esim_products',
    type: 'base',
    schema: [
      {
        name: 'name',
        type: 'text',
        required: true,
      },
      {
        name: 'country',
        type: 'text',
        required: true,
      },
      // ... 나머지 필드
    ],
  });
  
  return db.saveCollection(collection);
}, (db) => {
  // Rollback
  return db.deleteCollection('esim_products');
});
```

---

## 샘플 데이터

### esim_products

```json
{
  "name": "일본 7일 무제한",
  "slug": "japan-7day-unlimited",
  "country": "JP",
  "country_name": "일본",
  "duration": 7,
  "data_limit": "무제한",
  "speed": "4G LTE",
  "provider": "eSIM Card",
  "provider_product_id": "jp-7day-unlimited",
  "wholesale_price": 8,
  "retail_price": 12000,
  "margin_percent": 33.33,
  "stock": 100,
  "is_active": true,
  "is_featured": true,
  "description": "<p>일본 전역에서 사용 가능한 7일 무제한 데이터 eSIM</p>",
  "features": ["무제한 데이터", "4G LTE 속도", "즉시 활성화", "테더링 가능"],
  "tags": ["일본", "무제한", "여행", "eSIM"],
  "sort_order": 1
}
```

### orders

```json
{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "product": "PRODUCT_RECORD_ID",
  "status": "completed",
  "payment_status": "paid",
  "payment_method": "card",
  "payment_id": "pi_3K9QxY2eZvKYlo2C0z1z2z3z",
  "amount": 12000,
  "currency": "KRW",
  "esim_qr_code_url": "https://cdn.esimcard.com/qr/abc123.png",
  "esim_activation_code": "LPA:1$rsp.esimcard.com$ABC123",
  "customer_email": "customer@example.com",
  "customer_name": "홍길동",
  "delivered_at": "2024-12-01T10:30:00Z",
  "email_sent_at": "2024-12-01T10:30:05Z"
}
```

---

## 데이터베이스 최적화

### 자주 실행되는 쿼리 최적화

```javascript
// 1. 국가별 활성 상품 조회
pb.collection('esim_products').getList(1, 20, {
  filter: 'country="JP" && is_active=true',
  sort: '-is_featured,sort_order',
});

// 2. 사용자의 최근 주문 조회
pb.collection('orders').getList(1, 10, {
  filter: `user="${userId}"`,
  sort: '-created',
  expand: 'product',
});

// 3. 재고 부족 상품 조회
pb.collection('esim_products').getList(1, 50, {
  filter: 'stock<10 && is_active=true',
  sort: 'stock',
});
```

### 백업 스크립트

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
PB_DATA="/path/to/pb_data"

# SQLite DB 백업
sqlite3 $PB_DATA/data.db ".backup '$BACKUP_DIR/db_$DATE.db'"

# 파일 저장소 백업
tar -czf $BACKUP_DIR/storage_$DATE.tar.gz $PB_DATA/storage/

# 30일 이상 된 백업 삭제
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

---

## 다음 단계

1. **PocketBase Admin UI에서 Collections 생성**
2. **샘플 데이터 입력**
3. **API 테스트 (Postman 또는 curl)**
4. **Next.js에서 PocketBase SDK 연동**
5. **프로덕션 환경 마이그레이션**

---

**데이터 구조가 명확하면, 개발 속도가 3배 빨라진다.**
