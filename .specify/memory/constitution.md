<!--
Sync Impact Report
==================
Version change: 0.0.0 → 1.0.0 (MAJOR - initial constitution ratification)

Modified principles: N/A (initial version)

Added sections:
- Core Principles (5): Automation-First, TDD Mandatory, Reliability & Failover, Simplicity & YAGNI, Observability
- Technology Standards
- Security Requirements
- Development Workflow
- Performance Standards
- Governance

Removed sections: N/A (initial version)

Templates requiring updates:
- .specify/templates/plan-template.md: ✅ Already aligned (Constitution Check section exists)
- .specify/templates/spec-template.md: ✅ Already aligned (user scenarios, requirements structure)
- .specify/templates/tasks-template.md: ✅ Already aligned (TDD flow, phase structure)

Follow-up TODOs: None
==================
-->

# NumnaRoad Constitution

## Core Principles

### I. Automation-First

Every feature MUST prioritize full automation over manual intervention. The platform's core value proposition is 24/7 unattended operation.

**Non-negotiable rules:**
- Order processing MUST complete without human intervention (target: 10 seconds end-to-end)
- Manual steps are technical debt; any manual workaround MUST have a tracking issue for automation
- New features MUST include automation workflow design before implementation begins
- Cron jobs and webhooks are preferred over manual triggers

**Rationale:** NumnaRoad's competitive advantage is zero-labor operation. Every manual step erodes profit margins and limits scalability.

### II. TDD Mandatory

Test-Driven Development is non-negotiable. All implementation follows the Red-Green-Refactor cycle.

**Non-negotiable rules:**
- Tests MUST be written BEFORE implementation code
- Tests MUST fail (Red) before any implementation proceeds
- Implementation MUST only satisfy failing tests (Green)
- Refactoring MUST NOT change test outcomes
- PRs without corresponding tests MUST be rejected unless explicitly justified and documented

**Rationale:** TDD ensures correctness, enables fearless refactoring, and catches regressions early. For a payment-processing system, correctness is paramount.

### III. Reliability & Failover

The system MUST maintain 99.9% availability through redundancy and graceful degradation.

**Non-negotiable rules:**
- eSIM provider integration MUST implement multi-provider failover (minimum 2 providers)
- Failed API calls MUST retry with exponential backoff (max 3 attempts per provider)
- Provider failures MUST automatically cascade to next priority provider
- All external service calls MUST have timeout limits (max 30 seconds)
- Circuit breaker patterns MUST be implemented for external dependencies

**Rationale:** Customers expect instant eSIM delivery. A single provider outage cannot halt the entire business.

### IV. Simplicity & YAGNI

Start with the simplest solution that works. Do not build for hypothetical future requirements.

**Non-negotiable rules:**
- Features MUST solve a current, documented need (not "might be useful someday")
- Abstractions MUST be justified by actual duplication (Rule of Three)
- Configuration options MUST have concrete use cases before implementation
- Third-party dependencies MUST be evaluated against building in-house (prefer fewer dependencies)
- Code MUST be deleted when no longer used (no commented-out code in main branch)

**Rationale:** Over-engineering increases maintenance burden, introduces bugs, and delays delivery. Build what's needed now.

### V. Observability

All system behavior MUST be traceable and debuggable without accessing production directly.

**Non-negotiable rules:**
- All order state transitions MUST be logged with correlation IDs
- External API calls MUST log request/response (redacting sensitive data)
- Errors MUST be captured with full context (Sentry integration required)
- Business metrics MUST be tracked (orders processed, success rate, provider usage)
- Logs MUST use structured format (JSON) for queryability

**Rationale:** When automation fails at 3 AM, operators need to diagnose issues from logs alone. Silent failures are unacceptable.

## Technology Standards

**Stack Requirements:**
- **Language**: TypeScript 5.3+ (strict mode enabled, `any` usage prohibited)
- **Frontend**: Next.js 14 (App Router), TailwindCSS, shadcn/ui
- **Backend**: PocketBase 0.22+ (Go-based, single binary deployment)
- **Database**: SQLite (embedded with PocketBase)
- **Automation**: n8n (self-hosted) for workflow orchestration
- **Payment**: Stripe (primary), TossPay (Korea domestic)
- **Email**: Resend API
- **Monitoring**: Sentry for error tracking

**Dependency Policy:**
- New dependencies MUST be evaluated for maintenance status (last commit < 6 months)
- Security vulnerabilities MUST trigger immediate patching or removal
- Prefer well-established libraries over cutting-edge alternatives

## Security Requirements

**Payment Data:**
- Credit card data MUST NOT be stored (Stripe handles PCI compliance)
- Stripe webhook signatures MUST be verified on every request
- Payment amounts MUST be validated server-side (never trust client)

**API Security:**
- All API keys MUST be stored in environment variables (never in code)
- Provider API keys MUST be rotated quarterly
- Rate limiting MUST be implemented on public endpoints
- Input validation MUST occur at API boundaries (sanitize all user input)

**Data Protection:**
- Customer email addresses MUST be encrypted at rest
- PocketBase admin credentials MUST use strong passwords (16+ characters)
- Production database backups MUST be encrypted

## Development Workflow

**Branch Strategy:**
- `main` branch is protected; direct commits prohibited
- Feature branches: `feature/[description]`
- Bug fixes: `fix/[description]`
- All changes require PR review before merge

**Code Review Requirements:**
- PRs MUST pass all automated tests
- PRs MUST have at least one approval (for team projects)
- PRs MUST include test coverage for new functionality
- Commit messages MUST follow conventional format: `feat:`, `fix:`, `docs:`, `refactor:`

**Testing Gates:**
- Unit tests MUST pass before PR creation
- Integration tests MUST pass before merge
- Contract tests MUST verify external API compatibility

**Deployment:**
- Staging deployment MUST precede production
- Production deployments require passing all test suites
- Rollback procedure MUST be documented and tested

## Performance Standards

**Response Times:**
- Page load (LCP): < 2.5 seconds
- API responses: < 500ms p95
- Order processing (end-to-end): < 10 seconds

**Throughput:**
- System MUST handle 100 concurrent orders without degradation
- Database queries MUST complete in < 100ms

**Resource Limits:**
- Server memory: < 512MB baseline
- Database size: Monitor when approaching 1GB
- n8n workflow execution: < 30 seconds per order

## Governance

**Constitution Authority:**
- This constitution supersedes all other development practices
- Violations MUST be flagged in code review
- Exceptions require documented justification in PR description

**Amendment Process:**
1. Propose changes via PR to this document
2. Document rationale for addition/removal/modification
3. Require explicit approval from project maintainer
4. Include migration plan if changes affect existing code

**Compliance Review:**
- All PRs MUST verify alignment with constitution principles
- Quarterly review of constitution relevance and effectiveness
- Complexity additions MUST cite which principle justifies the complexity

**Version Policy:**
- MAJOR: Principle removal or incompatible governance changes
- MINOR: New principle/section additions or material expansions
- PATCH: Clarifications, wording improvements, typo fixes

**Version**: 1.0.0 | **Ratified**: 2025-12-02 | **Last Amended**: 2025-12-02
