# Quickstart: Automated Order Processing

**Feature Branch**: `001-order-processing`
**Date**: 2025-12-02

This guide walks through setting up and testing the automated order processing feature locally.

---

## Prerequisites

- Node.js 20 LTS
- PocketBase 0.22+ installed
- n8n (Docker or local)
- Stripe CLI (for webhook testing)
- Stripe test account

## Design System

- **Material Design 3 (M3)** with MUI v6+
- **Primary Color**: #6366F1 (Indigo)
- **Languages**: Korean (default), English
- **Customer UI**: Mobile-first responsive
- **Admin UI**: Desktop-optimized (1024px+)

---

## 1. Environment Setup

### 1.1 Clone and Install

```bash
git clone https://github.com/Prometheus-P/NumnaRoad.git
cd NumnaRoad
git checkout 001-order-processing
npm install
```

### 1.2 Install MUI and i18n Dependencies

```bash
# MUI v6 with M3 theme support
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/x-data-grid  # For admin data tables

# Korean-optimized font
npm install @fontsource/pretendard

# Internationalization
npm install next-intl
```

### 1.3 Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with these values:

```bash
# PocketBase
POCKETBASE_URL=http://127.0.0.1:8090

# Stripe (use test keys!)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Get from Stripe CLI

# eSIM Providers (at least one required)
ESIM_CARD_API_KEY=your_test_key
ESIM_CARD_API_URL=https://api.esimcard.com/v1

# Optional providers for failover testing
MOBIMATTER_API_KEY=your_test_key
MOBIMATTER_API_URL=https://api.mobimatter.com/v1

AIRALO_API_KEY=your_test_key
AIRALO_API_URL=https://partners.airalo.com/api/v1

# n8n
N8N_WEBHOOK_URL=http://localhost:5678

# Email
RESEND_API_KEY=re_test_...
```

---

## 2. Start Services

### 2.1 PocketBase

```bash
cd pocketbase
./pocketbase serve
# Admin UI: http://127.0.0.1:8090/_/
```

Create admin account on first run.

### 2.2 n8n (Docker)

```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=admin \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n

# Access at http://localhost:5678
```

### 2.3 Next.js Dev Server

```bash
cd apps/web
npm run dev
# Access at http://localhost:3000
```

### 2.4 Stripe CLI (for webhooks)

```bash
# Install Stripe CLI first: https://stripe.com/docs/stripe-cli

stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the webhook signing secret (whsec_...) to .env
```

---

## 3. Database Setup

### 3.1 Create Collections

In PocketBase Admin UI (`http://127.0.0.1:8090/_/`):

1. **esim_providers** collection:
   - Import schema from `pocketbase/pb_migrations/003_esim_providers.js`

2. **esim_products** collection:
   - Import schema from migration files

3. **orders** collection:
   - Import schema from `pocketbase/pb_migrations/001_orders.js`

4. **automation_logs** collection:
   - Import schema from `pocketbase/pb_migrations/002_automation_logs.js`

### 3.2 Seed Provider Data

```bash
npm run seed:providers
# Or manually add via PocketBase Admin UI
```

Default providers:
| Name | Priority | Active |
|------|----------|--------|
| eSIM Card | 100 | Yes |
| MobiMatter | 80 | Yes |
| Airalo | 60 | Yes |

### 3.3 Add Test Product

In PocketBase Admin, create a product in `esim_products`:

```json
{
  "name": "Bolivia 5GB 7 Days",
  "slug": "bolivia-5gb-7d",
  "country": "BO",
  "provider_id": "<esimcard_provider_id>",
  "provider_sku": "BOL-5GB-7D",
  "price": 15000,
  "data_limit": "5GB",
  "duration_days": 7,
  "is_active": true
}
```

---

## 4. Import n8n Workflow

### 4.1 Import Workflow

1. Open n8n at `http://localhost:5678`
2. Create new workflow
3. Import from file: `automation/n8n-workflows/order-processing.json`

### 4.2 Configure Credentials

In n8n, add credentials for:

- **PocketBase**: URL + admin token
- **Resend**: API key
- **eSIM Card**: API key (header auth)

### 4.3 Activate Workflow

Toggle workflow to "Active" state.

---

## 5. Test the Flow

### 5.1 Manual Test: Create Order via Stripe CLI

```bash
# Trigger a test checkout.session.completed event
stripe trigger checkout.session.completed \
  --override checkout_session:metadata.product_id=<your_product_id> \
  --override checkout_session:customer_email=test@example.com
```

### 5.2 Verify Order Created

Check PocketBase Admin:
- `orders` collection should have new record with status "pending"
- `automation_logs` should show "webhook_received" entry

### 5.3 Verify n8n Workflow Triggered

Check n8n Executions:
- Should see new execution for order processing
- Follow execution steps to see provider calls

