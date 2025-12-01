# Services

외부 서비스 연동 모듈

## 구조

```
services/
├── esim-providers/        # eSIM 공급사 API
│   ├── esimcard.ts
│   ├── mobimatter.ts
│   ├── airalo.ts
│   └── provider-factory.ts
├── payment/               # 결제 처리
│   ├── stripe.ts
│   └── toss.ts
└── email/                 # 이메일 전송
    └── resend.ts
```

## eSIM Providers

### 구현 필요 인터페이스

```typescript
interface ESIMProvider {
  name: string;
  issueESIM(productId: string, email: string): Promise<ESIMResponse>;
  getInventory(productId: string): Promise<number>;
  getProducts(): Promise<Product[]>;
}

interface ESIMResponse {
  orderId: string;
  qrCodeUrl: string;
  activationCode: string;
  iccid?: string;
}
```

### 사용 예시

```typescript
import { getProvider } from './esim-providers/provider-factory';

const provider = getProvider('eSIM Card');
const result = await provider.issueESIM('jp-7day-unlimited', 'customer@example.com');
```

## Payment

### Stripe

```typescript
import { stripe } from './payment/stripe';

const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [...],
  mode: 'payment',
  success_url: '...',
  cancel_url: '...',
});
```

## Email

### Resend

```typescript
import { sendEmail } from './email/resend';

await sendEmail({
  to: 'customer@example.com',
  subject: 'Your eSIM is Ready!',
  html: '...',
  attachments: [...],
});
```
