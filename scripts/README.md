# Scripts

유틸리티 스크립트 모음

## 스크립트 목록

### seed-products.ts
샘플 상품 데이터 생성

```bash
npm run seed
```

PocketBase에 테스트용 eSIM 상품 데이터 입력

### test-providers.ts
공급사 API 테스트

```bash
tsx scripts/test-providers.ts
```

모든 eSIM 공급사 API 연결 테스트

### backup.sh
데이터베이스 백업

```bash
bash scripts/backup.sh
```

SQLite DB와 파일 저장소 백업

### migrate.ts
데이터 마이그레이션

```bash
tsx scripts/migrate.ts
```

PocketBase Collections 자동 생성 및 초기 데이터 설정

## 개발용 스크립트

### dev-setup.sh
개발 환경 자동 설정

```bash
bash scripts/dev-setup.sh
```

실행 내용:
- PocketBase 다운로드
- 환경 변수 파일 생성
- npm 의존성 설치
- 샘플 데이터 생성

### clean.sh
빌드 파일 및 캐시 제거

```bash
bash scripts/clean.sh
```

## 사용법

```bash
# TypeScript 스크립트 실행
tsx scripts/script-name.ts

# Bash 스크립트 실행
bash scripts/script-name.sh
```
