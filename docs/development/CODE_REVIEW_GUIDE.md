# Code Review Guide

NumnaRoad 코드 리뷰 가이드라인

---

## 📋 Document Metadata

| 항목 | 내용 |
|------|------|
| **문서 유형** | Collaboration Guide |
| **대상 독자** | 코드 리뷰어, 기여자, 메인테이너 |
| **최종 수정** | 2024-12-01 |
| **연관 문서** | [CONTRIBUTING.md](./CONTRIBUTING.md), [plan.md](./plan.md) |
| **우선순위** | ⭐⭐ (High) |

---

## 📚 Quick Links

- 📖 **[CONTRIBUTING.md](./CONTRIBUTING.md)** - 기여 가이드라인
- 📋 **[plan.md](./plan.md)** - TDD 개발 태스크 리스트
- 🎯 **[CONTEXT.md](./CONTEXT.md)** - 프로젝트 전체 맥락

---

## 목차

1. [코드 리뷰 원칙](#코드-리뷰-원칙)
2. [리뷰어 체크리스트](#리뷰어-체크리스트)
3. [TDD 리뷰 가이드](#tdd-리뷰-가이드)
4. [코드 품질 기준](#코드-품질-기준)
5. [리뷰 피드백 작성법](#리뷰-피드백-작성법)
6. [일반적인 리뷰 패턴](#일반적인-리뷰-패턴)
7. [승인 기준](#승인-기준)

---

## 코드 리뷰 원칙

### 핵심 가치

1. **건설적 피드백**: 문제를 지적하되, 해결 방법도 함께 제시
2. **존중과 배려**: 코드를 비판하되, 사람을 비판하지 않음
3. **학습 기회**: 리뷰는 양방향 학습의 기회
4. **일관성 유지**: 프로젝트 코딩 스타일 및 원칙 준수

### 리뷰 철학

> "We're reviewing code, not people. Focus on the what, not the who."

**Good Review**:
```
💡 Suggestion: This function could be simplified using array.reduce().

Current approach works, but reduce() would be more idiomatic:
```typescript
const total = orders.reduce((sum, order) => sum + order.amount, 0);
```
```

**Bad Review**:
```
❌ Why did you write such complicated code? This is terrible.
```

---

## 리뷰어 체크리스트

### 📋 Before You Start

- [ ] PR 설명 읽기 (목적, 변경 사항, 관련 Issue)
- [ ] [plan.md](./plan.md)에서 관련 Task 확인
- [ ] 변경된 파일 목록 확인 (scope 파악)
- [ ] CI/CD 상태 확인 (테스트, 린트, 빌드)

### ✅ Code Review Checklist

#### 1. TDD 준수 (Critical)

- [ ] 🔴 **RED**: 실패하는 테스트가 먼저 작성되었는가?
- [ ] 🟢 **GREEN**: 테스트가 통과하는 최소한의 구현인가?
- [ ] 🔵 **REFACTOR**: 리팩토링이 테스트 통과를 유지하는가?
- [ ] 테스트 커버리지가 유지 또는 증가했는가?
- [ ] 각 단계별 커밋이 명확한가?

#### 2. 기능 및 로직

- [ ] PR 목적과 구현이 일치하는가?
- [ ] 엣지 케이스가 처리되었는가?
- [ ] 에러 처리가 적절한가?
- [ ] 성능 문제가 없는가?

#### 3. 코드 품질

- [ ] 함수가 20줄 이내인가?
- [ ] 네이밍이 명확하고 의도를 표현하는가?
- [ ] TypeScript `any` 사용이 없는가?
- [ ] 주석이 "왜"만 설명하는가?
- [ ] 중복 코드가 없는가?

#### 4. 테스트

- [ ] 유닛 테스트가 충분한가?
- [ ] 테스트가 독립적인가? (순서 의존 없음)
- [ ] 테스트 이름이 명확한가?
- [ ] Mock/Stub이 적절히 사용되었는가?

#### 5. 보안

- [ ] 환경 변수 하드코딩이 없는가?
- [ ] SQL Injection 취약점이 없는가?
- [ ] XSS 취약점이 없는가?
- [ ] 민감 정보 로그 출력이 없는가?
- [ ] Input validation이 구현되었는가?

#### 6. 성능

- [ ] N+1 쿼리 문제가 없는가?
- [ ] 불필요한 re-render가 없는가? (React)
- [ ] 메모리 누수 가능성이 없는가?
- [ ] 무거운 연산이 최적화되었는가?

#### 7. 문서

- [ ] README.md 업데이트 (필요시)
- [ ] API 문서 업데이트 (필요시)
- [ ] CHANGELOG.md 업데이트
- [ ] JSDoc 주석 추가 (public API)

---

## TDD 리뷰 가이드

NumnaRoad는 TDD-First를 따르므로, 리뷰어는 TDD 사이클 준수 여부를 중점적으로 확인해야 합니다.

### 🔴 RED Phase 리뷰

**체크 포인트**:
- 테스트가 실패하는가? (구현 전)
- 테스트가 명확한 요구사항을 표현하는가?
- 테스트 이름이 의도를 설명하는가?

**Example - Good RED**:
```typescript
// ✅ Good - 명확한 요구사항, 실패하는 테스트
describe('Product.calculateDiscountedPrice()', () => {
  it('should apply 10% discount when coupon code is valid', () => {
    const product = { price: 100 };
    const result = product.calculateDiscountedPrice('SAVE10');
    expect(result).toBe(90);
  });

  it('should throw error when coupon code is invalid', () => {
    const product = { price: 100 };
    expect(() => product.calculateDiscountedPrice('INVALID')).toThrow('Invalid coupon');
  });
});
```

**Example - Bad RED**:
```typescript
// ❌ Bad - 모호한 테스트, 의도 불명확
describe('Product', () => {
  it('works', () => {
    const product = new Product();
    expect(product).toBeTruthy();
  });
});
```

**리뷰 피드백**:
```markdown
🔴 RED Phase Issue:

The test name "works" is too vague. Could you make it more specific?

**Suggestion**:
```typescript
it('should calculate discounted price correctly when valid coupon is applied', () => {
  // ...
});
```

This makes the requirement clearer.
```

### 🟢 GREEN Phase 리뷰

**체크 포인트**:
- 테스트가 통과하는가?
- 구현이 과도하게 복잡하지 않은가? (최소 구현 원칙)
- 다른 테스트가 깨지지 않았는가?

**Example - Good GREEN**:
```typescript
// ✅ Good - 최소한의 구현, 테스트 통과
calculateDiscountedPrice(couponCode: string): number {
  if (couponCode === 'SAVE10') {
    return this.price * 0.9;
  }
  throw new Error('Invalid coupon');
}
```

**Example - Bad GREEN (Over-engineering)**:
```typescript
// ❌ Bad - 과도한 구현, 아직 요구사항 없음
calculateDiscountedPrice(couponCode: string): number {
  const coupons = await db.query('SELECT * FROM coupons WHERE code = ?', [couponCode]);
  const validCoupons = coupons.filter(c => c.expiresAt > new Date());
  const activeCoupons = validCoupons.filter(c => c.usedCount < c.maxUsageCount);

  if (activeCoupons.length === 0) {
    throw new Error('Invalid coupon');
  }

  // ... 100줄의 복잡한 로직
}
```

**리뷰 피드백**:
```markdown
🟢 GREEN Phase Issue:

The implementation seems over-engineered for the current test requirements.

**Current Test**: Only checks for coupon code 'SAVE10'
**Current Implementation**: Full database integration, expiration logic, usage limits

**Suggestion**: Keep it simple for now. Add complexity when tests require it (YAGNI principle).

```typescript
// Minimal implementation that passes tests:
calculateDiscountedPrice(couponCode: string): number {
  if (couponCode === 'SAVE10') {
    return this.price * 0.9;
  }
  throw new Error('Invalid coupon');
}
```

We can add database integration in the next RED-GREEN cycle when we have tests for it.
```

### 🔵 REFACTOR Phase 리뷰

**체크 포인트**:
- 리팩토링 후에도 테스트가 통과하는가?
- 코드 가독성이 향상되었는가?
- 중복이 제거되었는가?
- 성능이 개선되었는가?

**Example - Good REFACTOR**:
```typescript
// Before REFACTOR (GREEN)
calculateDiscountedPrice(couponCode: string): number {
  if (couponCode === 'SAVE10') {
    return this.price * 0.9;
  } else if (couponCode === 'SAVE20') {
    return this.price * 0.8;
  } else if (couponCode === 'SAVE30') {
    return this.price * 0.7;
  }
  throw new Error('Invalid coupon');
}

// After REFACTOR (improved)
calculateDiscountedPrice(couponCode: string): number {
  const discountRates: Record<string, number> = {
    'SAVE10': 0.9,
    'SAVE20': 0.8,
    'SAVE30': 0.7,
  };

  const rate = discountRates[couponCode];
  if (!rate) {
    throw new Error('Invalid coupon');
  }

  return this.price * rate;
}
```

**리뷰 피드백**:
```markdown
✅ Excellent REFACTOR!

**Improvements**:
1. ✅ Eliminated if-else chain (more maintainable)
2. ✅ Used object lookup (O(1) performance)
3. ✅ Easy to add new coupons (just add to object)
4. ✅ All tests still passing

**Approved!** 🎉
```

---

## 코드 품질 기준

### 1. 함수 크기 (20줄 이내)

**❌ Reject**:
```typescript
// 100줄짜리 함수
async function processOrder(orderId: string) {
  // 주문 조회
  // 재고 확인
  // 할인 적용
  // 결제 처리
  // eSIM 발급
  // 이메일 발송
  // 통계 업데이트
  // ... 100줄
}
```

**💬 Feedback**:
```markdown
⚠️ Function Too Long

This function has multiple responsibilities. Let's extract them:

**Suggestion**:
```typescript
async function processOrder(orderId: string): Promise<void> {
  const order = await fetchOrder(orderId);
  await validateInventory(order);
  await applyDiscounts(order);
  await processPayment(order);
  await issueESIM(order);
  await sendConfirmationEmail(order);
  await updateStatistics(order);
}
```

Each extracted function should be tested independently.
```

### 2. 네이밍 명확성

**❌ Reject**:
```typescript
function calc(a: number, b: number): number {
  return a * (1 - b / 100);
}

const data = await fetch('/api/orders');
const list = data.filter(x => x.status === 'completed');
```

**💬 Feedback**:
```markdown
⚠️ Unclear Naming

Variable names should express intent clearly.

**Suggestions**:
1. `calc` → `calculateDiscountedPrice`
2. `a`, `b` → `subtotal`, `discountPercent`
3. `data` → `orders`
4. `list` → `completedOrders`
5. `x` → `order`

```typescript
function calculateDiscountedPrice(
  subtotal: number,
  discountPercent: number
): number {
  return subtotal * (1 - discountPercent / 100);
}

const orders = await fetch('/api/orders');
const completedOrders = orders.filter(order => order.status === 'completed');
```
```

### 3. TypeScript `any` 금지

**❌ Reject**:
```typescript
function processData(data: any): any {
  return data.map((item: any) => item.value);
}
```

**💬 Feedback**:
```markdown
❌ `any` Type Used

TypeScript `any` defeats the purpose of type safety.

**Suggestion**:
```typescript
interface DataItem {
  value: number;
  label: string;
}

function processData(data: DataItem[]): number[] {
  return data.map(item => item.value);
}
```

If the type is truly unknown, use `unknown` instead of `any`.
```

### 4. 주석 - "왜"만 작성

**❌ Reject**:
```typescript
// 주문 ID로 주문을 가져옵니다
const order = await getOrder(orderId);

// 주문 금액을 계산합니다
const total = order.items.reduce((sum, item) => sum + item.price, 0);
```

**💬 Feedback**:
```markdown
⚠️ Unnecessary Comments

These comments just repeat what the code already says. Remove them.

**Good Comment (explains "why")**:
```typescript
// Exponential backoff을 사용하는 이유:
// eSIM 공급사 API가 rate limit을 엄격하게 적용하므로
// 즉시 재시도 시 429 에러 발생 확률이 높음
await retryWithExponentialBackoff(() => callProviderAPI(orderId));
```
```

### 5. 중복 제거 (DRY)

**❌ Reject**:
```typescript
// 동일한 로직 반복
function getKoreaProducts() {
  return products.filter(p => p.country === 'Korea' && p.isActive);
}

function getJapanProducts() {
  return products.filter(p => p.country === 'Japan' && p.isActive);
}

function getChinaProducts() {
  return products.filter(p => p.country === 'China' && p.isActive);
}
```

**💬 Feedback**:
```markdown
⚠️ Code Duplication (DRY Violation)

These functions have identical logic. Let's extract:

**Suggestion**:
```typescript
function getProductsByCountry(country: string): Product[] {
  return products.filter(p => p.country === country && p.isActive);
}

// Usage
const koreaProducts = getProductsByCountry('Korea');
const japanProducts = getProductsByCountry('Japan');
```
```

---

## 리뷰 피드백 작성법

### 피드백 우선순위

1. **🔴 Blocker** - 머지 불가, 반드시 수정 필요
2. **⚠️ Major** - 심각한 문제, 수정 권장
3. **💡 Minor** - 개선 제안, 선택 사항
4. **❓ Question** - 궁금한 점, 설명 요청
5. **🎉 Praise** - 잘한 부분, 칭찬

### 피드백 템플릿

#### 🔴 Blocker (머지 차단)

```markdown
🔴 **Security Issue - SQL Injection Vulnerability**

This code is vulnerable to SQL injection:

```typescript
const query = `SELECT * FROM orders WHERE customer_email = '${email}'`;
```

**Why It's Critical**:
Attacker can inject malicious SQL: `'; DROP TABLE orders; --`

**Required Fix**:
```typescript
const query = 'SELECT * FROM orders WHERE customer_email = ?';
const result = await db.execute(query, [email]);
```

**References**:
- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
```

#### ⚠️ Major (수정 권장)

```markdown
⚠️ **Performance Issue - N+1 Query**

This code triggers N+1 queries:

```typescript
for (const order of orders) {
  const product = await getProduct(order.productId); // N queries
}
```

**Impact**: 1000 orders = 1000 database queries (very slow!)

**Suggested Fix**:
```typescript
const productIds = orders.map(o => o.productId);
const products = await getProductsByIds(productIds); // 1 query
const productMap = new Map(products.map(p => [p.id, p]));

for (const order of orders) {
  const product = productMap.get(order.productId);
}
```

**Performance Improvement**: O(N) → O(1) per order
```

#### 💡 Minor (개선 제안)

```markdown
💡 **Suggestion: Use Optional Chaining**

Current code:
```typescript
const country = product && product.location && product.location.country;
```

**Suggestion**:
```typescript
const country = product?.location?.country;
```

**Benefits**:
- More concise
- Easier to read
- Same functionality

Feel free to keep current version if you prefer. This is optional.
```

#### ❓ Question (궁금한 점)

```markdown
❓ **Question: Why Use setTimeout Instead of setInterval?**

I noticed you're using `setTimeout` in a recursive pattern:

```typescript
function pollStatus() {
  setTimeout(() => {
    checkOrderStatus();
    pollStatus(); // Recursive call
  }, 5000);
}
```

Is there a specific reason for this over `setInterval`?

Just curious - not suggesting you change it unless there's an issue.
```

#### 🎉 Praise (칭찬)

```markdown
🎉 **Excellent Test Coverage!**

I love how you've covered all edge cases:
- ✅ Valid coupon
- ✅ Expired coupon
- ✅ Used-up coupon
- ✅ Invalid format
- ✅ Empty string
- ✅ Null/undefined

Test coverage: 100% 🎊

This will prevent a lot of bugs. Great work!
```

---

## 일반적인 리뷰 패턴

### Pattern 1: "Magic Numbers"

**❌ Code**:
```typescript
if (order.amount > 50) {
  applyDiscount(order, 0.1);
}
```

**💬 Feedback**:
```markdown
💡 **Suggestion: Extract Magic Numbers**

What does `50` and `0.1` represent?

**Suggestion**:
```typescript
const FREE_SHIPPING_THRESHOLD = 50; // USD
const LOYALTY_DISCOUNT_RATE = 0.1; // 10%

if (order.amount > FREE_SHIPPING_THRESHOLD) {
  applyDiscount(order, LOYALTY_DISCOUNT_RATE);
}
```

**Benefits**:
- Self-documenting code
- Easy to update thresholds
- Centralized configuration
```

### Pattern 2: "Callback Hell"

**❌ Code**:
```typescript
fetchOrder(orderId, (order) => {
  fetchProduct(order.productId, (product) => {
    fetchInventory(product.id, (inventory) => {
      updateOrder(order, inventory, (result) => {
        sendEmail(result, (emailStatus) => {
          console.log('Done');
        });
      });
    });
  });
});
```

**💬 Feedback**:
```markdown
⚠️ **Callback Hell - Use async/await**

This nested callback structure is hard to read and maintain.

**Suggestion**:
```typescript
async function processOrder(orderId: string): Promise<void> {
  const order = await fetchOrder(orderId);
  const product = await fetchProduct(order.productId);
  const inventory = await fetchInventory(product.id);
  const result = await updateOrder(order, inventory);
  await sendEmail(result);
  console.log('Done');
}
```

**Benefits**:
- More readable (top-to-bottom flow)
- Better error handling
- Easier to debug
```

### Pattern 3: "Premature Optimization"

**❌ Code**:
```typescript
// Micro-optimization for array access
const len = arr.length;
for (let i = 0; i < len; i++) {
  // ... complex caching logic
  // ... manual memory management
}
```

**💬 Feedback**:
```markdown
💡 **Premature Optimization**

> "Premature optimization is the root of all evil" - Donald Knuth

This optimization adds complexity without proven performance benefit.

**Suggestion**: Use standard array methods unless profiling shows a bottleneck:
```typescript
arr.forEach(item => {
  // Clear, idiomatic code
});
```

**When to optimize**:
1. Profile first (find actual bottleneck)
2. Measure impact
3. Optimize if significant (>10% improvement)
```

### Pattern 4: "God Object"

**❌ Code**:
```typescript
class OrderService {
  createOrder() { /* ... */ }
  updateOrder() { /* ... */ }
  deleteOrder() { /* ... */ }
  sendEmail() { /* ... */ }
  processPayment() { /* ... */ }
  issueESIM() { /* ... */ }
  calculateTax() { /* ... */ }
  validateCoupon() { /* ... */ }
  // ... 50 more methods
}
```

**💬 Feedback**:
```markdown
⚠️ **God Object - Too Many Responsibilities**

This class has too many responsibilities (violates Single Responsibility Principle).

**Suggestion**: Split into focused classes:
```typescript
class OrderService {
  createOrder() { /* ... */ }
  updateOrder() { /* ... */ }
  deleteOrder() { /* ... */ }
}

class EmailService {
  sendOrderConfirmation() { /* ... */ }
}

class PaymentService {
  processPayment() { /* ... */ }
}

class ESIMService {
  issueESIM() { /* ... */ }
}
```

**Benefits**:
- Easier to test
- Easier to maintain
- Clear separation of concerns
```

---

## 승인 기준

### ✅ Approve When:

1. **모든 필수 체크리스트 통과**
   - TDD 사이클 준수
   - 테스트 커버리지 유지/증가
   - 타입 체크 통과
   - 린트 통과
   - 빌드 성공

2. **코드 품질 기준 충족**
   - Clean Code 원칙 준수
   - 적절한 네이밍
   - 중복 최소화
   - 적절한 주석

3. **보안 및 성능**
   - 보안 취약점 없음
   - 성능 문제 없음

4. **문서 업데이트**
   - README, API 문서, CHANGELOG 업데이트 (필요시)

### ⚠️ Request Changes When:

1. **Blocker 이슈 존재**
   - 보안 취약점
   - 심각한 버그
   - 테스트 실패

2. **코드 품질 기준 미달**
   - 함수 너무 긴 (>20줄)
   - `any` 타입 사용
   - 중복 코드 과다

3. **TDD 사이클 미준수**
   - 테스트 없는 구현
   - 테스트 커버리지 감소

### 💬 Comment (승인 보류) When:

1. **Minor 이슈만 존재**
   - 개선 제안 (필수 아님)
   - 스타일 이슈
   - 성능 최적화 제안

2. **질문이 필요한 경우**
   - 설계 결정 이유 궁금
   - 대안 제시

---

## Validation Checklist

### 리뷰어 자가 점검

리뷰 완료 전 확인:

- [ ] PR 설명을 읽고 목적을 이해했는가?
- [ ] 모든 변경 파일을 검토했는가?
- [ ] TDD 사이클 준수 여부를 확인했는가?
- [ ] 코드 품질 기준을 확인했는가?
- [ ] 보안 취약점을 확인했는가?
- [ ] 피드백이 건설적이고 명확한가?
- [ ] 대안 또는 예시를 제공했는가?
- [ ] 칭찬할 부분을 찾아 언급했는가?

---

## 📚 Additional Resources

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - 기여 가이드라인
- **[plan.md](./plan.md)** - 개발 태스크 리스트
- **[CONTEXT.md](./CONTEXT.md)** - 프로젝트 맥락
- **[Clean Code by Robert C. Martin](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)** - Clean Code 원칙

---

## 🙏 감사합니다!

고품질 코드 리뷰는 프로젝트의 품질을 높이고 팀의 성장을 돕습니다.

**함께 더 나은 코드를 만들어갑시다!** 🚀

---

> **TL;DR for Reviewers**:
> 1. ✅ TDD 사이클 준수 확인 (RED → GREEN → REFACTOR)
> 2. ✅ 코드 품질 기준 확인 (Clean Code)
> 3. ✅ 보안 및 성능 이슈 확인
> 4. 💬 건설적 피드백 제공 (문제 + 해결책)
> 5. 🎉 잘한 부분 칭찬하기
