# Contributing to eSIM Vault

기여해주셔서 감사합니다! 이 문서는 eSIM Vault 프로젝트에 기여하는 방법을 안내합니다.

## 목차
1. [Code of Conduct](#code-of-conduct)
2. [개발 환경 설정](#개발-환경-설정)
3. [기여 방법](#기여-방법)
4. [코드 스타일](#코드-스타일)
5. [Pull Request 프로세스](#pull-request-프로세스)
6. [이슈 리포팅](#이슈-리포팅)

---

## Code of Conduct

이 프로젝트는 [Contributor Covenant](https://www.contributor-covenant.org/)를 따릅니다. 모든 참여자는 서로를 존중하고 건설적인 피드백을 제공해야 합니다.

---

## 개발 환경 설정

### 사전 요구사항
- Node.js 18+
- npm or yarn
- Git
- PocketBase

### 로컬 설정

```bash
# 저장소 포크 및 클론
git clone https://github.com/YOUR_USERNAME/esim-vault.git
cd esim-vault

# 원본 저장소를 upstream으로 추가
git remote add upstream https://github.com/original/esim-vault.git

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일을 수정하여 API 키 입력

# PocketBase 실행
cd pocketbase
./pocketbase serve

# 새 터미널에서 Next.js 개발 서버 실행
cd apps/web
npm run dev
```

---

## 기여 방법

### 1. Issue 확인 또는 생성

기여하기 전에 [Issues](https://github.com/yourusername/esim-vault/issues)를 확인하세요:
- 이미 다른 사람이 작업 중인지 확인
- 새로운 기능이나 버그 수정은 먼저 Issue를 생성하고 논의

### 2. 브랜치 생성

```bash
# main 브랜치에서 최신 코드 받기
git checkout main
git pull upstream main

# 새 브랜치 생성
git checkout -b feature/your-feature-name
# 또는
git checkout -b fix/bug-description
```

브랜치 네이밍 컨벤션:
- `feature/` - 새로운 기능
- `fix/` - 버그 수정
- `docs/` - 문서 수정
- `refactor/` - 코드 리팩토링
- `test/` - 테스트 추가/수정

### 3. 코드 작성

- 작은 단위로 커밋
- 명확한 커밋 메시지 작성
- 테스트 추가 (가능한 경우)

### 4. 테스트

```bash
# 타입 체크
npm run type-check

# 린트
npm run lint

# 테스트 실행
npm test
```

### 5. 커밋

```bash
git add .
git commit -m "feat: add coupon validation logic"
```

커밋 메시지 컨벤션 (Conventional Commits):
- `feat:` - 새로운 기능
- `fix:` - 버그 수정
- `docs:` - 문서 수정
- `style:` - 코드 포맷팅 (기능 변경 없음)
- `refactor:` - 코드 리팩토링
- `test:` - 테스트 추가/수정
- `chore:` - 빌드 프로세스 또는 도구 변경

---

## 코드 스타일

### TypeScript

```typescript
// ✅ Good
interface Product {
  id: string;
  name: string;
  price: number;
}

export async function getProducts(): Promise<Product[]> {
  // 구현
}

// ❌ Bad
function getProducts() {
  // 타입 없음
}
```

### React Components

```typescript
// ✅ Good - Named export, TypeScript, clear props
interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-lg font-semibold">{product.name}</h3>
      <button onClick={() => onAddToCart(product.id)}>
        Add to Cart
      </button>
    </div>
  );
}

// ❌ Bad - Default export, no types
export default function ProductCard(props) {
  return <div>{props.product.name}</div>;
}
```

### 네이밍

- **파일명**: `kebab-case.ts` (예: `product-card.tsx`)
- **컴포넌트**: `PascalCase` (예: `ProductCard`)
- **함수/변수**: `camelCase` (예: `getProducts`)
- **상수**: `UPPER_SNAKE_CASE` (예: `API_BASE_URL`)
- **타입/인터페이스**: `PascalCase` (예: `ProductCardProps`)

### 파일 구조

```
feature/
├── components/
│   ├── product-card.tsx
│   └── product-list.tsx
├── hooks/
│   └── use-products.ts
├── services/
│   └── product-service.ts
├── types/
│   └── product.ts
└── index.ts (public API)
```

---

## Pull Request 프로세스

### 1. Push

```bash
git push origin feature/your-feature-name
```

### 2. PR 생성

GitHub에서 Pull Request를 생성:
- 제목: 간결하고 명확하게 (예: "feat: add coupon validation")
- 설명: 변경 사항 상세히 설명
- 관련 Issue 링크 (예: "Closes #123")

### PR 템플릿

```markdown
## 변경 사항
- 쿠폰 검증 로직 추가
- 쿠폰 적용 API 엔드포인트 구현

## 테스트
- [ ] 유효한 쿠폰 적용 테스트
- [ ] 만료된 쿠폰 거부 테스트
- [ ] 사용 한도 초과 쿠폰 거부 테스트

## 스크린샷
(있다면 추가)

## 관련 Issue
Closes #123
```

### 3. 코드 리뷰

- 피드백에 신속히 대응
- 변경 요청 사항 수정
- 리뷰어의 승인 후 머지

---

## 이슈 리포팅

버그를 발견했거나 기능 제안이 있다면:

### 버그 리포트

```markdown
**버그 설명**
간단한 버그 설명

**재현 방법**
1. '...'로 이동
2. '...' 클릭
3. 스크롤 다운
4. 에러 발생

**예상 동작**
어떻게 동작해야 하는지

**실제 동작**
실제로 어떻게 동작하는지

**스크린샷**
(있다면 추가)

**환경**
- OS: [예: macOS 14.0]
- Browser: [예: Chrome 120]
- Node.js: [예: 18.17.0]
```

### 기능 제안

```markdown
**기능 설명**
제안하는 기능의 간단한 설명

**동기**
왜 이 기능이 필요한지

**해결 방법**
어떻게 구현할 수 있을지

**대안**
고려한 다른 방법들

**추가 정보**
기타 정보나 스크린샷
```

---

## 우선순위 영역

도움이 가장 필요한 영역:

1. **테스트 작성**
   - Unit tests
   - Integration tests
   - E2E tests

2. **문서화**
   - API 문서
   - 사용 가이드
   - 코드 주석

3. **성능 최적화**
   - 이미지 최적화
   - 번들 크기 감소
   - API 응답 시간 개선

4. **접근성 (a11y)**
   - 키보드 네비게이션
   - 스크린 리더 지원
   - ARIA 레이블

5. **다국어 지원**
   - 번역 추가
   - i18n 설정

---

## 질문이 있나요?

- [Discussions](https://github.com/yourusername/esim-vault/discussions)에서 질문하기
- [Issue](https://github.com/yourusername/esim-vault/issues/new)로 버그 리포트
- 이메일: your.email@example.com

---

**감사합니다! 함께 더 나은 eSIM Vault를 만들어갑시다!**
