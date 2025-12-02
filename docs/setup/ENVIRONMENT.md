---
title: NumnaRoad - Environment Setup Guide
version: 1.0.0
status: Active
owner: @Prometheus-P
created: 2024-12-01
updated: 2024-12-01
---

# ENVIRONMENT.md

> **Complete Environment Setup Guide for NumnaRoad**
>
> 이 문서는 로컬 개발 환경부터 프로덕션 배포까지 모든 환경 설정을 다룹니다.

## 📋 Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development](#2-local-development)
3. [Environment Variables](#3-environment-variables)
4. [Database Setup](#4-database-setup)
5. [External Services](#5-external-services)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Prerequisites

### 1.1 Required Software

| Software | Minimum Version | Recommended | Installation |
|----------|----------------|-------------|--------------|
| **Node.js** | 18.0.0 | 20.x LTS | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.0.0 | Latest | (Included with Node.js) |
| **Git** | 2.30.0 | Latest | [git-scm.com](https://git-scm.com/) |
| **PocketBase** | 0.22.0 | 0.22.x | [pocketbase.io](https://pocketbase.io/docs/) |

### 1.2 Optional but Recommended

| Software | Purpose | Installation |
|----------|---------|--------------|
| **Docker** | n8n 실행, 로컬 테스트 환경 | [docker.com](https://www.docker.com/) |
| **VSCode** | IDE (권장 확장 프로그램 포함) | [code.visualstudio.com](https://code.visualstudio.com/) |
| **Postman** | API 테스트 | [postman.com](https://www.postman.com/) |

### 1.3 VSCode Extensions (권장)

프로젝트 루트에 `.vscode/extensions.json` 생성:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "streetsidesoftware.code-spell-checker",
    "usernamehw.errorlens",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

---

## 2. Local Development

### 2.1 Quick Start (자동 설정)

```bash
# 저장소 클론
git clone https://github.com/Prometheus-P/NumnaRoad.git
cd NumnaRoad

# 자동 설정 스크립트 실행
bash scripts/dev-setup.sh

# ✅ 완료! 다음 섹션으로 이동
```

### 2.2 Manual Setup (단계별)

#### Step 1: 저장소 클론 및 의존성 설치

```bash
# 저장소 클론
git clone https://github.com/Prometheus-P/NumnaRoad.git
cd NumnaRoad

# 루트 디렉토리 의존성 설치 (공통 스크립트)
npm install
```

#### Step 2: PocketBase 설치

**Linux/macOS:**
```bash
cd pocketbase

# PocketBase 다운로드
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_linux_amd64.zip

# 압축 해제
unzip pocketbase_0.22.0_linux_amd64.zip

# 실행 권한 부여
chmod +x pocketbase

# 정리
rm pocketbase_0.22.0_linux_amd64.zip

cd ..
```

**Windows:**
```powershell
cd pocketbase

# PowerShell에서 다운로드
Invoke-WebRequest -Uri "https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_windows_amd64.zip" -OutFile "pocketbase.zip"

# 압축 해제
Expand-Archive -Path pocketbase.zip -DestinationPath .

# 정리
Remove-Item pocketbase.zip

cd ..
```

#### Step 3: 환경 변수 설정

```bash
# .env.example을 .env로 복사
cp .env.example .env

# .env 파일 편집
nano .env  # 또는 선호하는 에디터 사용
```

#### Step 4: Next.js 프로젝트 설정

```bash
cd apps/web

# 의존성 설치
npm install

cd ../..
```

#### Step 5: n8n 설정 (Docker 사용)

```bash
# n8n Docker 컨테이너 실행
docker run -d \
  --name numnaroad-n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=admin \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# n8n UI 접속: http://localhost:5678
# 로그인: admin / admin
```

---

## 3. Environment Variables

### 3.1 환경 변수 구조

NumnaRoad는 3개 환경을 사용합니다:

```
.env.local          # 로컬 개발 (git에 포함 안됨)
.env.development    # 개발 서버 (Railway Dev)
.env.production     # 프로덕션 (Railway Prod)
```

### 3.2 필수 환경 변수

#### 📍 루트 `.env` (전체 공통)

```bash
# ═════════════════════════════════════════════════════════
# 🌐 Application URLs
# ═════════════════════════════════════════════════════════
NODE_ENV=development  # development | production
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ═════════════════════════════════════════════════════════
# 🗄️ PocketBase
# ═════════════════════════════════════════════════════════
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
POCKETBASE_ADMIN_EMAIL=admin@numnaroad.local
POCKETBASE_ADMIN_PASSWORD=your_secure_password_here

# ⚠️ 보안: 프로덕션에서는 강력한 비밀번호 사용 (최소 16자, 대소문자+숫자+특수문자)

# ═════════════════════════════════════════════════════════
# 💳 Stripe Payment
# ═════════════════════════════════════════════════════════
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51234567890abcdef...
STRIPE_SECRET_KEY=sk_test_51234567890abcdef...
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...

# 획득 방법:
# 1. https://dashboard.stripe.com/test/apikeys 방문
# 2. "Publishable key" 복사 → NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# 3. "Secret key" 표시 후 복사 → STRIPE_SECRET_KEY
# 4. Webhooks → "Add endpoint" → Secret 복사 → STRIPE_WEBHOOK_SECRET

# ═════════════════════════════════════════════════════════
# 📡 eSIM Providers
# ═════════════════════════════════════════════════════════

# eSIM Card
ESIM_CARD_API_KEY=your_esimcard_api_key
ESIM_CARD_API_URL=https://api.esimcard.com/v1

# MobiMatter
MOBIMATTER_API_KEY=your_mobimatter_api_key
MOBIMATTER_API_URL=https://api.mobimatter.com/v1

# Airalo
AIRALO_API_KEY=your_airalo_api_key
AIRALO_API_URL=https://api.airalo.com/v1

# 획득 방법:
# 1. 각 공급사 파트너 프로그램 신청
# 2. API 키 발급 요청
# 3. Webhook URL 등록: https://yourdomain.com/api/webhook/provider

# ═════════════════════════════════════════════════════════
# 🤖 n8n Automation
# ═════════════════════════════════════════════════════════
N8N_WEBHOOK_URL=http://localhost:5678
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin

# 프로덕션:
# N8N_WEBHOOK_URL=https://n8n.yourdomain.com
# N8N_BASIC_AUTH_USER=admin_prod
# N8N_BASIC_AUTH_PASSWORD=strong_password_here

# ═════════════════════════════════════════════════════════
# 📧 Email Service (Resend)
# ═════════════════════════════════════════════════════════
RESEND_API_KEY=re_1234567890abcdef...
RESEND_FROM_EMAIL=noreply@numnaroad.com

# 획득 방법:
# 1. https://resend.com 가입
# 2. API Keys → Create API Key
# 3. Domain → Add Domain (예: numnaroad.com)
# 4. DNS 레코드 추가 (SPF, DKIM)

# ═════════════════════════════════════════════════════════
# 📊 Monitoring & Analytics
# ═════════════════════════════════════════════════════════

# Sentry (에러 추적)
NEXT_PUBLIC_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/7654321
SENTRY_AUTH_TOKEN=sntrys_1234567890abcdef...

# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-ABC123XYZ

# Slack (알림)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX

# ═════════════════════════════════════════════════════════
# 🔐 Security (Optional)
# ═════════════════════════════════════════════════════════
# JWT_SECRET=your_jwt_secret_here  # PocketBase 자체 인증 사용 시 불필요
# ENCRYPTION_KEY=your_encryption_key  # 추가 암호화 필요 시
```

### 3.3 환경 변수 검증

**자동 검증 스크립트** (`scripts/validate-env.sh`):

```bash
#!/bin/bash

echo "🔍 Validating environment variables..."

REQUIRED_VARS=(
  "NEXT_PUBLIC_POCKETBASE_URL"
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  "STRIPE_SECRET_KEY"
  "N8N_WEBHOOK_URL"
)

MISSING=()

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    MISSING+=("$VAR")
  fi
done

if [ ${#MISSING[@]} -eq 0 ]; then
  echo "✅ All required environment variables are set"
  exit 0
else
  echo "❌ Missing required environment variables:"
  printf '  - %s\n' "${MISSING[@]}"
  exit 1
fi
```

**실행**:
```bash
bash scripts/validate-env.sh
```

---

## 4. Database Setup

### 4.1 PocketBase 초기 설정

#### Step 1: PocketBase 실행

```bash
cd pocketbase
./pocketbase serve
```

**출력 예시**:
```
Server started at http://127.0.0.1:8090
├─ REST API: http://127.0.0.1:8090/api/
└─ Admin UI: http://127.0.0.1:8090/_/
```

#### Step 2: Admin 계정 생성

1. 브라우저에서 http://127.0.0.1:8090/_ 접속
2. "Create your first admin account" 화면 표시
3. 정보 입력:
   - Email: `admin@numnaroad.local`
   - Password: `.env`의 `POCKETBASE_ADMIN_PASSWORD`와 동일
4. "Create and login" 클릭

#### Step 3: Collections 생성

**Option A: Admin UI 수동 생성** (권장, 학습용)
1. Collections → "New Collection" 클릭
2. `docs/DATABASE_SCHEMA.md` 참조하여 필드 추가
3. API Rules 설정

**Option B: 마이그레이션 스크립트** (빠른 설정)
```bash
# 아직 구현 예정
npm run db:migrate
```

### 4.2 샘플 데이터 생성

```bash
# TypeScript 스크립트 실행
npx tsx scripts/seed-products.ts

# 성공 시:
# ✅ Created 10 sample products
# ✅ Sample data seeded successfully
```

**생성되는 샘플 데이터**:
- 일본 7일 무제한 (₩12,000)
- 조지아 30일 50GB (₩25,000)
- 유럽 14일 20GB (₩40,000)
- ... 총 10개 상품

### 4.3 백업 및 복원

**백업**:
```bash
# SQLite DB 백업
sqlite3 pocketbase/pb_data/data.db ".backup 'backups/db_$(date +%Y%m%d).db'"

# 전체 pb_data 백업
tar -czf backups/pb_data_$(date +%Y%m%d).tar.gz pocketbase/pb_data/
```

**복원**:
```bash
# DB 복원
sqlite3 pocketbase/pb_data/data.db ".restore 'backups/db_20241201.db'"

# 전체 복원
tar -xzf backups/pb_data_20241201.tar.gz -C pocketbase/
```

---

## 5. External Services

### 5.1 Stripe 설정

#### Step 1: 계정 생성
1. https://stripe.com 방문
2. "Start now" → 이메일 가입
3. Test Mode 활성화 (왼쪽 상단 토글)

#### Step 2: API 키 획득
1. Dashboard → Developers → API keys
2. `pk_test_...` (Publishable key) 복사
3. `sk_test_...` (Secret key) 표시 후 복사

#### Step 3: Webhook 설정
1. Developers → Webhooks → "Add endpoint"
2. Endpoint URL: `https://yourdomain.com/api/webhook/stripe`
3. Events to send:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Signing secret 복사 → `STRIPE_WEBHOOK_SECRET`

#### Step 4: 테스트
```bash
# Stripe CLI 설치
brew install stripe/stripe-cli/stripe  # macOS
# Windows: https://github.com/stripe/stripe-cli/releases

# 로컬 테스트
stripe listen --forward-to localhost:3000/api/webhook/stripe

# 테스트 결제
stripe trigger payment_intent.succeeded
```

### 5.2 Resend (Email) 설정

#### Step 1: 계정 생성
1. https://resend.com 가입
2. API Keys → "Create API Key"
3. 키 복사 → `RESEND_API_KEY`

#### Step 2: 도메인 인증
1. Domains → "Add Domain"
2. 도메인 입력 (예: `numnaroad.com`)
3. DNS 레코드 추가:

```
Type: TXT
Name: _resend
Value: re_abc123xyz...

Type: MX
Name: @
Value: feedback-smtp.resend.com
Priority: 10
```

4. "Verify DNS" 클릭

#### Step 3: 테스트
```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "your.email@example.com",
    "subject": "Test Email",
    "html": "<p>Hello from NumnaRoad!</p>"
  }'
```

### 5.3 n8n 워크플로우 Import

#### Step 1: n8n 접속
```
http://localhost:5678
로그인: admin / admin
```

#### Step 2: Credentials 설정
1. Credentials → "Add Credential"
2. 다음 항목 추가:
   - **PocketBase HTTP Header Auth**
     - Name: `PocketBase Admin`
     - Header Name: `Authorization`
     - Value: `Admin YOUR_ADMIN_TOKEN`
   - **HTTP Basic Auth** (eSIM Providers)
   - **SMTP** (Email)

#### Step 3: 워크플로우 Import
1. Workflows → Import from File
2. 파일 선택:
   - `automation/n8n-workflows/order-processing.json`
   - `automation/n8n-workflows/inventory-sync.json`
3. Credentials 매핑
4. "Activate" 토글 ON

---

## 6. Troubleshooting

### 6.1 PocketBase 관련

#### 문제: `pb_data/data.db` is locked
**원인**: 다른 프로세스가 DB 사용 중
**해결**:
```bash
# PocketBase 프로세스 종료
pkill pocketbase

# 또는 프로세스 ID 확인 후 종료
ps aux | grep pocketbase
kill -9 [PID]

# 재시작
./pocketbase serve
```

#### 문제: Admin UI 접속 불가 (404)
**원인**: 포트 충돌
**해결**:
```bash
# 다른 포트로 실행
./pocketbase serve --http=127.0.0.1:8091
```

#### 문제: Collections API 호출 시 403 Forbidden
**원인**: API Rules 설정 오류
**해결**:
1. Admin UI → Collections → [해당 Collection]
2. API Rules 탭 → `listRule` 확인
3. 공개 조회 허용: `listRule = ""`

### 6.2 Next.js 관련

#### 문제: `Module not found: Can't resolve '@/lib/pocketbase'`
**원인**: tsconfig.json paths 설정 누락
**해결**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

#### 문제: Hydration Error
**원인**: 서버-클라이언트 렌더링 불일치
**해결**:
```typescript
// 클라이언트 전용 컴포넌트로 변경
'use client';

// 또는 dynamic import
import dynamic from 'next/dynamic';
const ClientComponent = dynamic(() => import('./ClientComponent'), { ssr: false });
```

### 6.3 Stripe 관련

#### 문제: Webhook 서명 검증 실패
**원인**: `STRIPE_WEBHOOK_SECRET` 불일치
**해결**:
```bash
# Stripe Dashboard → Webhooks → Signing secret 재확인
# .env 업데이트
# 서버 재시작
```

#### 문제: 결제 테스트 실패
**원인**: Test Mode 비활성화
**해결**:
1. Stripe Dashboard 왼쪽 상단 토글 확인 (Test mode)
2. 테스트 카드 사용:
   - 성공: `4242 4242 4242 4242`
   - 실패: `4000 0000 0000 0002`

### 6.4 n8n 관련

#### 문제: Workflow 실행 시 Timeout
**원인**: eSIM Provider API 응답 지연
**해결**:
```javascript
// HTTP Request Node 설정
{
  "timeout": 30000  // 30초로 증가
}
```

#### 문제: Webhook이 트리거되지 않음
**원인**: Firewall 또는 네트워크 차단
**해결**:
```bash
# 로컬 테스트: ngrok 사용
ngrok http 5678

# n8n Webhook URL 업데이트
# https://abc123.ngrok.io/webhook/order-paid
```

---

## 📚 Related Documents

- [CONTEXT.md](./CONTEXT.md) - 프로젝트 전체 맥락
- [plan.md](./plan.md) - TDD 개발 계획
- [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) - DB 스키마
- [docs/API_SPEC.md](./docs/API_SPEC.md) - API 명세

---

## ✅ Environment Setup Checklist

프로덕션 배포 전 체크리스트:

```
□ Node.js 18+ 설치 확인
□ PocketBase 다운로드 및 실행 테스트
□ .env 파일 생성 및 모든 필수 변수 설정
□ PocketBase Admin 계정 생성
□ Collections 생성 (esim_products, orders 최소)
□ 샘플 데이터 생성 확인
□ Stripe Test Mode 결제 테스트 성공
□ Resend 이메일 발송 테스트 성공
□ n8n 워크플로우 Import 및 활성화
□ 환경 변수 검증 스크립트 통과
□ 로컬 개발 서버 실행 확인 (Next.js, PocketBase, n8n)
```

---

**Environment setup complete! 🎉**
**Next: Run `npm run dev` to start development**
