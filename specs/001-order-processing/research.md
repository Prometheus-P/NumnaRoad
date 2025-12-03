# Research: Automated Order Processing

**Feature Branch**: `001-order-processing`
**Date**: 2025-12-02
**Status**: Complete

## Research Summary

This document captures research findings for implementing automated order processing with multi-provider failover.

---

## 1. Stripe Webhook Integration (Next.js 14 App Router)

### Decision
Use signature verification with raw request body + event ID tracking for idempotency.

### Rationale
- **Signature Verification**: Non-negotiable security - prevents forged requests
- **Raw Body Requirement**: Stripe calculates signatures on exact raw UTF-8 request body. `req.json()` breaks verification in App Router
- **Idempotency**: Stripe delivers "at least once" - same webhook may arrive multiple times
- **Async Processing**: Return 200 immediately to avoid timeout retries

### Key Implementation Pattern

```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const body = await request.text()  // NOT req.json()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Idempotency check via database
  if (await isEventProcessed(event.id)) {
    return NextResponse.json({ received: true })
  }

  // Process and mark as processed
  // ...
}
```

### Gotchas to Avoid
1. **Using `req.json()` instead of `req.text()`** - breaks signature verification
2. **Wrong webhook secret** - Dashboard secrets differ from CLI secrets
3. **Processing before returning 200** - causes timeout retries
4. **Missing unique constraint on event ID** - concurrent duplicates bypass checks
5. **Middleware blocking webhooks** - add to `ignoredRoutes` in auth middleware

---

## 2. n8n + PocketBase Integration

### Decision
Event-driven webhook architecture with failover logic in n8n Function nodes.

### Rationale
- **Separation of Concerns**: PocketBase is stateless trigger, n8n contains business logic
- **Resilience**: Multi-provider failover in n8n orchestration layer
- **Observability**: All automation logged with correlation IDs
- **Cost-Effective**: Single n8n instance handles all workflows

### Workflow Structure

```
Webhook Trigger (PocketBase hook → n8n)
  ↓
[Validate Order] (IF node)
  ↓
[Call Primary Provider] (HTTP Request: eSIM Card API)
  ├─ Success → [Update Order] → [Send Email] → [Slack Notify]
  └─ Failure → [Prepare Failover] (Function node)
            ↓
       [Call Secondary Provider] (HTTP Request: MobiMatter)
            ├─ Success → [Update Order] → [Send Email]
            └─ Failure → [Call Tertiary Provider] (Airalo)
                     ├─ Success → [Update Order] → [Send Email]
                     └─ Failure → [Log Error] → [Alert] → [Refund]
```

### PocketBase Hook Pattern

```javascript
// pocketbase/pb_hooks/orders.pb.js
onRecordAfterCreateRequest((e) => {
  if (e.record.get('payment_status') === 'paid') {
    const correlationId = crypto.randomUUID();
    $http.send({
      url: `${N8N_WEBHOOK_URL}/webhook/order-paid`,
      method: 'POST',
      body: JSON.stringify({
        order_id: e.record.id,
        product_id: e.record.get('product'),
        customer_email: e.record.get('customer_email'),
        correlation_id: correlationId,
      }),
      timeout: 120,
    });
  }
}, 'orders');
```

### Gotchas to Avoid
1. **Duplicate orders** - Check `stripe_payment_intent` uniqueness before creating
2. **Stuck orders** - Set 1-hour timeout, auto-mark as failed
3. **n8n crashes mid-workflow** - Use `continueOnFail: true` on HTTP nodes
4. **Invalid QR codes** - Validate URL format before sending email
5. **Rate limits** - Add jitter to retry delays

---

## 3. eSIM Provider API Abstraction

### Decision
Unified provider interface with response normalization and error classification.

### Rationale
- Encapsulates API differences at provider layer
- Enables seamless failover without n8n complexity
- Centralized error classification for retry logic
- Type-safe responses across all providers

### Provider Comparison

| Aspect | eSIM Card | MobiMatter | Airalo |
|--------|-----------|------------|--------|
| **Auth** | `X-API-Key` header | Bearer token | Bearer token |
| **Order Endpoint** | `/orders` | `/v1/esim/purchase` | `/orders` |
| **Request Fields** | `product_id, email, quantity` | `package_id, customer_email, qty` | `package_id, quantity, type` |
| **QR Response** | `qr_code_url` (flat) | `esim.qr_image` (nested) | `sims[0].qrcode` (nested array) |

### TypeScript Interface

