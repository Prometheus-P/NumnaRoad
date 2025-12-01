# 🗺️ Development Roadmap

## 전체 일정

**총 기간: 6주**
**목표: 월 300건 판매, 순이익 150만원**

---

## Phase 1: MVP (주 1-2)

**기간: 2주**  
**목표: 첫 자동 주문 처리 성공**

### Week 1: 기반 구축

#### Day 1-2: 환경 설정
- [x] PocketBase 로컬 설치 및 실행
- [ ] PocketBase Collections 생성
  - [ ] esim_products
  - [ ] orders
  - [ ] users (기본 제공)
  - [ ] automation_logs
  - [ ] provider_sync_logs
- [ ] 샘플 데이터 10개 입력
- [ ] PocketBase Admin UI 탐색

#### Day 3-4: 프론트엔드 기본 구조
- [ ] Next.js 프로젝트 초기화
- [ ] TailwindCSS + shadcn/ui 설정
- [ ] PocketBase SDK 연동
- [ ] 레이아웃 구성
  - [ ] Header (로고, 네비게이션, 로그인)
  - [ ] Footer
  - [ ] 메인 페이지

#### Day 5-7: 상품 페이지
- [ ] 상품 목록 페이지 (`/products`)
  - [ ] 국가별 필터
  - [ ] 가격대별 필터
  - [ ] 데이터 용량별 필터
- [ ] 상품 상세 페이지 (`/products/[slug]`)
  - [ ] 상품 정보 표시
  - [ ] 설치 가이드
  - [ ] 리뷰 섹션 (추후 구현)
- [ ] 장바구니 기능 (선택사항)

**Week 1 완료 기준:**
- 상품을 목록과 상세 페이지에서 확인할 수 있음
- PocketBase API로 데이터를 성공적으로 불러옴

---

### Week 2: 결제 및 자동화

#### Day 8-10: Stripe 결제 연동
- [ ] Stripe 계정 생성 (테스트 모드)
- [ ] Stripe Checkout Session 생성 API
- [ ] 결제 페이지 (`/checkout`)
  - [ ] 고객 정보 입력 폼
  - [ ] Stripe Checkout 리다이렉트
- [ ] Stripe Webhook 처리
  - [ ] `payment_intent.succeeded` 이벤트
  - [ ] PocketBase에 주문 생성

#### Day 11-12: eSIM 공급사 연동
- [ ] eSIM Card API 키 발급
- [ ] API 테스트 스크립트 작성
- [ ] 1개 상품 수동 발급 테스트
- [ ] API 래퍼 함수 작성
  ```typescript
  // services/esim-providers/esimcard.ts
  export async function issueESIM(productId: string, email: string)
  ```

#### Day 13-14: 자동화 파이프라인
- [ ] n8n 로컬 설치
- [ ] "Order Processing" 워크플로우 생성
  1. PocketBase Webhook 수신
  2. eSIM Card API 호출
  3. PocketBase 주문 업데이트
  4. 이메일 발송 (Resend)
- [ ] 첫 자동 주문 테스트 성공 🎉

**Week 2 완료 기준:**
- 결제 → eSIM 발급 → 이메일 전송 자동 완료
- 전체 프로세스 시간: 30초 이하

---

## Phase 2: 자동화 확장 (주 3-4)

**기간: 2주**  
**목표: 다중 공급사 자동 전환 완성**

### Week 3: 공급사 확장 및 재고 관리

#### Day 15-17: 공급사 2개 추가
- [ ] MobiMatter API 연동
- [ ] Airalo API 연동 (백업용)
- [ ] 공급사 Factory 패턴 구현
  ```typescript
  // services/esim-providers/provider-factory.ts
  export function getProvider(name: string): ESIMProvider
  ```
- [ ] 자동 전환 로직
  - 1차 실패 → 2차 시도
  - 2차 실패 → 3차 시도
  - 모두 실패 → Slack 알림 + 환불

#### Day 18-19: 재고 동기화 자동화
- [ ] n8n "Inventory Sync" 워크플로우
  - Cron: 1시간마다
  - 모든 공급사 재고 조회
  - PocketBase 상품 재고 업데이트
- [ ] 재고 10개 이하 시 Slack 알림
- [ ] 재고 0개 시 자동 비활성화

#### Day 20-21: 에러 핸들링 강화
- [ ] 재시도 로직 (최대 3회)
- [ ] Timeout 처리 (API 응답 2초 초과)
- [ ] 에러 로그 PocketBase 저장
- [ ] Slack 알림 설정
  - 주문 실패
  - 재고 부족
  - API 장애

