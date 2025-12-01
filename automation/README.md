# Automation

n8n 워크플로우 및 Cron 작업

## n8n 워크플로우

### 설치 및 실행

```bash
# Docker로 실행
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=admin \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

UI: http://localhost:5678

### 워크플로우 목록

#### 1. order-processing.json
주문 처리 자동화

```
Webhook → Get Order → Issue eSIM → Update Order → Send Email
```

#### 2. inventory-sync.json
재고 동기화 (Cron: 매 1시간)

```
Cron → Loop Providers → Get Inventory → Update PocketBase → Alert if Low
```

#### 3. email-automation.json
마케팅 이메일 자동화

```
Cron → Get Orders (D+7) → Send Survey → Get Orders (D+30) → Send Coupon
```

## Cron Jobs

서버에서 직접 실행되는 스크립트

### backup.sh
데이터베이스 백업 (매일 새벽 3시)

```bash
#!/bin/bash
sqlite3 /path/to/data.db ".backup '/backups/db_$(date +%Y%m%d).db'"
```

## 환경 변수

```bash
N8N_WEBHOOK_URL=https://n8n.yourdomain.com
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=password
```

## 워크플로우 Import

1. n8n UI 접속
2. Workflows → Import from File
3. `n8n-workflows/*.json` 파일 선택
4. Credentials 설정
5. Activate
