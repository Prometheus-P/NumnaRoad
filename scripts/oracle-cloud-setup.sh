#!/bin/bash
# Oracle Cloud VM 초기 설정 스크립트
# VM 접속 후 실행: bash oracle-cloud-setup.sh

set -e

echo "=== NumnaRoad Sync Server Setup ==="

# 1. 시스템 업데이트
echo "Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Node.js 20 설치
echo "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 동기화 디렉토리 생성
echo "Creating sync directory..."
sudo mkdir -p /opt/numnaroad
sudo chown $USER:$USER /opt/numnaroad

# 4. 동기화 스크립트 생성
cat > /opt/numnaroad/sync.sh << 'EOF'
#!/bin/bash
# SmartStore 주문 동기화 스크립트

CRON_SECRET="REDACTED_CRON_SECRET"
API_URL="https://web-silk-pi-42.vercel.app"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$API_URL/api/cron/sync-smartstore-orders")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

if [ "$HTTP_CODE" == "200" ]; then
  echo "[$TIMESTAMP] SUCCESS: $BODY"
else
  echo "[$TIMESTAMP] ERROR ($HTTP_CODE): $BODY"
fi
EOF

chmod +x /opt/numnaroad/sync.sh

# 5. Cron 설정 (5분마다)
echo "Setting up cron job..."
(crontab -l 2>/dev/null | grep -v numnaroad; echo "*/5 * * * * /opt/numnaroad/sync.sh >> /var/log/numnaroad-sync.log 2>&1") | crontab -

# 6. 로그 파일 생성
sudo touch /var/log/numnaroad-sync.log
sudo chown $USER:$USER /var/log/numnaroad-sync.log

# 7. 로그 로테이션 설정
sudo tee /etc/logrotate.d/numnaroad > /dev/null << 'EOF'
/var/log/numnaroad-sync.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
EOF

echo ""
echo "=== Setup Complete ==="
echo ""
echo "다음 단계:"
echo "1. Naver API Center에 이 VM의 IP 주소를 등록하세요"
echo "   현재 IP: $(curl -s ifconfig.me)"
echo ""
echo "2. 테스트 실행:"
echo "   /opt/numnaroad/sync.sh"
echo ""
echo "3. 로그 확인:"
echo "   tail -f /var/log/numnaroad-sync.log"
echo ""
echo "4. Cron 상태 확인:"
echo "   crontab -l"
