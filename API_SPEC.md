# API Specification

NumnaRoad REST API 명세서 (OpenAPI 3.0)

---

## 📋 Document Metadata

| 항목 | 내용 |
|------|------|
| **문서 유형** | API Specification |
| **대상 독자** | Backend 개발자, Frontend 개발자, QA |
| **최종 수정** | 2024-12-01 |
| **API 버전** | v1.0.0 |
| **연관 문서** | [PRD.md](./PRD.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) |
| **우선순위** | ⭐⭐⭐ (Core) |

---

## 📚 Quick Links

- 📋 **[PRD.md](./PRD.md)** - Product Requirements
- 🏗️ **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System Architecture
- 🗄️ **[DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)** - Database Schema

---

## 목차

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Products API](#products-api)
4. [Orders API](#orders-api)
5. [Customers API](#customers-api)
6. [Payments API](#payments-api)
7. [Webhooks](#webhooks)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [OpenAPI Schema](#openapi-schema)

---

## API Overview

### Base URL

```
Development:  http://localhost:8090
Production:   https://api.numnaroad.com
PocketBase:   https://pocketbase.numnaroad.com
```

### API Versioning

```
/api/v1/*           # Current version
/api/collections/*  # PocketBase Collections API
```

### Content Types

```
Request:  application/json
Response: application/json
```

### Standard Headers

```http
Content-Type: application/json
Authorization: Bearer {token}
X-API-Key: {api_key}
```

---

## Authentication

### Auth Methods

| Method | Use Case | Format |
|--------|----------|--------|
| **JWT Token** | User authentication | `Authorization: Bearer {jwt}` |
| **API Key** | Server-to-server | `X-API-Key: {key}` |
| **Public** | Read-only endpoints | No auth required |

### JWT Token

**Endpoint**: `POST /api/collections/users/auth-with-password`

**Request**:
```json
{
  "identity": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "record": {
    "id": "abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "created": "2024-12-01T00:00:00Z",
    "updated": "2024-12-01T00:00:00Z"
  }
}
```

**Token Expiration**: 7 days

### API Key (Admin Only)

```http
X-API-Key: sk_live_abc123def456ghi789
```

Used for server-to-server communication (n8n, webhooks).

---

## Products API

### List Products

**Endpoint**: `GET /api/collections/esim_products/records`

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `perPage` | integer | No | Items per page (default: 30, max: 100) |
| `sort` | string | No | Sort field (e.g., `-price`, `+name`) |
| `filter` | string | No | Filter expression |
| `fields` | string | No | Comma-separated fields to return |

**Filter Examples**:

```
country='Japan'
country='Japan' && is_active=true
price>=10 && price<=20
duration>=7
country~'Korea'  # Contains 'Korea'
```

**Request**:
```http
GET /api/collections/esim_products/records?filter=country='Japan'&&is_active=true&sort=-created
```

**Response**: `200 OK`
```json
{
  "page": 1,
  "perPage": 30,
  "totalPages": 1,
  "totalItems": 3,
  "items": [
    {
      "id": "abc123",
      "collectionId": "esim_products",
      "collectionName": "esim_products",
      "created": "2024-12-01T00:00:00Z",
      "updated": "2024-12-01T00:00:00Z",
      "name": "일본 eSIM 7일 무제한",
      "slug": "japan-7days-unlimited",
      "country": "Japan",
      "duration": 7,
      "data_limit": "Unlimited",
      "price": 12.00,
      "cost": 8.00,
      "margin_percent": 33.33,
      "currency": "USD",
      "is_active": true,
      "provider": "eSIM Card",
      "provider_product_id": "jp-7day-unlimited",
      "stock": 50,
      "description": "일본 여행 7일 무제한 데이터",
      "features": ["Docomo", "SoftBank", "5G 지원"],
      "supported_networks": ["Docomo", "SoftBank", "AU"],
      "image_url": "https://cdn.numnaroad.com/products/japan-7days.jpg"
    }
  ]
}
```

### Get Product by ID

**Endpoint**: `GET /api/collections/esim_products/records/{id}`

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Product ID |

**Response**: `200 OK`
```json
{
  "id": "abc123",
  "collectionId": "esim_products",
  "collectionName": "esim_products",
  "created": "2024-12-01T00:00:00Z",
  "updated": "2024-12-01T00:00:00Z",
  "name": "일본 eSIM 7일 무제한",
  "slug": "japan-7days-unlimited",
  "country": "Japan",
  "duration": 7,
  "data_limit": "Unlimited",
  "price": 12.00,
  "cost": 8.00,
  "margin_percent": 33.33,
  "currency": "USD",
  "is_active": true,
  "provider": "eSIM Card",
  "provider_product_id": "jp-7day-unlimited",
  "stock": 50,
  "description": "일본 여행 7일 무제한 데이터",
  "features": ["Docomo", "SoftBank", "5G 지원"],
  "supported_networks": ["Docomo", "SoftBank", "AU"],
  "image_url": "https://cdn.numnaroad.com/products/japan-7days.jpg"
}
```

### Get Product by Slug

**Endpoint**: `GET /api/collections/esim_products/records?filter=slug='{slug}'`

**Example**:
```http
GET /api/collections/esim_products/records?filter=slug='japan-7days-unlimited'
```

### Create Product (Admin Only)

**Endpoint**: `POST /api/collections/esim_products/records`

**Headers**:
```http
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "일본 eSIM 7일 무제한",
  "slug": "japan-7days-unlimited",
  "country": "Japan",
  "duration": 7,
  "data_limit": "Unlimited",
  "price": 12.00,
  "cost": 8.00,
  "currency": "USD",
  "provider": "eSIM Card",
  "provider_product_id": "jp-7day-unlimited",
  "stock": 50,
  "description": "일본 여행 7일 무제한 데이터",
  "features": ["Docomo", "SoftBank", "5G 지원"],
  "supported_networks": ["Docomo", "SoftBank", "AU"],
  "image_url": "https://cdn.numnaroad.com/products/japan-7days.jpg",
  "is_active": true
}
```

**Response**: `200 OK`
```json
{
  "id": "abc123",
  "created": "2024-12-01T00:00:00Z",
  "updated": "2024-12-01T00:00:00Z",
  ...
}
```

### Update Product (Admin Only)

**Endpoint**: `PATCH /api/collections/esim_products/records/{id}`

**Request Body** (partial update):
```json
{
  "price": 11.00,
  "stock": 45
}
```

### Delete Product (Admin Only)

**Endpoint**: `DELETE /api/collections/esim_products/records/{id}`

**Response**: `204 No Content`

---

## Orders API

### Create Order

**Endpoint**: `POST /api/collections/orders/records`

**Headers**:
```http
Authorization: Bearer {user_token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "order_id": "ORD-20241201-ABC123",
  "product": "abc123",
  "customer_email": "customer@example.com",
  "amount": 12.00,
  "currency": "USD",
  "payment_status": "pending",
  "status": "pending"
}
```

**Response**: `200 OK`
```json
{
  "id": "order123",
  "collectionId": "orders",
  "collectionName": "orders",
  "created": "2024-12-01T12:00:00Z",
  "updated": "2024-12-01T12:00:00Z",
  "order_id": "ORD-20241201-ABC123",
  "product": "abc123",
  "customer_email": "customer@example.com",
  "amount": 12.00,
  "currency": "USD",
  "payment_status": "pending",
  "status": "pending",
  "payment_id": null,
  "esim_qr_code": null,
  "esim_activation_code": null,
  "provider_order_id": null,
  "notes": null
}
```

### Get Order by ID

**Endpoint**: `GET /api/collections/orders/records/{id}`

**Authorization**: User can only view their own orders

**Response**: `200 OK`
```json
{
  "id": "order123",
  "order_id": "ORD-20241201-ABC123",
  "product": {
    "id": "abc123",
    "name": "일본 eSIM 7일 무제한",
    "country": "Japan",
    "duration": 7
  },
  "customer_email": "customer@example.com",
  "amount": 12.00,
  "currency": "USD",
  "payment_status": "paid",
  "status": "completed",
  "payment_id": "pi_abc123",
  "esim_qr_code": "https://cdn.numnaroad.com/qr/order123.png",
  "esim_activation_code": "LPA:1$...",
  "provider_order_id": "esimcard-xyz789",
  "created": "2024-12-01T12:00:00Z",
  "updated": "2024-12-01T12:00:15Z"
}
```

### List User Orders

**Endpoint**: `GET /api/collections/orders/records?filter=customer_email='{email}'`

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filter` | string | Yes | `customer_email='user@example.com'` |
| `sort` | string | No | `-created` (newest first) |
| `expand` | string | No | `product` (expand relations) |

**Response**: `200 OK`
```json
{
  "page": 1,
  "perPage": 30,
  "totalPages": 1,
  "totalItems": 5,
  "items": [
    {
      "id": "order123",
      "order_id": "ORD-20241201-ABC123",
      "product": "abc123",
      "expand": {
        "product": {
          "id": "abc123",
          "name": "일본 eSIM 7일 무제한",
          "country": "Japan"
        }
      },
      "amount": 12.00,
      "status": "completed",
      "created": "2024-12-01T12:00:00Z"
    }
  ]
}
```

### Update Order Status (System Only)

**Endpoint**: `PATCH /api/collections/orders/records/{id}`

**Headers**:
```http
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "status": "completed",
  "esim_qr_code": "https://cdn.numnaroad.com/qr/order123.png",
  "esim_activation_code": "LPA:1$...",
  "provider_order_id": "esimcard-xyz789"
}
```

**Allowed Status Transitions**:
```
pending → processing → completed
pending → processing → failed
```

---

## Customers API

### Create Customer (Auto on Order)

**Endpoint**: `POST /api/collections/customers/records`

**Note**: Automatically created when first order is placed.

**Request Body**:
```json
{
  "email": "customer@example.com",
  "name": "John Doe",
  "phone": "+821012345678"
}
```

### Get Customer by Email

**Endpoint**: `GET /api/collections/customers/records?filter=email='{email}'`

**Response**: `200 OK`
```json
{
  "items": [
    {
      "id": "cust123",
      "email": "customer@example.com",
      "name": "John Doe",
      "phone": "+821012345678",
      "total_orders": 5,
      "total_spent": 60.00,
      "created": "2024-11-01T00:00:00Z",
      "updated": "2024-12-01T12:00:00Z"
    }
  ]
}
```

---

## Payments API

### Create Stripe Checkout Session

**Endpoint**: `POST /api/payments/checkout`

**Custom API Route** (Next.js)

**Request Body**:
```json
{
  "product_id": "abc123",
  "customer_email": "customer@example.com",
  "success_url": "https://numnaroad.com/orders/success",
  "cancel_url": "https://numnaroad.com/checkout"
}
```

**Response**: `200 OK`
```json
{
  "sessionId": "cs_test_abc123",
  "url": "https://checkout.stripe.com/pay/cs_test_abc123"
}
```

**Usage**:
```typescript
// Frontend
const response = await fetch('/api/payments/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_id: 'abc123',
    customer_email: 'customer@example.com',
    success_url: window.location.origin + '/orders/success',
    cancel_url: window.location.origin + '/checkout',
  }),
});

const { url } = await response.json();
window.location.href = url; // Redirect to Stripe
```

### Stripe Webhook Handler

**Endpoint**: `POST /api/webhooks/stripe`

**Headers**:
```http
Stripe-Signature: t=1234567890,v1=abc123...
Content-Type: application/json
```

**Request Body** (Stripe Event):
```json
{
  "id": "evt_abc123",
  "object": "event",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_abc123",
      "amount": 1200,
      "currency": "usd",
      "receipt_email": "customer@example.com",
      "metadata": {
        "product_id": "abc123",
        "order_id": "ORD-20241201-ABC123"
      }
    }
  }
}
```

**Response**: `200 OK`
```json
{
  "received": true
}
```

**Supported Events**:
- `payment_intent.succeeded` - Create order in PocketBase
- `payment_intent.payment_failed` - Update order status to failed
- `charge.refunded` - Update order status to refunded

---

## Webhooks

### n8n Order Processing Webhook

**Endpoint**: `POST /webhook/order-paid`

**Triggered by**: PocketBase Hook (orders.pb.js)

**Request Body**:
```json
{
  "order_id": "order123",
  "product_id": "abc123",
  "customer_email": "customer@example.com",
  "amount": 12.00,
  "timestamp": "2024-12-01T12:00:00Z"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "workflow_id": "workflow-abc123"
}
```

### Slack Notification Webhook

**Endpoint**: `POST https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`

**Request Body**:
```json
{
  "text": "⚠️ Order #ORD-20241201-ABC123 failed - All providers down",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Order Failed*\nOrder: #ORD-20241201-ABC123\nReason: All eSIM providers unavailable\nAction: Manual refund required"
      }
    }
  ]
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "code": 400,
  "message": "Invalid request",
  "data": {
    "field": "email",
    "error": "Invalid email format"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Request successful |
| `201` | Created | Resource created |
| `204` | No Content | Resource deleted |
| `400` | Bad Request | Invalid request parameters |
| `401` | Unauthorized | Missing or invalid authentication |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Resource already exists |
| `422` | Unprocessable Entity | Validation error |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |
| `503` | Service Unavailable | Service temporarily unavailable |

### Error Examples

**400 Bad Request**:
```json
{
  "code": 400,
  "message": "Failed to create record.",
  "data": {
    "email": {
      "code": "validation_invalid_email",
      "message": "Must be a valid email address."
    }
  }
}
```

**401 Unauthorized**:
```json
{
  "code": 401,
  "message": "The request requires valid record authorization token to be set.",
  "data": {}
}
```

**404 Not Found**:
```json
{
  "code": 404,
  "message": "The requested resource wasn't found.",
  "data": {}
}
```

**429 Rate Limit**:
```json
{
  "code": 429,
  "message": "Rate limit exceeded. Please try again later.",
  "data": {
    "retry_after": 60
  }
}
```

---

## Rate Limiting

### Limits

| Endpoint Type | Rate Limit | Window |
|---------------|------------|--------|
| **Public (Read)** | 100 req/min | Per IP |
| **Authenticated** | 300 req/min | Per user |
| **Admin** | 1000 req/min | Per API key |
| **Webhooks** | No limit | - |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

### Handling Rate Limits

```typescript
// Automatic retry with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}
```

---

## OpenAPI Schema

### Full OpenAPI 3.0 Schema

```yaml
openapi: 3.0.0
info:
  title: NumnaRoad API
  description: Automated eSIM sales platform API
  version: 1.0.0
  contact:
    name: NumnaRoad Support
    url: https://numnaroad.com/support
    email: support@numnaroad.com
  license:
    name: Proprietary
    url: https://numnaroad.com/license

servers:
  - url: https://api.numnaroad.com/v1
    description: Production server
  - url: http://localhost:8090/api
    description: Development server (PocketBase)

tags:
  - name: Products
    description: eSIM product management
  - name: Orders
    description: Order processing
  - name: Customers
    description: Customer management
  - name: Payments
    description: Payment processing

paths:
  /collections/esim_products/records:
    get:
      tags:
        - Products
      summary: List all products
      operationId: listProducts
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: perPage
          in: query
          schema:
            type: integer
            default: 30
            maximum: 100
        - name: sort
          in: query
          schema:
            type: string
            example: "-created"
        - name: filter
          in: query
          schema:
            type: string
            example: "country='Japan'&&is_active=true"
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductListResponse'

    post:
      tags:
        - Products
      summary: Create a new product (Admin only)
      operationId: createProduct
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProductCreate'
      responses:
        '200':
          description: Product created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

  /collections/esim_products/records/{id}:
    get:
      tags:
        - Products
      summary: Get product by ID
      operationId: getProduct
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
        '404':
          $ref: '#/components/responses/NotFound'

  /collections/orders/records:
    post:
      tags:
        - Orders
      summary: Create a new order
      operationId: createOrder
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderCreate'
      responses:
        '200':
          description: Order created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key

  schemas:
    Product:
      type: object
      properties:
        id:
          type: string
          example: "abc123"
        name:
          type: string
          example: "일본 eSIM 7일 무제한"
        slug:
          type: string
          example: "japan-7days-unlimited"
        country:
          type: string
          example: "Japan"
        duration:
          type: integer
          example: 7
        data_limit:
          type: string
          example: "Unlimited"
        price:
          type: number
          format: float
          example: 12.00
        cost:
          type: number
          format: float
          example: 8.00
        margin_percent:
          type: number
          format: float
          example: 33.33
        currency:
          type: string
          example: "USD"
        is_active:
          type: boolean
          example: true
        provider:
          type: string
          example: "eSIM Card"
        stock:
          type: integer
          example: 50
        created:
          type: string
          format: date-time
        updated:
          type: string
          format: date-time

    ProductCreate:
      type: object
      required:
        - name
        - slug
        - country
        - duration
        - price
        - cost
      properties:
        name:
          type: string
        slug:
          type: string
        country:
          type: string
        duration:
          type: integer
        data_limit:
          type: string
        price:
          type: number
        cost:
          type: number
        provider:
          type: string
        stock:
          type: integer

    ProductListResponse:
      type: object
      properties:
        page:
          type: integer
        perPage:
          type: integer
        totalPages:
          type: integer
        totalItems:
          type: integer
        items:
          type: array
          items:
            $ref: '#/components/schemas/Product'

    Order:
      type: object
      properties:
        id:
          type: string
        order_id:
          type: string
        product:
          type: string
        customer_email:
          type: string
          format: email
        amount:
          type: number
        currency:
          type: string
        payment_status:
          type: string
          enum: [pending, paid, failed, refunded]
        status:
          type: string
          enum: [pending, processing, completed, failed]
        payment_id:
          type: string
          nullable: true
        esim_qr_code:
          type: string
          nullable: true
        esim_activation_code:
          type: string
          nullable: true
        created:
          type: string
          format: date-time
        updated:
          type: string
          format: date-time

    OrderCreate:
      type: object
      required:
        - order_id
        - product
        - customer_email
        - amount
      properties:
        order_id:
          type: string
        product:
          type: string
        customer_email:
          type: string
          format: email
        amount:
          type: number
        currency:
          type: string
          default: "USD"

    Error:
      type: object
      properties:
        code:
          type: integer
        message:
          type: string
        data:
          type: object

  responses:
    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    Forbidden:
      description: Forbidden
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    NotFound:
      description: Not Found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
```

---

## Code Examples

### TypeScript SDK

```typescript
// lib/api-client.ts
export class NumnaRoadAPI {
  private baseURL: string;
  private token?: string;

  constructor(baseURL: string, token?: string) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async getProducts(filter?: string): Promise<Product[]> {
    const url = new URL(`${this.baseURL}/api/collections/esim_products/records`);
    if (filter) url.searchParams.set('filter', filter);

    const response = await fetch(url.toString());
    const data = await response.json();
    return data.items;
  }

  async getProduct(id: string): Promise<Product> {
    const response = await fetch(
      `${this.baseURL}/api/collections/esim_products/records/${id}`
    );
    return response.json();
  }

  async createOrder(order: OrderCreate): Promise<Order> {
    const response = await fetch(
      `${this.baseURL}/api/collections/orders/records`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
        },
        body: JSON.stringify(order),
      }
    );
    return response.json();
  }
}

// Usage
const api = new NumnaRoadAPI('http://localhost:8090');
const products = await api.getProducts("country='Japan'");
```

---

## Validation Checklist

### API Specification Completeness

- [x] All endpoints documented
- [x] Request/Response schemas defined
- [x] Authentication methods specified
- [x] Error handling documented
- [x] Rate limiting defined
- [x] OpenAPI 3.0 schema provided
- [x] Code examples included
- [x] Webhook endpoints documented

---

## 📚 Additional Resources

- **[Postman Collection](./postman/NumnaRoad.postman_collection.json)** - Import to Postman
- **[Swagger UI](https://api.numnaroad.com/docs)** - Interactive API docs
- **[PocketBase Docs](https://pocketbase.io/docs/)** - PocketBase API reference

---

> **TL;DR**:
> - **Base URL**: `https://api.numnaroad.com` (Production), `http://localhost:8090` (Dev)
> - **Auth**: JWT Token or API Key
> - **Main Endpoints**: Products, Orders, Customers, Payments
> - **Rate Limit**: 100 req/min (public), 300 req/min (authenticated)
> - **OpenAPI**: Full schema included for code generation
