# NumnaRoad Development Guidelines

## Development Principles

### 1. 기술 구현과 비즈니스 작업 분리
- **기술 구현**: 코드 작성, 테스트, 리팩토링 → Claude가 직접 수행
- **비즈니스/운영 작업**: 외부 계정 설정, API 키 발급, 환경 변수 설정, 가격 정책 결정 → GitHub Issue로 등록
- 수동 작업이 필요한 경우 `[Biz]` prefix로 issue 생성

### 2. Provider 우선순위 원칙
```
RedteaGO (100) → eSIMCard (80) → MobiMatter (60) → Airalo (40) → Manual (10)
```
- 도매가 우선, 소매가 최후 fallback
- Circuit Breaker로 장애 provider 자동 차단

### 3. 테스트 우선 개발
- 새로운 Provider 추가 시 반드시 단위 테스트 작성
- `npm run test:run`으로 전체 테스트 통과 확인 후 커밋

## Active Technologies
- TypeScript 5.3+ (strict mode, `any` prohibited)
- Next.js 14 (App Router)
- MUI v6+ (M3 theme)
- PocketBase SDK
- Stripe SDK
- Resend (email)

## Project Structure

```text
apps/web/           # Next.js 웹 애플리케이션
services/           # 비즈니스 로직
  esim-providers/   # eSIM Provider 어댑터들
  notifications/    # Discord, Email 알림
  order-fulfillment/# 주문 처리 서비스
pocketbase/         # PocketBase 설정 및 마이그레이션
tests/              # 테스트 파일
  unit/             # 단위 테스트
  integration/      # 통합 테스트
  e2e/              # E2E 테스트 (Playwright)
  contract/         # API 계약 테스트
```

## Commands

```bash
npm run test:run    # 전체 테스트 실행
npm run lint        # 린트 검사
npm run build       # 프로덕션 빌드
```

## eSIM Provider Architecture

| Provider | Priority | 용도 | 파일 |
|----------|----------|------|------|
| RedteaGO | 100 | Primary (도매) | `services/esim-providers/redteago.ts` |
| eSIMCard | 80 | Backup | `services/esim-providers/esimcard.ts` |
| MobiMatter | 60 | Backup | `services/esim-providers/mobimatter.ts` |
| Airalo | 40 | Fallback (소매) | `services/esim-providers/airalo.ts` |
| Manual | 10 | 수동 처리 | `services/esim-providers/manual.ts` |

## Environment Variables

필수 환경 변수는 `.env.example` 참조.
프로덕션 설정은 GitHub Issue #34 참조.

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
