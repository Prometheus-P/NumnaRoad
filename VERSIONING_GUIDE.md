# Versioning Guide

NumnaRoad 버전 관리 및 릴리스 가이드

---

## 📋 Document Metadata

| 항목 | 내용 |
|------|------|
| **문서 유형** | Collaboration Guide |
| **대상 독자** | 메인테이너, 릴리스 매니저 |
| **최종 수정** | 2024-12-01 |
| **연관 문서** | [CHANGELOG.md](./CHANGELOG.md), [ROADMAP.md](./ROADMAP.md) |
| **우선순위** | ⭐⭐ (High) |

---

## 📚 Quick Links

- 📝 **[CHANGELOG.md](./CHANGELOG.md)** - 버전 히스토리
- 🗺️ **[ROADMAP.md](./ROADMAP.md)** - 개발 로드맵
- 📋 **[plan.md](./plan.md)** - 개발 태스크 리스트

---

## 목차

1. [Semantic Versioning](#semantic-versioning)
2. [버전 번호 규칙](#버전-번호-규칙)
3. [릴리스 프로세스](#릴리스-프로세스)
4. [CHANGELOG 작성법](#changelog-작성법)
5. [Git 태그 관리](#git-태그-관리)
6. [배포 전략](#배포-전략)
7. [롤백 절차](#롤백-절차)

---

## Semantic Versioning

NumnaRoad는 [Semantic Versioning 2.0.0](https://semver.org/)을 따릅니다.

### 버전 형식

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILDMETADATA]

Examples:
1.0.0          # 정식 릴리스
1.1.0          # 기능 추가
1.1.1          # 버그 수정
2.0.0          # Breaking change
1.0.0-alpha.1  # 알파 릴리스
1.0.0-beta.2   # 베타 릴리스
1.0.0-rc.1     # Release Candidate
```

### 버전 구성 요소

#### MAJOR (주 버전)

**언제 증가?**: Breaking changes (하위 호환성 깨짐)

**Examples**:
- API 엔드포인트 URL 변경
- 필수 환경 변수 추가/제거
- Database 스키마 호환성 깨짐
- 공개 함수 시그니처 변경

```typescript
// Breaking Change Example: v1 → v2
// v1.x.x
function getProducts(): Product[] { ... }

// v2.0.0 (Breaking: 반환 타입 변경)
function getProducts(): Promise<Product[]> { ... }
```

#### MINOR (부 버전)

**언제 증가?**: 새 기능 추가 (하위 호환성 유지)

**Examples**:
- 새로운 API 엔드포인트 추가
- 새로운 선택적 파라미터 추가
- 새로운 UI 기능 추가
- 성능 개선

```typescript
// New Feature Example: v1.0 → v1.1
// v1.0.0
function createOrder(productId: string): Order { ... }

// v1.1.0 (New: 선택적 파라미터 추가, 기존 코드 동작 유지)
function createOrder(
  productId: string,
  options?: { couponCode?: string }
): Order { ... }
```

#### PATCH (수 버전)

**언제 증가?**: 버그 수정 (하위 호환성 유지)

**Examples**:
- 버그 수정
- 보안 패치
- 문서 수정
- 타이포 수정

```typescript
// Bug Fix Example: v1.1.0 → v1.1.1
// v1.1.0 (버그: 할인 계산 오류)
function calculateDiscount(price: number, percent: number): number {
  return price * percent / 100; // 잘못된 계산
}

// v1.1.1 (수정: 올바른 계산)
function calculateDiscount(price: number, percent: number): number {
  return price * (1 - percent / 100); // 올바른 계산
}
```

#### PRERELEASE (사전 릴리스)

**형식**: `MAJOR.MINOR.PATCH-PRERELEASE`

**Types**:
- `alpha`: 초기 개발 버전 (불안정)
- `beta`: 기능 완성, 테스트 필요
- `rc`: Release Candidate (릴리스 후보)

```
1.0.0-alpha.1  → 1.0.0-alpha.2  → ... → 1.0.0-alpha.10
                                ↓
1.0.0-beta.1   → 1.0.0-beta.2   → ...
                                ↓
1.0.0-rc.1     → 1.0.0-rc.2     → ...
                                ↓
1.0.0 (정식 릴리스)
```

---

## 버전 번호 규칙

### 초기 개발 (0.x.x)

**규칙**: `0.MINOR.PATCH`

```
0.1.0  # 첫 번째 릴리스
0.2.0  # 기능 추가
0.2.1  # 버그 수정
0.3.0  # Breaking change (MAJOR는 아직 0)
```

**특징**:
- Breaking changes도 MINOR 증가로 처리
- 안정성 보장 안 함
- 빠른 반복 개발

### 정식 릴리스 (1.0.0+)

**규칙**: `MAJOR.MINOR.PATCH`

```
1.0.0  # 첫 정식 릴리스
1.1.0  # 새 기능
1.1.1  # 버그 수정
2.0.0  # Breaking change
```

**1.0.0 릴리스 기준**:
- [ ] 모든 핵심 기능 구현 완료
- [ ] 프로덕션 배포 완료
- [ ] 테스트 커버리지 80% 이상
- [ ] 문서 완성 (README, API docs)
- [ ] 안정적인 API 제공

---

## 릴리스 프로세스

### 1. 릴리스 준비

#### Step 1: 버전 결정

```bash
# 현재 버전 확인
git describe --tags --abbrev=0
# 예: v0.2.1

# 다음 버전 결정 (Semantic Versioning 기준)
# Breaking change? → v1.0.0 (MAJOR)
# New feature? → v0.3.0 (MINOR)
# Bug fix? → v0.2.2 (PATCH)
```

#### Step 2: 브랜치 생성

```bash
# Release 브랜치 생성
git checkout -b release/v0.3.0

# 또는 Hotfix 브랜치 (긴급 버그 수정)
git checkout -b hotfix/v0.2.2
```

#### Step 3: 버전 번호 업데이트

```bash
# package.json 버전 업데이트
npm version 0.3.0 --no-git-tag-version

# 또는 수동 편집
nano package.json
# "version": "0.3.0"
```

#### Step 4: CHANGELOG.md 업데이트

```markdown
# CHANGELOG.md

## [0.3.0] - 2024-12-01

### Added
- 쿠폰 코드 기능 추가 (#45)
- 상품 필터링 기능 (국가별, 가격대별) (#48)
- 관리자 대시보드 통계 차트 (#52)

### Changed
- 상품 목록 API 응답 속도 50% 개선 (#50)
- UI 디자인 개선 (모바일 반응형) (#51)

### Fixed
- 주문 완료 후 이메일 미발송 버그 수정 (#47)
- Stripe Webhook 타임아웃 오류 수정 (#49)

### Security
- SQL Injection 취약점 수정 (#46)
```

#### Step 5: 테스트

```bash
# 모든 테스트 실행
npm test

# E2E 테스트
npm run test:e2e

# 빌드 테스트
npm run build

# 프로덕션 환경 테스트
npm run test:prod
```

### 2. 릴리스 생성

#### Step 6: 커밋 및 태그

```bash
# 변경 사항 커밋
git add .
git commit -m "chore: bump version to 0.3.0"

# Git 태그 생성
git tag -a v0.3.0 -m "Release v0.3.0

Added:
- Coupon code feature
- Product filtering
- Admin dashboard statistics

Fixed:
- Email sending bug
- Stripe webhook timeout
"

# 태그 확인
git tag -l
git show v0.3.0
```

#### Step 7: Push

```bash
# 브랜치 push
git push origin release/v0.3.0

# 태그 push
git push origin v0.3.0

# 또는 모든 태그 push
git push origin --tags
```

#### Step 8: Pull Request 생성

```markdown
Title: Release v0.3.0

## Release Notes

### Added
- Coupon code feature (#45)
- Product filtering (#48)
- Admin dashboard statistics (#52)

### Changed
- Improved product list API performance by 50% (#50)
- Enhanced UI design (mobile responsive) (#51)

### Fixed
- Email not sent after order completion (#47)
- Stripe webhook timeout error (#49)

### Security
- Fixed SQL injection vulnerability (#46)

## Checklist
- [x] Version bumped in package.json
- [x] CHANGELOG.md updated
- [x] All tests passing
- [x] E2E tests passing
- [x] Build successful
- [x] Documentation updated

## Deployment Plan
1. Merge to main
2. Deploy to staging
3. Run smoke tests
4. Deploy to production
5. Monitor for 24 hours
```

### 3. 배포

#### Step 9: Merge 및 배포

```bash
# PR 승인 후 main으로 merge
git checkout main
git pull origin main

# Production 배포
npm run deploy:prod

# 또는 Railway/Fly.io 자동 배포 트리거
git push origin main
```

#### Step 10: GitHub Release 생성

GitHub UI에서:
1. Releases → Draft a new release
2. Tag version: `v0.3.0`
3. Release title: `v0.3.0 - Coupon Feature & Performance Improvements`
4. Description: CHANGELOG 내용 복사
5. Attach binaries (필요시)
6. Publish release

### 4. 릴리스 확인

#### Step 11: 스모크 테스트

```bash
# Production 환경 헬스체크
curl https://numnaroad.com/api/health

# 주요 기능 테스트
curl https://numnaroad.com/api/products
curl https://numnaroad.com/api/orders

# 프론트엔드 테스트
open https://numnaroad.com
```

#### Step 12: 모니터링

```bash
# Sentry 에러 모니터링
# Railway/Fly.io 로그 확인
fly logs

# 성능 모니터링
# Lighthouse 스코어 확인
npx lighthouse https://numnaroad.com
```

---

## CHANGELOG 작성법

### 형식

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- (개발 중인 기능)

## [1.0.0] - 2024-12-15

### Added
- 새로운 기능 (#123)

### Changed
- 기존 기능 변경 (#124)

### Deprecated
- 곧 제거될 기능 (#125)

### Removed
- 제거된 기능 (#126)

### Fixed
- 버그 수정 (#127)

### Security
- 보안 수정 (#128)

## [0.2.0] - 2024-12-01
...

[Unreleased]: https://github.com/Prometheus-P/NumnaRoad/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Prometheus-P/NumnaRoad/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/Prometheus-P/NumnaRoad/releases/tag/v0.2.0
```

### 카테고리

| 카테고리 | 설명 | Example |
|---------|------|---------|
| **Added** | 새로운 기능 | `- 쿠폰 코드 기능 추가 (#45)` |
| **Changed** | 기존 기능 변경 | `- 상품 목록 API 응답 속도 50% 개선 (#50)` |
| **Deprecated** | 곧 제거될 기능 | `- PocketBase v0.20 지원 중단 예정 (#60)` |
| **Removed** | 제거된 기능 | `- 레거시 API v1 엔드포인트 제거 (#70)` |
| **Fixed** | 버그 수정 | `- 주문 완료 후 이메일 미발송 버그 수정 (#47)` |
| **Security** | 보안 수정 | `- SQL Injection 취약점 수정 (#46)` |

### 작성 원칙

1. **사용자 관점**: 개발자가 아닌 사용자 관점에서 작성
2. **명확한 설명**: 무엇이 변경되었는지 명확하게
3. **Issue 번호**: 관련 Issue/PR 번호 포함
4. **Breaking Changes 강조**: ⚠️ 아이콘으로 강조

**Example**:

```markdown
## [2.0.0] - 2024-12-20

### ⚠️ Breaking Changes
- API v1 엔드포인트 제거 (#100)
  - Migration guide: [docs/migration-v2.md](docs/migration-v2.md)
- 필수 환경 변수 추가: `N8N_WEBHOOK_URL` (#101)

### Added
- 다국어 지원 (영어, 중국어, 일본어) (#90)
- PWA 지원 (오프라인 모드) (#92)
- 추천 프로그램 (#95)

### Changed
- 데이터베이스 마이그레이션: esim_products 스키마 변경 (#98)
- UI/UX 대폭 개선 (#99)

### Fixed
- 결제 실패 시 주문 상태 미업데이트 버그 수정 (#97)

### Security
- XSS 취약점 수정 (#96)
- Stripe API Key 노출 방지 (#94)
```

---

## Git 태그 관리

### 태그 생성

```bash
# Annotated tag (권장)
git tag -a v0.3.0 -m "Release v0.3.0"

# Lightweight tag (비권장)
git tag v0.3.0
```

### 태그 확인

```bash
# 모든 태그 확인
git tag -l

# 특정 패턴 검색
git tag -l "v1.*"

# 태그 상세 정보
git show v0.3.0
```

### 태그 삭제

```bash
# 로컬 태그 삭제
git tag -d v0.3.0

# 원격 태그 삭제
git push origin --delete v0.3.0
```

### 태그 Push

```bash
# 특정 태그 push
git push origin v0.3.0

# 모든 태그 push
git push origin --tags
```

---

## 배포 전략

### Blue-Green Deployment

```
┌─────────────┐     ┌─────────────┐
│   Blue      │     │   Green     │
│  (v0.2.0)   │ ←── │  (v0.3.0)   │
│  Current    │     │  Standby    │
└─────────────┘     └─────────────┘
       │                    │
       └────────┬───────────┘
                │
         ┌──────▼──────┐
         │   Router    │
         └─────────────┘
                │
         Traffic Switch
```

**절차**:
1. Green 환경에 v0.3.0 배포
2. Green 환경 테스트
3. 트래픽을 Blue → Green으로 전환
4. 모니터링 (24시간)
5. 문제 없으면 Blue 환경 업데이트

**장점**:
- Zero downtime
- 빠른 롤백 가능
- 안전한 배포

### Canary Deployment

```
v0.2.0 (90%)  ─────────────> Users
                              │
v0.3.0 (10%)  ─────────────> │
       ↓                      │
   Monitor                    │
       ↓                      │
   Increase to 50%           │
       ↓                      │
   Increase to 100%  ────────┘
```

**절차**:
1. v0.3.0을 10% 사용자에게만 배포
2. 24시간 모니터링
3. 문제 없으면 50%로 증가
4. 24시간 모니터링
5. 문제 없으면 100%로 증가

**장점**:
- 점진적 배포
- 리스크 최소화
- 실제 사용자 피드백

### Rolling Deployment

```
Instance 1: v0.2.0 → v0.3.0 ✓
Instance 2: v0.2.0 → v0.3.0 ✓
Instance 3: v0.2.0 → v0.3.0 ✓
Instance 4: v0.2.0 → v0.3.0 ✓
```

**절차**:
1. Instance 1 업데이트
2. 헬스체크
3. Instance 2 업데이트
4. 반복...

**장점**:
- Zero downtime
- 점진적 업데이트

---

## 롤백 절차

### 긴급 롤백 (Production 장애)

#### Step 1: 즉시 롤백

```bash
# Git 태그로 롤백
git checkout v0.2.0

# 배포
npm run deploy:prod

# 또는 Railway/Fly.io
fly deploy --image numnaroad:v0.2.0
```

#### Step 2: 모니터링

```bash
# 에러율 확인
# Sentry 대시보드 확인
# 사용자 피드백 확인
```

#### Step 3: 사후 분석

```markdown
# Postmortem Report

## Incident Summary
- Date: 2024-12-01 15:30 KST
- Duration: 15 minutes
- Impact: 500 users affected

## Root Cause
- v0.3.0 배포 시 n8n webhook URL 환경 변수 누락
- 주문 완료 후 이메일 발송 실패

## Timeline
- 15:30 - v0.3.0 배포
- 15:32 - 이메일 발송 실패 알림 (Sentry)
- 15:35 - 롤백 결정
- 15:40 - v0.2.0 롤백 완료
- 15:45 - 정상 동작 확인

## Action Items
- [ ] 배포 전 환경 변수 체크리스트 추가
- [ ] Staging 환경 테스트 강화
- [ ] 자동화된 스모크 테스트 추가
```

### 계획된 롤백 (문제 발견)

```bash
# 1. Revert 커밋 생성
git revert v0.3.0

# 2. CHANGELOG 업데이트
echo "## [0.2.2] - 2024-12-01

### Reverted
- v0.3.0 릴리스 롤백 (주요 버그로 인한 롤백)
- 다음 패치 버전에서 수정 예정
" >> CHANGELOG.md

# 3. 커밋 및 배포
git add .
git commit -m "revert: rollback to v0.2.0 due to critical bug"
git tag v0.2.2
git push origin main --tags
```

---

## Validation Checklist

### 릴리스 전 확인사항

#### 코드 품질
- [ ] 모든 테스트 통과 (`npm test`)
- [ ] E2E 테스트 통과 (`npm run test:e2e`)
- [ ] 타입 체크 통과 (`npm run type-check`)
- [ ] 린트 통과 (`npm run lint`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] 테스트 커버리지 80% 이상

#### 문서
- [ ] CHANGELOG.md 업데이트
- [ ] README.md 업데이트 (필요시)
- [ ] API 문서 업데이트 (필요시)
- [ ] Migration guide 작성 (Breaking change 시)

#### 버전 관리
- [ ] package.json 버전 업데이트
- [ ] Git 태그 생성
- [ ] 릴리스 노트 작성

#### 배포
- [ ] 환경 변수 확인 (프로덕션)
- [ ] Database 마이그레이션 완료
- [ ] Staging 환경 테스트 완료
- [ ] 배포 계획 수립

#### 모니터링
- [ ] Sentry 설정 확인
- [ ] 알림 설정 확인
- [ ] 스모크 테스트 스크립트 준비

---

## 📚 Additional Resources

- **[Semantic Versioning 2.0.0](https://semver.org/)** - Semantic Versioning 공식 문서
- **[Keep a Changelog](https://keepachangelog.com/)** - CHANGELOG 작성 가이드
- **[Conventional Commits](https://www.conventionalcommits.org/)** - 커밋 메시지 규약
- **[CHANGELOG.md](./CHANGELOG.md)** - NumnaRoad 버전 히스토리

---

## 🙏 감사합니다!

체계적인 버전 관리는 프로젝트의 신뢰성을 높입니다!

**함께 안정적인 릴리스를 만들어갑시다!** 🚀

---

> **TL;DR for Release Managers**:
> 1. 📋 Semantic Versioning 준수 (MAJOR.MINOR.PATCH)
> 2. 📝 CHANGELOG.md 업데이트 (Added, Changed, Fixed, Security)
> 3. 🏷️ Git 태그 생성 (v0.3.0)
> 4. 🚀 배포 전 체크리스트 완료
> 5. 📊 배포 후 24시간 모니터링