**Week 3 완료 기준:**
- 3개 공급사 자동 전환 작동
- 재고 동기화 1시간마다 실행
- 에러 발생 시 Slack 알림 수신

---

### Week 4: 관리자 대시보드 및 통계

#### Day 22-24: 관리자 대시보드
- [ ] 관리자 인증 (PocketBase role-based)
- [ ] 대시보드 페이지 (`/admin/dashboard`)
  - [ ] 오늘/이번 주/이번 달 통계
    - 주문 수
    - 매출
    - 순이익
  - [ ] 최근 주문 목록
  - [ ] 재고 부족 상품 목록
- [ ] 주문 관리 페이지 (`/admin/orders`)
  - [ ] 주문 목록 (필터, 검색)
  - [ ] 주문 상세 조회
  - [ ] 수동 환불 처리

#### Day 25-26: 상품 관리
- [ ] 상품 관리 페이지 (`/admin/products`)
  - [ ] 상품 CRUD
  - [ ] 재고 수동 업데이트
  - [ ] 가격 수정
- [ ] 공급사 동기화 수동 트리거

#### Day 27-28: 통계 및 분석
- [ ] 매출 차트 (Chart.js or Recharts)
- [ ] 국가별 판매 통계
- [ ] 상품별 판매 통계
- [ ] 마진 분석

**Week 4 완료 기준:**
- 관리자가 대시보드에서 실시간 통계 확인 가능
- 상품 및 주문 관리 UI 완성

---

## Phase 3: 마케팅 & 최적화 (주 5-6)

**기간: 2주**  
**목표: 런칭 준비 완료**

### Week 5: 마케팅 기능 및 SEO

#### Day 29-31: 마케팅 자동화
- [ ] 이메일 자동화 (n8n + Resend)
  - [ ] 구매 완료 이메일 (즉시)
  - [ ] 사용 가이드 이메일 (구매 후 1시간)
  - [ ] 만족도 조사 (D+7)
  - [ ] 재구매 쿠폰 (D+30, 10% 할인)
- [ ] 장바구니 이탈 리마인더 (1시간 후)

#### Day 32-33: 쿠폰 시스템
- [ ] 쿠폰 Collection 생성
- [ ] 쿠폰 적용 API
- [ ] 쿠폰 검증 로직
- [ ] 관리자 쿠폰 생성 UI

#### Day 34-35: SEO 최적화
- [ ] 메타 태그 설정
  ```typescript
  export const metadata: Metadata = {
    title: "일본 eSIM | 즉시 발급 | eSIM Vault",
    description: "일본 여행 7일 무제한 eSIM 12,000원...",
  }
  ```
- [ ] 사이트맵 생성
- [ ] robots.txt 설정
- [ ] Open Graph 이미지
- [ ] Schema.org 마크업 (상품 정보)
- [ ] Google Search Console 등록

**Week 5 완료 기준:**
- 구글 검색에 사이트 노출
- 이메일 자동화 워크플로우 작동

---

### Week 6: 최적화 및 런칭

#### Day 36-37: 성능 최적화
- [ ] 이미지 최적화 (WebP, AVIF)
- [ ] Lazy Loading 적용
- [ ] Next.js Image 컴포넌트 사용
- [ ] 번들 크기 최적화 (Code Splitting)
- [ ] Lighthouse 스코어 90+ 달성

#### Day 38-39: 모니터링 설정
- [ ] Sentry 설정 (에러 추적)
- [ ] Uptime Robot 설정 (가동 모니터링)
- [ ] Google Analytics 4 설정
- [ ] Slack 알림 통합

#### Day 40-41: 프로덕션 배포
- [ ] 도메인 구매 (numnaroad.com)
- [ ] Railway/Vercel 배포
- [ ] SSL 인증서 설정
- [ ] 환경변수 프로덕션으로 교체
- [ ] 결제 테스트 (실제 카드)
- [ ] eSIM 발급 테스트 (실제 주문)

#### Day 42: 런칭 🚀
- [ ] 네이버 스마트스토어 개설
- [ ] 체험단 모집 (20명)
- [ ] 네이버 블로그 포스팅 (5개)
- [ ] 네이버 카페 홍보 (3곳)

**Week 6 완료 기준:**
- 실제 주문 10건 처리 성공
- 모든 자동화 정상 작동
- 첫 고객 리뷰 수집

---

## Phase 4: 성장 & 확장 (주 7+)

**기간: 진행 중**  
**목표: 월 500-1,000건 달성**

### Month 2: 마케팅 강화

- [ ] 네이버 검색 광고 시작 (월 50만원)
- [ ] 인스타그램 광고 (월 30만원)
- [ ] 인플루언서 협업 (3명)
- [ ] 블로그 콘텐츠 20개 작성
- [ ] 네이버 스마트스토어 검색 광고

