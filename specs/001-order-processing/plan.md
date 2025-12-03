# Implementation Plan: Automated Order Processing

**Branch**: `001-order-processing` | **Date**: 2025-12-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-order-processing/spec.md`

## Summary

Implement automated eSIM order processing with multi-provider failover, customer order tracking UI, and admin dashboard using Material Design 3 (MUI v6+). Core automation flow: Stripe webhook → PocketBase order → n8n workflow → eSIM provider API → Email delivery. Frontend: Mobile-first customer UI (order tracking) + desktop-optimized admin dashboard.

## Technical Context

**Language/Version**: TypeScript 5.3+ (strict mode, `any` prohibited)
**Primary Dependencies**: Next.js 14, MUI v6+ (M3 theme), PocketBase SDK, Stripe SDK, Resend
**Storage**: PocketBase (SQLite embedded), n8n (workflow state)
**Testing**: Vitest (unit/integration), Playwright (E2E)
**Target Platform**: Railway (Linux containers), Modern browsers (Chrome 90+, Safari 15+)
**Project Type**: Web application (Next.js full-stack)
**Performance Goals**: <10s order processing, <500ms API p95, <2.5s LCP
**Constraints**: <512MB memory per service, 30s n8n workflow timeout
**Scale/Scope**: 100 concurrent orders, bilingual (KO/EN)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Automation-First** | ✅ PASS | Webhook → n8n → Provider → Email flow fully automated; no manual steps |
| **II. TDD Mandatory** | ✅ PASS | Tests defined before implementation in spec (US1-US5 acceptance scenarios) |
| **III. Reliability & Failover** | ✅ PASS | 3 providers (eSIM Card → MobiMatter → Airalo), circuit breaker (FR-011/012), exponential backoff (FR-004) |
| **IV. Simplicity & YAGNI** | ✅ PASS | MVP scope: 5 user stories, no speculative features |
| **V. Observability** | ✅ PASS | Structured JSON logs (US3-AS4), correlation IDs (FR-008), Sentry integration |

### Technology Standards Compliance

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| TypeScript strict mode | ✅ | `tsconfig.json` with `strict: true`, `noImplicitAny: true` |
| Frontend: Next.js 14 | ✅ | App Router, Server Components |
| **Frontend: MUI v6+** | ✅ | Replaces shadcn/ui per clarification (M3 design system requirement) |
| Backend: PocketBase | ✅ | 0.22+ with hooks for automation triggers |
| Database: SQLite | ✅ | Embedded with PocketBase |
| Automation: n8n | ✅ | Self-hosted, webhook-triggered workflows |
| Payment: Stripe | ✅ | Webhook with signature verification |
| Email: Resend | ✅ | Korean/English bilingual templates |
| Monitoring: Sentry | ✅ | Error tracking with order context |

### Security Compliance

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| No credit card storage | ✅ | Stripe handles PCI; only `payment_intent` stored |
| Webhook signature verification | ✅ | FR-009 mandatory check |
| API keys in env vars | ✅ | SR-002; never in code |
| Email encryption at rest | ✅ | SR-001; AES-256-GCM |
| Rate limiting | ⏳ | Planned for webhook endpoint |

**Constitution Gate: PASSED**

## Project Structure

### Documentation (this feature)

```text
specs/001-order-processing/
├── plan.md              # This file
├── spec.md              # Feature specification with clarifications
├── research.md          # Phase 0 research findings
├── data-model.md        # PocketBase collections schema
├── quickstart.md        # Local development setup
├── contracts/           # API contracts (OpenAPI, TypeScript interfaces)
│   ├── stripe-webhook.ts
│   ├── provider-api.ts
│   └── internal-api.ts
├── checklists/          # Requirements quality checklists
│   └── comprehensive.md
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

```text
apps/web/                        # Next.js 14 application
├── app/
│   ├── api/
│   │   └── webhooks/stripe/     # Stripe webhook handler
│   ├── order/[orderId]/         # Customer order tracking (P4)
│   ├── admin/                   # Admin dashboard (P5)
│   │   ├── page.tsx             # Dashboard home
│   │   ├── orders/              # Order list & detail
│   │   └── providers/           # Provider health
│   └── layout.tsx               # Root layout with MUI ThemeProvider
├── components/
│   ├── ui/                      # MUI-based M3 components
│   │   ├── theme/               # M3 theme configuration
│   │   ├── OrderCard.tsx
│   │   ├── StatusChip.tsx
│   │   ├── DataTable.tsx
│   │   └── NavigationRail.tsx
│   └── i18n/                    # Localization components
├── lib/
│   ├── pocketbase.ts            # PocketBase client
│   ├── stripe.ts                # Stripe client
│   ├── resend.ts                # Email service
│   ├── crypto.ts                # Email encryption
│   └── i18n/                    # i18n configuration (ko/en)
└── locales/
    ├── ko.json                  # Korean translations
    └── en.json                  # English translations

services/
├── esim-providers/
│   ├── types.ts                 # Provider interfaces
│   ├── provider-factory.ts      # Factory + circuit breaker
│   ├── esimcard.ts              # eSIM Card adapter
│   ├── mobimatter.ts            # MobiMatter adapter
│   └── airalo.ts                # Airalo adapter
└── logging/
    └── automation-logger.ts     # Structured logging service

pocketbase/
├── pb_hooks/
│   └── orders.pb.js             # n8n trigger on order create
└── pb_migrations/
    ├── 001_esim_providers.js
    ├── 002_esim_products.js
    ├── 003_orders.js
    ├── 004_automation_logs.js
    └── 005_seed_providers.js

automation/
└── n8n-workflows/
    └── order-processing.json    # Main automation workflow

tests/
├── unit/
│   ├── order-service.test.ts
│   ├── provider-factory.test.ts
│   ├── logging-service.test.ts
│   └── crypto.test.ts
├── integration/
│   ├── order-processing.test.ts
│   ├── failover.test.ts
│   └── order-tracking.test.ts
├── contract/
│   └── stripe-webhook.test.ts
└── e2e/
    ├── customer-order-tracking.test.ts
    └── admin-dashboard.test.ts
```

**Structure Decision**: Web application with Next.js full-stack. UI components use MUI v6 with M3 theme. Services separated for testability. PocketBase for persistence, n8n for workflow orchestration.

## Complexity Tracking

> No constitution violations requiring justification.

| Item | Status | Notes |
|------|--------|-------|
| MUI v6 replacing shadcn/ui | Clarified | User requested M3 design system; MUI is most mature React M3 library |
| Bilingual i18n | Clarified | Korean primary, English secondary per user request |
| Mobile-first customer UI | Clarified | eSIM customers often on mobile; admin uses desktop |

## Phase Summary

### Phase 0: Research (Complete)
- [x] Stripe webhook integration patterns
- [x] n8n + PocketBase integration
- [x] eSIM provider API abstraction
- [ ] MUI v6 M3 theme setup (NEW)
- [ ] next-intl for i18n (NEW)

### Phase 1: Design (Complete)
- [x] data-model.md
- [x] contracts/
- [x] quickstart.md
- [ ] MUI theme configuration (NEW)
- [ ] i18n setup (NEW)

### Phase 2: Tasks
- See tasks.md for implementation breakdown
