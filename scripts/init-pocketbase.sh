#!/bin/bash

# PocketBase Collections 자동 초기화 스크립트
# Usage: ./scripts/init-pocketbase.sh

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 PocketBase Collections Initialization${NC}"
echo ""

# PocketBase URL
PB_URL="${POCKETBASE_URL:-http://127.0.0.1:8090}"
ADMIN_EMAIL="${POCKETBASE_ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${POCKETBASE_ADMIN_PASSWORD:-password123}"

echo -e "${YELLOW}⚠️  This script will create collections in PocketBase${NC}"
echo -e "${YELLOW}   Make sure PocketBase is running at: ${PB_URL}${NC}"
echo ""

# PocketBase 실행 확인
echo -e "${BLUE}[1/4] Checking PocketBase connection...${NC}"
if ! curl -s "${PB_URL}/api/health" > /dev/null; then
  echo -e "${RED}✗ PocketBase is not running at ${PB_URL}${NC}"
  echo -e "${YELLOW}  Start PocketBase with: cd pocketbase && ./pocketbase serve${NC}"
  exit 1
fi
echo -e "${GREEN}✓ PocketBase is running${NC}"

# Admin 계정 생성 또는 로그인
echo -e "\n${BLUE}[2/4] Admin authentication...${NC}"
echo -e "${YELLOW}  Please create an admin account manually in the PocketBase Admin UI${NC}"
echo -e "${YELLOW}  Visit: ${PB_URL}/_/${NC}"
echo ""
read -p "Press Enter after creating admin account to continue..."

# Collections 파일 확인
echo -e "\n${BLUE}[3/4] Checking collection schema files...${NC}"
COLLECTIONS_DIR="pocketbase/collections"

if [ ! -d "$COLLECTIONS_DIR" ]; then
  echo -e "${RED}✗ Collections directory not found: $COLLECTIONS_DIR${NC}"
  exit 1
fi

SCHEMA_FILES=$(find "$COLLECTIONS_DIR" -name "*.json" -type f)
if [ -z "$SCHEMA_FILES" ]; then
  echo -e "${RED}✗ No schema files found in $COLLECTIONS_DIR${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Found collection schemas:${NC}"
for file in $SCHEMA_FILES; do
  filename=$(basename "$file")
  echo -e "  - $filename"
done

# Collections 생성 안내
echo -e "\n${BLUE}[4/4] Import collections...${NC}"
echo -e "${YELLOW}⚠️  Manual Import Required${NC}"
echo ""
echo -e "To import collections:"
echo -e "1. Open PocketBase Admin UI: ${BLUE}${PB_URL}/_/${NC}"
echo -e "2. Go to Settings → Import collections"
echo -e "3. Upload each JSON file from: ${BLUE}${COLLECTIONS_DIR}/${NC}"
echo -e ""
echo -e "Collection files to import:"
for file in $SCHEMA_FILES; do
  filename=$(basename "$file")
  echo -e "  - ${GREEN}${file}${NC}"
done

echo -e "\n${GREEN}✅ Setup instructions complete!${NC}"
echo ""
echo -e "Next steps:"
echo -e "1. Import collections via Admin UI"
echo -e "2. Run seed script: ${BLUE}npm run seed${NC}"
echo -e "3. Verify collections: Visit ${BLUE}${PB_URL}/_/${NC}"
echo ""