```typescript
export interface ESIMProvider {
  readonly name: string;
  readonly priority: number;

  createOrder(request: CreateESIMRequest): Promise<CreateESIMResponse>;
  getOrderStatus(orderId: string): Promise<OrderStatus>;
  cancelOrder(orderId: string): Promise<boolean>;
  listProducts(): Promise<Product[]>;
  getInventory(productId: string): Promise<number>;
}

export interface CreateESIMRequest {
  productId: string;
  email: string;
  quantity: number;
}

export interface CreateESIMResponse {
  success: boolean;
  orderId: string;
  iccid: string;
  qrCodeUrl: string;  // Always URL format (normalized)
  activationCode: string;
  provider: string;
}

export enum ErrorType {
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  OUT_OF_STOCK = 'out_of_stock',
  AUTHENTICATION = 'authentication',
  SERVER_ERROR = 'server_error',
  UNKNOWN = 'unknown',
}
```

### Error Classification for Retry

| Error Type | Retryable | Action |
|------------|-----------|--------|
| Timeout | Yes | Retry with backoff |
| Rate Limit | Yes | Wait Retry-After or 60s |
| Out of Stock | No | Try next provider |
| Authentication | No | Alert admin |
| Server Error (5xx) | Yes | Retry with backoff |

### Retry Strategy
- Exponential backoff: 1s → 2s → 4s (max 10s)
- Max 3 retries per provider
- On exhaustion, cascade to next priority provider

---

## 4. Resolved Clarifications

| Item | Resolution |
|------|------------|
| Testing Framework | Vitest for unit/integration (faster than Jest), Playwright for E2E |
| Email Provider | Resend API (per constitution Technology Standards) |
| Webhook Idempotency | Store `stripe_event_id` with unique constraint |
| Correlation ID Format | UUIDv4 generated at webhook receipt |
| Order Status States | pending → processing → completed/failed |
| n8n Deployment | Self-hosted on Railway (same instance as PocketBase) |

---

## 5. Alternatives Considered

### Stripe Webhook Handling
- **Alternative**: Use Stripe CLI for local testing only
- **Rejected**: Production needs proper signature verification

### n8n vs Custom Code
- **Alternative**: Implement workflow in Next.js API routes
- **Rejected**: n8n provides visual debugging, retry UI, easier maintenance

### Provider Integration
- **Alternative**: Direct provider calls without abstraction
- **Rejected**: Would require duplicate failover logic in multiple places

---

---

## 5. Material Design 3 with MUI v6+ (NEW)

### Decision
Use MUI (Material UI) v6+ with Material Design 3 theme for all UI components.

### Rationale
- **Native M3 Support**: MUI v6 has built-in Material Design 3 theming
- **Mature Ecosystem**: Largest React component library with TypeScript support
- **Dynamic Theming**: Supports M3 dynamic color system from brand color
- **Accessibility**: Built-in WCAG 2.1 AA compliance (keyboard nav, ARIA)
- **Production Ready**: Used by thousands of production apps

### MUI M3 Theme Configuration

```typescript
// apps/web/components/ui/theme/m3-theme.ts
import { createTheme, ThemeOptions } from '@mui/material/styles';
import { getDesignTokens } from '@mui/material-next/styles';

// Brand primary color from clarifications
const primaryColor = '#6366F1'; // Indigo

// Generate M3 color palette
export const lightTheme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: { main: primaryColor },
        mode: 'light',
      },
    },
    dark: {
      palette: {
        primary: { main: primaryColor },
        mode: 'dark',
      },
    },
  },
  typography: {
    fontFamily: '"Pretendard", "Roboto", sans-serif',
    // M3 Typography Scale
    displayLarge: { fontSize: '57px', lineHeight: '64px', fontWeight: 400 },
    displayMedium: { fontSize: '45px', lineHeight: '52px', fontWeight: 400 },
    displaySmall: { fontSize: '36px', lineHeight: '44px', fontWeight: 400 },
    headlineLarge: { fontSize: '32px', lineHeight: '40px', fontWeight: 400 },
    headlineMedium: { fontSize: '28px', lineHeight: '36px', fontWeight: 400 },
    headlineSmall: { fontSize: '24px', lineHeight: '32px', fontWeight: 400 },
    titleLarge: { fontSize: '22px', lineHeight: '28px', fontWeight: 500 },
    titleMedium: { fontSize: '16px', lineHeight: '24px', fontWeight: 500 },
    titleSmall: { fontSize: '14px', lineHeight: '20px', fontWeight: 500 },
    bodyLarge: { fontSize: '16px', lineHeight: '24px', fontWeight: 400 },
    bodyMedium: { fontSize: '14px', lineHeight: '20px', fontWeight: 400 },
    bodySmall: { fontSize: '12px', lineHeight: '16px', fontWeight: 400 },
    labelLarge: { fontSize: '14px', lineHeight: '20px', fontWeight: 500 },
    labelMedium: { fontSize: '12px', lineHeight: '16px', fontWeight: 500 },
    labelSmall: { fontSize: '11px', lineHeight: '16px', fontWeight: 500 },
  },
  shape: {
    borderRadius: 16, // M3 default
  },
});
```

### Key MUI Components for NumnaRoad

