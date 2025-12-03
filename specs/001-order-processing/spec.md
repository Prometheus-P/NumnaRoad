# Feature Specification: Automated Order Processing

**Feature Branch**: `001-order-processing`
**Created**: 2025-12-02
**Status**: Draft
**Input**: Automated eSIM order processing with multi-provider failover
**Design System**: Material Design 3 (M3)

## Clarifications

### Session 2025-12-02
- Q: Should M3 design system be applied to admin UI, customer UI, or both? → A: Both admin dashboard UI (order monitoring, logs viewer) and customer-facing UI (checkout, order tracking pages)
- Q: Which M3 component library for React/Next.js? → A: MUI (Material UI) v6+ with M3 theme
- Q: Brand primary color for M3 theme? → A: #6366F1 (Indigo)
- Q: Language localization requirements? → A: Korean primary, English secondary (bilingual with Korean as default)
- Q: Mobile/responsive design requirements? → A: Mobile-first for customer UI, desktop-optimized for admin dashboard

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete Order Fulfillment (Priority: P1)

As a customer who just completed payment, I want my eSIM to be automatically issued and delivered to my email within 10 seconds, so I can start using it immediately without waiting for manual processing.

**Why this priority**: This is the core value proposition of NumnaRoad. Without automated order fulfillment, the platform has no differentiation from manual competitors.

**Independent Test**: Can be fully tested by completing a Stripe test payment and verifying the eSIM QR code arrives via email within 10 seconds.

**Acceptance Scenarios**:

1. **Given** a customer completes Stripe payment, **When** the payment succeeds, **Then** an order record is created in PocketBase with status "pending"
2. **Given** an order with status "pending", **When** the n8n workflow triggers, **Then** the primary eSIM provider API is called within 1 second
3. **Given** the eSIM provider returns a QR code, **When** the response is received, **Then** the customer receives an email with the QR code within 5 seconds
4. **Given** the email is sent successfully, **When** the workflow completes, **Then** the order status is updated to "completed" with timestamp

---

### User Story 2 - Multi-Provider Failover (Priority: P2)

As the system, when the primary eSIM provider fails, I want to automatically try alternative providers in priority order, so that customer orders are fulfilled even during provider outages.

**Why this priority**: 99.9% availability requires failover. Without this, a single provider outage stops all sales.

**Independent Test**: Can be tested by mocking primary provider failure and verifying secondary provider is called automatically.

**Acceptance Scenarios**:

1. **Given** the primary provider (eSIM Card) returns an error, **When** failover triggers, **Then** the secondary provider (MobiMatter) is called within 2 seconds
2. **Given** a provider fails 3 times consecutively, **When** retry exhausts, **Then** the system moves to the next provider without manual intervention
3. **Given** all providers fail, **When** no eSIM can be issued, **Then** the order status is set to "failed" and an admin alert is sent

---

### User Story 3 - Order State Tracking (Priority: P3)

As an admin, I want to see the complete processing history of each order including provider attempts and timing, so I can diagnose issues and monitor system health.

**Why this priority**: Observability is required by constitution. This enables debugging without production access.

**Independent Test**: Can be tested by processing an order and querying the automation_logs collection for complete state history.

**Acceptance Scenarios**:

1. **Given** an order is being processed, **When** each step executes, **Then** a log entry is created with correlation_id, timestamp, step_name, and outcome
2. **Given** a provider API is called, **When** the call completes, **Then** the request/response is logged (with sensitive data redacted)
3. **Given** an order fails, **When** querying logs by order_id, **Then** the complete failure chain is visible including all retry attempts
4. **Given** any log entry is created, **When** it is written to automation_logs, **Then** the log format MUST be structured JSON with fields: timestamp, correlation_id, step_name, status, duration_ms, metadata

---

### User Story 4 - Customer Order Tracking UI (Priority: P4)

As a customer, I want to view my order status and eSIM details on a web page, so I can check my purchase without searching through emails.

**Why this priority**: Reduces support requests and improves customer experience. Email delivery is primary channel (P1), web UI is secondary.

**Independent Test**: Can be tested by completing an order and accessing the order tracking page with order ID.

**Acceptance Scenarios**:

1. **Given** a customer has an order, **When** they visit /order/{orderId}, **Then** they see order status, product name, and purchase date
2. **Given** an order is completed, **When** viewing order details, **Then** the QR code is displayed with installation instructions
3. **Given** an order is processing, **When** viewing order details, **Then** a progress indicator shows current step
4. **Given** an order failed, **When** viewing order details, **Then** an error message displays with support contact

**UI Design Requirements (Material Design 3)**:
- Use M3 color system with dynamic theming
- Implement M3 typography scale (Display, Headline, Body, Label)
- Use M3 Cards for order information display
- Apply M3 progress indicators for order status
- Ensure WCAG 2.1 AA accessibility compliance

---

### User Story 5 - Admin Dashboard UI (Priority: P5)

As an admin, I want a dashboard to monitor orders, view processing logs, and manage provider health, so I can operate the system without direct database access.

