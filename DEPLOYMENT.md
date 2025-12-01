# 🚀 Deployment Guide

## 배포 전략

```
로컬 개발 → 스테이징 → 프로덕션
```

---

## 1. 로컬 환경 설정

### 사전 요구사항

```bash
Node.js 18+
npm or yarn
PocketBase 0.22+
Git
```

### 설치

```bash
# 저장소 클론
git clone https://github.com/yourusername/esim-vault.git
cd esim-vault

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일 수정
```

### PocketBase 실행

```bash
cd pocketbase
./pocketbase serve

# Admin UI: http://127.0.0.1:8090/_/
# API: http://127.0.0.1:8090/api
```

### Next.js 개발 서버

```bash
cd apps/web
npm run dev

# http://localhost:3000
```

---

## 2. Railway 배포 (추천)

### 장점
- **간편**: GitHub 연동으로 자동 배포
- **저렴**: $5/월부터 시작
- **확장 용이**: 클릭 한 번으로 리소스 증설
- **무료 $5 크레딧**: 첫 달 무료

### 2-1. PocketBase 배포

**Step 1: Railway 프로젝트 생성**

1. [Railway](https://railway.app) 가입
2. "New Project" → "Deploy from GitHub repo"
3. 저장소 선택: `esim-vault`

**Step 2: PocketBase 서비스 생성**

```dockerfile
# Dockerfile (루트 디렉토리)
FROM alpine:latest

# PocketBase 다운로드
ADD https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/

# 데이터 디렉토리
WORKDIR /pb
RUN mkdir -p pb_data pb_migrations pb_hooks

# 포트 노출
EXPOSE 8080

# 실행
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]
```

**Step 3: 환경변수 설정**

Railway Dashboard → Settings → Variables:

```bash
PORT=8080
PB_ADMIN_EMAIL=admin@yourdomain.com
PB_ADMIN_PASSWORD=strong_password_here
```

**Step 4: 볼륨 마운트 (데이터 영구 저장)**

Railway Dashboard → Settings → Volumes:
- Mount Path: `/pb/pb_data`
- Size: 5GB

**Step 5: 도메인 연결**

Railway Dashboard → Settings → Domains:
- Generate Domain 또는 Custom Domain 추가
- 예: `pocketbase.yourdomain.com`

### 2-2. Next.js 배포

**Step 1: Vercel 배포 (추천)**

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
cd apps/web
vercel --prod
```

Vercel Dashboard에서 환경변수 설정:
```bash
NEXT_PUBLIC_POCKETBASE_URL=https://pocketbase.yourdomain.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Step 2: Railway 배포 (대안)**

```dockerfile
# apps/web/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

EXPOSE 3000
CMD ["npm", "start"]
```

### 2-3. n8n 배포

**Railway에 n8n 서비스 추가**

```dockerfile
# automation/Dockerfile
FROM n8nio/n8n:latest

WORKDIR /home/node/.n8n

EXPOSE 5678

CMD ["n8n"]
```

환경변수:
```bash
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=strong_password
N8N_HOST=n8n.yourdomain.com
WEBHOOK_URL=https://n8n.yourdomain.com
```

---

## 3. Fly.io 배포 (대안)

### 장점
- **무료 티어**: 3개 VM 무료
- **글로벌 엣지**: 전 세계 배포
- **빠른 배포**: 1분 내 완료

### 3-1. PocketBase 배포

```bash
# flyctl 설치
curl -L https://fly.io/install.sh | sh

# Fly.io 로그인
flyctl auth login

# 앱 생성
flyctl launch --name esim-vault-pb

# fly.toml 수정
```

**fly.toml:**
```toml
app = "esim-vault-pb"
primary_region = "nrt"  # Tokyo

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[mounts]
  source = "pb_data"
  destination = "/pb/pb_data"
```

```bash
# 볼륨 생성
flyctl volumes create pb_data --size 5

# 배포
flyctl deploy

# 도메인 확인
flyctl info
```

---

## 4. VPS 배포 (고급)

### 추천 VPS

| 제공자 | 가격 | 스펙 |
|--------|------|------|
| Vultr | $5/월 | 1 vCPU, 1GB RAM |
| Hetzner | €4.5/월 | 1 vCPU, 2GB RAM |
| DigitalOcean | $6/월 | 1 vCPU, 1GB RAM |

### 4-1. 서버 초기 설정

```bash
# SSH 접속
ssh root@your-server-ip

# 패키지 업데이트
apt update && apt upgrade -y

# Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Docker 설치 (선택사항)
curl -fsSL https://get.docker.com | sh

# Nginx 설치
apt install -y nginx certbot python3-certbot-nginx
```

### 4-2. PocketBase 설치

```bash
# PocketBase 다운로드
cd /opt
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_linux_amd64.zip
unzip pocketbase_0.22.0_linux_amd64.zip
chmod +x pocketbase

# Systemd 서비스 생성
cat > /etc/systemd/system/pocketbase.service << EOF
[Unit]
Description=PocketBase
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt
ExecStart=/opt/pocketbase serve --http=127.0.0.1:8090
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 서비스 시작
systemctl enable pocketbase
systemctl start pocketbase
```

### 4-3. Nginx 설정

```nginx
# /etc/nginx/sites-available/esim-vault
server {
    listen 80;
    server_name pocketbase.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name n8n.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# 심볼릭 링크 생성
ln -s /etc/nginx/sites-available/esim-vault /etc/nginx/sites-enabled/

# Nginx 재시작
nginx -t
systemctl reload nginx

# SSL 인증서 발급
certbot --nginx -d pocketbase.yourdomain.com
certbot --nginx -d n8n.yourdomain.com
```

### 4-4. n8n 설치

```bash
# Docker로 n8n 실행
docker run -d \
  --name n8n \
  -p 127.0.0.1:5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=strong_password \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

---

## 5. 환경변수 관리

### .env.example

```bash
# PocketBase
POCKETBASE_URL=https://pocketbase.yourdomain.com
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=strong_password_here

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# eSIM Providers
ESIM_CARD_API_KEY=abc123...
MOBIMATTER_API_KEY=def456...
AIRALO_API_KEY=ghi789...

# n8n
N8N_WEBHOOK_URL=https://n8n.yourdomain.com
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=strong_password

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Monitoring
SENTRY_DSN=https://...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### 프로덕션 체크리스트

- [ ] 모든 API 키를 프로덕션 키로 교체
- [ ] `.env` 파일을 `.gitignore`에 추가
- [ ] Railway/Vercel에서 환경변수 설정
- [ ] HTTPS 강제 활성화
- [ ] CORS 설정 확인
- [ ] Rate limiting 설정
- [ ] 데이터베이스 백업 설정
- [ ] 에러 모니터링 설정 (Sentry)
- [ ] Uptime 모니터링 설정

---

## 6. 데이터베이스 마이그레이션

### 로컬 → 프로덕션

```bash
# 로컬 DB 내보내기
sqlite3 pocketbase/pb_data/data.db .dump > backup.sql

# 프로덕션 서버에서 복원
sqlite3 /opt/pb_data/data.db < backup.sql

# PocketBase 재시작
systemctl restart pocketbase
```

### 백업 자동화

```bash
# /opt/backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# DB 백업
sqlite3 /opt/pb_data/data.db ".backup '$BACKUP_DIR/db_$DATE.db'"

# 파일 백업
tar -czf $BACKUP_DIR/storage_$DATE.tar.gz /opt/pb_data/storage/

# S3에 업로드 (선택사항)
aws s3 cp $BACKUP_DIR/db_$DATE.db s3://your-bucket/backups/

# 30일 이상 된 백업 삭제
find $BACKUP_DIR -mtime +30 -delete
```

```bash
# Cron 작업 추가
crontab -e

# 매일 새벽 3시에 백업
0 3 * * * /opt/backup.sh
```

---

## 7. 모니터링 설정

### Uptime Robot

1. [Uptime Robot](https://uptimerobot.com) 가입
2. Monitor 추가:
   - URL: `https://pocketbase.yourdomain.com/api/health`
   - Type: HTTP(s)
   - Interval: 5분
   - Alert: 이메일 + Slack

### Sentry

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

---

## 8. 성능 최적화

### CDN 설정 (Cloudflare)

1. Cloudflare 계정 생성
2. 도메인 추가
3. DNS 설정:
   ```
   A     @              your-server-ip
   CNAME www            @
   CNAME pocketbase     your-server-ip
   CNAME n8n            your-server-ip
   ```
4. SSL/TLS 모드: Full (strict)
5. Auto Minify: JS, CSS, HTML 활성화
6. Brotli 압축 활성화

### 이미지 최적화

```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['pocketbase.yourdomain.com'],
    formats: ['image/avif', 'image/webp'],
  },
};
```

---

## 9. CI/CD 파이프라인

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 10. 롤백 전략

### 1. Vercel 롤백

```bash
# Vercel Dashboard → Deployments → Rollback
# 또는 CLI
vercel rollback
```

### 2. Railway 롤백

Railway Dashboard → Deployments → 이전 배포 선택 → Rollback

### 3. 수동 롤백 (VPS)

```bash
# Git으로 이전 커밋으로 롤백
git checkout <previous-commit-hash>

# PM2 재시작
pm2 restart all
```

---

## 트러블슈팅

### 1. PocketBase 연결 실패

```bash
# 방화벽 확인
ufw allow 8090

# 서비스 상태 확인
systemctl status pocketbase

# 로그 확인
journalctl -u pocketbase -f
```

### 2. n8n Webhook 타임아웃

```javascript
// n8n Settings → Executions → Timeout
// 기본 60초 → 300초로 증가
```

### 3. Stripe Webhook 실패

```bash
# Webhook 서명 확인
stripe listen --forward-to localhost:3000/api/webhook/stripe

# 로그 확인
stripe logs tail
```

---

## 비용 견적

### 월 100건 (초기)

| 항목 | 비용 |
|------|------|
| Railway (PocketBase) | $5 |
| Railway (n8n) | $5 |
| Vercel (Next.js) | $0 (무료 티어) |
| 도메인 | $1.25 |
| **합계** | **$11.25** |

### 월 1,000건 (성장기)

| 항목 | 비용 |
|------|------|
| Railway (PocketBase) | $10 |
| Railway (n8n) | $10 |
| Vercel (Next.js) | $20 |
| Cloudflare (CDN) | $0 (무료) |
| 도메인 | $1.25 |
| **합계** | **$41.25** |

---

**배포는 시작일 뿐이다. 지속적인 모니터링과 최적화가 핵심이다.**
