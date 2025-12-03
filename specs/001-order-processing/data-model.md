# Data Model: Automated Order Processing

**Feature Branch**: `001-order-processing`
**Date**: 2025-12-02
**Storage**: PocketBase (SQLite embedded)

---

## Entity Relationship Diagram

```
┌─────────────────────┐     ┌─────────────────────┐
│      orders         │     │   esim_providers    │
├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │     │ id (PK)             │
│ customer_email      │     │ name                │
│ product_id (FK)     │──┐  │ priority            │
│ stripe_payment_int  │  │  │ api_endpoint        │
│ stripe_session_id   │  │  │ api_key_env_var     │
│ status              │  │  │ is_active           │
│ provider_used       │──┼──│ success_rate        │
│ esim_qr_code        │  │  │ created_at          │
│ esim_iccid          │  │  │ updated_at          │
│ correlation_id      │  │  └─────────────────────┘
│ created_at          │  │
│ completed_at        │  │  ┌─────────────────────┐
│ error_message       │  │  │  esim_products      │
└─────────────────────┘  │  ├─────────────────────┤
         │               └──│ id (PK)             │
         │                  │ name                │
         ▼                  │ country             │
┌─────────────────────┐     │ provider_id (FK)    │
│  automation_logs    │     │ provider_sku        │
├─────────────────────┤     │ price               │
│ id (PK)             │     │ data_limit          │
│ order_id (FK)       │     │ duration_days       │
│ correlation_id      │     │ is_active           │
│ step_name           │     │ stock_count         │
│ status              │     └─────────────────────┘
│ provider_name       │
│ request_payload     │
│ response_payload    │
│ error_message       │
│ duration_ms         │
│ created_at          │
└─────────────────────┘
```

---

## Collection: `orders`

Represents a customer eSIM purchase from payment through fulfillment.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text (PK) | Auto | PocketBase record ID |
| `customer_email` | text | Yes | Customer email for delivery (encrypted at rest with AES-256-GCM) |
| `product_id` | relation | Yes | Reference to esim_products |
| `stripe_payment_intent` | text | Yes | Stripe payment_intent ID (idempotency key) |
| `stripe_session_id` | text | No | Stripe checkout session ID |
| `status` | select | Yes | Order state: pending, processing, completed, failed |
| `provider_used` | relation | No | Which provider fulfilled the order |
| `esim_qr_code` | url | No | QR code URL from provider |
| `esim_iccid` | text | No | eSIM ICCID identifier |
| `esim_activation_code` | text | No | Manual activation code (LPA) |
| `correlation_id` | text | Yes | UUID for tracing through logs |
| `error_message` | text | No | Error details if status=failed |
| `created_at` | date | Auto | Order creation timestamp |
| `completed_at` | date | No | Fulfillment completion timestamp |

### Indexes

- `UNIQUE(stripe_payment_intent)` - Idempotency enforcement
- `INDEX(status)` - Query by state
- `INDEX(correlation_id)` - Log correlation lookup
- `INDEX(created_at)` - Time-based queries

### State Machine

```
         ┌──────────────────────────────────────────┐
         │                                          │
         ▼                                          │
    ┌─────────┐     ┌────────────┐     ┌───────────┐
    │ pending │────▶│ processing │────▶│ completed │
    └─────────┘     └────────────┘     └───────────┘
                          │
                          │ (all providers fail)
                          ▼
                    ┌──────────┐
                    │  failed  │
                    └──────────┘
```

### Validation Rules

- `customer_email`: Valid email format
- `stripe_payment_intent`: Must start with `pi_`
- `status`: One of `pending`, `processing`, `completed`, `failed`
- `esim_qr_code`: Must be HTTPS URL when present
- `correlation_id`: Must be valid UUIDv4

---

## Collection: `automation_logs`

Audit trail for order processing with step-by-step visibility.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text (PK) | Auto | PocketBase record ID |
| `order_id` | relation | Yes | Reference to orders |
| `correlation_id` | text | Yes | Matches order correlation_id |
| `step_name` | text | Yes | Processing step identifier |
| `status` | select | Yes | Step outcome: started, success, failed, skipped |
| `provider_name` | text | No | Provider attempted (if applicable) |
| `request_payload` | json | No | Outgoing request (sensitive data redacted) |
| `response_payload` | json | No | Incoming response (sensitive data redacted) |
| `error_message` | text | No | Error details if status=failed |
| `error_type` | text | No | Classified error type (timeout, rate_limit, etc.) |
| `duration_ms` | number | No | Step execution time in milliseconds |
| `retry_count` | number | No | Which retry attempt (0=first try) |
| `created_at` | date | Auto | Log entry timestamp |

### Indexes

- `INDEX(order_id)` - Query logs by order
- `INDEX(correlation_id)` - Query logs by correlation
- `INDEX(step_name, status)` - Query by step outcome
- `INDEX(created_at)` - Time-based queries

### Step Names (Enum)

