# NumnaRoad Documentation

프로젝트 전체 문서 인덱스

## 📁 문서 구조

```
docs/
├── api/                    # API 관련 문서
│   ├── API_SPEC.md        # API 전체 스펙
│   └── API_DOCS.md        # API 사용 가이드
├── architecture/           # 시스템 아키텍처
│   ├── ARCHITECTURE.md    # 전체 시스템 설계
│   ├── BACKEND_DESIGN.md  # 백엔드 상세 설계
│   ├── FRONTEND_SPEC.md   # 프론트엔드 스펙
│   ├── DATA_MODEL.md      # 데이터 모델
│   └── DATABASE_SCHEMA.md # DB 스키마
├── planning/              # 기획 및 계획
│   ├── PRD.md            # 제품 요구사항 문서
│   ├── PLANNING.md       # 사업 기획
│   ├── ROADMAP.md        # 개발 로드맵
│   └── plan.md           # 구현 계획
├── development/           # 개발 가이드
│   ├── CODE_REVIEW_GUIDE.md    # 코드 리뷰 가이드
│   └── VERSIONING_GUIDE.md     # 버전 관리 가이드
├── deployment/            # 배포 관련
│   └── DEPLOYMENT.md     # 배포 가이드
├── setup/                 # 환경 설정
│   └── ENVIRONMENT.md    # 환경 변수 설정
└── community/             # 커뮤니티
    ├── CODE_OF_CONDUCT.md      # 행동 강령
    ├── CONTRIBUTING.md         # 기여 가이드
    └── CONTEXT.md             # 프로젝트 배경
```

## 🎯 역할별 문서 가이드

### 처음 시작하는 경우
1. [README.md](../README.md) - 프로젝트 소개
2. [planning/PRD.md](planning/PRD.md) - 제품 요구사항
3. [planning/PLANNING.md](planning/PLANNING.md) - 비즈니스 모델
4. [architecture/ARCHITECTURE.md](architecture/ARCHITECTURE.md) - 기술 스택

### 개발자
1. [architecture/ARCHITECTURE.md](architecture/ARCHITECTURE.md) - 시스템 설계
2. [architecture/DATABASE_SCHEMA.md](architecture/DATABASE_SCHEMA.md) - DB 구조
3. [api/API_DOCS.md](api/API_DOCS.md) - API 사용법
4. [development/CODE_REVIEW_GUIDE.md](development/CODE_REVIEW_GUIDE.md) - 코드 리뷰
5. [community/CONTRIBUTING.md](community/CONTRIBUTING.md) - 기여 방법

### 운영자
1. [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md) - 배포 절차
2. [setup/ENVIRONMENT.md](setup/ENVIRONMENT.md) - 환경 설정
3. [planning/ROADMAP.md](planning/ROADMAP.md) - 개발 일정

### 기획자/PM
1. [planning/PRD.md](planning/PRD.md) - 제품 요구사항
2. [planning/ROADMAP.md](planning/ROADMAP.md) - 로드맵
3. [architecture/DATA_MODEL.md](architecture/DATA_MODEL.md) - 데이터 모델

## 📝 문서 작성 규칙

- 모든 문서는 Markdown 형식
- 코드 예시는 언어 명시
- 스크린샷은 `/docs/images/` 에 저장
- 외부 링크는 변경 가능성 최소화

## 🔄 문서 업데이트

문서 변경 시:
1. 해당 문서 수정
2. CHANGELOG.md에 기록
3. 버전 번호 업데이트 (필요시)