| Component | Use Case | M3 Feature |
|-----------|----------|------------|
| `Card` | Order display | Elevated/outlined variants |
| `Chip` | Status tags | Color semantics (error, success) |
| `DataGrid` | Admin order list | Sorting, filtering, pagination |
| `NavigationRail` | Admin sidebar | Desktop-optimized nav |
| `LinearProgress` | Order processing | Indeterminate progress |
| `Dialog` | Order details | Modal with scrim |
| `Snackbar` | Notifications | Status updates |
| `Button` | Actions | Filled, outlined, text variants |

### Installation

```bash
npm install @mui/material @mui/material-next @emotion/react @emotion/styled
npm install @fontsource/pretendard  # Korean-optimized font
```

### Gotchas to Avoid
1. **Server Components**: MUI requires `"use client"` directive
2. **Font Loading**: Use `next/font` or @fontsource for Korean fonts
3. **Dark Mode Flash**: Use `getInitColorSchemeScript()` for SSR
4. **Bundle Size**: Tree-shake unused components

---

## 6. Internationalization with next-intl (NEW)

### Decision
Use `next-intl` for Korean/English bilingual support.

### Rationale
- **Next.js Native**: Designed for App Router with RSC support
- **Type Safety**: TypeScript support for translation keys
- **ICU Format**: Standard message format for plurals, dates
- **SSR/SSG**: Proper locale handling in server components

### Configuration

```typescript
// apps/web/lib/i18n/config.ts
export const locales = ['ko', 'en'] as const;
export const defaultLocale = 'ko' as const;
export type Locale = typeof locales[number];

// apps/web/locales/ko.json
{
  "order": {
    "status": {
      "pending": "처리 대기중",
      "processing": "처리중",
      "completed": "완료",
      "failed": "실패"
    },
    "tracking": {
      "title": "주문 조회",
      "qrCode": "eSIM QR 코드",
      "installGuide": "설치 안내"
    }
  },
  "admin": {
    "dashboard": "대시보드",
    "orders": "주문 관리",
    "providers": "공급자 상태"
  }
}

// apps/web/locales/en.json
{
  "order": {
    "status": {
      "pending": "Pending",
      "processing": "Processing",
      "completed": "Completed",
      "failed": "Failed"
    },
    "tracking": {
      "title": "Order Tracking",
      "qrCode": "eSIM QR Code",
      "installGuide": "Installation Guide"
    }
  },
  "admin": {
    "dashboard": "Dashboard",
    "orders": "Order Management",
    "providers": "Provider Status"
  }
}
```

### Installation

```bash
npm install next-intl
```

---

## 7. Resolved Clarifications (Updated)

| Item | Resolution |
|------|------------|
| Testing Framework | Vitest for unit/integration, Playwright for E2E |
| Email Provider | Resend API (per constitution Technology Standards) |
| Webhook Idempotency | Store `stripe_event_id` with unique constraint |
| Correlation ID Format | UUIDv4 generated at webhook receipt |
| Order Status States | pending → processing → completed/failed |
| n8n Deployment | Self-hosted on Railway (same instance as PocketBase) |
| **Design System** | Material Design 3 (M3) |
| **Component Library** | MUI (Material UI) v6+ |
| **Brand Primary Color** | #6366F1 (Indigo) |
| **Localization** | Korean (default), English secondary |
| **Customer UI** | Mobile-first responsive (320px-428px) |
| **Admin UI** | Desktop-optimized (1024px+) |

---

## 8. Alternatives Considered (Updated)

### Stripe Webhook Handling
- **Alternative**: Use Stripe CLI for local testing only
- **Rejected**: Production needs proper signature verification

### n8n vs Custom Code
- **Alternative**: Implement workflow in Next.js API routes
- **Rejected**: n8n provides visual debugging, retry UI, easier maintenance

### Provider Integration
- **Alternative**: Direct provider calls without abstraction
- **Rejected**: Would require duplicate failover logic in multiple places

### UI Component Library
- **Alternative A**: shadcn/ui (Radix-based, Tailwind)
- **Alternative B**: Radix UI primitives with custom styling
- **Alternative C**: Custom components from scratch
- **Selected**: MUI v6+ with M3 theme
- **Rationale**: User explicitly requested Material Design 3; MUI is the most mature React M3 implementation

### Internationalization
- **Alternative A**: react-i18next
- **Alternative B**: Custom context-based solution
- **Selected**: next-intl
- **Rationale**: Native Next.js App Router support, RSC compatible, TypeScript-first

---

## Next Steps

1. **Phase 1**: Create data model (orders, automation_logs, esim_providers collections)
2. **Phase 1**: Define API contracts (Stripe webhook, n8n trigger, provider adapters)
3. **Phase 1**: Generate quickstart.md for local development setup
4. **Phase 1**: Configure MUI M3 theme with Indigo primary (#6366F1)
5. **Phase 1**: Set up next-intl with Korean/English translations
