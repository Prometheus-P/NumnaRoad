# Frontend Specification

NumnaRoad 프론트엔드 기술 명세서

---

## 📋 Document Metadata

| 항목 | 내용 |
|------|------|
| **문서 유형** | Frontend Specification |
| **대상 독자** | Frontend 개발자, UI/UX 디자이너 |
| **최종 수정** | 2024-12-01 |
| **프레임워크** | Next.js 14 (App Router) |
| **연관 문서** | [PRD.md](./PRD.md), [API_SPEC.md](./API_SPEC.md), [ARCHITECTURE.md](./ARCHITECTURE.md) |
| **우선순위** | ⭐⭐⭐ (Core) |

---

## 📚 Quick Links

- 📋 **[PRD.md](./PRD.md)** - Product Requirements
- 📡 **[API_SPEC.md](./API_SPEC.md)** - API Specification
- 🏗️ **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System Architecture

---

## 목차

1. [Technology Stack](#technology-stack)
2. [Project Structure](#project-structure)
3. [Component Library](#component-library)
4. [Routing & Navigation](#routing--navigation)
5. [State Management](#state-management)
6. [Data Fetching](#data-fetching)
7. [Styling System](#styling-system)
8. [Forms & Validation](#forms--validation)
9. [Performance Optimization](#performance-optimization)
10. [Accessibility](#accessibility)

---

## Technology Stack

### Core Framework

**Next.js 14 (App Router)**
- Server Components by default
- React Server Actions
- Built-in API routes
- File-based routing
- SSR/ISR/SSG support

### UI Libraries

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.0",
    "@radix-ui/react-*": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "tailwindcss": "^3.4.0",
    "framer-motion": "^10.16.0",
    "lucide-react": "^0.294.0"
  }
}
```

### State Management

- **React Context**: Global UI state (theme, modals)
- **Zustand**: Client-side state (cart, user preferences)
- **React Query**: Server state (API data)

### Data Fetching

- **React Query (TanStack Query)**: API calls, caching
- **PocketBase SDK**: Backend communication

---

## Project Structure

```
apps/web/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Auth layout group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (marketing)/             # Marketing layout
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Homepage
│   │   └── about/
│   │       └── page.tsx
│   ├── products/                # Product pages
│   │   ├── page.tsx            # Product list
│   │   ├── [slug]/
│   │   │   └── page.tsx        # Product detail
│   │   └── loading.tsx         # Loading state
│   ├── checkout/
│   │   ├── page.tsx            # Checkout flow
│   │   └── success/
│   │       └── page.tsx
│   ├── orders/
│   │   ├── page.tsx            # Order history
│   │   └── [id]/
│   │       └── page.tsx        # Order detail
│   ├── api/                     # API routes
│   │   ├── webhooks/
│   │   │   └── stripe/
│   │   │       └── route.ts
│   │   └── health/
│   │       └── route.ts
│   ├── layout.tsx              # Root layout
│   ├── error.tsx               # Global error boundary
│   ├── not-found.tsx           # 404 page
│   └── globals.css             # Global styles
├── components/                  # React components
│   ├── ui/                     # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── layout/                 # Layout components
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── navigation.tsx
│   │   └── sidebar.tsx
│   ├── product/                # Product components
│   │   ├── product-card.tsx
│   │   ├── product-list.tsx
│   │   ├── product-filter.tsx
│   │   └── product-detail.tsx
│   ├── checkout/               # Checkout components
│   │   ├── cart-summary.tsx
│   │   ├── payment-form.tsx
│   │   └── order-confirmation.tsx
│   └── shared/                 # Shared components
│       ├── loading-spinner.tsx
│       ├── error-message.tsx
│       └── empty-state.tsx
├── lib/                        # Utilities
│   ├── api-client.ts          # API wrapper
│   ├── pocketbase.ts          # PocketBase client
│   ├── utils.ts               # Helper functions
│   └── validations.ts         # Form validations
├── hooks/                      # Custom React hooks
│   ├── use-products.ts
│   ├── use-cart.ts
│   ├── use-orders.ts
│   └── use-checkout.ts
├── stores/                     # Zustand stores
│   ├── cart-store.ts
│   ├── user-store.ts
│   └── ui-store.ts
├── types/                      # TypeScript types
│   ├── product.ts
│   ├── order.ts
│   └── api.ts
├── styles/                     # Additional styles
│   └── custom.css
├── public/                     # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
├── middleware.ts               # Next.js middleware
├── next.config.js             # Next.js config
├── tailwind.config.ts         # Tailwind config
├── tsconfig.json              # TypeScript config
└── package.json
```

---

## Component Library

### Design System (shadcn/ui)

**Base Components**:

```typescript
// components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        outline: "border border-gray-300 bg-transparent hover:bg-gray-100",
        ghost: "hover:bg-gray-100",
        link: "text-blue-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
```

### Product Components

**ProductCard**:
```typescript
// components/product/product-card.tsx
interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string) => void;
  showQuickView?: boolean;
}

export function ProductCard({ product, onAddToCart, showQuickView }: ProductCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardHeader className="relative">
        {product.is_featured && (
          <Badge className="absolute top-2 left-2">Featured</Badge>
        )}
        <Image
          src={product.image_url || '/placeholder.jpg'}
          alt={product.name}
          width={300}
          height={200}
          className="rounded-t-lg object-cover group-hover:scale-105 transition-transform"
        />
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Flag country={product.country} size={20} />
          <span className="text-sm text-gray-600">{product.country}</span>
        </div>
        <h3 className="font-semibold text-lg">{product.name}</h3>
        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
          <Clock size={16} />
          <span>{product.duration} days</span>
          <Separator orientation="vertical" className="h-4" />
          <Database size={16} />
          <span>{product.data_limit}</span>
        </div>
        <div className="flex items-center justify-between mt-4">
          <span className="text-2xl font-bold">${product.price}</span>
          {product.stock > 0 ? (
            <Button onClick={() => onAddToCart?.(product.id)}>
              Add to Cart
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Out of Stock
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**ProductList**:
```typescript
// components/product/product-list.tsx
interface ProductListProps {
  products: Product[];
  isLoading?: boolean;
}

export function ProductList({ products, isLoading }: ProductListProps) {
  const { addItem } = useCart();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag size={48} />}
        title="No products found"
        description="Try adjusting your filters"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={addItem}
        />
      ))}
    </div>
  );
}
```

---

## Routing & Navigation

### App Router Structure

```typescript
// app/layout.tsx (Root Layout)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <QueryProvider>
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Dynamic Routes

```typescript
// app/products/[slug]/page.tsx
export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  return <ProductDetail product={product} />;
}
```

### Navigation Component

```typescript
// components/layout/navigation.tsx
const navigation = [
  { name: 'Products', href: '/products' },
  { name: 'Destinations', href: '/destinations' },
  { name: 'How it Works', href: '/how-it-works' },
  { name: 'Support', href: '/support' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center space-x-6">
      {navigation.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-blue-600',
            pathname === item.href ? 'text-blue-600' : 'text-gray-700'
          )}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}
```

---

## State Management

### Cart Store (Zustand)

```typescript
// stores/cart-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.productId === product.id
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.productId === product.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }

          return {
            items: [...state.items, { productId: product.id, product, quantity }],
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
```

---

## Data Fetching

### React Query Setup

```typescript
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
  },
});
```

### Custom Hooks

```typescript
// hooks/use-products.ts
export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => apiClient.getProducts(filters),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => apiClient.getProduct(id),
    enabled: !!id,
  });
}

// hooks/use-checkout.ts
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (order: OrderCreate) => apiClient.createOrder(order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
```

---

## Styling System

### Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6',
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        secondary: {
          DEFAULT: '#10B981',
          500: '#10B981',
          600: '#059669',
        },
        accent: {
          DEFAULT: '#F59E0B',
          500: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/forms')],
};

export default config;
```

---

## Forms & Validation

### React Hook Form + Zod

```typescript
// lib/validations.ts
import { z } from 'zod';

export const checkoutSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

// components/checkout/checkout-form.tsx
export function CheckoutForm() {
  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: '',
      name: '',
      phone: '',
      acceptTerms: false,
    },
  });

  const onSubmit = async (data: CheckoutFormData) => {
    try {
      await createCheckoutSession(data);
      toast.success('Redirecting to payment...');
    } catch (error) {
      toast.error('Failed to process checkout');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* More fields... */}
        <Button type="submit" className="w-full">
          Continue to Payment
        </Button>
      </form>
    </Form>
  );
}
```

---

## Performance Optimization

### Image Optimization

```typescript
import Image from 'next/image';

<Image
  src={product.image_url}
  alt={product.name}
  width={300}
  height={200}
  quality={85}
  priority={product.is_featured}
  placeholder="blur"
  blurDataURL="/placeholder-blur.jpg"
/>
```

### Code Splitting

```typescript
// Dynamic imports for heavy components
const DashboardChart = dynamic(() => import('./dashboard-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});
```

### Memoization

```typescript
const expensiveCalculation = useMemo(() => {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}, [items]);

const handleAddToCart = useCallback((productId: string) => {
  addItem(productId);
}, [addItem]);
```

---

## Accessibility

### ARIA Labels & Semantic HTML

```typescript
<nav aria-label="Main navigation">
  <ul role="list">
    {navigation.map((item) => (
      <li key={item.name}>
        <Link href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>
          {item.name}
        </Link>
      </li>
    ))}
  </ul>
</nav>

<button
  aria-label="Add to cart"
  aria-pressed={isInCart}
  onClick={handleAddToCart}
>
  <ShoppingCart aria-hidden="true" />
</button>
```

### Keyboard Navigation

```typescript
// components/ui/dialog.tsx
export function Dialog({ open, onOpenChange }: DialogProps) {
  useEffect(() => {
    if (open) {
      // Trap focus within dialog
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay />
        <DialogPrimitive.Content
          ref={dialogRef}
          onEscapeKeyDown={onOpenChange}
          aria-describedby={undefined}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
```

---

## Validation Checklist

- [x] Technology stack defined
- [x] Project structure documented
- [x] Component library specified
- [x] Routing patterns defined
- [x] State management strategy documented
- [x] Data fetching patterns specified
- [x] Styling system configured
- [x] Form validation implemented
- [x] Performance optimizations documented
- [x] Accessibility guidelines provided

---

> **TL;DR**:
> - **Framework**: Next.js 14 (App Router)
> - **UI**: shadcn/ui + TailwindCSS
> - **State**: Zustand (client) + React Query (server)
> - **Forms**: React Hook Form + Zod
> - **Performance**: Image optimization, code splitting, memoization
> - **Accessibility**: ARIA labels, keyboard navigation, WCAG 2.1 AA
