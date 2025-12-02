# Contributing to NumnaRoad

기여해주셔서 감사합니다! 이 문서는 NumnaRoad 프로젝트에 기여하는 방법을 안내합니다.

---

## 📋 Document Metadata

| 항목 | 내용 |
|------|------|
| **문서 유형** | Collaboration Guide |
| **대상 독자** | 기여자, 개발자, 코드 리뷰어 |
| **최종 수정** | 2024-12-01 |
| **연관 문서** | [README.md](./README.md), [plan.md](./plan.md), [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) |
| **우선순위** | ⭐⭐⭐ (Core) |

---

## 📚 Quick Links

- 📖 **[README.md](./README.md)** - 프로젝트 개요 및 빠른 시작
- 🎯 **[CONTEXT.md](./CONTEXT.md)** - 프로젝트 전체 맥락
- 🔧 **[ENVIRONMENT.md](./ENVIRONMENT.md)** - 환경 설정 가이드
- 📋 **[plan.md](./plan.md)** - TDD 개발 태스크 리스트
- 🤝 **[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)** - 행동 강령

---

## 목차

1. [Code of Conduct](#code-of-conduct)
2. [시작하기 전에](#시작하기-전에)
3. [개발 환경 설정](#개발-환경-설정)
4. [TDD-First 개발 워크플로우](#tdd-first-개발-워크플로우)
5. [기여 방법](#기여-방법)
6. [코드 스타일 가이드](#코드-스타일-가이드)
7. [Pull Request 프로세스](#pull-request-프로세스)
8. [이슈 리포팅](#이슈-리포팅)
9. [우선순위 영역](#우선순위-영역)
10. [Validation Checklist](#validation-checklist)

---

## Code of Conduct

이 프로젝트는 [Contributor Covenant](https://www.contributor-covenant.org/)를 따릅니다. 모든 참여자는 서로를 존중하고 건설적인 피드백을 제공해야 합니다.

자세한 내용은 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)를 참조하세요.

---

## 시작하기 전에

### 필독 문서

기여하기 전에 다음 문서를 읽어주세요:

1. ✅ **[README.md](./README.md)** - 프로젝트 개요, Vision, North Star Metric
2. ✅ **[CONTEXT.md](./CONTEXT.md)** - 프로젝트 맥락, 아키텍처, 기술 스택 결정
3. ✅ **[plan.md](./plan.md)** - 현재 개발 상황, 사용 가능한 태스크

### 핵심 원칙

NumnaRoad 프로젝트는 다음 원칙을 따릅니다:

#### 1. TDD-First (Test-Driven Development)

```
🔴 RED: 실패하는 테스트 작성
  ↓
🟢 GREEN: 테스트를 통과하는 최소한의 코드 작성
  ↓
🔵 REFACTOR: 코드 개선 (테스트는 계속 통과)
```

> 💡 **상세 가이드**: [TDD-First 개발 워크플로우](#tdd-first-개발-워크플로우) 섹션 참조

#### 2. Clean Code

- **함수**: 20줄 이내, 단일 책임
- **네이밍**: 의도를 명확하게 표현
- **주석**: 코드로 설명할 수 없는 "왜"만 작성
- **타입**: TypeScript `any` 사용 금지

#### 3. Spec-Driven Development (SDD)

- 구현 전 명세 작성
- API 설계 → 구현 순서
- 문서와 코드 동기화

#### 4. 자동화 우선

- 수동 작업은 자동화로 전환
- CI/CD 파이프라인 활용
- 반복 작업 스크립트화

---

## 개발 환경 설정

### 사전 요구사항

```bash
Node.js 18+
npm 또는 yarn
Git
PocketBase 0.22+
```

### 빠른 설정

```bash
# 1. 저장소 포크 및 클론
git clone https://github.com/YOUR_USERNAME/NumnaRoad.git
cd NumnaRoad

# 2. 원본 저장소를 upstream으로 추가
git remote add upstream https://github.com/Prometheus-P/NumnaRoad.git

# 3. 자동 설정 스크립트 실행
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh

# 4. 환경변수 설정
cp .env.example .env
# .env 파일을 수정하여 API 키 입력

# 5. PocketBase 실행
cd pocketbase && ./pocketbase serve

# 6. 새 터미널에서 Next.js 개발 서버 실행
cd apps/web && npm run dev
```

> 💡 **상세 환경 설정**: [ENVIRONMENT.md](./ENVIRONMENT.md) 참조

### 검증

```bash
# 타입 체크
npm run type-check

# 린트
npm run lint

# 테스트 실행
npm test

# 개발 서버 접속
# http://localhost:3000 (Next.js)
# http://127.0.0.1:8090/_/ (PocketBase Admin)
```

---

## TDD-First 개발 워크플로우

NumnaRoad는 **TDD-First** 접근 방식을 따릅니다. 모든 기능은 테스트부터 시작합니다.

### Red-Green-Refactor Cycle

#### 🔴 Step 1: RED (실패하는 테스트 작성)

**목표**: 구현하려는 기능의 인터페이스와 동작을 테스트로 정의

**Example: esim_products Collection 생성**

```bash
# 1. 테스트 실행 (당연히 실패)
curl http://localhost:8090/api/collections/esim_products/records

# Expected: {"items": [], "page": 1, "perPage": 30, "totalItems": 0}
# Actual: 404 Not Found (Collection does not exist)
```

```typescript
// tests/pocketbase/collections.test.ts
describe('esim_products Collection', () => {
  it('should exist with correct schema', async () => {
    const response = await fetch('http://localhost:8090/api/collections/esim_products/records');
    expect(response.status).toBe(200);
  });

  it('should have required fields', async () => {
    const schema = await getCollectionSchema('esim_products');
    expect(schema.fields).toContain('name');
    expect(schema.fields).toContain('slug');
    expect(schema.fields).toContain('country');
    expect(schema.fields).toContain('duration');
  });
});
```

**✅ Success Criteria**: 테스트가 실패하고, 실패 이유가 명확해야 함

#### 🟢 Step 2: GREEN (최소한의 구현)

**목표**: 테스트를 통과하는 최소한의 코드 작성 (품질은 나중에)

**Example: PocketBase Collection 생성**

```bash
# PocketBase Admin UI에서:
# 1. Collections → New Collection
# 2. Name: esim_products
# 3. Fields 추가:
#    - name (Text, Required)
#    - slug (Text, Required, Unique)
#    - country (Text, Required)
#    - duration (Number, Required)
#    - data_limit (Text, Required)
#    - price (Number, Required)
#    - cost (Number, Required)
#    - is_active (Bool, Default: true)

# 4. 테스트 재실행
curl http://localhost:8090/api/collections/esim_products/records
# ✅ {"items": [], ...} (성공!)
```

**✅ Success Criteria**: 모든 테스트가 통과해야 함

#### 🔵 Step 3: REFACTOR (개선)

**목표**: 코드 품질 향상 (테스트는 계속 통과)

**Example: Validation 규칙 추가**

```javascript
// pocketbase/pb_migrations/xxxx_add_validation.js
migrate((db) => {
  const collection = db.findCollectionByNameOrId('esim_products');

  // slug 자동 생성 규칙
  collection.schema.addField({
    name: 'slug',
    type: 'text',
    required: true,
    unique: true,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', // kebab-case
  });

  // 마진율 자동 계산
  collection.schema.addField({
    name: 'margin_percent',
    type: 'number',
    formula: '(price - cost) / cost * 100',
  });

  db.saveCollection(collection);
});
```

**✅ Success Criteria**: 테스트가 여전히 통과하고, 코드가 더 나아졌음

### TDD 체크리스트

각 기능 구현 시 다음을 확인하세요:

- [ ] 🔴 **RED**: 실패하는 테스트 작성 완료
- [ ] 테스트가 실패하는 이유가 명확
- [ ] 🟢 **GREEN**: 테스트 통과하는 구현 완료
- [ ] 모든 테스트가 통과
- [ ] 🔵 **REFACTOR**: 코드 개선 완료
- [ ] 테스트가 여전히 통과
- [ ] 코드 리뷰 준비 완료

> 💡 **실제 태스크 예시**: [plan.md](./plan.md)의 Task 1.2, 1.3, 1.4 참조

---

## 기여 방법

### 1. 태스크 선택

[plan.md](./plan.md)에서 `📋 TODO` 상태인 태스크를 선택하세요:

```markdown
### Sprint 2: Next.js Frontend

#### Task 2.1: Next.js 프로젝트 초기화
**Status**: 📋 TODO
**Assignee**: -
**Estimate**: 1일

**Description**: apps/web/ 디렉토리에 Next.js 14 프로젝트 초기화
...
```

### 2. Issue 확인 또는 생성

기여하기 전에 [Issues](https://github.com/Prometheus-P/NumnaRoad/issues)를 확인하세요:

- 이미 다른 사람이 작업 중인지 확인
- 새로운 기능이나 버그 수정은 먼저 Issue를 생성하고 논의
- Issue에 자신을 Assign 하여 중복 작업 방지

```markdown
Title: Implement Task 2.1: Next.js 프로젝트 초기화

Description:
plan.md의 Task 2.1을 구현합니다.

- [ ] RED: Next.js 라우팅 테스트 작성
- [ ] GREEN: create-next-app 실행
- [ ] REFACTOR: tsconfig.json 설정, path aliases 추가

Related: Sprint 2 (Frontend)
```

### 3. 브랜치 생성

```bash
# main 브랜치에서 최신 코드 받기
git checkout main
git pull upstream main

# 새 브랜치 생성
git checkout -b feature/task-2-1-nextjs-init
```

**브랜치 네이밍 컨벤션**:

- `feature/task-X-Y-description` - 새로운 기능 (plan.md의 Task 번호 포함)
- `fix/issue-123-description` - 버그 수정 (Issue 번호 포함)
- `docs/update-contributing` - 문서 수정
- `refactor/provider-factory` - 코드 리팩토링
- `test/add-unit-tests` - 테스트 추가/수정

### 4. TDD-First 개발

```bash
# 🔴 RED: 테스트 작성
npm test -- --watch

# 🟢 GREEN: 구현
# 코드 작성...

# 🔵 REFACTOR: 개선
npm run lint
npm run type-check
```

### 5. 작은 단위로 커밋

```bash
# RED 단계 커밋
git add tests/
git commit -m "test: add failing test for Next.js routing (RED)"

# GREEN 단계 커밋
git add apps/web/
git commit -m "feat: initialize Next.js 14 with App Router (GREEN)"

# REFACTOR 단계 커밋
git add apps/web/tsconfig.json
git commit -m "refactor: add path aliases to tsconfig (REFACTOR)"
```

**커밋 메시지 컨벤션** (Conventional Commits):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: 새로운 기능 (corresponds to GREEN in TDD)
- `test`: 테스트 추가/수정 (corresponds to RED in TDD)
- `refactor`: 코드 리팩토링 (corresponds to REFACTOR in TDD)
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅 (기능 변경 없음)
- `chore`: 빌드 프로세스 또는 도구 변경

**Example**:

```bash
git commit -m "feat(frontend): add product list page with filtering

- Implement ProductList component
- Add useProducts hook for data fetching
- Add filter by country and duration
- Add responsive grid layout

Closes #45"
```

### 6. Push 및 PR 생성

```bash
# Push
git push origin feature/task-2-1-nextjs-init

# GitHub에서 Pull Request 생성
```

---

## 코드 스타일 가이드

### TypeScript 기본 원칙

#### ✅ DO: 명시적 타입, 인터페이스 정의

```typescript
// ✅ Good
interface Product {
  id: string;
  name: string;
  slug: string;
  country: string;
  duration: number; // days
  dataLimit: string; // e.g., "3GB"
  price: number; // USD
  cost: number; // USD
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function getProducts(filters?: {
  country?: string;
  maxPrice?: number;
}): Promise<Product[]> {
  // 구현
}
```

#### ❌ DON'T: any 타입, 타입 없는 함수

```typescript
// ❌ Bad - any 사용
function getProducts(filters: any): any {
  // ...
}

// ❌ Bad - 타입 없음
function getProducts(filters) {
  // ...
}
```

### React Components

#### ✅ DO: Named export, Props interface, TypeScript

```typescript
// ✅ Good
interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
  isLoading?: boolean;
}

export function ProductCard({
  product,
  onAddToCart,
  isLoading = false
}: ProductCardProps) {
  if (isLoading) {
    return <ProductCardSkeleton />;
  }

  return (
    <div className="rounded-lg border p-4 shadow-sm hover:shadow-md transition">
      <h3 className="text-lg font-semibold">{product.name}</h3>
      <p className="text-sm text-gray-600">
        {product.country} • {product.duration} days • {product.dataLimit}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xl font-bold">${product.price}</span>
        <button
          onClick={() => onAddToCart(product.id)}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
```

#### ❌ DON'T: Default export, 타입 없음, 복잡한 로직

```typescript
// ❌ Bad
export default function ProductCard(props) {
  // 100줄의 복잡한 로직...

  return <div>{props.product.name}</div>;
}
```

### Clean Code 원칙

#### 1. 함수는 작고 단순하게 (20줄 이내)

```typescript
// ✅ Good - 단일 책임, 명확한 이름
export async function createOrder(
  productId: string,
  customerEmail: string
): Promise<Order> {
  const product = await getProductById(productId);
  const order = await insertOrder({ productId, customerEmail, amount: product.price });
  await sendOrderConfirmationEmail(order);
  return order;
}

// ❌ Bad - 너무 많은 책임
export async function processOrder(data: any) {
  // 제품 조회
  // 재고 확인
  // 할인 적용
  // 결제 처리
  // 주문 생성
  // eSIM 발급
  // 이메일 발송
  // 통계 업데이트
  // ... 200줄
}
```

#### 2. 명확한 네이밍

```typescript
// ✅ Good - 의도가 명확
function calculateOrderTotalWithDiscount(
  subtotal: number,
  discountPercent: number
): number {
  return subtotal * (1 - discountPercent / 100);
}

// ❌ Bad - 의미 불명확
function calc(a: number, b: number): number {
  return a * (1 - b / 100);
}
```

#### 3. 주석은 "왜"만 작성

```typescript
// ✅ Good - 코드로 설명 불가능한 "왜"
export async function issueESIM(orderId: string): Promise<void> {
  // Exponential backoff을 사용하는 이유:
  // eSIM 공급사 API가 rate limit을 엄격하게 적용하므로
  // 즉시 재시도 시 429 에러 발생 확률이 높음
  await retryWithExponentialBackoff(() => callProviderAPI(orderId));
}

// ❌ Bad - 코드가 이미 설명하는 내용
// 주문 ID로 eSIM을 발급합니다
export async function issueESIM(orderId: string): Promise<void> {
  // ...
}
```

### 네이밍 컨벤션

| 항목 | 컨벤션 | 예시 |
|------|--------|------|
| **파일명** | `kebab-case.ts` | `product-card.tsx` |
| **컴포넌트** | `PascalCase` | `ProductCard` |
| **함수/변수** | `camelCase` | `getProducts`, `isLoading` |
| **상수** | `UPPER_SNAKE_CASE` | `API_BASE_URL`, `MAX_RETRY_COUNT` |
| **타입/인터페이스** | `PascalCase` | `ProductCardProps`, `ESIMProvider` |
| **Private 함수** | `_camelCase` (prefix _) | `_validateInput` |

### 파일 구조

```
feature/
├── components/
│   ├── product-card.tsx         # UI 컴포넌트
│   ├── product-card.test.tsx    # 컴포넌트 테스트
│   └── product-list.tsx
├── hooks/
│   ├── use-products.ts          # React Hook
│   └── use-products.test.ts     # Hook 테스트
├── services/
│   ├── product-service.ts       # API 호출 로직
│   └── product-service.test.ts  # 서비스 테스트
├── types/
│   └── product.ts               # TypeScript 타입 정의
├── utils/
│   ├── product-utils.ts         # 유틸리티 함수
│   └── product-utils.test.ts    # 유틸리티 테스트
└── index.ts                      # Public API (re-export)
```

---

## Pull Request 프로세스

### 1. Self-Review

PR을 생성하기 전에 스스로 검토:

```bash
# 변경 사항 확인
git diff main..feature/your-branch

# 테스트 실행
npm test

# 타입 체크
npm run type-check

# 린트
npm run lint

# 빌드 테스트
npm run build
```

### 2. PR 생성

GitHub에서 Pull Request를 생성:

**제목 형식**:
```
<type>(<scope>): <subject>

Examples:
feat(frontend): add product filtering by country
fix(api): resolve race condition in order processing
docs(contributing): add TDD workflow guide
```

**PR 템플릿**:

```markdown
## 📝 Summary

Task 2.1: Next.js 프로젝트 초기화 구현

## ✅ Changes

- Next.js 14 프로젝트 초기화 (App Router)
- TailwindCSS 및 shadcn/ui 설정
- TypeScript 설정 및 path aliases 추가
- 기본 레이아웃 및 Navigation 컴포넌트 구현

## 🧪 TDD Checklist

- [x] 🔴 RED: 라우팅 테스트 작성 완료
- [x] 🟢 GREEN: 구현 완료, 모든 테스트 통과
- [x] 🔵 REFACTOR: tsconfig 설정 개선, 코드 정리 완료

## 🧪 Tests

### Added Tests
- `apps/web/app/page.test.tsx` - 홈페이지 렌더링 테스트
- `apps/web/app/products/page.test.tsx` - 상품 목록 페이지 테스트

### Test Coverage
```bash
npm test -- --coverage
# Statements: 95%
# Branches: 90%
# Functions: 92%
# Lines: 94%
```

## 📸 Screenshots

(스크린샷 추가)

## 🔗 Related

- Related Task: [plan.md](./plan.md) - Task 2.1
- Closes #45
- Depends on #42

## ✅ Pre-merge Checklist

- [x] 모든 테스트 통과
- [x] 타입 체크 통과
- [x] 린트 통과
- [x] 빌드 성공
- [x] 문서 업데이트 (필요시)
- [x] CHANGELOG.md 업데이트
- [x] Self-review 완료
```

### 3. 코드 리뷰 대응

**리뷰어 피드백에 대응**:

```bash
# 피드백 반영
git add .
git commit -m "refactor: apply code review feedback

- Extract complex logic to separate function
- Add JSDoc comments for public API
- Fix typo in error message"

git push origin feature/your-branch
```

**리뷰 요청 사항**:
- 피드백에 신속히 대응 (24시간 이내)
- 변경 요청 사항 수정
- 리뷰어의 승인 후 머지
- 머지 후 브랜치 삭제

### 4. 머지

리뷰어 승인 후:

```bash
# Squash and Merge (권장)
# GitHub UI에서 "Squash and merge" 버튼 클릭

# 또는 로컬에서 (maintainer only)
git checkout main
git pull upstream main
git merge --squash feature/your-branch
git commit
git push upstream main
```

---

## 이슈 리포팅

버그를 발견했거나 기능 제안이 있다면:

### 버그 리포트

**제목 형식**: `[BUG] 간단한 버그 설명`

```markdown
## 🐛 Bug Description

주문 완료 후 이메일이 발송되지 않음

## 🔄 Steps to Reproduce

1. http://localhost:3000/products/japan-7days 접속
2. "Add to Cart" 클릭
3. Checkout 진행
4. Stripe 테스트 카드로 결제 (4242 4242 4242 4242)
5. 주문 완료 페이지 도달
6. 이메일 확인 → **이메일 수신 안 됨**

## ✅ Expected Behavior

주문 완료 후 5초 이내에 고객 이메일로 다음 내용이 포함된 이메일 발송:
- 주문 번호
- eSIM QR 코드
- 활성화 코드
- 사용 방법

## ❌ Actual Behavior

이메일이 발송되지 않음. PocketBase logs를 확인하니 n8n webhook 호출 실패 (Connection refused).

## 📸 Screenshots

(스크린샷 첨부)

## 🖥️ Environment

- **OS**: macOS 14.0
- **Browser**: Chrome 120
- **Node.js**: 18.17.0
- **PocketBase**: 0.22.0
- **n8n**: Not running (원인으로 추정)

## 📋 Additional Context

n8n이 실행되지 않아서 발생한 것 같습니다. 환경 변수에 N8N_WEBHOOK_URL이 설정되어 있지 않았습니다.

**Possible Solution**:
- n8n 실행 여부 확인 로직 추가
- n8n 없을 시 Resend API 직접 호출로 fallback

## 🔗 Related

- Related to: automation/n8n-workflows/order-processing.json
- May relate to #78 (이메일 발송 실패 이슈)
```

### 기능 제안

**제목 형식**: `[FEATURE] 간단한 기능 설명`

```markdown
## 💡 Feature Description

쿠폰 코드 기능 추가 (할인 및 프로모션)

## 🎯 Motivation

- 마케팅 캠페인을 위한 할인 쿠폰 필요
- 첫 구매 고객에게 10% 할인 제공
- 재구매 고객에게 리워드 제공
- 추천 프로그램 (친구 초대 시 양쪽 모두 할인)

**Business Impact**:
- 고객 획득 비용 (CAC) 감소 예상
- 재구매율 증가 예상 (20% → 35%)
- 평균 주문 금액 (AOV) 증가 예상 (추가 구매 유도)

## 📋 Proposed Solution

### 1. Database Schema

```sql
-- coupons Collection
{
  code: string (unique),
  discountType: 'percent' | 'fixed',
  discountValue: number,
  minOrderAmount: number,
  maxUsageCount: number,
  usedCount: number,
  expiresAt: datetime,
  isActive: boolean
}

-- coupon_usage Collection
{
  couponId: relation,
  orderId: relation,
  customerId: relation,
  discountApplied: number,
  usedAt: datetime
}
```

### 2. API Endpoints

```typescript
POST /api/coupons/validate
Body: { code: string, orderAmount: number }
Response: { valid: boolean, discountAmount: number }

POST /api/coupons/apply
Body: { code: string, orderId: string }
Response: { success: boolean, newTotal: number }
```

### 3. UI Changes

- Checkout 페이지에 쿠폰 입력 필드 추가
- 쿠폰 적용 시 할인 금액 표시
- 쿠폰 유효성 검증 (실시간)

### 4. TDD Tasks

- [ ] 🔴 RED: 쿠폰 검증 API 테스트 작성
- [ ] 🟢 GREEN: 쿠폰 검증 로직 구현
- [ ] 🔵 REFACTOR: 에러 처리 개선
- [ ] 🔴 RED: 쿠폰 적용 API 테스트 작성
- [ ] 🟢 GREEN: 주문 금액 업데이트 구현
- [ ] 🔵 REFACTOR: 트랜잭션 처리 추가

## 🔄 Alternatives Considered

### Alternative 1: 간단한 할인율만 지원
- Pros: 구현 간단
- Cons: 유연성 부족, 마케팅 옵션 제한

### Alternative 2: 외부 쿠폰 서비스 (Stripe Promotion Codes)
- Pros: 기능 풍부, 유지보수 불필요
- Cons: 추가 비용, Stripe에 종속

**선택한 이유**: 자체 구현으로 완전한 제어 가능, 비용 절감

## 📊 Success Metrics

- 쿠폰 사용률: 목표 30%
- 쿠폰 사용 주문의 AOV: 기존 대비 120%
- 재구매율: 20% → 35% 증가
- CAC 감소: 10% 감소

## 🔗 Related

- Related to: [PLANNING.md](./PLANNING.md) - Phase 3 마케팅 자동화
- Depends on: #82 (Stripe 결제 연동 완료 필요)
- Blocks: #95 (추천 프로그램은 쿠폰 기능에 의존)

## 📅 Timeline

- Sprint 7 (Week 7-8)
- Estimate: 5일
```

---

## 우선순위 영역

현재 도움이 가장 필요한 영역:

### 🔥 High Priority

1. **TDD 테스트 작성**
   - Unit tests (함수, 컴포넌트)
   - Integration tests (API, 워크플로우)
   - E2E tests (사용자 시나리오)
   - 현재 커버리지: 30% → 목표: 80%

2. **Core Features 구현** ([plan.md](./plan.md) 참조)
   - Sprint 2: Next.js Frontend
   - Sprint 3: Payment Integration
   - Sprint 4: Automation Workflows

3. **문서화**
   - API 문서 (OpenAPI/Swagger)
   - 컴포넌트 Storybook
   - 코드 JSDoc 주석

### 🌟 Medium Priority

4. **성능 최적화**
   - 이미지 최적화 (Next.js Image)
   - 번들 크기 감소 (tree-shaking)
   - API 응답 시간 개선 (캐싱)
   - Lighthouse 스코어 90+ 목표

5. **접근성 (a11y)**
   - 키보드 네비게이션
   - 스크린 리더 지원
   - ARIA 레이블
   - WCAG 2.1 AA 준수

6. **에러 처리 및 모니터링**
   - Sentry 연동
   - 에러 바운더리
   - 사용자 친화적 에러 메시지

### 💡 Low Priority (Nice to Have)

7. **다국어 지원**
   - i18n 설정 (next-intl)
   - 영어, 중국어, 일본어 번역
   - 지역별 통화 표시

8. **고급 기능**
   - PWA (Progressive Web App)
   - 오프라인 지원
   - Push 알림

9. **개발자 경험 (DX)**
   - Prettier 자동 포맷팅
   - Husky pre-commit hooks
   - GitHub Actions CI/CD

---

## Validation Checklist

### PR 제출 전 확인사항

#### 코드 품질

- [ ] 모든 테스트 통과 (`npm test`)
- [ ] 타입 체크 통과 (`npm run type-check`)
- [ ] 린트 통과 (`npm run lint`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] 테스트 커버리지 유지 또는 증가

#### TDD 준수

- [ ] 🔴 RED: 실패하는 테스트 작성
- [ ] 🟢 GREEN: 테스트 통과하는 구현
- [ ] 🔵 REFACTOR: 코드 개선 완료
- [ ] 각 단계별 커밋 메시지 명확

#### Clean Code

- [ ] 함수당 20줄 이내
- [ ] 명확한 네이밍 (의도 표현)
- [ ] TypeScript `any` 사용 안 함
- [ ] 주석은 "왜"만 작성 (코드로 설명 가능한 건 제거)
- [ ] 단일 책임 원칙 준수

#### 문서

- [ ] README.md 업데이트 (필요시)
- [ ] API 문서 업데이트 (필요시)
- [ ] CHANGELOG.md 업데이트
- [ ] JSDoc 주석 추가 (public API)

#### 보안

- [ ] 환경 변수 하드코딩 안 함
- [ ] 민감 정보 로그 출력 안 함
- [ ] SQL Injection, XSS 취약점 없음
- [ ] Input validation 구현

---

## 질문이 있나요?

### 📞 Contact Channels

- **GitHub Discussions**: [질문 및 아이디어](https://github.com/Prometheus-P/NumnaRoad/discussions)
- **GitHub Issues**: [버그 리포트 및 기능 제안](https://github.com/Prometheus-P/NumnaRoad/issues/new)
- **Email**: your.email@example.com

### 📚 Additional Resources

- **[README.md](./README.md)** - 프로젝트 개요
- **[CONTEXT.md](./CONTEXT.md)** - 전체 맥락
- **[ENVIRONMENT.md](./ENVIRONMENT.md)** - 환경 설정
- **[plan.md](./plan.md)** - 개발 태스크
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 시스템 아키텍처
- **[API_DOCS.md](./docs/API_DOCS.md)** - API 레퍼런스

---

## 🙏 감사합니다!

NumnaRoad에 기여해주셔서 감사합니다!

**함께 더 나은 자동화 플랫폼을 만들어갑시다!** 🚀

---

> **TL;DR for Contributors**:
> 1. 📋 [plan.md](./plan.md)에서 `📋 TODO` 태스크 선택
> 2. 🔴 RED: 실패하는 테스트 작성
> 3. 🟢 GREEN: 테스트 통과하는 구현
> 4. 🔵 REFACTOR: 코드 개선
> 5. 📝 PR 생성 및 리뷰 대응
