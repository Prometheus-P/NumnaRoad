# 📡 API Documentation

## Base URLs

- **PocketBase API**: `https://pocketbase.yourdomain.com/api`
- **Next.js API**: `https://yourdomain.com/api`

## Authentication

### PocketBase Auth

```typescript
// 회원가입
POST /api/collections/users/records
Body: {
  "email": "user@example.com",
  "password": "password123",
  "passwordConfirm": "password123",
  "name": "홍길동"
}

// 로그인
POST /api/collections/users/auth-with-password
Body: {
  "identity": "user@example.com",
  "password": "password123"
}

Response: {
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "record": {
    "id": "abc123",
    "email": "user@example.com",
    "name": "홍길동"
  }
}
```

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

---

## Products API

### List Products

```http
GET /api/collections/esim_products/records

Query Parameters:
- page: number (default: 1)
- perPage: number (default: 20, max: 100)
- sort: string (default: "-created")
- filter: string (PocketBase filter syntax)
- expand: string (comma-separated relations)

Example:
GET /api/collections/esim_products/records?filter=country="JP"&&is_active=true&sort=-is_featured,sort_order&perPage=10

Response: {
  "page": 1,
  "perPage": 10,
  "totalItems": 45,
  "totalPages": 5,
  "items": [
    {
      "id": "abc123",
      "name": "일본 7일 무제한",
      "country": "JP",
      "country_name": "일본",
      "duration": 7,
      "data_limit": "무제한",
      "retail_price": 12000,
      "is_active": true,
      "image": "abc123_image.jpg",
      "created": "2024-12-01T10:00:00Z"
    }
  ]
}
```

### Get Product

```http
GET /api/collections/esim_products/records/:id

Response: {
  "id": "abc123",
  "name": "일본 7일 무제한",
  "slug": "japan-7day-unlimited",
  "country": "JP",
  "country_name": "일본",
  "duration": 7,
  "data_limit": "무제한",
  "speed": "4G LTE",
  "provider": "eSIM Card",
  "retail_price": 12000,
  "margin_percent": 33.33,
  "stock": 100,
  "is_active": true,
  "description": "<p>일본 전역에서 사용 가능한 7일 무제한 데이터 eSIM</p>",
  "features": ["무제한 데이터", "4G LTE 속도", "즉시 활성화"],
  "installation_guide": "<h2>설치 방법</h2>...",
  "created": "2024-12-01T10:00:00Z",
  "updated": "2024-12-01T10:00:00Z"
}
```

### Search Products

```http
GET /api/collections/esim_products/records?filter=name~"일본"||country_name~"일본"

Response: {
  "items": [...]
}
```

---

## Orders API

### Create Order

```http
POST /api/collections/orders/records
Headers: Authorization: Bearer <token>

Body: {
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "product": "PRODUCT_RECORD_ID",
  "status": "pending",
  "payment_status": "pending",
  "payment_method": "card",
  "amount": 12000,
  "currency": "KRW",
  "customer_email": "customer@example.com",
  "customer_name": "홍길동",
  "customer_phone": "01012345678"
}

Response: {
  "id": "xyz789",
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  ...
}
```

### List My Orders

```http
GET /api/collections/orders/records?filter=user="${userId}"&sort=-created&expand=product

Response: {
  "items": [
    {
      "id": "xyz789",
      "order_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "completed",
      "payment_status": "paid",
      "amount": 12000,
      "esim_qr_code_url": "https://cdn.esimcard.com/qr/abc123.png",
      "expand": {
        "product": {
          "name": "일본 7일 무제한",
          "country": "JP"
        }
      },
      "created": "2024-12-01T10:00:00Z"
    }
  ]
}
```

### Get Order Details

```http
GET /api/collections/orders/records/:id?expand=product

Response: {
  "id": "xyz789",
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "payment_status": "paid",
  "esim_qr_code": "xyz789_qr.png",
  "esim_qr_code_url": "https://cdn.esimcard.com/qr/abc123.png",
  "esim_activation_code": "LPA:1$rsp.esimcard.com$ABC123",
  "expand": {
    "product": {...}
  }
}
```

---

## Payment API (Next.js)

### Create Stripe Checkout Session

```http
POST /api/checkout/create-session

Body: {
  "productId": "abc123",
  "customerEmail": "customer@example.com",
  "successUrl": "https://yourdomain.com/checkout/success",
  "cancelUrl": "https://yourdomain.com/checkout/cancel"
}

Response: {
  "sessionId": "cs_test_abc123",
  "url": "https://checkout.stripe.com/pay/cs_test_abc123"
}
```

### Stripe Webhook

```http
POST /api/webhook/stripe
Headers: Stripe-Signature: <signature>

Body: {
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_abc123",
      "amount": 1200000,
      "metadata": {
        "product_id": "abc123",
        "customer_email": "customer@example.com"
      }
    }
  }
}

Response: {
  "received": true
}
```

---

## Coupon API

### Validate Coupon

```http
GET /api/collections/coupons/records?filter=code="${code}"&&is_active=true

Response: {
  "items": [
    {
      "id": "coupon123",
      "code": "WELCOME10",
      "type": "percentage",
      "discount_value": 10,
      "usage_count": 5,
      "usage_limit": 100,
      "valid_from": "2024-12-01T00:00:00Z",
      "valid_until": "2024-12-31T23:59:59Z"
    }
  ]
}
```

### Apply Coupon

