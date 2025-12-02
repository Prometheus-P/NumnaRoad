# NumnaRoad Web Application

고객용 웹 애플리케이션 - Next.js 14 (App Router)

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Project Structure

```
app/
├── layout.tsx          # Root layout
├── page.tsx            # Home page
├── products/           # Product listing & details
│   ├── page.tsx
│   └── [slug]/
│       └── page.tsx
├── checkout/           # Checkout process
│   └── page.tsx
├── orders/             # Order confirmation
│   └── [id]/
│       └── page.tsx
└── api/                # API routes
    ├── products/
    ├── orders/
    └── checkout/

components/             # Reusable React components
lib/                    # Utility functions & PocketBase client
public/                 # Static assets
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PocketBase
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod

## Features

- 🌍 eSIM 상품 검색 및 구매
- 💳 Stripe 결제 연동
- 📧 자동 이메일 발송 (QR 코드 포함)
- 📱 반응형 디자인
- 🔐 PocketBase 인증

## Development Guidelines

- Use TypeScript strictly
- Follow Next.js App Router conventions
- Use Server Components by default
- Add 'use client' only when necessary
- Keep components small and focused
- Write tests for critical paths

## Related Documentation

- [Architecture](../../docs/architecture/FRONTEND_SPEC.md)
- [API Documentation](../../docs/api/API_DOCS.md)
- [Database Schema](../../docs/architecture/DATABASE_SCHEMA.md)