**목표: 월 200건 달성**

### Month 3: 기능 확장

- [ ] 리뷰 시스템 구현
- [ ] 포인트/리워드 시스템
- [ ] 다국어 지원 (영어)
- [ ] 모바일 앱 (React Native) 시작
- [ ] B2B API (리셀러 프로그램)

**목표: 월 300건 달성**

### Month 4-6: 인바운드 시장 진출

- [ ] 영어 사이트 런칭
- [ ] 중국어 사이트 런칭
- [ ] 구글 SEO 최적화
- [ ] 구글 광고 (월 40만원)
- [ ] TripAdvisor 등록
- [ ] 공항 픽업 제휴 (선택사항)

**목표: 월 500건 달성**

### Month 7-12: 확장 및 자동화 고도화

- [ ] AI 챗봇 (고객 지원 자동화)
- [ ] 동적 가격 책정 (수요 기반)
- [ ] 멀티국가 플랜 확대
- [ ] 구독 모델 (디지털 노마드용)
- [ ] 제휴 마케팅 프로그램

**목표: 월 1,000건 달성**

---

## 마일스톤

### 🎯 Milestone 1: MVP 완성 (Week 2 말)
- ✅ 첫 자동 주문 처리 성공
- ✅ 결제 → 발급 → 이메일 자동화

### 🎯 Milestone 2: 자동화 완성 (Week 4 말)
- ✅ 다중 공급사 자동 전환
- ✅ 재고 동기화 자동화
- ✅ 관리자 대시보드 완성

### 🎯 Milestone 3: 런칭 (Week 6 말)
- ✅ 프로덕션 배포
- ✅ 첫 실제 주문 10건
- ✅ SEO 최적화 완료

### 🎯 Milestone 4: 손익분기 (Month 3)
- ✅ 월 300건 달성
- ✅ 순이익 +60만원

### 🎯 Milestone 5: 스케일링 (Month 6)
- ✅ 월 500건 달성
- ✅ 인바운드 시장 진출

### 🎯 Milestone 6: 자동화 완전체 (Month 12)
- ✅ 월 1,000건 달성
- ✅ 순이익 400만원/월
- ✅ 인간 개입 거의 제로

---

## 리스크 관리

### 일정 지연 리스크

| 리스크 | 확률 | 대응 방안 |
|--------|------|-----------|
| API 연동 어려움 | 중 | 공급사 기술 지원 요청, 대체 공급사 준비 |
| 결제 연동 복잡성 | 낮 | Stripe 문서 충실히 따르기, 테스트 모드 활용 |
| n8n 워크플로우 오류 | 중 | 단계별 테스트, 로그 철저히 확인 |
| 배포 이슈 | 중 | Railway 대신 Fly.io 준비, 백업 플랜 |

### 기술적 블로커

- **블로커 1**: eSIM Card API 승인 지연
  - **대응**: MobiMatter 먼저 연동, eSIM Card는 추후
  
- **블로커 2**: PocketBase 성능 이슈
  - **대응**: PostgreSQL + Supabase 마이그레이션 준비

- **블로커 3**: 결제 실패율 높음
  - **대응**: 토스페이먼츠 추가, 다양한 결제 수단 제공

---

## 성공 지표 (KPI)

### 기술 KPI

- **자동화율**: 95% 이상 (인간 개입 5% 이하)
- **주문 처리 시간**: 30초 이하
- **시스템 가동률**: 99.5% 이상
- **API 응답 시간**: 2초 이하
- **에러율**: 1% 이하

### 사업 KPI

- **Week 6**: 첫 주문 10건
- **Month 2**: 월 200건
- **Month 3**: 월 300건 (손익분기)
- **Month 6**: 월 500건
- **Month 12**: 월 1,000건

### 고객 KPI

- **고객 만족도**: 4.5/5 이상
- **재구매율**: 20% 이상
- **고객 문의 응답 시간**: 1시간 이내
- **환불율**: 2% 이하

---

## 다음 즉시 할 일

1. **지금 당장** (5분):
   - [ ] PocketBase 다운로드 및 실행
   - [ ] Admin 계정 생성

2. **오늘 중** (2시간):
   - [ ] Collections 5개 생성
   - [ ] 샘플 데이터 10개 입력
   - [ ] API 테스트 (curl or Postman)

3. **이번 주 내** (10시간):
   - [ ] Next.js 프로젝트 초기화
   - [ ] PocketBase SDK 연동
   - [ ] 상품 목록 페이지 완성

---

**일정은 가이드다. 실행하면서 조정한다. 중요한 건 시작하는 것이다.**
