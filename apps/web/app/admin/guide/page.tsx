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
import { useAdminLanguage } from '@/lib/i18n';

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
function CircuitBreakerBadge({ state, labels }: {
  state: 'CLOSED' | 'HALF_OPEN' | 'OPEN';
  labels: { closed: string; halfOpen: string; open: string };
}) {
  const config = {
    CLOSED: { color: 'success' as const, label: labels.closed, icon: '🟢' },
    HALF_OPEN: { color: 'warning' as const, label: labels.halfOpen, icon: '🟡' },
    OPEN: { color: 'error' as const, label: labels.open, icon: '🔴' },
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
  const { t, locale } = useAdminLanguage();

  const circuitBreakerLabels = {
    closed: t.guide.closedState,
    halfOpen: t.guide.halfOpenState,
    open: t.guide.openState,
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} mb={1}>
        {locale === 'ko' ? '관리자 가이드' : 'Admin Guide'}
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        {t.guide.subtitle}
      </Typography>

      {/* 1. Getting Started */}
      <GuideSection
        title={`1. ${t.guide.gettingStarted}`}
        icon={<RocketLaunchIcon color="primary" />}
        defaultExpanded={true}
      >
        <Typography variant="body1" paragraph>
          {t.guide.welcome}
        </Typography>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {t.guide.login}
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary={locale === 'ko' ? '관리자 계정으로 /admin/login 에서 로그인' : 'Login at /admin/login with admin account'}
              secondary={t.guide.loginDesc}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t.guide.sessionInfo}
              secondary={locale === 'ko' ? '로그인 상태는 브라우저 종료 전까지 유지됩니다' : 'Login state persists until browser is closed'}
            />
          </ListItem>
        </List>

        <Alert severity="info" sx={{ mt: 2 }}>
          {t.guide.adminAccountInfo}
        </Alert>
      </GuideSection>

      {/* 2. Dashboard */}
      <GuideSection title={`2. ${t.guide.dashboard}`} icon={<DashboardIcon color="primary" />}>
        <Typography variant="body1" paragraph>
          {t.guide.dashboardDesc}
        </Typography>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {t.guide.statsCards}
        </Typography>
        <TableContainer component={Card} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t.guide.card}</TableCell>
                <TableCell>{t.guide.cardDesc}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Today Orders</TableCell>
                <TableCell>{t.guide.todayOrdersDesc}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Today Revenue</TableCell>
                <TableCell>{t.guide.todayRevenueDesc}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Pending</TableCell>
                <TableCell>{t.guide.pendingDesc}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Failed</TableCell>
                <TableCell>{t.guide.failedDesc}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {t.guide.providerStatus}
        </Typography>
        <Typography variant="body2" paragraph>
          {t.guide.providerStatusDesc}
        </Typography>
      </GuideSection>

      {/* 3. Orders Management */}
      <GuideSection title={`3. ${t.guide.ordersManagement}`} icon={<ShoppingCartIcon color="primary" />}>
        <Typography variant="body1" paragraph>
          {t.guide.ordersManagementDesc}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Search */}
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <SearchIcon color="action" />
          <Typography variant="subtitle1" fontWeight={600}>
            {t.guide.search}
          </Typography>
        </Box>
        <Typography variant="body2" paragraph>
          {t.guide.searchDesc}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Filtering */}
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <FilterListIcon color="action" />
          <Typography variant="subtitle1" fontWeight={600}>
            {t.guide.filtering}
          </Typography>
        </Box>
        <List dense>
          <ListItem>
            <ListItemIcon><CheckCircleIcon color="success" fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={`Status (${t.common.status})`}
              secondary={t.guide.statusFilter}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><StorefrontIcon color="action" fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={`Channel (${locale === 'ko' ? '채널' : 'Channel'})`}
              secondary={t.guide.channelFilter}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><VisibilityIcon color="action" fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={`Date Range (${locale === 'ko' ? '날짜' : 'Date'})`}
              secondary={t.guide.dateRange}
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Bulk Retry */}
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <ReplayIcon color="warning" />
          <Typography variant="subtitle1" fontWeight={600}>
            {t.guide.bulkRetry}
          </Typography>
        </Box>
        <Typography variant="body2" paragraph>
          {t.guide.bulkRetryDesc}
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary={t.guide.bulkRetryStep1}
              secondary={t.guide.bulkRetryStep1Desc}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t.guide.bulkRetryStep2}
              secondary={t.guide.bulkRetryStep2Desc}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t.guide.bulkRetryStep3}
              secondary={t.guide.bulkRetryStep3Desc}
            />
          </ListItem>
        </List>

        <Alert severity="warning" sx={{ mt: 2 }}>
          {t.guide.retryableStates}
        </Alert>

        <Divider sx={{ my: 2 }} />

        {/* Order Detail */}
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {t.guide.orderDetail}
        </Typography>
        <Typography variant="body2">
          {t.guide.orderDetailDesc}
        </Typography>
      </GuideSection>

      {/* 4. Products */}
      <GuideSection title={`4. ${t.guide.productsManagement}`} icon={<InventoryIcon color="primary" />}>
        <Typography variant="body1" paragraph>
          {t.guide.productsManagementDesc}
        </Typography>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {t.guide.productInfo}
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary={t.guide.productNameCountry}
              secondary={t.guide.productNameCountryDesc}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t.guide.providerSku}
              secondary={t.guide.providerSkuDesc}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t.guide.price}
              secondary={t.guide.priceDesc}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t.common.status}
              secondary={t.guide.statusDesc}
            />
          </ListItem>
        </List>
      </GuideSection>

      {/* 5. Provider Health */}
      <GuideSection title={`5. ${t.guide.providerHealth}`} icon={<CloudIcon color="primary" />}>
        <Typography variant="body1" paragraph>
          {t.guide.providerHealthDesc}
        </Typography>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {t.guide.circuitBreakerStatus}
        </Typography>
        <Typography variant="body2" paragraph>
          {t.guide.circuitBreakerDesc}
        </Typography>

        <Box display="flex" flexDirection="column" gap={1} mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <CircuitBreakerBadge state="CLOSED" labels={circuitBreakerLabels} />
            <Typography variant="body2">{t.guide.closedStateDesc}</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <CircuitBreakerBadge state="HALF_OPEN" labels={circuitBreakerLabels} />
            <Typography variant="body2">
              {t.guide.halfOpenStateDesc}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <CircuitBreakerBadge state="OPEN" labels={circuitBreakerLabels} />
            <Typography variant="body2">
              {t.guide.openStateDesc}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {t.guide.manualReset}
        </Typography>
        <Typography variant="body2" paragraph>
          {t.guide.manualResetDesc}
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary={t.guide.resetButton}
              secondary={t.guide.resetButtonDesc}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t.guide.confirmDialog}
              secondary={t.guide.confirmDialogDesc}
            />
          </ListItem>
        </List>

        <Alert severity="info" sx={{ mt: 2 }}>
          {t.guide.resetWarning}
        </Alert>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {t.guide.errorMonitoring}
        </Typography>
        <Typography variant="body2">
          {t.guide.errorMonitoringDesc}
        </Typography>
      </GuideSection>

      {/* 6. Notifications */}
      <GuideSection title={`6. ${t.guide.notifications}`} icon={<NotificationsIcon color="primary" />}>
        <Typography variant="body1" paragraph>
          {t.guide.notificationsDesc}
        </Typography>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {t.guide.emailNotification}
        </Typography>
        <Typography variant="body2" paragraph>
          {t.guide.emailNotificationDesc}
        </Typography>
        <Card variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
          <Typography variant="body2" fontFamily="monospace">
            RESEND_API_KEY=re_xxxxxxxxxx
          </Typography>
        </Card>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {t.guide.kakaoAlimtalk}
        </Typography>
        <Typography variant="body2" paragraph>
          {t.guide.kakaoAlimtalkDesc}
        </Typography>

        <Alert severity="warning" sx={{ mb: 2 }}>
          {t.guide.kakaoWarning}
        </Alert>

        <List dense>
          <ListItem>
            <ListItemText
              primary={t.guide.kakaoStep1}
              secondary={t.guide.kakaoStep1Desc}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t.guide.kakaoStep2}
              secondary={t.guide.kakaoStep2Desc}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t.guide.kakaoStep3}
              secondary={t.guide.kakaoStep3Desc}
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
      <GuideSection title={`7. ${t.guide.smartStore}`} icon={<StorefrontIcon color="primary" />}>
        <Typography variant="body1" paragraph>
          {t.guide.smartStoreDesc}
        </Typography>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {t.guide.integrationMethod}
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary={t.guide.orderCollection}
              secondary={t.guide.orderCollectionDesc}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t.guide.autoProcess}
              secondary={t.guide.autoProcessDesc}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t.guide.statusSync}
              secondary={t.guide.statusSyncDesc}
            />
          </ListItem>
        </List>
      </GuideSection>

      {/* 8. Troubleshooting */}
      <GuideSection title={`8. ${t.guide.troubleshooting}`} icon={<BuildIcon color="primary" />}>
        <Typography variant="body1" paragraph>
          {t.guide.troubleshootingDesc}
        </Typography>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {t.guide.orderFailed}
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon><ErrorIcon color="error" fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={t.guide.checkProviderStatus}
              secondary={t.guide.checkProviderStatusDesc}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><ErrorIcon color="error" fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={t.guide.checkErrorLog}
              secondary={t.guide.checkErrorLogDesc}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><ReplayIcon color="warning" fontSize="small" /></ListItemIcon>
            <ListItemText
              primary={t.guide.retryOrder}
              secondary={t.guide.retryOrderDesc}
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {t.guide.providerFailure}
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary={t.guide.providerFailureStep1}
              secondary={t.guide.providerFailureStep1Desc}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t.guide.providerFailureStep2}
              secondary={t.guide.providerFailureStep2Desc}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t.guide.providerFailureStep3}
              secondary={t.guide.providerFailureStep3Desc}
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {t.guide.refundProcess}
        </Typography>
        <Typography variant="body2" paragraph>
          {t.guide.refundProcessDesc}
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary={t.guide.stripeRefund}
              secondary={t.guide.stripeRefundDesc}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t.guide.smartStoreRefund}
              secondary={t.guide.smartStoreRefundDesc}
            />
          </ListItem>
        </List>

        <Alert severity="error" sx={{ mt: 2 }}>
          {t.guide.refundWarning}
        </Alert>
      </GuideSection>

      {/* Footer */}
      <Card sx={{ mt: 3, bgcolor: 'primary.50' }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {t.guide.footer}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