| Step | Description |
|------|-------------|
| `webhook_received` | Stripe webhook received and validated |
| `order_created` | Order record created in PocketBase |
| `provider_call_started` | API call to provider initiated |
| `provider_call_success` | Provider returned eSIM successfully |
| `provider_call_failed` | Provider call failed (includes retry info) |
| `failover_triggered` | Moving to next provider |
| `email_sent` | Customer email delivered |
| `email_failed` | Email delivery failed |
| `order_completed` | Order marked as completed |
| `order_failed` | Order marked as failed (all options exhausted) |

---

## Collection: `esim_providers`

Configuration for eSIM provider integrations.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text (PK) | Auto | PocketBase record ID |
| `name` | text | Yes | Provider display name |
| `slug` | text | Yes | Identifier: esimcard, mobimatter, airalo |
| `priority` | number | Yes | Failover order (100=highest) |
| `api_endpoint` | url | Yes | Base API URL |
| `api_key_env_var` | text | Yes | Environment variable name for API key |
| `timeout_ms` | number | Yes | Request timeout in milliseconds |
| `max_retries` | number | Yes | Max retry attempts |
| `is_active` | bool | Yes | Whether provider is enabled |
| `success_rate` | number | No | Rolling success rate (0-100) |
| `last_success_at` | date | No | Last successful order timestamp |
| `last_failure_at` | date | No | Last failed order timestamp |
| `created_at` | date | Auto | Record creation timestamp |
| `updated_at` | date | Auto | Record update timestamp |

### Indexes

- `UNIQUE(slug)` - Provider identifier
- `INDEX(priority, is_active)` - Failover ordering

### Default Data

```json
[
  {
    "name": "eSIM Card",
    "slug": "esimcard",
    "priority": 100,
    "api_endpoint": "https://api.esimcard.com/v1",
    "api_key_env_var": "ESIM_CARD_API_KEY",
    "timeout_ms": 30000,
    "max_retries": 3,
    "is_active": true
  },
  {
    "name": "MobiMatter",
    "slug": "mobimatter",
    "priority": 80,
    "api_endpoint": "https://api.mobimatter.com/v1",
    "api_key_env_var": "MOBIMATTER_API_KEY",
    "timeout_ms": 30000,
    "max_retries": 3,
    "is_active": true
  },
  {
    "name": "Airalo",
    "slug": "airalo",
    "priority": 60,
    "api_endpoint": "https://partners.airalo.com/api/v1",
    "api_key_env_var": "AIRALO_API_KEY",
    "timeout_ms": 30000,
    "max_retries": 3,
    "is_active": true
  }
]
```

---

## Collection: `esim_products`

Product catalog mapping to provider SKUs.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text (PK) | Auto | PocketBase record ID |
| `name` | text | Yes | Product display name |
| `slug` | text | Yes | URL-friendly identifier |
| `country` | text | Yes | ISO country code or "global" |
| `provider_id` | relation | Yes | Reference to esim_providers |
| `provider_sku` | text | Yes | SKU in provider's system |
| `price` | number | Yes | Price in KRW |
| `data_limit` | text | Yes | Data allowance (e.g., "5GB", "Unlimited") |
| `duration_days` | number | Yes | Validity period in days |
| `is_active` | bool | Yes | Whether product is available |
| `stock_count` | number | No | Cached inventory count |
| `created_at` | date | Auto | Record creation timestamp |
| `updated_at` | date | Auto | Record update timestamp |

### Indexes

- `UNIQUE(slug)` - Product identifier
- `INDEX(country, is_active)` - Product filtering
- `INDEX(provider_id)` - Provider lookup

---

## PocketBase Migration

```javascript
// pocketbase/pb_migrations/001_orders.js
migrate((db) => {
  const collection = new Collection({
    name: 'orders',
    type: 'base',
    schema: [
      { name: 'customer_email', type: 'email', required: true },
      { name: 'product_id', type: 'relation', options: { collectionId: 'esim_products' }, required: true },
      { name: 'stripe_payment_intent', type: 'text', required: true },
      { name: 'stripe_session_id', type: 'text' },
      { name: 'status', type: 'select', options: { values: ['pending', 'processing', 'completed', 'failed'] }, required: true },
      { name: 'provider_used', type: 'relation', options: { collectionId: 'esim_providers' } },
      { name: 'esim_qr_code', type: 'url' },
      { name: 'esim_iccid', type: 'text' },
      { name: 'esim_activation_code', type: 'text' },
      { name: 'correlation_id', type: 'text', required: true },
      { name: 'error_message', type: 'text' },
      { name: 'completed_at', type: 'date' },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_orders_payment_intent ON orders (stripe_payment_intent)',
      'CREATE INDEX idx_orders_status ON orders (status)',
      'CREATE INDEX idx_orders_correlation ON orders (correlation_id)',
    ],
  });

  return Dao(db).saveCollection(collection);
});
```

---

## Data Redaction Rules

For `automation_logs.request_payload` and `response_payload`:

| Field Pattern | Redaction |
|---------------|-----------|
| `*email*` | Hash: `sha256(email).substring(0,8)` |
| `*api_key*`, `*token*` | Replace with `[REDACTED]` |
| `*password*`, `*secret*` | Replace with `[REDACTED]` |
| QR code URLs | Keep (not sensitive) |
| ICCID | Keep (needed for debugging) |
