#!/bin/bash

# NumnaRoad Development Environment Setup
# 개발 환경 자동 설정 스크립트

set -e

echo "🚀 NumnaRoad Development Setup Starting..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. PocketBase 다운로드
echo -e "\n${BLUE}[1/5] Downloading PocketBase...${NC}"
if [ ! -f "pocketbase/pocketbase" ]; then
  cd pocketbase
  wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_linux_amd64.zip
  unzip -o pocketbase_0.22.0_linux_amd64.zip
  rm pocketbase_0.22.0_linux_amd64.zip
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
