# Product Requirements Document (PRD)

NumnaRoad 제품 요구사항 명세서

---

## 📋 Document Metadata

| 항목 | 내용 |
|------|------|
| **문서 유형** | Product Specification |
| **대상 독자** | PM, 개발자, 디자이너, QA |
| **최종 수정** | 2024-12-01 |
| **버전** | 1.0.0 |
| **연관 문서** | [CONTEXT.md](./CONTEXT.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [plan.md](./plan.md) |
| **우선순위** | ⭐⭐⭐ (Core) |

---

## 📚 Quick Links

- 🎯 **[CONTEXT.md](./CONTEXT.md)** - 프로젝트 전체 맥락
- 🏗️ **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 시스템 아키텍처
- 📋 **[plan.md](./plan.md)** - 개발 태스크 리스트
- 🗄️ **[DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)** - DB 스키마
- 📡 **[API_DOCS.md](./docs/API_DOCS.md)** - API 문서

---

## 목차

1. [Executive Summary](#executive-summary)
2. [Product Vision](#product-vision)
3. [User Personas](#user-personas)
4. [User Stories](#user-stories)
5. [Functional Requirements](#functional-requirements)
6. [Non-Functional Requirements](#non-functional-requirements)
7. [User Flows](#user-flows)
8. [MVP Scope](#mvp-scope)
9. [Success Metrics](#success-metrics)
10. [Release Plan](#release-plan)

---

## Executive Summary

### Product Overview

**NumnaRoad**는 해외여행 eSIM을 24/7 자동으로 판매하는 완전 자동화 플랫폼입니다.

**핵심 가치 제안**:
- ⚡ **10초 자동 처리**: 주문 → 발급 → 이메일 전송
- 🌙 **24/7 무인 운영**: 인간 개입 없이 야간도 판매
- 💰 **저비용 구조**: 월 $5 서버비, 인건비 제로
- 🎯 **니치 타겟팅**: 유심사가 안 하는 지역 집중

### Business Model

```
도매가 $8 → 판매가 $12 → 마진 $4 (33%)
월 1,000건 × $4 = $4,000 순이익
```

### Target Market

1. **아웃바운드**: 해외여행 한국인 (비주류 여행지)
2. **인바운드**: 한국 방문 외국인 (중국, 일본, 동남아)

---

## Product Vision

### Vision Statement

> "완전 자동화된 eSIM 판매 플랫폼으로 디지털 노마드와 배낭 여행자에게 번거로움 없는 연결성을 제공한다."

### North Star Metric

**Monthly Auto-Processed Orders (월 자동 처리 주문 건수)**

- **Current**: 0건
- **Target**: 1,000건/월
- **Success Criteria**:
  - 주문 → 발급 → 이메일 전송까지 10초 이내
  - 인간 개입 없이 99.9% 성공률

### 3-Year Vision

```
Year 1: MVP 출시 → 월 1,000건 달성
Year 2: 다국어 지원 → 월 5,000건 달성
Year 3: B2B API 출시 → 월 10,000건 달성
```

---

## User Personas

### Persona 1: 디지털 노마드 현수 (Primary)

**Demographics**:
- 나이: 32세
- 직업: 프리랜서 개발자
- 연봉: 7,000만원
- 거주지: 서울 → 해외 노마드

**Travel Patterns**:
- 3개월마다 국가 이동 (동남아, 유럽)
- 비주류 국가 선호 (조지아, 포르투갈, 발리)
- 항상 인터넷 필요 (업무용)

**Pain Points**:
- ❌ 현지 SIM 구매 번거로움 (언어 장벽)
- ❌ 공항 도착 직후 인터넷 필요
- ❌ 유심사 eSIM은 너무 비쌈 ($30+)
- ❌ 재고 부족으로 구매 실패

**Goals**:
- ✅ 저렴한 가격 ($10-15)
- ✅ 즉시 구매 및 활성화
- ✅ 안정적인 데이터
- ✅ 니치 국가 지원

**Tech Savvy**: ⭐⭐⭐⭐⭐ (5/5)

**Quote**:
> "조지아 가는데 유심사는 지원 안 해. 현지 SIM은 공항에서 2시간 기다려야 함. NumnaRoad는 5분 만에 해결!"

### Persona 2: 배낭여행 민지 (Secondary)

**Demographics**:
- 나이: 26세
- 직업: 대학원생
- 연봉: 2,500만원
- 거주지: 부산

**Travel Patterns**:
- 연 2-3회 배낭여행 (동남아, 중앙아시아)
- 저예산 여행 ($1,000/회)
- SNS 활동 많음 (인스타그램)

**Pain Points**:
- ❌ 비싼 로밍 요금 ($50+/주)
- ❌ 현지 SIM 구매 시간 낭비
- ❌ 데이터 용량 부족
- ❌ 복잡한 설정

**Goals**:
- ✅ 가성비 ($10 이하)
- ✅ 간편한 설치 (QR 코드)
- ✅ 충분한 데이터 (3GB+)
- ✅ 한국어 지원

**Tech Savvy**: ⭐⭐⭐ (3/5)

**Quote**:
> "우즈베키스탄 가는데 eSIM이 제일 쌌어. QR 코드 찍으니까 바로 되더라!"

---

## User Stories

### Epic 1: 상품 검색 및 구매

#### US-1.1: 국가별 eSIM 검색
```
As a 여행자
I want to 여행 국가별로 eSIM 검색
So that 내 여행지에 맞는 상품을 빠르게 찾을 수 있다

Acceptance Criteria:
- [ ] 국가 이름으로 검색 가능 (한글, 영문)
- [ ] 검색 결과는 가격 오름차순으로 정렬
- [ ] 검색 결과에 가격, 데이터 용량, 유효기간 표시
- [ ] 재고 없는 상품은 "품절" 표시
```

#### US-1.2: 상품 상세 정보 확인
```
As a 여행자
I want to 상품 상세 정보를 확인
So that 구매 전 충분한 정보를 얻을 수 있다

Acceptance Criteria:
- [ ] 데이터 용량, 유효기간, 지원 네트워크 표시
- [ ] 활성화 방법 설명 (QR 코드, 수동)
- [ ] 실제 사용자 리뷰 표시
- [ ] 환불 정책 명시
```

#### US-1.3: 장바구니에 상품 추가
```
As a 여행자
I want to 여러 상품을 장바구니에 담기
So that 한 번에 결제할 수 있다

Acceptance Criteria:
- [ ] "Add to Cart" 버튼으로 추가
- [ ] 장바구니 아이콘에 상품 개수 표시
- [ ] 장바구니에서 상품 수량 변경 가능
- [ ] 장바구니에서 상품 삭제 가능
```

#### US-1.4: Stripe 결제
```
As a 여행자
I want to 신용카드로 안전하게 결제
So that 빠르고 편리하게 구매할 수 있다

Acceptance Criteria:
- [ ] Stripe Checkout 페이지로 이동
- [ ] 카드 정보 입력 (암호화)
- [ ] 결제 성공 시 주문 완료 페이지로 이동
- [ ] 결제 실패 시 에러 메시지 표시
```

### Epic 2: 자동 주문 처리

#### US-2.1: 자동 eSIM 발급
```
As a 시스템
I want to 결제 완료 시 자동으로 eSIM 발급
So that 인간 개입 없이 주문을 처리할 수 있다

Acceptance Criteria:
- [ ] Stripe Webhook으로 결제 완료 감지
- [ ] PocketBase에 주문 레코드 생성
- [ ] n8n Workflow 자동 트리거
- [ ] eSIM 공급사 API 호출 (eSIM Card)
- [ ] QR 코드 및 활성화 코드 수신
- [ ] 주문 상태 "completed"로 업데이트
```

#### US-2.2: 공급사 자동 전환
```
As a 시스템
I want to 1차 공급사 실패 시 2차 공급사로 자동 전환
So that 주문 실패율을 최소화할 수 있다

Acceptance Criteria:
- [ ] 1차 공급사 (eSIM Card) API 호출
- [ ] 2초 내 응답 없으면 타임아웃
- [ ] 재고 부족 시 2차 공급사 (MobiMatter)로 전환
- [ ] 2차도 실패 시 3차 공급사 (Airalo)로 전환
- [ ] 모두 실패 시 Slack 알림 및 환불 처리
```

#### US-2.3: 자동 이메일 발송
```
As a 시스템
I want to eSIM 발급 완료 시 고객에게 이메일 발송
So that 고객이 즉시 eSIM을 사용할 수 있다

Acceptance Criteria:
- [ ] eSIM 발급 완료 후 5초 이내 이메일 발송
- [ ] QR 코드 이미지 첨부
- [ ] 활성화 코드 텍스트로 포함
- [ ] 활성화 방법 설명 (iOS, Android)
- [ ] 주문 번호 및 고객 지원 연락처 포함
```

### Epic 3: 관리자 대시보드

#### US-3.1: 실시간 주문 모니터링
```
As a 관리자
I want to 실시간으로 주문 현황을 확인
So that 문제 발생 시 즉시 대응할 수 있다

Acceptance Criteria:
- [ ] 최근 24시간 주문 건수 표시
- [ ] 주문 상태별 분류 (pending, completed, failed)
- [ ] 실패한 주문 알림 (빨간색 하이라이트)
- [ ] 자동 새로고침 (30초마다)
```

#### US-3.2: 매출 통계
```
As a 관리자
I want to 일별/월별 매출 통계를 확인
So that 비즈니스 성과를 추적할 수 있다

Acceptance Criteria:
- [ ] 일별 매출 그래프 (Chart.js)
- [ ] 월별 매출 비교
- [ ] 평균 주문 금액 (AOV)
- [ ] 순이익률 계산 (마진 포함)
```

---

## Functional Requirements

### FR-1: 상품 관리

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-1.1 | 관리자는 상품을 생성/수정/삭제할 수 있다 | Must Have | 📋 TODO |
| FR-1.2 | 상품은 국가, 가격, 데이터 용량, 유효기간 정보를 포함한다 | Must Have | 📋 TODO |
| FR-1.3 | 상품은 활성화/비활성화 상태를 가진다 | Must Have | 📋 TODO |
| FR-1.4 | 재고가 0인 상품은 자동으로 비활성화된다 | Should Have | 📋 TODO |
| FR-1.5 | 상품은 slug로 고유하게 식별된다 | Must Have | 📋 TODO |

### FR-2: 주문 처리

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-2.1 | 고객은 Stripe로 결제할 수 있다 | Must Have | 📋 TODO |
| FR-2.2 | 결제 완료 시 주문이 자동 생성된다 | Must Have | 📋 TODO |
| FR-2.3 | 주문은 pending → processing → completed 상태로 전환된다 | Must Have | 📋 TODO |
| FR-2.4 | 주문 실패 시 자동으로 환불 처리된다 | Should Have | 📋 TODO |
| FR-2.5 | 주문 내역을 고객 이메일로 조회할 수 있다 | Should Have | 📋 TODO |

### FR-3: eSIM 발급

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-3.1 | n8n Workflow가 주문 생성 시 자동 트리거된다 | Must Have | 📋 TODO |
| FR-3.2 | 1차 공급사 (eSIM Card) API를 호출한다 | Must Have | 📋 TODO |
| FR-3.3 | 실패 시 2차 공급사 (MobiMatter)로 자동 전환된다 | Should Have | 📋 TODO |
| FR-3.4 | QR 코드 이미지를 수신하여 저장한다 | Must Have | 📋 TODO |
| FR-3.5 | 활성화 코드를 텍스트로 저장한다 | Must Have | 📋 TODO |

### FR-4: 이메일 발송

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-4.1 | eSIM 발급 완료 시 5초 이내 이메일 발송된다 | Must Have | 📋 TODO |
| FR-4.2 | 이메일에 QR 코드 이미지가 첨부된다 | Must Have | 📋 TODO |
| FR-4.3 | 이메일에 활성화 방법이 포함된다 | Must Have | 📋 TODO |
| FR-4.4 | D+7일에 만족도 조사 이메일이 발송된다 | Nice to Have | 📋 TODO |
| FR-4.5 | D+30일에 재구매 쿠폰 이메일이 발송된다 | Nice to Have | 📋 TODO |

### FR-5: 관리자 대시보드

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-5.1 | 실시간 주문 현황을 표시한다 | Should Have | 📋 TODO |
| FR-5.2 | 일별/월별 매출 통계를 표시한다 | Should Have | 📋 TODO |
| FR-5.3 | 실패한 주문을 하이라이트한다 | Should Have | 📋 TODO |
| FR-5.4 | Slack 알림을 설정할 수 있다 | Nice to Have | 📋 TODO |
| FR-5.5 | 주문을 수동으로 재처리할 수 있다 | Should Have | 📋 TODO |

---

## Non-Functional Requirements

### NFR-1: Performance

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-1.1 | 주문 처리 시간 | < 10초 | Stripe → Email 전송 |
| NFR-1.2 | 상품 목록 로딩 | < 2초 | First Contentful Paint |
| NFR-1.3 | API 응답 시간 | < 500ms | 95th percentile |
| NFR-1.4 | 동시 주문 처리 | 100건/분 | Load testing |
| NFR-1.5 | Database 쿼리 | < 100ms | PocketBase logs |

### NFR-2: Reliability

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-2.1 | 시스템 가용성 | 99.9% | Uptime monitoring |
| NFR-2.2 | 자동 주문 처리 성공률 | 99.9% | Order success rate |
| NFR-2.3 | 이메일 발송 성공률 | 99.5% | Resend analytics |
| NFR-2.4 | 공급사 Failover 시간 | < 5초 | n8n logs |
| NFR-2.5 | 에러 복구 시간 (MTTR) | < 1시간 | Incident reports |

### NFR-3: Scalability

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-3.1 | 월 처리 주문 | 10,000건 | Order count |
| NFR-3.2 | 데이터베이스 크기 | < 1GB | SQLite size |
| NFR-3.3 | Storage 사용량 | < 5GB | Railway metrics |
| NFR-3.4 | Memory 사용량 | < 512MB | Railway metrics |
| NFR-3.5 | Horizontal scaling | 3 instances | Load balancer |

### NFR-4: Security

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-4.1 | HTTPS 강제 | 100% | SSL certificate |
| NFR-4.2 | 환경 변수 암호화 | 100% | Railway secrets |
| NFR-4.3 | SQL Injection 방지 | 100% | Code review |
| NFR-4.4 | XSS 방지 | 100% | CSP headers |
| NFR-4.5 | Rate Limiting | 100 req/min | Cloudflare |

### NFR-5: Usability

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-5.1 | 모바일 반응형 | 100% | Mobile-friendly test |
| NFR-5.2 | Lighthouse Score | > 90 | Lighthouse CI |
| NFR-5.3 | 접근성 (a11y) | WCAG 2.1 AA | axe DevTools |
| NFR-5.4 | 페이지 로딩 | < 3초 | PageSpeed Insights |
| NFR-5.5 | 브라우저 호환성 | Chrome, Safari, Firefox | BrowserStack |

---

## User Flows

### Flow 1: eSIM 구매 (Happy Path)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. 홈페이지 접속                                                │
│    https://numnaroad.com                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. 여행 국가 검색                                               │
│    - Search bar: "일본"                                         │
│    - 또는 Popular destinations 클릭                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. 상품 목록 확인                                               │
│    ┌──────────────────────────────────────────────┐            │
│    │ 일본 eSIM 7일 3GB                            │            │
│    │ $12                                          │            │
│    │ [자세히 보기] [장바구니 추가]                │            │
│    └──────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. 상품 상세 페이지                                             │
│    - 데이터 용량: 3GB                                           │
│    - 유효기간: 7일                                              │
│    - 지원 네트워크: Docomo, SoftBank                           │
│    - 활성화 방법: QR 코드                                       │
│    - 리뷰: ⭐⭐⭐⭐⭐ (4.8/5.0)                                  │
│    [장바구니에 담기]                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. 장바구니 페이지                                              │
│    ┌──────────────────────────────────────────────┐            │
│    │ 일본 eSIM 7일 3GB  x1        $12            │            │
│    └──────────────────────────────────────────────┘            │
│    Subtotal: $12                                                │
│    [Checkout]                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Stripe Checkout 페이지                                       │
│    - 이메일 입력: customer@example.com                         │
│    - 카드 번호: 4242 4242 4242 4242                           │
│    - 만료일: 12/25                                              │
│    - CVC: 123                                                   │
│    [결제하기]                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. 결제 처리 (Stripe)                                           │
│    - ⏳ Processing...                                           │
│    - ✅ Payment successful!                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. 주문 완료 페이지                                             │
│    ✅ 주문이 완료되었습니다!                                    │
│    주문번호: #12345                                             │
│    이메일로 eSIM이 발송되었습니다.                             │
│    [주문 내역 보기]                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. 이메일 수신 (5초 이내)                                       │
│    Subject: NumnaRoad - 일본 eSIM 발급 완료                    │
│    Body:                                                         │
│    - QR 코드 이미지 [📱]                                        │
│    - 활성화 코드: ABC-123-DEF-456                              │
│    - 활성화 방법 (iOS/Android)                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 10. eSIM 활성화 (고객)                                          │
│     - 설정 → 모바일 데이터 → eSIM 추가                         │
│     - QR 코드 스캔                                              │
│     - ✅ 활성화 완료!                                           │
└─────────────────────────────────────────────────────────────────┘
```

**소요 시간**: 결제 완료 → 이메일 수신 = **10초 이내**

### Flow 2: 주문 실패 처리 (Error Handling)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. 결제 완료 (Stripe)                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. PocketBase Webhook → n8n Trigger                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. eSIM Card API 호출                                           │
│    ❌ Error: Timeout (2초 초과)                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Failover: MobiMatter API 호출                                │
│    ❌ Error: Out of stock                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Failover: Airalo API 호출                                    │
│    ❌ Error: API key invalid                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. 모든 공급사 실패                                             │
│    - 주문 상태: failed                                          │
│    - Slack 알림: "Order #12345 failed - All providers down"   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. 자동 환불 처리 (Stripe Refund API)                          │
│    - Refund amount: $12                                         │
│    - Reason: "Product out of stock"                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. 고객 이메일 발송                                             │
│    Subject: NumnaRoad - 주문 취소 및 환불 안내                 │
│    Body:                                                         │
│    - 일시적인 재고 부족으로 주문이 취소되었습니다.            │
│    - $12가 3-5일 내 환불됩니다.                                 │
│    - 10% 할인 쿠폰 제공: SORRY10                                │
└─────────────────────────────────────────────────────────────────┘
```

**Failover 시간**: 전체 3개 공급사 시도 = **5-10초**

---

## MVP Scope

### MVP Features (Must Have)

**Sprint 1-2: Core Backend (2주)**

- ✅ PocketBase 설정 및 Collections 생성
- ✅ esim_products, orders, customers Collections
- ✅ PocketBase Webhook (orders.pb.js)

**Sprint 3-4: Frontend (2주)**

- ✅ Next.js 프로젝트 초기화
- ✅ 상품 목록 페이지 (/products)
- ✅ 상품 상세 페이지 (/products/[slug])
- ✅ 장바구니 기능 (Zustand)
- ✅ Checkout 페이지

**Sprint 5-6: Payment & Automation (2주)**

- ✅ Stripe Checkout Session API
- ✅ Stripe Webhook Handler
- ✅ n8n Docker 배포
- ✅ Order Processing Workflow
- ✅ eSIM Card API 연동
- ✅ Resend 이메일 발송

### Post-MVP Features (Should Have)

**Phase 2 (월 2-3)**

- Multi-Provider Failover (MobiMatter, Airalo)
- 재고 동기화 Cron Job
- 관리자 대시보드
- 주문 통계

**Phase 3 (월 4-6)**

- 쿠폰 시스템
- 리뷰 시스템
- 마케팅 자동화 (D+7, D+30)
- SEO 최적화

### Future Features (Nice to Have)

**Phase 4 (월 7-12)**

- 다국어 지원 (영어, 중국어, 일본어)
- 모바일 앱 (React Native)
- B2B API (리셀러 프로그램)
- AI 챗봇 (고객 지원)

---

## Success Metrics

### North Star Metric

**Monthly Auto-Processed Orders**

```
Target: 1,000건/월
Current: 0건
Deadline: 2025-06-01 (6개월)
```

### Key Performance Indicators (KPIs)

#### Business Metrics

| Metric | Target | Measurement | Frequency |
|--------|--------|-------------|-----------|
| Monthly Revenue | $12,000 | Stripe Dashboard | Monthly |
| Monthly Profit | $4,000 | Revenue - Cost | Monthly |
| Average Order Value (AOV) | $12 | Total Revenue / Orders | Monthly |
| Profit Margin | 33% | (Price - Cost) / Price | Monthly |
| Customer Acquisition Cost (CAC) | $5 | Marketing Spend / New Customers | Monthly |

#### Product Metrics

| Metric | Target | Measurement | Frequency |
|--------|--------|-------------|-----------|
| Order Processing Time | < 10초 | Stripe → Email | Real-time |
| Automation Success Rate | 99.9% | Successful Orders / Total | Daily |
| Email Delivery Rate | 99.5% | Resend Analytics | Daily |
| Website Conversion Rate | 5% | Orders / Visitors | Weekly |
| Cart Abandonment Rate | < 50% | Carts / Checkouts | Weekly |

#### Technical Metrics

| Metric | Target | Measurement | Frequency |
|--------|--------|-------------|-----------|
| System Uptime | 99.9% | Railway Metrics | Real-time |
| API Response Time | < 500ms | 95th percentile | Real-time |
| Error Rate | < 0.1% | Sentry | Real-time |
| Lighthouse Score | > 90 | Lighthouse CI | Weekly |
| Test Coverage | > 80% | Jest Coverage | Per Commit |

### Success Criteria

**MVP Success (3개월)**:
- ✅ 월 100건 자동 처리
- ✅ 99% 자동화 성공률
- ✅ 10초 이내 처리 시간
- ✅ $400/월 순이익

**Product-Market Fit (6개월)**:
- ✅ 월 1,000건 자동 처리
- ✅ 99.9% 자동화 성공률
- ✅ 5% 전환율
- ✅ $4,000/월 순이익

**Scale (12개월)**:
- ✅ 월 5,000건 자동 처리
- ✅ 다국어 지원 (3개 언어)
- ✅ B2B API 출시
- ✅ $20,000/월 순이익

---

## Release Plan

### Version 0.1.0 (MVP) - 2024년 12월

**Features**:
- ✅ 상품 목록 및 상세 페이지
- ✅ Stripe 결제
- ✅ 자동 eSIM 발급 (eSIM Card 단일 공급사)
- ✅ 이메일 자동 발송

**Target**:
- 첫 10건 주문 처리
- 자동화 검증

### Version 0.2.0 - 2025년 1월

**Features**:
- ✅ Multi-Provider Failover
- ✅ 관리자 대시보드
- ✅ 주문 통계

**Target**:
- 월 100건 주문 처리

### Version 0.3.0 - 2025년 2월

**Features**:
- ✅ 쿠폰 시스템
- ✅ 리뷰 시스템
- ✅ SEO 최적화

**Target**:
- 월 300건 주문 처리

### Version 1.0.0 (정식 릴리스) - 2025년 3월

**Features**:
- ✅ 마케팅 자동화
- ✅ 성능 최적화
- ✅ 보안 강화

**Target**:
- 월 1,000건 주문 처리
- Product-Market Fit 달성

---

## Validation Checklist

### PRD 완성도

- [x] Product Vision 명확
- [x] User Personas 구체적 (2개)
- [x] User Stories 작성 (3 Epics, 15+ Stories)
- [x] Functional Requirements 명세 (25+ items)
- [x] Non-Functional Requirements 명세 (25+ items)
- [x] User Flows 시각화 (2개)
- [x] MVP Scope 정의
- [x] Success Metrics 명확 (North Star + KPIs)
- [x] Release Plan 수립

### 이해관계자 승인

- [ ] PM 승인
- [ ] 개발팀 리뷰
- [ ] 디자인팀 리뷰
- [ ] QA 팀 리뷰

---

## 📚 Additional Resources

- **[CONTEXT.md](./CONTEXT.md)** - 프로젝트 전체 맥락
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 시스템 아키텍처
- **[plan.md](./plan.md)** - 개발 태스크 리스트
- **[DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)** - DB 스키마
- **[API_DOCS.md](./docs/API_DOCS.md)** - API 문서

---

## 🙏 Document Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Manager | - | - | - |
| Tech Lead | - | - | - |
| Design Lead | - | - | - |

---

**Version History**:
- v1.0.0 (2024-12-01): Initial PRD creation

---

> **TL;DR**:
> - **Vision**: 완전 자동화 eSIM 판매 플랫폼
> - **Target**: 월 1,000건 자동 처리, $4,000 순이익
> - **MVP**: 단일 공급사 연동, 자동 주문 처리 (3개월)
> - **Success**: 10초 처리 시간, 99.9% 성공률
