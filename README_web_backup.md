# NumnaRoad Web App

Next.js 기반 고객용 웹 애플리케이션

## 구조

```
web/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/            # 인증 관련 페이지
│   │   ├── login/
│   │   └── register/
│   ├── products/          # 상품 관련
│   │   ├── page.tsx       # 상품 목록
│   │   └── [slug]/        # 상품 상세
│   ├── checkout/          # 결제
│   ├── orders/            # 주문 내역
│   ├── api/               # API Routes
│   │   ├── webhook/       # Stripe Webhook
│   │   └── health/        # Health Check
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx           # 홈페이지
├── components/            # 재사용 가능한 컴포넌트
├── lib/                   # 유틸리티 함수
│   ├── pocketbase.ts      # PocketBase 클라이언트
│   └── stripe.ts          # Stripe 설정
├── public/                # 정적 파일
├── styles/                # 글로벌 스타일
├── next.config.js         # Next.js 설정
├── tailwind.config.ts     # Tailwind 설정
├── tsconfig.json          # TypeScript 설정
└── package.json
```

## 개발 서버 실행

```bash
cd apps/web
npm install
npm run dev
```

http://localhost:3000 에서 확인

## 환경 변수

`.env.local` 파일 생성:

```bash
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 주요 기능

- ✅ 상품 목록 및 상세 페이지
- ✅ Stripe 결제 통합
- ✅ PocketBase 인증
- ✅ 주문 내역 조회
- ✅ 반응형 디자인
- ✅ SEO 최적화

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **State**: React Query (TanStack Query)
- **Auth**: PocketBase
- **Payment**: Stripe
