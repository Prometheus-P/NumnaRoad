# NumnaRoad Development Guidelines

## Commands

```bash
# Development
npm run dev              # Start web app (localhost:3000)
npm run dev:web          # Start web app only

# Build & Check
npm run build            # Production build
npm run lint             # ESLint
npm run typecheck        # TypeScript check

# Testing
npm run test             # Vitest watch mode
npm run test:run         # Vitest single run
npm run test:coverage    # Coverage report
```

## Project Structure

```
apps/web/                # Next.js 14 (App Router)
  app/                   # Routes
    [locale]/            # i18n (ko, en, ja, zh, es)
    admin/               # Admin dashboard
    api/                 # API routes
  components/            # React components
  lib/                   # Utilities

services/                # Business logic
  esim-providers/        # Provider adapters (RedteaGO, Airalo, etc.)
  notifications/         # Discord, Email
  order-fulfillment/     # Order processing

pocketbase/              # Backend (BaaS)
```

## eSIM Provider Architecture

| Provider   | Priority | Use Case            |
|------------|----------|---------------------|
| RedteaGO   | 100      | Primary (wholesale) |
| eSIMCard   | 80       | Backup              |
| MobiMatter | 60       | Backup              |
| Airalo     | 40       | Fallback (retail)   |
| Manual     | 10       | Manual processing   |

- Circuit Breaker automatically blocks failing providers
- Provider caching: 5-min TTL in `/apps/web/lib/cache/providers.ts`

## Tech Stack

- **TypeScript 5.3+** - strict mode, `any` prohibited
- **Next.js 14** - App Router, SSG/SSR
- **MUI v7** - Material Design 3 theme
- **PocketBase** - Backend as a Service
- **Stripe** - Payments
- **Resend** - Transactional email
- **TanStack Query v5** - Data fetching

## Conventions

### Commits
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- No AI mentions in commit body (Co-Authored-By is OK)

### TDD Workflow
1. Write failing test (Red)
2. Write minimal code to pass (Green)
3. Refactor (maintain tests)

### External Setup
- Code implementation: Claude handles directly
- Business/ops (API keys, env vars, pricing): Create GitHub Issue with `[Biz]` prefix

### Code Style
- Single Responsibility Principle
- ESLint/Prettier enforced
- File line limit: ~300 lines (split if larger)

## Environment Variables

See `.env.example` for required variables.
Production setup: GitHub Issue #34.
