'use client';

import {
  Container,
  Typography,
  Box,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Breadcrumbs,
  Alert,
} from '@mui/material';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SimCardIcon from '@mui/icons-material/SimCard';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const COMPATIBLE_DEVICES = {
  apple: [
    'iPhone XS / XS Max / XR 이상',
    'iPad Pro (3세대 이상)',
    'iPad Air (3세대 이상)',
    'iPad (7세대 이상)',
    'iPad mini (5세대 이상)',
  ],
  samsung: [
    'Galaxy S20 시리즈 이상',
    'Galaxy Note 20 시리즈 이상',
    'Galaxy Z Fold / Z Flip 시리즈',
    'Galaxy A54 / A34 등 일부 A시리즈',
  ],
  google: ['Pixel 4 이상', 'Pixel Fold'],
  others: ['Motorola Razr 시리즈', 'OPPO Find 시리즈 일부', 'Xiaomi 일부 모델'],
};

const INSTALLATION_STEPS = [
  {
    title: '1단계: 결제 완료',
    desc: '상품 결제 완료 후 이메일로 QR 코드와 설치 안내를 받습니다.',
  },
  {
    title: '2단계: 설정 진입',
    desc: '휴대폰 설정 > 모바일 데이터 > eSIM 추가 (또는 셀룰러 플랜 추가)로 이동합니다.',
  },
  {
    title: '3단계: QR 코드 스캔',
    desc: '이메일로 받은 QR 코드를 스캔하거나, 수동 입력 코드를 입력합니다.',
  },
  {
    title: '4단계: 플랜 활성화',
    desc: '설치된 eSIM을 데이터 전용으로 설정하고, 여행지 도착 후 데이터 로밍을 켭니다.',
  },
];

const FAQS = [
  {
    q: 'eSIM 설치 후 바로 사용할 수 있나요?',
    a: '출국 전 미리 설치하시고, 여행지 도착 후 데이터 로밍을 켜면 즉시 사용 가능합니다. 일부 상품은 첫 데이터 사용 시점부터 유효기간이 시작됩니다.',
  },
  {
    q: '기존 유심과 함께 사용할 수 있나요?',
    a: '네, 대부분의 기기에서 물리 유심(전화/문자)과 eSIM(데이터)을 동시에 사용할 수 있습니다.',
  },
  {
    q: 'eSIM을 여러 기기에서 사용할 수 있나요?',
    a: '아니요, eSIM은 한 기기에만 설치할 수 있습니다. 설치 후 다른 기기로 이동이 불가능합니다.',
  },
  {
    q: '데이터를 다 쓰면 어떻게 되나요?',
    a: '데이터 소진 시 자동으로 연결이 종료됩니다. 추가 요금이 발생하지 않습니다.',
  },
  {
    q: '환불이 가능한가요?',
    a: 'QR 코드 발급 전까지는 전액 환불 가능합니다. 발급 후에는 미사용 상태여도 환불이 어렵습니다.',
  },
];

