# Automation

Cron 작업 및 아카이브된 n8n 워크플로우

## Inline Fulfillment (현재 사용)

주문 처리는 이제 Stripe Webhook 핸들러에서 직접 처리됩니다:

```
Stripe Checkout → Webhook → Inline Fulfillment → Email
```

주요 파일:
- `/apps/web/app/api/webhooks/stripe/route.ts` - Stripe 웹훅 핸들러
- `/services/order-fulfillment/fulfillment-service.ts` - eSIM 발급 서비스

환경 변수:
```bash
FEATURE_INLINE_FULFILLMENT=true  # 기본값
```

## n8n 워크플로우 (아카이브됨)

> **보안 업데이트**: n8n 워크플로우는 `_archive/` 폴더로 이동되었습니다.
>
> 이전 아키텍처에서 주문이 결제 확인 없이 처리될 수 있는 보안 취약점이
> 발견되어 인라인 풀필먼트로 전환되었습니다.
>
> 참고: https://github.com/numna-road/numnaroad/issues/94

아카이브된 워크플로우:
- `_archive/n8n-workflows/order-processing.json` - 주문 처리 (deprecated)
- `_archive/n8n-workflows/inventory-sync.json` - 재고 동기화
- `_archive/n8n-workflows/payment-webhook.json` - 결제 웹훅

### 레거시 n8n 설정 (더 이상 필요 없음)

```bash
# 이 환경 변수들은 FEATURE_INLINE_FULFILLMENT=true일 때 불필요합니다
# N8N_WEBHOOK_URL=https://n8n.yourdomain.com
# N8N_API_KEY=your_api_key
```

## Cron Jobs

서버에서 직접 실행되는 스크립트

### backup.sh
데이터베이스 백업 (매일 새벽 3시)

```bash
#!/bin/bash
sqlite3 /path/to/data.db ".backup '/backups/db_$(date +%Y%m%d).db'"
```

## 마이그레이션 히스토리

- **2024-12**: n8n 워크플로우에서 인라인 풀필먼트로 마이그레이션
- **이유**: 결제 검증 없이 주문 처리가 가능한 보안 취약점 수정
- **상태**: 완료 (n8n 의존성 제거됨)
