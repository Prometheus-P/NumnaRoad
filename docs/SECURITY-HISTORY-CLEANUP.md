# GitHub 히스토리에서 민감한 정보 삭제하기

> **경고**: 이 문서는 Git 히스토리를 영구적으로 변경하는 방법을 설명합니다.
> 이 작업은 되돌릴 수 없으며, 모든 협업자에게 영향을 미칩니다.

## 목차

1. [즉시 조치 사항](#즉시-조치-사항)
2. [방법 1: git-filter-repo (권장)](#방법-1-git-filter-repo-권장)
3. [방법 2: BFG Repo-Cleaner](#방법-2-bfg-repo-cleaner)
4. [방법 3: git filter-branch (레거시)](#방법-3-git-filter-branch-레거시)
5. [GitHub에서 캐시된 데이터 삭제](#github에서-캐시된-데이터-삭제)
6. [팀 협업자 조치 사항](#팀-협업자-조치-사항)
7. [사후 점검](#사후-점검)

---

## 즉시 조치 사항

민감한 정보가 노출된 것을 발견했다면:

### 1. 즉시 자격 증명 무효화
```bash
# API 키, 비밀번호, 토큰 등을 즉시 변경/폐기
# - 해당 서비스 대시보드에서 키 재발급
# - 비밀번호 변경
# - 토큰 폐기 및 재발급
```

### 2. 노출된 파일 확인
```bash
# 특정 파일이 히스토리에 있는지 확인
git log --all --full-history -- "path/to/sensitive-file"

# 특정 문자열이 히스토리에 있는지 검색
git log -p --all -S "API_KEY_VALUE" --source --all
```

### 3. GitHub Security 알림 확인
GitHub 저장소 → Settings → Security → Secret scanning alerts 확인

---

## 방법 1: git-filter-repo (권장)

가장 빠르고 안전한 방법입니다.

### 설치
```bash
# macOS
brew install git-filter-repo

# pip
pip3 install git-filter-repo

# Ubuntu/Debian
apt-get install git-filter-repo
```

### 특정 파일 완전 삭제
```bash
# 백업 생성 (필수!)
git clone --mirror git@github.com:Prometheus-P/NumnaRoad.git backup-repo

# 파일 삭제
git filter-repo --path .env --invert-paths
git filter-repo --path secrets/ --invert-paths

# 여러 파일 동시 삭제
git filter-repo --invert-paths --path .env --path config/secrets.json --path credentials.json
```

### 특정 문자열 치환
```bash
# 민감한 문자열을 ***REMOVED***로 치환
git filter-repo --replace-text <(echo "YOUR_API_KEY==>***REMOVED***")

# 여러 문자열 치환 (파일 사용)
cat > replacements.txt << EOF
sk-live-xxxxxxxxxxxxx==>***REMOVED***
AKIAIOSFODNN7EXAMPLE==>***REMOVED***
password123==>***REMOVED***
EOF

git filter-repo --replace-text replacements.txt
```

### 강제 푸시
```bash
# 모든 브랜치 강제 푸시
git push origin --force --all

# 모든 태그 강제 푸시
git push origin --force --tags
```

---

## 방법 2: BFG Repo-Cleaner

Java 기반의 빠른 도구입니다.

### 설치
```bash
# macOS
brew install bfg

# 또는 JAR 다운로드
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
```

### 사용법
```bash
# 백업 생성
git clone --mirror git@github.com:Prometheus-P/NumnaRoad.git backup-repo

# 미러 클론
git clone --mirror git@github.com:Prometheus-P/NumnaRoad.git NumnaRoad.git
cd NumnaRoad.git

# 특정 파일 삭제
java -jar bfg.jar --delete-files ".env"
java -jar bfg.jar --delete-files "credentials.json"

# 특정 폴더 삭제
java -jar bfg.jar --delete-folders "secrets"

# 특정 문자열 치환
echo "YOUR_API_KEY" > passwords.txt
java -jar bfg.jar --replace-text passwords.txt

# 정리 및 푸시
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

---

## 방법 3: git filter-branch (레거시)

> **주의**: 이 방법은 느리고 위험합니다. git-filter-repo 사용을 권장합니다.

```bash
# 특정 파일 삭제
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/sensitive-file" \
  --prune-empty --tag-name-filter cat -- --all

# 정리
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 강제 푸시
git push origin --force --all
git push origin --force --tags
```

---

## GitHub에서 캐시된 데이터 삭제

### 1. GitHub Support 연락

강제 푸시 후에도 GitHub 서버에 캐시가 남을 수 있습니다.

**GitHub Support 요청 방법:**
1. https://support.github.com/contact 접속
2. "Remove cached views" 또는 "Remove data from repository" 선택
3. 다음 정보 제공:
   - 저장소 URL: `https://github.com/Prometheus-P/NumnaRoad`
   - 삭제할 커밋 SHA 목록
   - 민감한 데이터 유형 설명 (API 키, 비밀번호 등)

### 2. Pull Request 캐시 삭제

PR에 민감한 정보가 포함된 경우:
- 해당 PR을 닫고 삭제
- GitHub Support에 PR 캐시 삭제 요청

### 3. Fork 처리

저장소가 Fork된 경우:
- 모든 Fork 소유자에게 연락
- Fork 삭제 또는 동일한 정리 작업 요청
- GitHub Support에 Fork 네트워크 정리 요청

---

## 팀 협업자 조치 사항

히스토리를 다시 작성한 후, 모든 협업자에게 다음을 요청:

### 협업자용 스크립트
```bash
# 기존 로컬 저장소 백업 (필요시)
mv NumnaRoad NumnaRoad-backup

# 새로 클론
git clone git@github.com:Prometheus-P/NumnaRoad.git

# 또는 기존 저장소 강제 업데이트 (위험!)
cd NumnaRoad
git fetch origin
git reset --hard origin/main
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### 주의사항
- 로컬에 민감한 정보가 포함된 커밋이 남아있을 수 있음
- 로컬 reflog 정리 필수
- stash에도 민감한 정보가 있을 수 있음: `git stash clear`

---

## 사후 점검

### 1. 히스토리 검증
```bash
# 삭제된 파일이 없는지 확인
git log --all --full-history -- "path/to/sensitive-file"

# 민감한 문자열 검색
git log -p --all -S "sensitive_string" --source --all
```

### 2. GitHub Secret Scanning
- Settings → Security → Secret scanning alerts 확인
- 새로운 알림이 없는지 확인

### 3. 외부 서비스 확인
- [GitGuardian](https://www.gitguardian.com/) - 무료 검사
- [TruffleHog](https://github.com/trufflesecurity/trufflehog) - 로컬 스캔

```bash
# TruffleHog 설치 및 실행
brew install trufflehog
trufflehog git file://. --only-verified
```

### 4. 자격 증명 갱신 확인
- [ ] API 키 재발급 완료
- [ ] 비밀번호 변경 완료
- [ ] 토큰 폐기 및 재발급 완료
- [ ] 환경 변수 업데이트 완료
- [ ] CI/CD 시크릿 업데이트 완료

---

## 예방 조치

### 1. Pre-commit Hook 설정
```bash
# .git/hooks/pre-commit
#!/bin/bash

# 민감한 파일 패턴 확인
SENSITIVE_PATTERNS=".env secrets credentials api.key private.key"

for pattern in $SENSITIVE_PATTERNS; do
  if git diff --cached --name-only | grep -q "$pattern"; then
    echo "ERROR: Sensitive file pattern detected: $pattern"
    exit 1
  fi
done
```

### 2. git-secrets 설치
```bash
# macOS
brew install git-secrets

# 저장소에 설정
git secrets --install
git secrets --register-aws

# 커스텀 패턴 추가
git secrets --add 'sk-[a-zA-Z0-9]{20,}'  # Stripe 키
git secrets --add 'ghp_[a-zA-Z0-9]{36}'   # GitHub 토큰
```

### 3. GitHub Secret Scanning 활성화
- Settings → Security → Secret scanning → Enable

### 4. .gitignore 검토
- 정기적으로 .gitignore 검토
- 새 프로젝트 시작 시 보안 템플릿 사용

---

## 긴급 연락처

- **GitHub Security**: security@github.com
- **GitHub Support**: https://support.github.com/contact
- **프로젝트 보안 담당자**: [담당자 이메일]

---

## 참고 자료

- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [git-filter-repo Documentation](https://htmlpreview.github.io/?https://github.com/newren/git-filter-repo/blob/docs/html/git-filter-repo.html)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [OWASP Secret Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