export default function GuidePage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ko';

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: 'calc(100vh - 64px)' }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <IconButton
            onClick={() => router.back()}
            sx={{
              bgcolor: 'grey.100',
              '&:hover': { bgcolor: 'grey.200' },
            }}
            size="small"
          >
            <ArrowBackIcon />
          </IconButton>
          <Breadcrumbs>
            <Link href={`/${locale}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              홈
            </Link>
            <Typography color="text.primary">이용 가이드</Typography>
          </Breadcrumbs>
        </Box>

        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
            eSIM 이용 가이드
          </Typography>
          <Typography variant="h6" color="text.secondary">
            NumnaRoad eSIM 설치부터 사용까지 안내해 드립니다
          </Typography>
        </Box>

        {/* What is eSIM */}
        <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: 'primary.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SimCardIcon sx={{ fontSize: 28, color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              eSIM이란?
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
            eSIM(embedded SIM)은 물리적 유심 카드 없이 디지털로 통신사 프로필을 다운로드하여 사용하는 기술입니다.
            기기에 내장된 칩에 직접 설치되어, 유심 교체 없이 간편하게 해외 데이터를 사용할 수 있습니다.
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label="물리 유심 불필요" size="small" color="primary" variant="outlined" />
            <Chip label="즉시 발급" size="small" color="primary" variant="outlined" />
            <Chip label="QR 스캔 설치" size="small" color="primary" variant="outlined" />
          </Box>
        </Paper>

        {/* Compatible Devices */}
        <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: 'success.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PhoneIphoneIcon sx={{ fontSize: 28, color: 'success.main' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              지원 기기
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            eSIM 지원 여부는 기기 모델과 구매 지역에 따라 다를 수 있습니다.
            설정 &gt; 셀룰러 &gt; eSIM 추가 메뉴가 있는지 확인해 주세요.
          </Alert>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Apple
              </Typography>
              <List dense disablePadding>
                {COMPATIBLE_DEVICES.apple.map((device, idx) => (
                  <ListItem key={idx} disablePadding sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <CheckCircleIcon fontSize="small" color="success" />
                    </ListItemIcon>
                    <ListItemText primary={device} />
                  </ListItem>
                ))}
              </List>
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Samsung
              </Typography>
              <List dense disablePadding>
                {COMPATIBLE_DEVICES.samsung.map((device, idx) => (
                  <ListItem key={idx} disablePadding sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <CheckCircleIcon fontSize="small" color="success" />
                    </ListItemIcon>
                    <ListItemText primary={device} />
                  </ListItem>
                ))}
              </List>
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Google Pixel
              </Typography>
              <List dense disablePadding>
                {COMPATIBLE_DEVICES.google.map((device, idx) => (
                  <ListItem key={idx} disablePadding sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <CheckCircleIcon fontSize="small" color="success" />
                    </ListItemIcon>
                    <ListItemText primary={device} />
                  </ListItem>
                ))}
              </List>
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                기타
              </Typography>
              <List dense disablePadding>
                {COMPATIBLE_DEVICES.others.map((device, idx) => (
                  <ListItem key={idx} disablePadding sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <CheckCircleIcon fontSize="small" color="success" />
                    </ListItemIcon>
                    <ListItemText primary={device} />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>
        </Paper>

        {/* Installation Steps */}
        <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: 'info.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <QrCodeScannerIcon sx={{ fontSize: 28, color: 'info.main' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              설치 방법
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {INSTALLATION_STEPS.map((step, idx) => (
              <Box
                key={idx}
                sx={{
                  p: 3,
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                  borderLeft: '4px solid',
                  borderColor: 'primary.main',
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.desc}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Important Notes */}
        <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: 'warning.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <WarningIcon sx={{ fontSize: 28, color: 'warning.main' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              주의사항
            </Typography>
          </Box>

          <List>
            <ListItem>
              <ListItemIcon>
                <SettingsIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="출국 전 미리 설치"
                secondary="Wi-Fi 환경에서 설치 가능합니다. 여행지에서 설치하려면 별도의 인터넷이 필요합니다."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SettingsIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="데이터 로밍 설정"
                secondary="eSIM 설치 후 '데이터 로밍' 옵션을 켜야 해외에서 사용할 수 있습니다."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SettingsIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="1회 설치 제한"
                secondary="QR 코드는 1회만 사용 가능합니다. 기기 변경 시 재설치가 불가능합니다."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SettingsIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="유효기간 확인"
                secondary="상품별로 유효기간 시작 시점이 다릅니다. (설치 즉시 / 첫 데이터 사용 시)"
              />
            </ListItem>
          </List>
        </Paper>

        {/* FAQ */}
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: 'secondary.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HelpOutlineIcon sx={{ fontSize: 28, color: 'secondary.main' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              자주 묻는 질문
            </Typography>
          </Box>

          {FAQS.map((faq, idx) => (
            <Accordion key={idx} disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 500 }}>{faq.q}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography color="text.secondary">{faq.a}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>
      </Container>
    </Box>
  );
}
