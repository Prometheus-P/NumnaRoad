# Tasks: Automated Order Processing

**Input**: Design documents from `/specs/001-order-processing/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: TDD is MANDATORY per constitution (Principle II). All tests must be written and FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md project structure:
- **Next.js**: `apps/web/`
- **PocketBase**: `pocketbase/`
- **Services**: `services/`
- **Automation**: `automation/`
- **Tests**: `tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create directory structure per plan.md: apps/web/, pocketbase/, services/, automation/, tests/
- [x] T002 Initialize Next.js 14 project with TypeScript in apps/web/
- [x] T003 [P] Configure TypeScript strict mode and ESLint in apps/web/tsconfig.json
- [x] T004 [P] Install dependencies: stripe, pocketbase, resend, uuid in apps/web/package.json
- [x] T005 [P] Configure Vitest for testing in apps/web/vitest.config.ts
- [x] T006 Create .env.example with all required environment variables at repository root
- [x] T007 [P] Configure .gitignore for pocketbase/pb_data/, node_modules/, .env

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Create PocketBase migration for esim_providers collection in pocketbase/pb_migrations/001_esim_providers.js
- [x] T009 Create PocketBase migration for esim_products collection in pocketbase/pb_migrations/002_esim_products.js
- [x] T010 [P] Create PocketBase migration for orders collection in pocketbase/pb_migrations/003_orders.js
- [x] T011 [P] Create PocketBase migration for automation_logs collection in pocketbase/pb_migrations/004_automation_logs.js
- [x] T012 Create seed script for default esim_providers data in pocketbase/pb_migrations/005_seed_providers.js
- [x] T013 Implement PocketBase client singleton in apps/web/lib/pocketbase.ts
- [x] T014 [P] Implement Stripe client configuration in apps/web/lib/stripe.ts
- [x] T015 [P] Define shared TypeScript types in services/esim-providers/types.ts
- [x] T016 Create environment configuration loader in apps/web/lib/config.ts
- [x] T064 [P] Implement email encryption/decryption utility in apps/web/lib/crypto.ts
- [x] T065 Unit test for email encryption round-trip in tests/unit/crypto.test.ts

### UI Foundation (Required for US4/US5)

