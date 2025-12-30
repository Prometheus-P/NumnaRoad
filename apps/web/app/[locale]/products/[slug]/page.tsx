'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Chip,
  Divider,
  Skeleton,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Breadcrumbs,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SimCardIcon from '@mui/icons-material/SimCard';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import SecurityIcon from '@mui/icons-material/Security';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

interface Product {
  id: string;
  name: string;
  slug: string;
  country: string;
  country_name: string;
  data_limit: string;
  duration: number;
  speed: string;
  retail_price: number;
  wholesale_price: number;
  is_featured: boolean;
  features: string[];
  description?: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(price);
}

const BENEFITS = [
  { icon: <FlashOnIcon />, title: '즉시 발급', desc: '결제 완료 후 10초 내 eSIM 발급' },
  { icon: <PhoneIphoneIcon />, title: 'QR 스캔 설치', desc: '간편한 QR코드 스캔으로 설치' },
  { icon: <SecurityIcon />, title: '안전한 결제', desc: 'Stripe 보안 결제 시스템' },
  { icon: <SupportAgentIcon />, title: '24/7 지원', desc: '언제든지 고객 지원 가능' },
];

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const locale = (params?.locale as string) || 'ko';

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/products/${slug}`);
        const data = await res.json();

        if (data.success) {
          setProduct(data.data);
        } else {
          setError('상품을 찾을 수 없습니다.');
        }
      } catch {
        setError('네트워크 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  const handlePurchase = async () => {
    if (!product) return;

    setPurchasing(true);
    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      });

      const data = await res.json();

      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setError('결제 세션 생성에 실패했습니다.');
      }
    } catch {
      setError('결제 요청 중 오류가 발생했습니다.');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ bgcolor: 'grey.50', minHeight: 'calc(100vh - 64px)', py: 4 }}>
        <Container maxWidth="lg">
          <Skeleton variant="text" width={200} height={24} sx={{ mb: 3 }} />
          <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
            </Box>
            <Box sx={{ width: { xs: '100%', md: 400 } }}>
              <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />
            </Box>
          </Box>
        </Container>
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Box sx={{ bgcolor: 'grey.50', minHeight: 'calc(100vh - 64px)', py: 4 }}>
        <Container maxWidth="lg">
          <Alert severity="error" sx={{ mb: 4 }}>
            {error || '상품을 찾을 수 없습니다.'}
          </Alert>
          <Button
            component={Link}
            href={`/${locale}/products`}
            startIcon={<ArrowBackIcon />}
            variant="outlined"
          >
            상품 목록으로
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: 'calc(100vh - 64px)' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
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
            <Link href={`/${locale}/products`} style={{ color: 'inherit', textDecoration: 'none' }}>
              상품
            </Link>
            <Typography color="text.primary">{product.country_name}</Typography>
          </Breadcrumbs>
        </Box>

        <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Product Info */}
          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 2,
                    bgcolor: 'primary.50',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SimCardIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                    {product.country_name} eSIM
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {product.name}
                  </Typography>
                </Box>
                {product.is_featured && (
                  <Chip label="인기 상품" color="primary" sx={{ ml: 'auto' }} />
                )}
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Specs */}
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                상품 정보
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                <Chip
                  icon={<DataUsageIcon />}
                  label={`데이터: ${product.data_limit}`}
                  sx={{ bgcolor: 'primary.50', color: 'primary.main', fontWeight: 600, py: 2.5, px: 1 }}
                />
                <Chip
                  icon={<AccessTimeIcon />}
                  label={`유효기간: ${product.duration}일`}
                  sx={{ bgcolor: 'grey.100', py: 2.5, px: 1 }}
                />
                {product.speed && (
                  <Chip
                    icon={<SignalCellularAltIcon />}
                    label={`속도: ${product.speed}`}
                    color={product.speed === '5G' ? 'success' : 'default'}
                    sx={{ py: 2.5, px: 1 }}
                  />
                )}
              </Box>

              {/* Features */}
              {product.features && product.features.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    주요 특징
                  </Typography>
                  <List disablePadding>
                    {product.features.map((feature, idx) => (
                      <ListItem key={idx} disablePadding sx={{ mb: 1 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Paper>

            {/* Benefits */}
            <Paper sx={{ p: 4, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                NumnaRoad eSIM 장점
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {BENEFITS.map((benefit, idx) => (
                  <Card key={idx} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: 'primary.50',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'primary.main',
                        }}
                      >
                        {benefit.icon}
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {benefit.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {benefit.desc}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Paper>
          </Box>

          {/* Purchase Card */}
          <Box sx={{ width: { xs: '100%', md: 380 } }}>
            <Paper
              sx={{
                p: 4,
                borderRadius: 3,
                position: { md: 'sticky' },
                top: { md: 80 },
                border: '2px solid',
                borderColor: 'primary.main',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                주문 요약
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">상품</Typography>
                <Typography>{product.country_name} eSIM</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">데이터</Typography>
                <Typography>{product.data_limit}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">유효기간</Typography>
                <Typography>{product.duration}일</Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  총 결제금액
                </Typography>
                <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
                  {formatPrice(product.retail_price)}
                </Typography>
              </Box>

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handlePurchase}
                disabled={purchasing}
                startIcon={<ShoppingCartIcon />}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: '1.1rem',
                }}
              >
                {purchasing ? '처리 중...' : '구매하기'}
              </Button>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                결제 완료 후 이메일로 eSIM이 발송됩니다
              </Typography>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