### 5.4 Verify Email Sent

Check Resend dashboard or test email inbox for eSIM delivery email.

---

## 6. Test Failover

### 6.1 Simulate Provider Failure

1. In PocketBase, set `eSIM Card` provider's `is_active` to `false`
2. Trigger another test order
3. Verify n8n falls back to MobiMatter

### 6.2 Check Logs

Query `automation_logs`:
```
filter: order_id = "<order_id>"
sort: created_at ASC
```

Should see:
1. `provider_call_started` (eSIM Card)
2. `provider_call_failed` or `failover_triggered`
3. `provider_call_started` (MobiMatter)
4. `provider_call_success`

---

## 7. Common Issues

### Webhook Signature Fails

**Symptom**: 400 error "Webhook signature verification failed"

**Fix**:
1. Ensure using `whsec_` secret from `stripe listen` output
2. Verify `.env` has correct `STRIPE_WEBHOOK_SECRET`
3. Restart Next.js dev server after env change

### n8n Webhook Not Triggering

**Symptom**: Order created but n8n shows no execution

**Fix**:
1. Check PocketBase hook is active: `pocketbase/pb_hooks/orders.pb.js`
2. Verify `N8N_WEBHOOK_URL` in environment
3. Check n8n workflow is "Active"
4. Check n8n logs: `docker logs n8n`

### Provider API Returns 401

**Symptom**: "Authentication failed" in automation_logs

**Fix**:
1. Verify API key in `.env` is valid
2. Check key hasn't expired
3. Ensure using correct environment variable name

### Email Not Sent

**Symptom**: Order completes but no email received

**Fix**:
1. Check Resend API key is valid
2. Verify email domain is verified in Resend
3. Check spam folder
4. Look for `email_failed` in automation_logs

---

## 8. Performance Validation

### Target: 10 seconds end-to-end

Use the timing in automation_logs to validate:

```sql
SELECT
  order_id,
  MAX(created_at) - MIN(created_at) as total_duration_ms
FROM automation_logs
WHERE order_id = '<order_id>'
GROUP BY order_id
```

Breakdown targets:
| Step | Target |
|------|--------|
| Webhook → Order created | < 500ms |
| Order → n8n trigger | < 1s |
| Provider API call | < 5s |
| Email send | < 2s |
| Status update | < 500ms |

---

## 9. Next Steps

After local validation:

1. Run contract tests: `npm test -- --grep "stripe-webhook"`
2. Run integration tests: `npm test -- --grep "order-processing"`
3. Deploy to staging (Railway)
4. Configure production Stripe webhook
5. Smoke test with real payment

---

## Quick Reference

| Service | URL | Credentials |
|---------|-----|-------------|
| Next.js | http://localhost:3000 | - |
| PocketBase Admin | http://127.0.0.1:8090/_/ | Created on first run |
| n8n | http://localhost:5678 | admin/admin |
| Stripe Dashboard | https://dashboard.stripe.com/test | Your account |

---

## 10. UI Setup (Material Design 3)

### 10.1 MUI Theme Configuration

Create `apps/web/components/ui/theme/m3-theme.ts`:

```typescript
import { createTheme } from '@mui/material/styles';

// Brand primary color: Indigo #6366F1
export const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#6366F1' },
        secondary: { main: '#EC4899' },
        error: { main: '#EF4444' },
        warning: { main: '#F59E0B' },
        success: { main: '#10B981' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#818CF8' },
        secondary: { main: '#F472B6' },
        error: { main: '#F87171' },
        warning: { main: '#FBBF24' },
        success: { main: '#34D399' },
      },
    },
  },
  typography: {
    fontFamily: '"Pretendard", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
});
```

### 10.2 Theme Provider Setup

Create `apps/web/components/providers/ThemeProvider.tsx`:

```typescript
'use client';

import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '../ui/theme/m3-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
```

### 10.3 i18n Setup

Create `apps/web/i18n.ts`:

```typescript
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./locales/${locale}.json`)).default,
}));
```

Create locale files:

- `apps/web/locales/ko.json` - Korean translations
- `apps/web/locales/en.json` - English translations

### 10.4 Verify Theme

Start dev server and verify:

1. **Light/Dark mode**: Toggle system preference
2. **Primary color**: Buttons should be Indigo (#6366F1)
3. **Typography**: Korean text should render with Pretendard font
4. **Responsive**: Customer pages should be mobile-first

---

## 11. UI Test Pages

### Customer Order Tracking

```
http://localhost:3000/order/{orderId}
```

- Displays order status with M3 progress indicator
- Shows QR code when order completed
- Mobile-optimized layout

### Admin Dashboard

```
http://localhost:3000/admin
```

- Navigation Rail sidebar
- Order list with DataGrid
- Provider health cards
- Desktop-optimized (1024px+)