**Why this priority**: Operational necessity but not customer-facing. Backend monitoring via logs sufficient for MVP launch.

**Independent Test**: Can be tested by logging in as admin and viewing recent orders, filtering by status, and drilling into order details.

**Acceptance Scenarios**:

1. **Given** an admin is logged in, **When** they view the dashboard, **Then** they see order summary stats (pending, processing, completed, failed counts)
2. **Given** an admin views order list, **When** they click an order, **Then** they see complete processing timeline with log entries
3. **Given** an admin views provider health, **When** a circuit breaker is open, **Then** the provider shows warning status with failure count
4. **Given** an admin searches orders, **When** filtering by status or date range, **Then** results update in real-time

**UI Design Requirements (Material Design 3)**:
- Use M3 Navigation Rail for dashboard sections
- Implement M3 Data Tables for order lists
- Use M3 Chips for status filtering
- Apply M3 color semantics (error red, success green, warning amber)
- Use M3 Dialog for order detail modal

---

### Edge Cases

- What happens when Stripe webhook is received but PocketBase is temporarily unavailable? → Queue and retry
- How does system handle duplicate webhooks from Stripe? → Idempotency key check
- What happens when email delivery fails after eSIM is issued? → Retry email, mark order for manual review if persistent
- What happens when eSIM provider returns invalid QR code format? → Validate before sending, retry with next provider if invalid

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create order record in PocketBase when Stripe webhook indicates successful payment
- **FR-002**: System MUST trigger n8n workflow within 1 second of order creation
- **FR-003**: System MUST call eSIM provider API with correct product SKU and customer email
- **FR-004**: System MUST implement exponential backoff retry (max 3 attempts per provider, delays: 1s, 2s, 4s)
- **FR-005**: System MUST cascade to next priority provider after primary exhausts retries
- **FR-006**: System MUST send customer email via Resend API with QR code attachment
- **FR-007**: System MUST update order status at each state transition (pending → processing → completed/failed)
- **FR-008**: System MUST log all state transitions with correlation_id for traceability
- **FR-009**: System MUST verify Stripe webhook signature before processing
- **FR-010**: System MUST handle duplicate webhooks idempotently (same payment_intent processed only once)
- **FR-011**: System MUST implement circuit breaker pattern for provider API calls (open after 5 consecutive failures, half-open after 30 seconds, close after 2 successes)
- **FR-012**: System MUST track circuit breaker state per provider and skip providers with open circuits during failover cascade

### UI Functional Requirements (Material Design 3)

**Component Library**: MUI (Material UI) v6+ with Material Design 3 theme

- **UI-001**: Customer order tracking page MUST display order status, product details, and QR code (when available)
- **UI-002**: Customer UI MUST implement M3 dynamic color theming based on brand primary color (#6366F1 Indigo)
- **UI-003**: Admin dashboard MUST display real-time order statistics (pending, processing, completed, failed)
- **UI-004**: Admin dashboard MUST provide order list with filtering by status, date range, and search by order ID
- **UI-005**: Admin dashboard MUST show provider health status including circuit breaker state
- **UI-006**: All UI components MUST use M3 typography scale (Display, Headline, Title, Body, Label)
- **UI-007**: All UI MUST meet WCAG 2.1 AA accessibility standards (contrast ratios, keyboard navigation, screen reader support)
- **UI-008**: UI MUST support light and dark color schemes following M3 color system
- **UI-009**: UI MUST support Korean (default) and English languages with user-switchable locale
- **UI-010**: All user-facing text MUST be externalized for i18n (no hardcoded strings)
- **UI-011**: Customer UI MUST be mobile-first responsive (optimized for 320px-428px, scales up to desktop)
- **UI-012**: Admin dashboard MUST be desktop-optimized (minimum 1024px viewport, functional on tablet)

### Security Requirements

- **SR-001**: Customer email addresses MUST be encrypted at rest in PocketBase using AES-256-GCM
- **SR-002**: Encryption keys MUST be stored in environment variables, not in database
- **SR-003**: Email addresses MUST be decrypted only at point of use (email sending)

### Key Entities

- **Order**: Represents a customer purchase. Key attributes: id, customer_email, product_id, stripe_payment_intent, status, provider_used, esim_qr_code, created_at, completed_at
- **AutomationLog**: Audit trail for order processing. Key attributes: id, order_id, correlation_id, step_name, status, request_payload, response_payload, error_message, timestamp
- **eSIMProvider**: Configuration for each provider. Key attributes: id, name, priority, api_endpoint, api_key_env_var, is_active, success_rate

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of orders complete end-to-end processing in under 10 seconds
- **SC-002**: System achieves 99.9% order fulfillment success rate (including failover recoveries)
- **SC-003**: Zero orders stuck in "processing" state for more than 30 seconds without resolution or escalation
- **SC-004**: 100% of order state transitions are logged with correlation_id
- **SC-005**: System handles 100 concurrent orders without degradation (per constitution)
