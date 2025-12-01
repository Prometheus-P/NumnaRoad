# PocketBase Backend

## 설치 및 실행

```bash
cd pocketbase

# PocketBase 다운로드 (처음 한 번만)
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_linux_amd64.zip
unzip pocketbase_0.22.0_linux_amd64.zip
chmod +x pocketbase

# 실행
./pocketbase serve
```

Admin UI: http://127.0.0.1:8090/_/

## Collections

### 생성 필요한 Collections

1. **esim_products** - eSIM 상품 정보
2. **orders** - 주문 정보
3. **coupons** - 쿠폰
4. **reviews** - 리뷰
5. **provider_sync_logs** - 공급사 동기화 로그
6. **automation_logs** - 자동화 로그
7. **email_logs** - 이메일 로그

자세한 스키마는 `/docs/DATABASE_SCHEMA.md` 참조

## Hooks

`pb_hooks/` 디렉토리에 JavaScript 파일로 작성:

- `orders.pb.js` - 주문 생성 시 n8n 호출
- `payments.pb.js` - 결제 완료 시 주문 상태 업데이트

## Migrations

`pb_migrations/` 디렉토리에 마이그레이션 파일 저장

## 환경 변수

```bash
PB_ADMIN_EMAIL=admin@example.com
PB_ADMIN_PASSWORD=strong_password
```
