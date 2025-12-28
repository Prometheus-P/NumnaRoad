# NumnaRoad Development Guidelines

## Core Principles

| 섹션 | 핵심 원칙 |
|------|-----------|
| 1. TDD | 테스트 먼저 → Red/Green/Refactor 사이클 |
| 2. 외부 설정 | 수동 설정 필요 시 GitHub Issue 등록 필수 |
| 3. 디자인 시스템 | Clean Architecture, DI, Event-Driven |
| 4. 커밋 메시지 | Conventional Commits, AI 언급 금지 |
| 5. 코드 스타일 | gofmt, golangci-lint, 단일 책임 원칙 |
| 6. 응답 원칙 | CTO 관점, 객관적, 근거 필수 |
| 7. PR 체크리스트 | 7개 항목 체크 후 머지 |

---

## 1. TDD (Test-Driven Development)

- **Red**: 실패하는 테스트 먼저 작성
- **Green**: 테스트 통과하는 최소 코드 작성
- **Refactor**: 코드 개선 (테스트 유지)

```bash
npm run test:run    # 전체 테스트 실행
npm run lint        # 린트 검사
```

## 2. 외부 설정 원칙

- **기술 구현**: 코드 작성, 테스트, 리팩토링 → Claude가 직접 수행
- **비즈니스/운영 작업**: 외부 계정 설정, API 키 발급, 환경 변수 설정, 가격 정책 결정 → GitHub Issue로 등록
- 수동 작업이 필요한 경우 `[Biz]` prefix로 issue 생성

## 3. 디자인 시스템

- **Clean Architecture**: 도메인 중심 설계
- **DI (Dependency Injection)**: 의존성 주입으로 테스트 용이성 확보
- **Event-Driven**: 느슨한 결합, 확장성

## 4. 커밋 메시지

- **Conventional Commits** 형식 준수
- AI 생성 언급 금지 (Co-Authored-By 제외)
- 예: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

## 5. 코드 스타일

- TypeScript 5.3+ (strict mode, `any` prohibited)
- 단일 책임 원칙 (SRP)
- ESLint/Prettier 준수

## 6. 응답 원칙

### CTO 관점
- 결정 중심 (옵션 나열 X)
- 트레이드오프/리스크/ROI 명시
- P0/P1/P2 우선순위
- 간결함

### 객관성
- 감정 배제
- 사실 기반
- 정량적 표현

### 근거 확보
- 공식 문서 참조
- 코드 라인 명시 (예: `file.ts:123`)
- 테스트 결과 포함
- 벤치마크 데이터

### 금지 표현
- ❌ "아마도...", "~일 것 같습니다"
- ❌ "보통은...", "일반적으로..."
- ❌ 출처 없는 주장

## 7. 비즈니스 관점

| 항목 | 내용 |
|------|------|
| 소비자 중심 사고 | 리서치/피드백은 최종 사용자 관점 |
| 비즈니스 임팩트 | 수익/비용/시장 영향 고려 |
| 가치 전달 | 기술 ≠ 비즈니스 구분 |
| 시장 현실 | 이상 < 실용 |

B2C/B2B/B2G 전 영역 적용.

---

## Active Technologies

- TypeScript 5.3+ (strict mode, `any` prohibited)
- Next.js 14 (App Router)
- MUI v7+ (M3 theme)
- PocketBase SDK
- Stripe SDK
- Resend (email)
- TanStack React Query v5

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

## eSIM Provider Architecture

| Provider | Priority | 용도 | 파일 |
|----------|----------|------|------|
| RedteaGO | 100 | Primary (도매) | `services/esim-providers/redteago.ts` |
| eSIMCard | 80 | Backup | `services/esim-providers/esimcard.ts` |
| MobiMatter | 60 | Backup | `services/esim-providers/mobimatter.ts` |
| Airalo | 40 | Fallback (소매) | `services/esim-providers/airalo.ts` |
| Manual | 10 | 수동 처리 | `services/esim-providers/manual.ts` |

Circuit Breaker로 장애 provider 자동 차단.

## Environment Variables

필수 환경 변수는 `.env.example` 참조.
프로덕션 설정은 GitHub Issue #34 참조.

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
