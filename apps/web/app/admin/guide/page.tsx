'use client';

import React from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InventoryIcon from '@mui/icons-material/Inventory';
import CloudIcon from '@mui/icons-material/Cloud';
import NotificationsIcon from '@mui/icons-material/Notifications';
import BuildIcon from '@mui/icons-material/Build';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ReplayIcon from '@mui/icons-material/Replay';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

// Section component for consistent styling
function GuideSection({
  title,
  icon,
  children,
  defaultExpanded = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  return (
    <Accordion defaultExpanded={defaultExpanded}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box display="flex" alignItems="center" gap={1}>
          {icon}
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}

// Circuit Breaker state badge
function CircuitBreakerBadge({ state }: { state: 'CLOSED' | 'HALF_OPEN' | 'OPEN' }) {
  const config = {
    CLOSED: { color: 'success' as const, label: 'CLOSED (정상)', icon: '🟢' },
    HALF_OPEN: { color: 'warning' as const, label: 'HALF_OPEN (테스트)', icon: '🟡' },
    OPEN: { color: 'error' as const, label: 'OPEN (차단)', icon: '🔴' },
  };
  const c = config[state];
  return (
    <Chip
      label={`${c.icon} ${c.label}`}
      color={c.color}
      size="small"
      sx={{ fontWeight: 600 }}
    />
  );
}

export default function AdminGuidePage() {
  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={1}>
        관리자 가이드
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        NumnaRoad 어드민 패널 사용 설명서입니다. 각 섹션을 클릭하여 자세한 내용을 확인하세요.
      </Typography>

      {/* 1. Getting Started */}
      <GuideSection
        title="1. 시작하기"
        icon={<RocketLaunchIcon color="primary" />}
        defaultExpanded={true}
      >
        <Typography variant="body1" paragraph>
          NumnaRoad 관리자 패널에 오신 것을 환영합니다. 이 가이드는 주요 기능 사용법을 안내합니다.
        </Typography>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          로그인
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="관리자 계정으로 /admin/login 에서 로그인"
              secondary="이메일과 비밀번호를 입력하세요"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="세션 유지"
              secondary="로그인 상태는 브라우저 종료 전까지 유지됩니다"
            />
          </ListItem>
        </List>

        <Alert severity="info" sx={{ mt: 2 }}>
          관리자 계정은 PocketBase 관리자 패널에서 생성할 수 있습니다.
        </Alert>
      </GuideSection>

      {/* 2. Dashboard */}
      <GuideSection title="2. 대시보드" icon={<DashboardIcon color="primary" />}>
        <Typography variant="body1" paragraph>
          대시보드에서는 오늘의 주요 지표와 시스템 상태를 한눈에 확인할 수 있습니다.
        </Typography>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          통계 카드
        </Typography>
        <TableContainer component={Card} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>카드</TableCell>
                <TableCell>설명</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Today Orders</TableCell>
                <TableCell>오늘 접수된 주문 수 (전일 대비 변화율 표시)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Today Revenue</TableCell>
                <TableCell>오늘 매출 총액 (원화)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Pending</TableCell>
                <TableCell>처리 대기 중인 주문 수</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Failed</TableCell>
                <TableCell>실패한 주문 수 (빨간색 Alert 표시됨)</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Provider 상태
        </Typography>
        <Typography variant="body2" paragraph>
          우측에 각 Provider의 Circuit Breaker 상태와 성공률이 표시됩니다.
          문제가 있는 Provider는 빨간색으로 표시됩니다.
        </Typography>
      </GuideSection>

      {/* 3. Orders Management */}
      <GuideSection title="3. 주문 관리" icon={<ShoppingCartIcon color="primary" />}>
        <Typography variant="body1" paragraph>
          주문 목록 조회, 검색, 필터링, 벌크 재시도 등의 기능을 제공합니다.
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* 검색 */}
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <SearchIcon color="action" />
          <Typography variant="subtitle1" fontWeight={600}>
            검색
          </Typography>
        </Box>
        <Typography variant="body2" paragraph>
          검색창에 주문 ID 또는 고객 이메일을 입력하면 실시간으로 결과가 필터링됩니다.
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* 필터링 */}
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <FilterListIcon color="action" />
          <Typography variant="subtitle1" fontWeight={600}>
            필터링
          </Typography>
        </Box>
        <List dense>
          <ListItem>
            <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
            <ListItemText
              primary="Status (상태)"
              secondary="Pending, Completed, Failed 등으로 필터"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><StorefrontIcon color="action" fontSize="small" /></ListItemIcon>
            <ListItemText
              primary="Channel (채널)"
              secondary="Stripe, SmartStore, TossPay 등 판매 채널별 필터"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><VisibilityIcon color="action" fontSize="small" /></ListItemIcon>
            <ListItemText
              primary="Date Range (날짜)"
              secondary="From/To 날짜 범위 지정"
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        {/* 벌크 재시도 */}
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <ReplayIcon color="warning" />
          <Typography variant="subtitle1" fontWeight={600}>
            벌크 재시도 (Bulk Retry)
          </Typography>
        </Box>
        <Typography variant="body2" paragraph>
          실패한 주문을 일괄 재시도할 수 있습니다.
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="1. 체크박스로 재시도할 주문 선택"
              secondary="Failed, Provider Failed 상태의 주문만 재시도 가능"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="2. 'Retry Selected' 버튼 클릭"
              secondary="선택된 주문 수가 버튼에 표시됩니다"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="3. 결과 확인"
              secondary="성공/스킵/실패 건수가 알림으로 표시됩니다"
            />
          </ListItem>
        </List>

        <Alert severity="warning" sx={{ mt: 2 }}>
          재시도 가능한 상태: failed, provider_failed, pending_manual_fulfillment,
          fulfillment_started, payment_received
        </Alert>

        <Divider sx={{ my: 2 }} />

        {/* 주문 상세 */}
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          주문 상세 보기
        </Typography>
        <Typography variant="body2">
          주문 행을 클릭하면 상세 페이지로 이동합니다. 여기서 eSIM QR코드, 설치 정보,
          처리 이력을 확인할 수 있습니다.
        </Typography>
      </GuideSection>

      {/* 4. Products */}
      <GuideSection title="4. 상품 관리" icon={<InventoryIcon color="primary" />}>
        <Typography variant="body1" paragraph>
          판매 중인 eSIM 상품 목록을 관리합니다.
        </Typography>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          상품 정보
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="상품명, 국가, 데이터 용량"
              secondary="각 eSIM 상품의 기본 정보"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Provider SKU"
              secondary="각 Provider(RedteaGO, eSIMCard 등)의 상품 코드"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="가격"
              secondary="판매가 (KRW)"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="상태"
              secondary="Active/Inactive로 판매 여부 관리"
            />
          </ListItem>
        </List>
      </GuideSection>

      {/* 5. Provider Health */}
      <GuideSection title="5. 프로바이더 헬스" icon={<CloudIcon color="primary" />}>
        <Typography variant="body1" paragraph>
          eSIM 공급자(Provider)의 상태와 성공률을 모니터링합니다.
        </Typography>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Circuit Breaker 상태
        </Typography>
        <Typography variant="body2" paragraph>
          각 Provider는 Circuit Breaker 패턴으로 관리됩니다. 연속 실패 시 자동으로 차단되어
          다른 Provider로 failover됩니다.
        </Typography>

        <Box display="flex" flexDirection="column" gap={1} mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <CircuitBreakerBadge state="CLOSED" />
            <Typography variant="body2">정상 운영 중. 모든 요청 처리 가능.</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <CircuitBreakerBadge state="HALF_OPEN" />
            <Typography variant="body2">
              테스트 모드. 일부 요청만 허용하여 복구 여부 확인 중.
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <CircuitBreakerBadge state="OPEN" />
            <Typography variant="body2">
              차단됨. 모든 요청이 다른 Provider로 failover됩니다.
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          수동 리셋
        </Typography>
        <Typography variant="body2" paragraph>
          OPEN 상태의 Provider는 수동으로 리셋할 수 있습니다.
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="리셋 버튼 클릭"
              secondary="Provider 카드의 리셋 아이콘 클릭"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="확인 다이얼로그"
              secondary="리셋 확인 후 CLOSED 상태로 복구"
            />
          </ListItem>
        </List>

        <Alert severity="info" sx={{ mt: 2 }}>
          리셋 후에도 문제가 지속되면 해당 Provider의 API 상태를 직접 확인하세요.
        </Alert>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          에러 모니터링
        </Typography>
        <Typography variant="body2">
          &quot;Recent Errors&quot; 탭에서 최근 24시간 내 발생한 에러를 확인할 수 있습니다.
          에러 메시지, 발생 횟수, 마지막 발생 시간이 표시됩니다.
        </Typography>
      </GuideSection>

      {/* 6. Notifications */}
      <GuideSection title="6. 알림 설정" icon={<NotificationsIcon color="primary" />}>
        <Typography variant="body1" paragraph>
          주문 완료 시 고객에게 자동으로 알림이 발송됩니다.
        </Typography>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          이메일 알림 (Resend)
        </Typography>
        <Typography variant="body2" paragraph>
          eSIM 구매 완료 시 QR코드와 설치 가이드가 포함된 이메일이 자동 발송됩니다.
        </Typography>
        <Card variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
          <Typography variant="body2" fontFamily="monospace">
            RESEND_API_KEY=re_xxxxxxxxxx
          </Typography>
        </Card>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          카카오 알림톡 (SOLAPI)
        </Typography>
        <Typography variant="body2" paragraph>
          고객이 한국 전화번호를 입력한 경우, 카카오 알림톡으로 알림이 발송됩니다.
        </Typography>

        <Alert severity="warning" sx={{ mb: 2 }}>
          카카오 알림톡 사용을 위해서는 다음 설정이 필요합니다:
        </Alert>

        <List dense>
          <ListItem>
            <ListItemText
              primary="1. 카카오 비즈니스 채널 등록"
              secondary="kakao.com/business에서 채널 생성 및 PF ID 발급"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="2. SOLAPI 계정 설정"
              secondary="solapi.com에서 API Key/Secret 발급"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="3. 알림톡 템플릿 승인"
              secondary="카카오 검수 후 템플릿 ID 발급 (1-3일 소요)"
            />
          </ListItem>
        </List>

        <Card variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
          <Typography variant="body2" fontFamily="monospace" whiteSpace="pre-line">
            {`KAKAO_ALIMTALK_ENABLED=true
SOLAPI_API_KEY=your_api_key
SOLAPI_API_SECRET=your_api_secret
KAKAO_CHANNEL_PF_ID=@your_channel
KAKAO_ALIMTALK_SENDER_KEY=sender_key
KAKAO_ESIM_DELIVERY_TEMPLATE_ID=template_id`}
          </Typography>
        </Card>
      </GuideSection>

      {/* 7. SmartStore */}
      <GuideSection title="7. 스마트스토어 연동" icon={<StorefrontIcon color="primary" />}>
        <Typography variant="body1" paragraph>
          네이버 스마트스토어 주문을 자동으로 처리합니다.
        </Typography>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          연동 방식
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="주문 수집"
              secondary="스마트스토어 API로 신규 주문 자동 수집"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="자동 처리"
              secondary="결제 확인된 주문은 자동으로 eSIM 발급 및 발송"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="상태 동기화"
              secondary="처리 결과가 스마트스토어에 자동 반영"
            />
          </ListItem>
        </List>
      </GuideSection>

      {/* 8. Troubleshooting */}
      <GuideSection title="8. 문제 해결" icon={<BuildIcon color="primary" />}>
        <Typography variant="body1" paragraph>
          자주 발생하는 문제와 해결 방법입니다.
        </Typography>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          주문 실패 시
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon><ErrorIcon color="error" fontSize="small" /></ListItemIcon>
            <ListItemText
              primary="Provider 상태 확인"
              secondary="Providers 페이지에서 Circuit Breaker 상태 확인"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><ErrorIcon color="error" fontSize="small" /></ListItemIcon>
            <ListItemText
              primary="에러 로그 확인"
              secondary="Recent Errors 탭에서 구체적인 에러 메시지 확인"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><ReplayIcon color="warning" fontSize="small" /></ListItemIcon>
            <ListItemText
              primary="재시도"
              secondary="일시적 오류인 경우 주문 재시도로 해결 가능"
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Provider 장애 대응
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="1. Circuit Breaker 자동 차단 확인"
              secondary="OPEN 상태면 자동으로 다른 Provider로 failover됨"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="2. Provider API 직접 확인"
              secondary="각 Provider 관리자 페이지에서 상태 확인"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="3. 수동 리셋"
              secondary="문제 해결 후 Circuit Breaker 수동 리셋"
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          환불 처리
        </Typography>
        <Typography variant="body2" paragraph>
          자동 처리가 불가능한 경우 수동 환불이 필요합니다.
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="Stripe 환불"
              secondary="Stripe Dashboard에서 직접 환불 처리"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="스마트스토어 환불"
              secondary="스마트스토어 판매자센터에서 환불 처리"
            />
          </ListItem>
        </List>

        <Alert severity="error" sx={{ mt: 2 }}>
          환불 처리 후 반드시 주문 상태를 &apos;refunded&apos;로 변경하세요.
        </Alert>
      </GuideSection>

      {/* Footer */}
      <Card sx={{ mt: 3, bgcolor: 'primary.50' }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            추가 문의사항은 개발팀에 연락하세요.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