- [x] T068 [P] Install MUI v6+ dependencies (@mui/material, @emotion/react, @emotion/styled, @mui/x-data-grid) in apps/web/package.json
- [x] T069 [P] Install i18n dependencies (next-intl) in apps/web/package.json
- [x] T070 [P] Install Korean font (@fontsource/pretendard) in apps/web/package.json
- [x] T071 Create M3 theme configuration with Indigo primary (#6366F1) in apps/web/components/ui/theme/m3-theme.ts
- [x] T072 Create ThemeProvider component with CssBaseline in apps/web/components/providers/ThemeProvider.tsx
- [x] T073 Configure next-intl with ko/en locales in apps/web/i18n.ts
- [x] T074 Create Korean translations file in apps/web/locales/ko.json
- [x] T075 [P] Create English translations file in apps/web/locales/en.json
- [x] T076 Update root layout with ThemeProvider and i18n in apps/web/app/layout.tsx
- [x] T077 [P] Unit test for theme color values in tests/unit/theme.test.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Complete Order Fulfillment (Priority: P1) 🎯 MVP

**Goal**: Automated eSIM delivery within 10 seconds of payment completion

**Independent Test**: Complete a Stripe test payment and verify eSIM QR code arrives via email within 10 seconds

### Tests for User Story 1 (TDD - write first, verify fail)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T017 [P] [US1] Contract test for Stripe webhook signature verification in tests/contract/stripe-webhook.test.ts
- [x] T018 [P] [US1] Contract test for Stripe webhook payload parsing in tests/contract/stripe-webhook.test.ts
- [x] T019 [P] [US1] Unit test for order creation from webhook in tests/unit/order-service.test.ts
- [x] T020 [P] [US1] Integration test for full order flow (webhook → order → email) in tests/integration/order-processing.test.ts

### Implementation for User Story 1

- [x] T021 [US1] Implement Stripe webhook signature verification in apps/web/app/api/webhooks/stripe/route.ts
- [x] T022 [US1] Implement idempotency check for duplicate webhooks in apps/web/app/api/webhooks/stripe/route.ts
- [x] T023 [US1] Implement order creation from checkout.session.completed in apps/web/app/api/webhooks/stripe/route.ts
- [x] T024 [US1] Create PocketBase hook to trigger n8n on order create in pocketbase/pb_hooks/orders.pb.js
- [x] T025 [US1] Implement base eSIM provider interface in services/esim-providers/provider-factory.ts
- [x] T026 [P] [US1] Implement eSIM Card provider adapter in services/esim-providers/esimcard.ts
- [x] T027 [US1] Create n8n order processing workflow (single provider) in automation/n8n-workflows/order-processing.json
- [x] T028 [US1] Implement email service with Resend in apps/web/lib/resend.ts
- [x] T029 [US1] Add email template for eSIM delivery in apps/web/lib/email-templates/esim-delivery.ts
- [x] T030 [US1] Implement order status update (pending → processing → completed) in n8n workflow
- [x] T031 [US1] Add correlation_id generation in webhook handler in apps/web/app/api/webhooks/stripe/route.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - single provider happy path works

---

## Phase 4: User Story 2 - Multi-Provider Failover (Priority: P2)

**Goal**: 99.9% availability through automatic provider failover with exponential backoff

**Independent Test**: Mock primary provider failure and verify secondary provider is called automatically within 2 seconds

### Tests for User Story 2 (TDD - write first, verify fail)

- [x] T032 [P] [US2] Unit test for provider priority ordering in tests/unit/provider-factory.test.ts
- [x] T033 [P] [US2] Unit test for exponential backoff retry logic in tests/unit/provider-factory.test.ts
- [x] T034 [P] [US2] Unit test for failover cascade (provider1 → provider2 → provider3) in tests/unit/provider-factory.test.ts
- [x] T035 [P] [US2] Integration test for failover scenario in tests/integration/failover.test.ts

### Implementation for User Story 2

- [x] T036 [P] [US2] Implement MobiMatter provider adapter in services/esim-providers/mobimatter.ts
- [x] T037 [P] [US2] Implement Airalo provider adapter in services/esim-providers/airalo.ts
- [x] T038 [US2] Implement exponential backoff retry logic in services/esim-providers/provider-factory.ts
- [x] T039 [US2] Implement error classification (retryable vs non-retryable) in services/esim-providers/provider-factory.ts
- [x] T040 [US2] Implement provider cascade failover in services/esim-providers/provider-factory.ts
- [x] T041 [US2] Update n8n workflow for multi-provider failover in automation/n8n-workflows/order-processing.json
- [x] T042 [US2] Implement all-providers-failed handling (order status = failed) in n8n workflow
- [x] T043 [US2] Add admin alert on complete failure in automation/n8n-workflows/order-processing.json
- [x] T062 [US2] Implement circuit breaker state tracking in services/esim-providers/provider-factory.ts
- [x] T063 [US2] Unit test for circuit breaker state transitions (closed→open→half-open→closed) in tests/unit/provider-factory.test.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - system resilient to provider failures

---

## Phase 5: User Story 3 - Order State Tracking (Priority: P3)

**Goal**: Complete observability with correlation IDs and structured logging for all order processing steps

**Independent Test**: Process an order and query automation_logs collection for complete state history with all step transitions

### Tests for User Story 3 (TDD - write first, verify fail)

- [x] T044 [P] [US3] Unit test for log entry creation with correlation_id in tests/unit/logging-service.test.ts
- [x] T045 [P] [US3] Unit test for sensitive data redaction in tests/unit/logging-service.test.ts
- [x] T046 [P] [US3] Integration test for complete audit trail in tests/integration/order-tracking.test.ts

### Implementation for User Story 3

- [x] T047 [US3] Implement logging service with redaction in services/logging/automation-logger.ts
- [x] T048 [US3] Add step logging to webhook handler (webhook_received, order_created) in apps/web/app/api/webhooks/stripe/route.ts
- [x] T049 [US3] Add step logging to n8n workflow (provider_call_started, provider_call_success/failed) in automation/n8n-workflows/order-processing.json
- [x] T050 [US3] Add step logging for failover events (failover_triggered) in n8n workflow
- [x] T051 [US3] Add step logging for email events (email_sent, email_failed) in n8n workflow
- [x] T052 [US3] Add step logging for order completion (order_completed, order_failed) in n8n workflow
- [x] T053 [US3] Implement duration_ms tracking for each step in services/logging/automation-logger.ts
- [x] T054 [US3] Add request/response payload logging with redaction in services/logging/automation-logger.ts
- [x] T066 [US3] Verify all log outputs use structured JSON format in services/logging/automation-logger.ts
- [x] T067 [US3] Unit test for JSON log structure validation in tests/unit/logging-service.test.ts

**Checkpoint**: All user stories should now be independently functional with full observability

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T055 [P] Validate quickstart.md instructions work end-to-end
- [ ] T056 [P] Add Sentry error tracking integration in apps/web/lib/sentry.ts
- [x] T057 [P] Create npm scripts for common operations in package.json (test, lint, dev, build)
- [ ] T058 Performance validation: measure end-to-end order processing time (<10s target)
- [ ] T059 [P] Add rate limiting to webhook endpoint in apps/web/app/api/webhooks/stripe/route.ts
- [ ] T060 Security review: verify no secrets in code, webhook signature always checked
- [x] T061 Run full test suite and fix any failures

---

## Phase 7: User Story 4 - Customer Order Tracking UI (Priority: P4)

**Goal**: Mobile-first order tracking page with M3 design for customers to view order status and QR codes

**Independent Test**: Complete an order and access /order/{orderId} to verify status display, QR code rendering, and responsive layout

### Tests for User Story 4 (TDD - write first, verify fail)

- [x] T078 [P] [US4] Unit test for OrderCard component rendering in tests/unit/components/OrderCard.test.tsx
- [x] T079 [P] [US4] Unit test for StatusChip component states in tests/unit/components/StatusChip.test.tsx
- [x] T080 [P] [US4] Unit test for order status display logic in tests/unit/order-tracking.test.ts
- [x] T081 [P] [US4] Integration test for order tracking page data fetching in tests/integration/order-tracking-ui.test.ts
- [x] T082 [US4] E2E test for customer order tracking flow in tests/e2e/customer-order-tracking.test.ts

### Implementation for User Story 4

- [x] T083 [US4] Create StatusChip component with M3 color semantics in apps/web/components/ui/StatusChip.tsx
- [x] T084 [US4] Create OrderCard component with M3 Card styling in apps/web/components/ui/OrderCard.tsx
- [x] T085 [US4] Create QRCodeDisplay component for eSIM QR codes in apps/web/components/ui/QRCodeDisplay.tsx
- [x] T086 [US4] Create OrderProgress component with M3 LinearProgress in apps/web/components/ui/OrderProgress.tsx
- [x] T087 [US4] Create order tracking page at apps/web/app/order/[orderId]/page.tsx
- [x] T088 [US4] Implement order data fetching from PocketBase in apps/web/app/order/[orderId]/page.tsx
- [x] T089 [US4] Add installation instructions section with i18n in apps/web/components/ui/InstallationGuide.tsx
- [x] T090 [US4] Add error state display with support contact in apps/web/app/order/[orderId]/page.tsx
- [x] T091 [US4] Add order tracking translations to ko.json and en.json
- [x] T092 [US4] Implement mobile-first responsive layout (320px-428px primary) in apps/web/app/order/[orderId]/page.tsx
- [x] T093 [US4] Add accessibility attributes (ARIA labels, keyboard nav) to all components
- [x] T094 [US4] Implement light/dark mode support in order tracking page

**Checkpoint**: Customer order tracking UI complete - customers can view order status and QR codes on mobile/desktop

---

## Phase 8: User Story 5 - Admin Dashboard UI (Priority: P5)

**Goal**: Desktop-optimized admin dashboard with M3 design for monitoring orders and provider health

**Independent Test**: Log in as admin and verify order list, filtering, provider health cards, and real-time stats display

### Tests for User Story 5 (TDD - write first, verify fail)

- [x] T095 [P] [US5] Unit test for NavigationRail component in tests/unit/components/NavigationRail.test.tsx
- [x] T096 [P] [US5] Unit test for DataTable component with sorting/filtering in tests/unit/components/DataTable.test.tsx
- [x] T097 [P] [US5] Unit test for ProviderHealthCard component in tests/unit/components/ProviderHealthCard.test.tsx
- [x] T098 [P] [US5] Unit test for OrderStatsCard component in tests/unit/components/OrderStatsCard.test.tsx
- [x] T099 [P] [US5] Integration test for admin dashboard data aggregation in tests/integration/admin-dashboard.test.ts
- [x] T100 [US5] E2E test for admin dashboard navigation and filtering in tests/e2e/admin-dashboard.test.ts

### Implementation for User Story 5

- [x] T101 [US5] Create NavigationRail component with M3 styling in apps/web/components/ui/NavigationRail.tsx
- [x] T102 [US5] Create DataTable component using MUI DataGrid in apps/web/components/ui/DataTable.tsx
- [x] T103 [US5] Create OrderStatsCard component for dashboard summary in apps/web/components/ui/OrderStatsCard.tsx
- [x] T104 [US5] Create ProviderHealthCard component with circuit breaker status in apps/web/components/ui/ProviderHealthCard.tsx
- [x] T105 [US5] Create admin layout with NavigationRail in apps/web/app/admin/layout.tsx
- [x] T106 [US5] Create admin dashboard home page with stats in apps/web/app/admin/page.tsx
- [x] T107 [US5] Create admin orders list page with DataTable in apps/web/app/admin/orders/page.tsx
- [x] T108 [US5] Implement order filtering (status, date range, search) in apps/web/app/admin/orders/page.tsx
- [ ] T109 [US5] Create order detail modal with M3 Dialog in apps/web/components/ui/OrderDetailDialog.tsx
- [x] T110 [US5] Create admin providers page with health status in apps/web/app/admin/providers/page.tsx
- [ ] T111 [US5] Implement real-time stats updates using PocketBase realtime in apps/web/app/admin/page.tsx
- [x] T112 [US5] Add admin dashboard translations to ko.json and en.json (translations already exist)
- [x] T113 [US5] Implement desktop-optimized layout (1024px+ viewport) in apps/web/app/admin/layout.tsx
- [ ] T114 [US5] Add admin authentication check in apps/web/app/admin/layout.tsx
- [x] T115 [US5] Add accessibility for keyboard navigation in DataTable and NavigationRail

**Checkpoint**: Admin dashboard complete - admins can monitor orders, view logs, and check provider health

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion (can run parallel to US1)
- **User Story 3 (Phase 5)**: Depends on Foundational phase completion (can run parallel to US1/US2)
- **Polish (Phase 6)**: Depends on all user stories being complete
- **User Story 4 (Phase 7)**: Depends on UI Foundation (T068-T077) - Can run parallel to US5
- **User Story 5 (Phase 8)**: Depends on UI Foundation (T068-T077) - Can run parallel to US4

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on provider interface from US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Adds logging to existing flows but independently testable
- **User Story 4 (P4)**: Can start after UI Foundation - Requires order data from US1 but UI independently testable
- **User Story 5 (P5)**: Can start after UI Foundation - Requires provider data from US2 but UI independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD mandatory per constitution)
- Adapters/services before workflow integration
- Core implementation before polish
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup):**
```
T003, T004, T005, T007 can run in parallel after T001, T002
```

