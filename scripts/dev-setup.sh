#!/bin/bash

# NumnaRoad Development Environment Setup
# 개발 환경 자동 설정 스크립트

set -e

echo "🚀 NumnaRoad Development Setup Starting..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. PocketBase 다운로드
echo -e "\n${BLUE}[1/5] Downloading PocketBase...${NC}"
if [ ! -f "pocketbase/pocketbase" ]; then
  # OS 및 아키텍처 감지
  OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m)

  # 아키텍처 정규화
  case "$ARCH" in
    x86_64|amd64)
      ARCH="amd64"
      ;;
    arm64|aarch64)
      ARCH="arm64"
      ;;
    *)
      echo -e "${RED}✗ Unsupported architecture: $ARCH${NC}"
      exit 1
      ;;
  esac

  # PocketBase 버전
  PB_VERSION="0.22.0"

  # OS별 바이너리 URL 설정
  case "$OS" in
    darwin)
      PB_FILE="pocketbase_${PB_VERSION}_darwin_${ARCH}.zip"
      ;;
    linux)
      PB_FILE="pocketbase_${PB_VERSION}_linux_${ARCH}.zip"
      ;;
    *)
      echo -e "${RED}✗ Unsupported operating system: $OS${NC}"
      exit 1
      ;;
  esac

  PB_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${PB_FILE}"

  echo "Detected: $OS $ARCH"
  echo "Downloading: $PB_FILE"

  cd pocketbase

  # curl 또는 wget 사용
  if command -v curl &> /dev/null; then
    curl -L -o "$PB_FILE" "$PB_URL"
  elif command -v wget &> /dev/null; then
    wget "$PB_URL"
  else
    echo -e "${RED}✗ Neither curl nor wget found. Please install one of them.${NC}"
    exit 1
  fi

  unzip -o "$PB_FILE"
  rm "$PB_FILE"
  chmod +x pocketbase
  cd ..
  echo -e "${GREEN}✓ PocketBase downloaded${NC}"
else
  echo -e "${GREEN}✓ PocketBase already exists${NC}"
fi

# 2. 환경 변수 파일 생성
echo -e "\n${BLUE}[2/5] Creating environment files...${NC}"
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo -e "${GREEN}✓ .env file created${NC}"
  echo -e "⚠️  Please update .env with your API keys"
else
  echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# 3. 의존성 설치
echo -e "\n${BLUE}[3/5] Installing dependencies...${NC}"
if [ ! -d "node_modules" ]; then
  npm install
  echo -e "${GREEN}✓ Dependencies installed${NC}"
else
  echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# 4. Next.js 프로젝트 초기화 (옵션)
echo -e "\n${BLUE}[4/5] Checking Next.js projects...${NC}"
if [ ! -d "apps/web/node_modules" ]; then
  echo "Next.js web app will be initialized separately"
fi

# 5. Git hooks 설정
echo -e "\n${BLUE}[5/5] Setting up git hooks...${NC}"
if [ -d ".git" ]; then
  echo -e "${GREEN}✓ Git repository detected${NC}"
fi

echo -e "\n${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Update .env with your API keys"
echo "2. Start PocketBase: cd pocketbase && ./pocketbase serve"
echo "3. Initialize Next.js: cd apps/web && npx create-next-app@latest ."
echo "4. Start development: npm run dev"
echo ""
