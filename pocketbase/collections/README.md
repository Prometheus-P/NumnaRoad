# PocketBase Collections

PocketBase 데이터베이스 스키마 정의 파일들입니다.

## Collection 파일

- **esim_products.json** - eSIM 상품 정보
- **orders.json** - 주문 정보

## Collections 가져오기

### 방법 1: Admin UI에서 수동 Import (권장)

1. PocketBase 실행:
   ```bash
   cd pocketbase
   ./pocketbase serve
   ```

2. Admin UI 접속: http://127.0.0.1:8090/_/

3. 처음 실행 시 Admin 계정 생성

4. Settings → Import collections

5. 각 JSON 파일을 선택하여 Import:
   - `esim_products.json`
   - `orders.json`

### 방법 2: 자동화 스크립트 (개발 중)

```bash
# Collections 초기화 스크립트 실행
./scripts/init-pocketbase.sh
```

## 샘플 데이터 생성

Collections를 import한 후 샘플 데이터를 생성하세요:

```bash
# .env 파일에서 PocketBase 설정 확인
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=your_password

# 샘플 상품 데이터 생성
npm run seed
```

## Collection 스키마 설명

### esim_products

상품 정보를 저장하는 collection입니다.

**주요 필드:**
- `name` - 상품명
- `slug` - URL-friendly 이름 (unique)
- `country` - 국가 코드 (2자리)
- `duration` - 사용 기간 (일)
- `data_limit` - 데이터 용량
- `retail_price` - 판매가 (KRW)
- `stock` - 재고 수량
- `is_active` - 판매 활성화 여부
- `is_featured` - 추천 상품 여부

**인덱스:**
- country, is_active, slug (unique)

**API Rules:**
- List/View: 누구나 가능
- Create/Update/Delete: 인증된 사용자만

### orders

주문 정보를 저장하는 collection입니다.

**주요 필드:**
- `order_id` - UUID (unique)
- `product` - 상품 relation
- `status` - 주문 상태 (pending/processing/completed/failed/refunded)
- `payment_status` - 결제 상태
- `customer_email` - 고객 이메일
- `esim_qr_code_url` - QR 코드 URL
- `esim_activation_code` - LPA 활성화 코드

**API Rules:**
- List/View: 본인 주문만
- Create: 누구나 가능
- Update/Delete: 불가능

## 스키마 업데이트

1. Admin UI에서 Collection 수정
2. Settings → Export collections
3. 다운로드한 JSON을 이 디렉토리에 저장
4. Git commit

## 관련 문서

- [Database Schema](../../docs/architecture/DATABASE_SCHEMA.md)
- [API Documentation](../../docs/api/API_DOCS.md)
