# NumnaRoad

**자동화된 eSIM 판매 플랫폼 | Automated eSIM Sales Platform**

> 해외여행 eSIM을 24/7 자동으로 판매하는 무인 시스템. 주문부터 발급까지 인간 개입 없이 10초 내 완료.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![PocketBase](https://img.shields.io/badge/PocketBase-0.22-green)](https://pocketbase.io/)

---

## 🎯 프로젝트 목표

**자동화를 통한 수익 최대화**

- 수동 처리: 주문당 10분 → **자동화: 10초**
- 하루 처리 한계: 48건 → **무제한**
- 야간 판매: 불가능 → **24/7 자동 판매 (+30% 매출)**
- 인건비: 월 300만원 → **월 $5 (서버비)**
- 순이익률: 20-30% → **40-60%**

---

## 📊 사업 모델

### 타겟 시장
1. **아웃바운드**: 해외여행 한국인 (비주류 여행지 집중)
2. **인바운드**: 한국 방문 외국인 (중국, 일본, 동남아)

### 수익 구조
```
도매가: $8 → 판매가: $12 → 마진: $4 (33%)
월 300건 × $4 = $1,200 순이익
월 1,000건 달성 시 = $4,000 순이익
```

### 경쟁 우위
- **니치 타겟팅**: 유심사가 안 하는 지역 (볼리비아, 조지아 등)
- **완전 자동화**: 공급사 API → 자동 발급 → 이메일 전송
- **저비용 구조**: 서버비 월 $5, 인건비 제로

---

## 🏗️ 기술 스택

### Frontend
- **Next.js 14** (App Router, SSR/ISR)
- **TypeScript** (타입 안정성)
- **TailwindCSS** + shadcn/ui (빠른 UI 구축)
- **React Query** (API 상태관리, 자동 재시도)

### Backend
- **PocketBase** (Go 기반 단일 바이너리)
  - Database: SQLite (내장)
  - Auth: Built-in
  - File Storage: Built-in
  - Admin UI: Built-in
  - Realtime: WebSocket 지원

### Automation
- **n8n** (자체 호스팅 워크플로우)
  - 주문 → eSIM 발급 → 이메일 전송
  - 재고 자동 동기화
  - 공급사 장애 시 대체 전환

### Payment
- **Stripe** (글로벌 결제)
- **토스페이먼츠** (한국 결제)

### eSIM Providers
- **eSIM Card** (MOQ 없음, 즉시 시작)
- **MobiMatter** (대량 구매 시)
- **Airalo** (백업용)

---

## ⚡ 핵심 기능

### 1. 자동 주문 처리
```
고객 결제 완료 
→ Stripe Webhook 
→ PocketBase Order 생성 
→ n8n Trigger 
→ eSIM 공급사 API 호출 
→ QR 코드 받기 
→ 고객 이메일 발송 
→ 주문 완료 (총 소요시간: 10초)
```

### 2. 공급사 자동 전환
- 1차 공급사 실패 시 → 2차 공급사로 자동 전환
- 재고 부족 시 → 다른 공급사 자동 선택
- API 응답 2초 초과 시 → Timeout 처리 후 재시도

### 3. 실시간 재고 관리
- Cron Job: 1시간마다 공급사 재고 동기화
- 재고 10개 이하 시 → 자동 알림
- 품절 시 → 자동으로 상품 비활성화

### 4. 마케팅 자동화
- 구매 완료 → 환영 이메일 + eSIM 사용법
- D+7 → 만족도 조사 + 리뷰 요청
- D+30 → 재구매 쿠폰 (10% 할인)
- 장바구니 이탈 → 1시간 후 리마인더

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
│   │       └── stripe.ts      # Stripe 연동
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
│   │   ├── esimcard.ts
│   │   ├── mobimatter.ts
│   │   └── airalo.ts
│   ├── payment/               # 결제 처리
│   │   ├── stripe.ts
│   │   └── toss.ts
│   └── email/                 # 이메일 전송
│       └── resend.ts
│
├── docs/                       # 프로젝트 문서
│   ├── PLANNING.md            # 기획안
│   ├── ARCHITECTURE.md        # 시스템 설계
│   ├── DATABASE_SCHEMA.md     # DB 스키마
│   ├── API_DOCS.md            # API 문서
│   ├── DEPLOYMENT.md          # 배포 가이드
│   └── ROADMAP.md             # 개발 로드맵
│
├── scripts/                    # 유틸리티 스크립트
│   ├── seed-products.ts       # 샘플 데이터 생성
│   └── test-providers.ts      # 공급사 API 테스트
│
├── .env.example               # 환경변수 예시
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 빠른 시작

### 1. 사전 요구사항
```bash
Node.js 18+
npm or yarn
PocketBase 0.22+
```

### 2. 설치
```bash
# 저장소 클론
git clone https://github.com/Prometheus-P/NumnaRoad.git
cd NumnaRoad

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일을 열어서 API 키 입력
```

### 3. PocketBase 실행
```bash
cd pocketbase
./pocketbase serve
# Admin UI: http://127.0.0.1:8090/_/
```

### 4. 개발 서버 실행
```bash
# 새 터미널에서
cd apps/web
npm run dev
# http://localhost:3000
```

### 5. 샘플 데이터 생성
```bash
npm run seed
```

---

## 📖 문서

- [📋 기획안](./docs/PLANNING.md) - 사업 모델 및 시장 분석
- [🏗️ 아키텍처](./docs/ARCHITECTURE.md) - 시스템 설계 및 자동화 플로우
- [🗄️ DB 스키마](./docs/DATABASE_SCHEMA.md) - 데이터베이스 구조
- [📡 API 문서](./docs/API_DOCS.md) - REST API 레퍼런스
- [🚀 배포 가이드](./docs/DEPLOYMENT.md) - 프로덕션 배포 방법
- [🗺️ 로드맵](./docs/ROADMAP.md) - 개발 일정 및 마일스톤

---

## 💰 예산 및 비용

### 초기 투자: 500만원
```
도메인: 15,000원/년
서버 (Railway): $5/월 → 60,000원/년
eSIM 초기 재고 (100개): 800,000원
마케팅 (네이버 블로그 체험단): 500,000원
예비비: 3,625,000원
```

### 월간 운영비: $10 (약 13,000원)
```
PocketBase 서버 (Railway): $5
n8n 자체 호스팅: $0
도메인: $1.25 (15,000원/12개월)
이메일 (Resend): $0 (월 3,000건 무료)
```

### 손익분기점: 월 100건
```
월 100건 × 마진 $4 = $400 (520,000원)
월간 비용: $10 (13,000원)
순이익: $390 (507,000원)
```

---

## 🎯 개발 로드맵

### Phase 1: MVP (2주)
- [x] PocketBase 설정 및 Collections 생성
- [ ] Next.js 프론트엔드 기본 구조
- [ ] eSIM Card API 연동 (1개 공급사)
- [ ] Stripe 결제 연동
- [ ] 자동 주문 처리 파이프라인
- [ ] 이메일 자동 발송

**목표: 첫 자동 주문 처리 성공**

### Phase 2: 자동화 확장 (2주)
- [ ] n8n 워크플로우 구축
- [ ] 공급사 2개 추가 (MobiMatter, Airalo)
- [ ] 자동 재고 동기화
- [ ] 공급사 장애 시 대체 전환 로직
- [ ] 관리자 대시보드 (주문/통계)

**목표: 다중 공급사 자동 전환 완성**

### Phase 3: 마케팅 & 최적화 (2주)
- [ ] SEO 최적화 (메타태그, 사이트맵)
- [ ] 네이버 스마트스토어 연동
- [ ] 마케팅 자동화 (이메일 시퀀스)
- [ ] 성능 튜닝 (이미지 최적화, 캐싱)
- [ ] 에러 모니터링 (Sentry)

**목표: 런칭 준비 완료**

### Phase 4: 확장 (진행 중)
- [ ] 다국어 지원 (영어, 중국어, 일본어)
- [ ] 모바일 앱 (React Native)
- [ ] B2B API (리셀러 프로그램)
- [ ] AI 챗봇 (고객 지원 자동화)

---

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일 참조

---

## 📧 연락처

프로젝트 관리자: [@yourusername](https://github.com/yourusername)

프로젝트 링크: [https://github.com/Prometheus-P/NumnaRoad](https://github.com/Prometheus-P/NumnaRoad)

---

## 🙏 Acknowledgments

- [PocketBase](https://pocketbase.io/) - 백엔드 인프라
- [Next.js](https://nextjs.org/) - 프론트엔드 프레임워크
- [n8n](https://n8n.io/) - 워크플로우 자동화
- [Stripe](https://stripe.com/) - 결제 처리
- [shadcn/ui](https://ui.shadcn.com/) - UI 컴포넌트

---

**하면 된다. Let's automate and scale.**