```http
POST /api/coupons/apply

Body: {
  "code": "WELCOME10",
  "productId": "abc123",
  "amount": 12000
}

Response: {
  "valid": true,
  "discount_amount": 1200,
  "final_amount": 10800,
  "coupon": {
    "code": "WELCOME10",
    "type": "percentage",
    "discount_value": 10
  }
}
```

---

## Review API

### List Reviews

```http
GET /api/collections/reviews/records?filter=product="${productId}"&&is_approved=true&expand=user&sort=-created

Response: {
  "items": [
    {
      "id": "review123",
      "rating": 5,
      "title": "일본 여행 잘 다녀왔습니다",
      "content": "설치도 쉽고 속도도 빠릅니다!",
      "is_verified": true,
      "helpful_count": 12,
      "expand": {
        "user": {
          "name": "홍길동"
        }
      },
      "created": "2024-12-01T10:00:00Z"
    }
  ]
}
```

### Create Review

```http
POST /api/collections/reviews/records
Headers: Authorization: Bearer <token>

Body: {
  "order": "ORDER_RECORD_ID",
  "product": "PRODUCT_RECORD_ID",
  "rating": 5,
  "title": "일본 여행 잘 다녀왔습니다",
  "content": "설치도 쉽고 속도도 빠릅니다!",
  "is_approved": false
}

Response: {
  "id": "review123",
  "rating": 5,
  ...
}
```

---

## Admin API

### Get Dashboard Stats

```http
GET /api/admin/stats
Headers: Authorization: Bearer <admin_token>

Response: {
  "total_orders": 1234,
  "total_revenue": 14808000,
  "today_orders": 45,
  "today_revenue": 540000,
  "pending_orders": 3,
  "low_stock_products": 5,
  "recent_orders": [...]
}
```

### Sync Inventory (Manual Trigger)

```http
POST /api/admin/sync-inventory
Headers: Authorization: Bearer <admin_token>

Body: {
  "provider": "eSIM Card"  // or "all"
}

Response: {
  "status": "success",
  "synced_products": 45,
  "failed_products": 2,
  "execution_time_ms": 2345
}
```

---

## Webhook Endpoints (n8n)

### Order Processing Webhook

```http
POST https://n8n.yourdomain.com/webhook/order-paid

Body: {
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "product_id": "abc123",
  "customer_email": "customer@example.com",
  "amount": 12000
}

Response: {
  "status": "processing",
  "execution_id": "n8n_exec_123"
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "code": 400,
  "message": "Invalid request data",
  "data": {
    "email": {
      "code": "validation_invalid_email",
      "message": "Must be a valid email address"
    }
  }
}
```

### 401 Unauthorized

```json
{
  "code": 401,
  "message": "The request requires valid authentication token"
}
```

### 403 Forbidden

```json
{
  "code": 403,
  "message": "You are not allowed to perform this request"
}
```

### 404 Not Found

```json
{
  "code": 404,
  "message": "The requested resource wasn't found"
}
```

### 500 Internal Server Error

```json
{
  "code": 500,
  "message": "Something went wrong while processing your request"
}
```

---

## Rate Limiting

- **Public endpoints**: 100 requests/minute per IP
- **Authenticated endpoints**: 500 requests/minute per user
- **Admin endpoints**: Unlimited

Headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

---

## Pagination

All list endpoints support pagination:

```
?page=1&perPage=20
```

Response includes:
```json
{
  "page": 1,
  "perPage": 20,
  "totalItems": 145,
  "totalPages": 8,
  "items": [...]
}
```

---

## Filtering

PocketBase filter syntax:

```
// 같음
filter=country="JP"

// 포함
filter=name~"일본"

// AND
filter=country="JP"&&is_active=true

// OR
filter=country="JP"||country="KR"

// 대소비교
filter=retail_price>10000

// IN
filter=country?="JP"||country?="KR"

// 조합
filter=(country="JP"&&duration>=7)||is_featured=true
```

---

## Sorting

```
// 오름차순
sort=name

// 내림차순
sort=-created

// 다중 정렬
sort=-is_featured,sort_order,name
```

---

## Expanding Relations

```
// 단일 확장
expand=product

// 다중 확장
expand=product,user

// 중첩 확장
expand=product.reviews
```

---

## TypeScript SDK Example

```typescript
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pocketbase.yourdomain.com');

// 로그인
await pb.collection('users').authWithPassword(
  'user@example.com',
  'password123'
);

// 상품 조회
const products = await pb.collection('esim_products').getList(1, 20, {
  filter: 'country="JP" && is_active=true',
  sort: '-is_featured',
});

// 주문 생성
const order = await pb.collection('orders').create({
  order_id: crypto.randomUUID(),
  product: productId,
  amount: 12000,
  customer_email: 'customer@example.com',
});

// Realtime 구독
pb.collection('orders').subscribe(orderId, (data) => {
  console.log('Order updated:', data.record);
});
```

---

## Testing with curl

```bash
# 상품 목록 조회
curl "https://pocketbase.yourdomain.com/api/collections/esim_products/records?filter=country='JP'"

# 로그인
curl -X POST https://pocketbase.yourdomain.com/api/collections/users/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity":"user@example.com","password":"password123"}'

# 인증된 요청
curl https://pocketbase.yourdomain.com/api/collections/orders/records \
  -H "Authorization: Bearer <token>"
```

---

**API 문서는 살아있는 문서다. 계속 업데이트하자.**