**Phase 2 (Foundational):**
```
T010, T011 can run in parallel after T008, T009
T013, T014, T015 can run in parallel after T012
```

**Phase 3 (US1 Tests):**
```
T017, T018, T019, T020 can all run in parallel
```

**Phase 3 (US1 Implementation):**
```
T026 can run in parallel with T025
```

**Phase 4 (US2 Tests):**
```
T032, T033, T034, T035 can all run in parallel
```

**Phase 4 (US2 Implementation):**
```
T036, T037 can run in parallel
```

**Phase 5 (US3 Tests):**
```
T044, T045, T046 can all run in parallel
```

**Phase 6 (Polish):**
```
T055, T056, T057, T059 can run in parallel
```

**Phase 2 (UI Foundation):**
```
T068, T069, T070 can run in parallel (npm installs)
T074, T075 can run in parallel (translation files)
```

**Phase 7 (US4 Tests):**
```
T078, T079, T080, T081 can all run in parallel
```

**Phase 7 (US4 Implementation):**
```
T083, T084, T085, T086 can run in parallel (M3 components)
```

**Phase 8 (US5 Tests):**
```
T095, T096, T097, T098, T099 can all run in parallel
```

**Phase 8 (US5 Implementation):**
```
T101, T102, T103, T104 can run in parallel (M3 components)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test order processing with single provider
5. Deploy to staging if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test failover scenarios → Deploy/Demo
4. Add User Story 3 → Verify audit trail → Deploy/Demo
5. Complete UI Foundation → MUI/i18n ready
6. Add User Story 4 → Customer order tracking UI → Deploy/Demo
7. Add User Story 5 → Admin dashboard UI → Deploy/Demo (Full release!)
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (core flow)
   - Developer B: User Story 2 (failover)
   - Developer C: User Story 3 (logging)
3. After UI Foundation complete:
   - Developer A: User Story 4 (customer UI)
   - Developer B: User Story 5 (admin UI)
4. Stories complete and integrate independently

---

## Task Summary

| Phase | Task Count | Completed | Parallel Opportunities |
|-------|------------|-----------|------------------------|
| Setup | 7 | 7 ✅ | 4 tasks parallelizable |
| Foundational (Backend) | 11 | 11 ✅ | 6 tasks parallelizable |
| Foundational (UI) | 10 | 0 | 5 tasks parallelizable |
| US1 (P1) | 15 | 15 ✅ | 5 tests parallel, 1 impl parallel |
| US2 (P2) | 14 | 14 ✅ | 5 tests parallel, 2 impl parallel |
| US3 (P3) | 13 | 13 ✅ | 3 tests parallel |
| Polish | 7 | 2 | 4 tasks parallelizable |
| US4 (P4) | 17 | 0 | 4 tests parallel, 4 impl parallel |
| US5 (P5) | 21 | 0 | 5 tests parallel, 4 impl parallel |
| **Total** | **115** | **62** | **40 parallel opportunities** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD mandatory)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Reference quickstart.md for local testing setup
