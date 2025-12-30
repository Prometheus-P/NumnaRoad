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
  IconButton,
  Breadcrumbs,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EmailIcon from '@mui/icons-material/Email';
import ChatIcon from '@mui/icons-material/Chat';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PhoneIcon from '@mui/icons-material/Phone';

const CONTACT_METHODS = [
  {
    icon: <EmailIcon sx={{ fontSize: 32 }} />,
    title: '이메일 문의',
    desc: 'support@numnaroad.com',
    action: 'mailto:support@numnaroad.com',
    buttonText: '이메일 보내기',
    color: 'primary.main',
    bgColor: 'primary.50',
  },
  {
    icon: <ChatIcon sx={{ fontSize: 32 }} />,
    title: '카카오톡 채널',
    desc: '@NumnaRoad',
    action: 'https://pf.kakao.com/_NumnaRoad',
    buttonText: '채널 추가하기',
    color: 'warning.main',
    bgColor: 'warning.50',
  },
];

const SUPPORT_FAQS = [
  {
    q: 'QR 코드를 받지 못했어요',
    a: '결제 완료 후 10분 이내에 이메일로 발송됩니다. 스팸/프로모션 폴더도 확인해 주세요. 30분 이상 지연 시 고객센터로 문의해 주세요.',
  },
  {
    q: 'eSIM 설치가 안 돼요',
    a: '기기의 eSIM 지원 여부를 확인해 주세요. Wi-Fi에 연결된 상태에서 설치해야 합니다. 통신사 잠금(락)이 걸린 기기는 설치가 안 될 수 있습니다.',
  },
  {
    q: '해외에서 데이터가 연결되지 않아요',
    a: '설정에서 데이터 로밍이 켜져 있는지 확인해 주세요. eSIM이 기본 데이터로 설정되어 있어야 합니다. 기기를 재시작해 보세요.',
  },
  {
    q: '데이터 잔량을 확인하고 싶어요',
    a: '이메일로 받은 안내에 포함된 링크에서 데이터 사용량을 확인할 수 있습니다. 일부 상품은 확인이 제한될 수 있습니다.',
  },
  {
    q: '주문을 취소하고 싶어요',
    a: 'QR 코드 발급 전까지는 전액 환불 가능합니다. 이메일로 주문번호와 함께 취소 요청해 주세요.',
  },
  {
    q: '영수증/세금계산서가 필요해요',
    a: '결제 완료 시 이메일로 영수증이 발송됩니다. 세금계산서가 필요하신 경우 이메일로 사업자등록증과 함께 요청해 주세요.',
  },
];

export default function SupportPage() {
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
            <Typography color="text.primary">고객센터</Typography>
          </Breadcrumbs>
        </Box>

        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
            고객센터
          </Typography>
          <Typography variant="h6" color="text.secondary">
            궁금한 점이 있으시면 언제든지 문의해 주세요
          </Typography>
        </Box>

        {/* Contact Methods */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, mb: 4 }}>
          {CONTACT_METHODS.map((method, idx) => (
            <Card key={idx} sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    bgcolor: method.bgColor,
                    color: method.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  {method.icon}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {method.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {method.desc}
                </Typography>
                <Button
                  variant="outlined"
                  href={method.action}
                  target={method.action.startsWith('http') ? '_blank' : undefined}
                  sx={{ borderRadius: 2 }}
                >
                  {method.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Operating Hours */}
        <Paper sx={{ p: 4, borderRadius: 3, mb: 4 }}>
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
              <AccessTimeIcon sx={{ fontSize: 28, color: 'info.main' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              운영 시간
            </Typography>
          </Box>

          <List>
            <ListItem>
              <ListItemIcon>
                <SupportAgentIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="이메일 응답"
                secondary="평일 09:00 - 18:00 (주말/공휴일 휴무)"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ChatIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="카카오톡 상담"
                secondary="평일 09:00 - 18:00 (자동 응답은 24시간)"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <PhoneIcon color="action" />
              </ListItemIcon>
              <ListItemText
                primary="긴급 문의"
                secondary="여행 중 긴급한 문제는 카카오톡으로 문의해 주세요"
              />
            </ListItem>
          </List>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, pl: 2 }}>
            * 응답은 순차적으로 처리되며, 영업일 기준 24시간 이내 답변드립니다.
          </Typography>
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

          {SUPPORT_FAQS.map((faq, idx) => (
            <Accordion key={idx} disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 500 }}>{faq.q}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography color="text.secondary">{faq.a}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              원하는 답변을 찾지 못하셨나요?
            </Typography>
            <Button variant="contained" href="mailto:support@numnaroad.com" sx={{ borderRadius: 2 }}>
              직접 문의하기
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
