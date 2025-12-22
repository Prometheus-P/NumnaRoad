# NumnaRoad

**자동화된 eSIM 판매 플랫폼 | Automated eSIM Sales Platform**

> 해외여행 eSIM을 24/7 자동으로 판매하는 무인 시스템. 주문부터 발급까지 인간 개입 없이 10초 내 완료.

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![PocketBase](https://img.shields.io/badge/PocketBase-0.22-green)](https://pocketbase.io/)

---

## 📋 Document Metadata

| 항목 | 내용 |
|------|------|
| **문서 유형** | Quick Start Guide |
| **대상 독자** | 개발자, 기여자, 신규 팀원 |
| **최종 수정** | 2024-12-22 |
| **연관 문서** | [CONTEXT.md](./CONTEXT.md), [ENVIRONMENT.md](./ENVIRONMENT.md), [plan.md](./plan.md) |
| **우선순위** | ⭐⭐⭐ (Core) |

---

## 📚 Documentation Navigation

### 🎯 New to NumnaRoad? Start here:

1. **[docs/community/CONTEXT.md](./docs/community/CONTEXT.md)** - 프로젝트 전체 맥락, 비전, 아키텍처 (Single Source of Truth)
2. **[docs/setup/ENVIRONMENT.md](./docs/setup/ENVIRONMENT.md)** - 완전한 환경 설정 가이드 (Prerequisites → API Keys → Troubleshooting)
3. **[docs/planning/plan.md](./docs/planning/plan.md)** - TDD 기반 개발 태스크 리스트 (Red-Green-Refactor)
4. **README.md (현재 문서)** - 빠른 시작 가이드 (5분 내 로컬 실행)

### 📖 Additional Documentation:

전체 문서 구조는 **[docs/README.md](./docs/README.md)** 참조

| 카테고리 | 문서 | 설명 |
|---------|------|------|
| **기획** | [PRD.md](./docs/planning/PRD.md) | 제품 요구사항 문서 |
| | [PLANNING.md](./docs/planning/PLANNING.md) | 사업 모델 및 시장 분석 |
| | [ROADMAP.md](./docs/planning/ROADMAP.md) | 개발 일정 및 마일스톤 |
| **아키텍처** | [ARCHITECTURE.md](./docs/architecture/ARCHITECTURE.md) | 시스템 설계 및 자동화 플로우 |
| | [DATABASE_SCHEMA.md](./docs/architecture/DATABASE_SCHEMA.md) | PocketBase Collections 스키마 |
| | [DATA_MODEL.md](./docs/architecture/DATA_MODEL.md) | 데이터 모델 |
| **API** | [API_SPEC.md](./docs/api/API_SPEC.md) | API 전체 스펙 |
| | [API_DOCS.md](./docs/api/API_DOCS.md) | REST API 레퍼런스 |
| **배포** | [DEPLOYMENT.md](./docs/deployment/DEPLOYMENT.md) | 프로덕션 배포 가이드 |
| **개발** | [CODE_REVIEW_GUIDE.md](./docs/development/CODE_REVIEW_GUIDE.md) | 코드 리뷰 가이드 |
| | [VERSIONING_GUIDE.md](./docs/development/VERSIONING_GUIDE.md) | 버전 관리 가이드 |
| **커뮤니티** | [CONTRIBUTING.md](./docs/community/CONTRIBUTING.md) | 기여 가이드라인 |
| | [CODE_OF_CONDUCT.md](./docs/community/CODE_OF_CONDUCT.md) | 행동 강령 |
| **기타** | [CHANGELOG.md](./CHANGELOG.md) | 버전 히스토리 |

---

## 🎯 프로젝트 개요

### Vision Statement

**"완전 자동화된 eSIM 판매 플랫폼으로 디지털 노마드와 배낭 여행자에게 번거로움 없는 연결성을 제공한다."**

### North Star Metric

**Monthly Auto-Processed Orders (월 자동 처리 주문 건수)**
- Current: 0건
- Target: 1,000건/월
- Success Criteria: 주문 → 발급 → 이메일 전송까지 10초 이내, 인간 개입 없이 99.9% 성공률

### 자동화 Impact

| 지표 | 수동 처리 | 자동화 |
|------|-----------|--------|
| **처리 시간** | 주문당 10분 | **10초** |
| **일일 처리량** | 48건 (8시간 근무) | **무제한** |
| **야간 판매** | 불가능 | **24/7 운영 (+30% 매출)** |
| **인건비** | 월 300만원 | **월 $5 (서버비)** |
| **순이익률** | 20-30% | **40-60%** |

### 핵심 차별점

1. **니치 타겟팅**: 유심사가 안 하는 지역 (볼리비아, 조지아, 중앙아시아 등)
2. **완전 자동화**: 공급사 API → 자동 발급 → 이메일 전송 (10초 완료)
3. **저비용 구조**: 서버비 월 $5, 인건비 제로
4. **Multi-Provider Failover**: 공급사 장애 시 자동 전환 (99.9% 가용성)

> 💡 **자세한 내용**: 프로젝트 비전, 페르소나, 시스템 아키텍처는 [CONTEXT.md](./CONTEXT.md) 참조

---

## ⚡ 5분 빠른 시작 (Quick Start)

### 자동 설정 (권장)

```bash
# 1. 저장소 클론
git clone https://github.com/Prometheus-P/NumnaRoad.git
cd NumnaRoad

# 2. 자동 설정 스크립트 실행
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh

# 3. 환경 변수 설정
nano .env  # API 키 입력 (아래 참조)

# 4. PocketBase 실행
cd pocketbase && ./pocketbase serve

# 5. 개발 서버 실행 (새 터미널)
cd apps/web && npm run dev
```

### 수동 설정

<details>
<summary>펼치기 (클릭)</summary>

```bash
# 1. 저장소 클론
git clone https://github.com/Prometheus-P/NumnaRoad.git
cd NumnaRoad

# 2. 의존성 설치
npm install

# 3. PocketBase 다운로드
cd pocketbase
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_linux_amd64.zip
unzip -o pocketbase_0.22.0_linux_amd64.zip
chmod +x pocketbase
cd ..

# 4. 환경 변수 설정
cp .env.example .env
# .env 파일을 열어서 API 키 입력

# 5. PocketBase 실행
cd pocketbase && ./pocketbase serve

# 6. 개발 서버 실행 (새 터미널)
cd apps/web && npm run dev
```

</details>

### 필수 환경 변수 (Minimal Setup)

```bash
# PocketBase
POCKETBASE_URL=http://127.0.0.1:8090

# Stripe (테스트 모드)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# eSIM Provider (최소 1개 필요)
ESIM_CARD_API_KEY=your_api_key_here
```

> 💡 **완전한 환경 설정 가이드**: API 키 획득 방법, 선택적 환경 변수, 트러블슈팅은 [ENVIRONMENT.md](./ENVIRONMENT.md) 참조

### 초기 데이터 생성

```bash
# PocketBase Collections 생성
# 1. http://127.0.0.1:8090/_/ 접속
# 2. Admin 계정 생성
# 3. Collections 생성: esim_products, orders, customers, automation_logs
# (상세 스키마는 DATABASE_SCHEMA.md 참조)

# 샘플 상품 데이터 생성
npm run seed
```

### 접속 URL

- **고객 사이트**: http://localhost:3000
- **PocketBase Admin**: http://127.0.0.1:8090/_/
- **n8n (옵션)**: http://localhost:5678

---

## 🏗️ 기술 스택 (Tech Stack)

| 레이어 | 기술 | 선택 이유 |
|--------|------|----------|
| **Frontend** | Next.js 14 (App Router) | SSR/ISR, API Routes, TypeScript 완벽 지원 |
| **UI** | TailwindCSS + shadcn/ui | 빠른 개발, 일관된 디자인 시스템 |
| **Backend** | PocketBase 0.22 | Go 기반 단일 바이너리, Admin UI 내장, 저렴한 호스팅 |
| **Database** | SQLite (embedded) | 서버리스, 백업 간편, Railway 무료 티어 가능 |
| **Automation** | n8n (self-hosted) | 노코드 워크플로우, 무제한 실행, Docker 배포 |
| **Payment** | Stripe + 토스페이먼츠 | 글로벌(Stripe) + 국내(토스) 이중화 |
| **Email** | Resend | 개발자 친화적 API, 월 3,000건 무료 |
| **Monitoring** | Sentry | 에러 추적, 성능 모니터링 |

> 💡 **아키텍처 상세**: 시스템 컨텍스트 다이어그램, 배포 아키텍처, 자동화 플로우는 [CONTEXT.md](./CONTEXT.md) 참조

---

## 📁 프로젝트 구조

```
numnaroad/
├── apps/
│   ├── web/                    # Next.js 고객용 사이트
│   │   ├── app/
│   │   │   ├── (auth)/        # 로그인/회원가입
│   │   │   ├── products/      # 상품 목록
│   │   │   ├── checkout/      # 결제
│   │   │   └── orders/        # 주문 내역
│   │   └── lib/
│   │       ├── pocketbase.ts  # PocketBase 클라이언트
│   │       ├── stripe.ts      # Stripe 결제 처리
│   │       ├── resend.ts      # Resend 이메일 전송
│   │       ├── config.ts      # 환경 설정
│   │       └── crypto.ts      # 암호화 유틸리티
│   │
│   └── admin/                  # 관리자 대시보드
│       ├── app/
│       │   ├── dashboard/     # 대시보드
│       │   ├── products/      # 상품 관리
│       │   ├── orders/        # 주문 관리
│       │   └── analytics/     # 통계
│       └── lib/
│
├── pocketbase/                 # PocketBase 설정
│   ├── pb_data/               # 데이터베이스 (gitignore)
│   ├── pb_migrations/         # 마이그레이션
│   └── pb_hooks/              # Webhook 로직
│       └── orders.pb.js       # 주문 생성 시 n8n 호출
│
├── automation/                 # 자동화 워크플로우
│   ├── n8n-workflows/         # n8n JSON 파일
│   │   ├── order-processing.json
│   │   ├── inventory-sync.json
│   │   └── email-automation.json
│   └── cron-jobs/             # 스케줄 작업
│
├── services/                   # 외부 서비스 연동
│   ├── esim-providers/        # eSIM 공급사 API
│   │   ├── types.ts           # 공통 타입 정의
│   │   ├── provider-factory.ts  # 공급사 추상화 + Failover
│   │   ├── esimcard.ts
│   │   ├── mobimatter.ts
│   │   ├── airalo.ts
│   │   └── index.ts
│   └── logging/               # 로깅 서비스
│       └── automation-logger.ts
│
├── docs/                       # 프로젝트 문서
│   ├── API_DOCS.md            # API 문서
│   └── DATABASE_SCHEMA.md     # DB 스키마
│
├── scripts/                    # 유틸리티 스크립트
│   ├── dev-setup.sh           # 자동 환경 설정
│   ├── seed-products.ts       # 샘플 데이터 생성
│   └── test-providers.ts      # 공급사 API 테스트
│
├── CONTEXT.md                  # ⭐ 프로젝트 Single Source of Truth
├── ENVIRONMENT.md              # ⭐ 완전한 환경 설정 가이드
├── plan.md                     # ⭐ TDD 개발 태스크 리스트
├── README.md                   # ⭐ 빠른 시작 가이드 (현재 문서)
│
├── .github/                    # GitHub 설정
│   ├── ISSUE_TEMPLATE/        # 이슈 템플릿
│   ├── pull_request_template.md
│   ├── CODEOWNERS
│   └── SECURITY.md
│
├── .env.example               # 환경변수 예시
├── .gitignore
├── package.json
├── tsconfig.json
└── LICENSE
```

---

## 🚀 핵심 기능 (Core Features)

### 1. 자동 주문 처리 (Automated Order Processing)

```
[고객] 결제 완료 (Stripe)
   ↓
[Webhook] Stripe → PocketBase
   ↓
[PocketBase Hook] Order 생성 → n8n Trigger
   ↓
[n8n Workflow] eSIM 공급사 API 호출
   ↓ (실패 시 다음 공급사로 자동 전환)
[n8n] QR 코드 수신
   ↓
[n8n] 고객 이메일 발송 (Resend)
   ↓
[Complete] 주문 상태 업데이트 (completed)

⏱️ 총 소요시간: 10초 이내
✅ 성공률: 99.9% (Multi-Provider Failover)
```

### 2. Multi-Provider Failover

```typescript
// services/esim-providers/provider-factory.ts
const PROVIDER_PRIORITY = {
  'eSIM Card': 100,    // Primary (빠른 응답, MOQ 없음)
  'MobiMatter': 80,    // Secondary (대량 구매 시 저렴)
  'Airalo': 60,        // Backup (안정적, 다양한 국가)
};

// 자동 재시도 로직 (Exponential Backoff)
// 1차 공급사 실패 → 2차 공급사 시도 → 3차 공급사 시도
// 각 공급사당 최대 3회 재시도
```

### 3. 실시간 재고 관리

```
[Cron Job] 1시간마다 실행
   ↓
[n8n] 모든 공급사 재고 조회
   ↓
[PocketBase] 재고 수량 업데이트
   ↓
[Condition] 재고 < 10개?
   ↓ (Yes)
[Slack Alert] 관리자에게 알림
   ↓
[Condition] 재고 = 0?
   ↓ (Yes)
[Auto-disable] 상품 비활성화
```

### 4. 마케팅 자동화

```
[구매 완료] → 환영 이메일 + eSIM 사용법 (즉시)
[D+7] → 만족도 조사 + 리뷰 요청
[D+30] → 재구매 쿠폰 10% 할인
[장바구니 이탈] → 1시간 후 리마인더
```

---

## 🎯 개발 로드맵 (Development Roadmap)

### Sprint 1: PocketBase Collections (1주차)
- [x] PocketBase 설치 및 초기 설정
- [ ] Task 1.2: esim_products Collection 생성
- [ ] Task 1.3: orders Collection 생성
- [ ] Task 1.4: PocketBase Webhook 구현 (orders.pb.js)

### Sprint 2: Next.js Frontend (2주차)
- [ ] Task 2.1: Next.js 프로젝트 초기화
- [ ] Task 2.2: 상품 목록 페이지 (products/)
- [ ] Task 2.3: 상품 상세 페이지 (products/[slug])
- [ ] Task 2.4: 장바구니 기능 (Zustand)

### Sprint 3: Payment Integration (3주차)
- [ ] Task 3.1: Stripe Checkout Session API
- [ ] Task 3.2: Stripe Webhook Handler
- [ ] Task 3.3: 결제 성공/실패 페이지

### Sprint 4: Automation (4주차)
- [ ] Task 4.1: n8n Docker 배포
- [ ] Task 4.2: Order Processing Workflow
- [ ] Task 4.3: eSIM Provider 연동 (eSIM Card)
- [ ] Task 4.4: 이메일 자동 발송 (Resend)

### Sprint 5: Multi-Provider & Monitoring (5주차)
- [ ] Task 5.1: Provider Factory 구현
- [ ] Task 5.2: Failover 로직 테스트
- [ ] Task 5.3: Sentry 에러 추적
- [ ] Task 5.4: 재고 동기화 Cron Job

### Sprint 6: Launch Preparation (6주차)
- [ ] Task 6.1: SEO 최적화 (메타태그, 사이트맵)
- [ ] Task 6.2: Railway 배포
- [ ] Task 6.3: 도메인 연결 (numnaroad.com)
- [ ] Task 6.4: 프로덕션 테스트

> 💡 **상세 개발 계획**: TDD Red-Green-Refactor 사이클, 각 태스크별 테스트 케이스는 [plan.md](./plan.md) 참조

---

## 💰 예산 및 비용 (Budget & Costs)

### 초기 투자: 500만원

| 항목 | 금액 |
|------|------|
| 도메인 (numnaroad.com) | 15,000원/년 |
| 서버 (Railway) | 60,000원/년 ($5/월) |
| eSIM 초기 재고 (100개) | 800,000원 |
| 마케팅 (네이버 블로그 체험단) | 500,000원 |
| 예비비 | 3,625,000원 |

### 월간 운영비: $10 (약 13,000원)

```
PocketBase 서버 (Railway): $5
n8n 자체 호스팅: $0 (Railway 동일 인스턴스)
도메인: $1.25
이메일 (Resend): $0 (월 3,000건 무료)
Cloudflare CDN: $0 (무료)
```

### 손익분기점: 월 100건

```
수익: 월 100건 × 마진 $4 = $400 (520,000원)
비용: $10 (13,000원)
순이익: $390 (507,000원)
```

### 목표 달성 시 (월 1,000건)

```
수익: 월 1,000건 × 마진 $4 = $4,000 (5,200,000원)
비용: $10 (13,000원)
순이익: $3,990 (5,187,000원)
ROI: 초기 투자 5,000,000원 → 1개월 만에 회수
```

---

## ✅ Validation Checklist

### 문서 완성도

- [x] 프로젝트 개요 및 Vision 명확
- [x] 5분 빠른 시작 가이드 제공
- [x] 기술 스택 및 선택 이유 설명
- [x] 프로젝트 구조 문서화
- [x] 개발 로드맵 제시
- [x] 환경 설정 가이드 링크 (ENVIRONMENT.md)
- [x] 상세 컨텍스트 문서 링크 (CONTEXT.md)
- [x] 개발 계획 문서 링크 (plan.md)
- [x] 예산 및 비용 투명하게 공개

### 실행 가능성

- [x] 자동 설정 스크립트 제공 (dev-setup.sh)
- [x] .env.example 파일 존재
- [x] 최소 환경 변수 명시
- [x] PocketBase 다운로드 링크 제공
- [x] 개발 서버 실행 명령어 명확
- [x] 초기 데이터 생성 방법 제시

### 협업 준비

- [x] LICENSE 파일 존재 (Proprietary)
- [x] CODE_OF_CONDUCT.md 존재
- [x] CONTRIBUTING.md 링크 제공
- [x] CHANGELOG.md 존재
- [x] Issue 템플릿 (.github/ISSUE_TEMPLATE/)
- [x] PR 템플릿 (.github/pull_request_template.md)
- [x] CODEOWNERS 설정
- [x] SECURITY.md 보안 정책

---

## 🤝 기여하기 (Contributing)

NumnaRoad는 비공개 프로젝트입니다. 승인된 팀원 및 계약자만 접근 가능합니다.

### 기여 절차

1. **Fork** the Project
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/NumnaRoad.git`
3. **Create** a feature branch: `git checkout -b feature/AmazingFeature`
4. **Commit** your changes: `git commit -m 'Add some AmazingFeature'`
5. **Push** to the branch: `git push origin feature/AmazingFeature`
6. **Open** a Pull Request

### 개발 가이드라인

- **TDD-First**: 테스트 작성 → 구현 → 리팩토링 순서 준수 ([plan.md](./plan.md) 참조)
- **Clean Code**: 함수당 20줄 이내, 명확한 네이밍
- **TypeScript**: any 사용 금지, 타입 안정성 보장
- **Commit Convention**: `feat:`, `fix:`, `docs:`, `refactor:` 사용

> 💡 **상세 가이드라인**: [CONTRIBUTING.md](./CONTRIBUTING.md) 참조

---

## 📝 라이선스 (License)

**Proprietary License** - 자세한 내용은 [LICENSE](LICENSE) 파일 참조

이 소프트웨어는 NumnaRoad의 독점 자산입니다. 무단 사용, 복제, 배포가 금지됩니다.

---

## 📧 연락처 (Contact)

**프로젝트 관리자**: [@Prometheus-P](https://github.com/Prometheus-P)

**프로젝트 링크**: [https://github.com/Prometheus-P/NumnaRoad](https://github.com/Prometheus-P/NumnaRoad)

**이슈 제보**: [GitHub Issues](https://github.com/Prometheus-P/NumnaRoad/issues)

---

## 🙏 Acknowledgments

이 프로젝트는 다음 오픈소스 프로젝트들의 도움을 받았습니다:

- [PocketBase](https://pocketbase.io/) - 백엔드 인프라
- [Next.js](https://nextjs.org/) - 프론트엔드 프레임워크
- [n8n](https://n8n.io/) - 워크플로우 자동화
- [Stripe](https://stripe.com/) - 결제 처리
- [shadcn/ui](https://ui.shadcn.com/) - UI 컴포넌트
- [TailwindCSS](https://tailwindcss.com/) - CSS 프레임워크
- [TypeScript](https://www.typescriptlang.org/) - 타입 시스템

---

## 🚀 Next Steps

### 신규 개발자라면:

1. ✅ **README.md (현재 문서)** - 프로젝트 개요 파악
2. 📖 **[CONTEXT.md](./CONTEXT.md)** - 프로젝트 전체 맥락 이해
3. 🔧 **[ENVIRONMENT.md](./ENVIRONMENT.md)** - 로컬 환경 설정
4. 📋 **[plan.md](./plan.md)** - 현재 개발 상황 및 태스크 확인
5. 🤝 **[CONTRIBUTING.md](./CONTRIBUTING.md)** - 기여 가이드라인 숙지

### 기여하고 싶다면:

1. 📋 **[plan.md](./plan.md)** - `📋 TODO` 태스크 중 선택
2. 🔀 **Feature Branch** 생성
3. 🧪 **TDD-First** 접근: Red → Green → Refactor
4. 📝 **Commit** with clear message
5. 🔄 **Pull Request** 생성

### 배포하고 싶다면:

1. 📖 **[DEPLOYMENT.md](./DEPLOYMENT.md)** - 배포 가이드 참조
2. 🔑 환경 변수 프로덕션 설정
3. 🚀 Railway 배포
4. 🌐 도메인 연결
5. ✅ 프로덕션 테스트

---

**하면 된다. Let's automate and scale.**

---

> **TL;DR**:
> - **5분 시작**: `./scripts/dev-setup.sh` 실행 후 `.env` 설정
> - **전체 맥락**: [CONTEXT.md](./CONTEXT.md) 읽기
> - **환경 설정**: [ENVIRONMENT.md](./ENVIRONMENT.md) 따라하기
> - **개발 시작**: [plan.md](./plan.md)에서 태스크 선택
