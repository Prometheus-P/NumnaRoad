# Services

외부 서비스 연동 모듈

## 구조

```
services/
├── esim-providers/        # eSIM 공급사 API
│   ├── types.ts           # 공통 타입 정의
│   ├── airalo.ts          # Airalo API 클라이언트
│   ├── airalo-provider.ts # Airalo Provider 구현
│   ├── esimcard.ts        # eSIM Card API 클라이언트
│   ├── esimcard-provider.ts
│   ├── mobimatter.ts      # MobiMatter API 클라이언트
│   ├── mobimatter-provider.ts
│   ├── provider-factory.ts # Provider Factory 패턴
│   └── index.ts           # 모듈 exports
│
└── logging/               # 로깅 서비스
    ├── automation-logger.ts
    └── index.ts
```

## 참고: 기타 서비스 위치

Payment 및 Email 서비스는 `apps/web/lib/`에 위치합니다:

```
apps/web/lib/
├── stripe.ts              # Stripe 결제 처리
├── resend.ts              # Resend 이메일 전송
└── email-templates/       # 이메일 템플릿
    └── esim-delivery.ts
```

## eSIM Providers

### Provider Interface

```typescript
interface ESIMProvider {
  name: string;
  purchaseEsim(request: PurchaseRequest): Promise<PurchaseResponse>;
  getPackages(countryCode?: string): Promise<Package[]>;
  checkBalance(): Promise<BalanceInfo>;
}

interface PurchaseRequest {
  packageId: string;
  quantity: number;
  customerEmail?: string;
}

interface PurchaseResponse {
  orderId: string;
  qrCode: string;
  activationCode: string;
  iccid: string;
  status: 'success' | 'pending' | 'failed';
}
```

### Provider Factory 사용법

```typescript
import { createProvider, ProviderType } from '@/services/esim-providers';

// Provider 생성
const provider = createProvider(ProviderType.AIRALO);

// eSIM 구매
const result = await provider.purchaseEsim({
  packageId: 'jp-7day-unlimited',
  quantity: 1,
  customerEmail: 'customer@example.com'
});
```

### Failover 지원

Provider Factory는 자동 failover를 지원합니다:

```typescript
import { createProviderWithFailover } from '@/services/esim-providers';

const provider = createProviderWithFailover([
  ProviderType.ESIMCARD,
  ProviderType.AIRALO,
  ProviderType.MOBIMATTER
]);
```

## Logging Service

### 사용법

```typescript
import { AutomationLogger } from '@/services/logging';

const logger = new AutomationLogger('order-processing');

logger.info('Order created', { orderId: '123', correlationId: 'abc' });
logger.error('Payment failed', { error: err.message });
```
