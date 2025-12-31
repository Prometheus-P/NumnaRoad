'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Box,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Alert,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PublicIcon from '@mui/icons-material/Public';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAnnounce } from '@/lib/accessibility';

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
}

interface ProductsResponse {
  success: boolean;
  data: Product[];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
}

// Region categories
const REGIONS = [
  { id: 'all', label: '전체', icon: <PublicIcon /> },
  { id: 'asia', label: '아시아', countries: ['JP', 'CN', 'TH', 'VN', 'SG', 'TW', 'HK', 'PH', 'MY', 'ID'] },
  { id: 'europe', label: '유럽', countries: ['EU', 'GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'CH'] },
  { id: 'americas', label: '미주', countries: ['US', 'CA', 'MX', 'BR'] },
  { id: 'oceania', label: '오세아니아', countries: ['AU', 'NZ'] },
];

// Popular countries for quick filter
const POPULAR_COUNTRIES = [
  { code: 'JP', label: '일본', flag: '🇯🇵' },
  { code: 'US', label: '미국', flag: '🇺🇸' },
  { code: 'CN', label: '중국', flag: '🇨🇳' },
  { code: 'TH', label: '태국', flag: '🇹🇭' },
  { code: 'VN', label: '베트남', flag: '🇻🇳' },
  { code: 'TW', label: '대만', flag: '🇹🇼' },
  { code: 'SG', label: '싱가포르', flag: '🇸🇬' },
  { code: 'EU', label: '유럽', flag: '🇪🇺' },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(price);
}

function ProductCard({ product, locale }: { product: Product; locale: string }) {
  const cardId = useId();
  const titleId = `${cardId}-title`;
  const descId = `${cardId}-desc`;

  return (
    <Card
      component="article"
      role="article"
      aria-labelledby={titleId}
      aria-describedby={descId}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        transition: 'all 0.2s ease-in-out',
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
          borderColor: 'primary.main',
        },
        // Respect reduced motion preference
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': {
            transform: 'none',
          },
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography id={titleId} variant="h6" component="h2" sx={{ fontWeight: 700 }}>
              {product.country_name}
            </Typography>
            <Typography id={descId} variant="body2" color="text.secondary">
              {product.name}
            </Typography>
          </Box>
          {product.is_featured && (
            <Chip
              icon={<TrendingUpIcon sx={{ fontSize: 16 }} aria-hidden="true" />}
              label="인기"
              color="primary"
              size="small"
              sx={{ fontWeight: 600 }}
              aria-label="인기 상품"
            />
          )}
        </Box>

        <Box
          sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}
          role="group"
          aria-label="상품 정보"
        >
          <Chip
            icon={<DataUsageIcon sx={{ fontSize: 16 }} aria-hidden="true" />}
            label={product.data_limit}
            size="small"
            sx={{ bgcolor: 'primary.50', color: 'primary.main', fontWeight: 500 }}
            aria-label={`데이터: ${product.data_limit}`}
          />
          <Chip
            icon={<AccessTimeIcon sx={{ fontSize: 16 }} aria-hidden="true" />}
            label={`${product.duration}일`}
            size="small"
            sx={{ bgcolor: 'grey.100' }}
            aria-label={`사용 기간: ${product.duration}일`}
          />
          {product.speed && (
            <Chip
              icon={<SignalCellularAltIcon sx={{ fontSize: 16 }} aria-hidden="true" />}
              label={product.speed}
              size="small"
              color={product.speed === '5G' ? 'success' : 'default'}
              variant={product.speed === '5G' ? 'filled' : 'outlined'}
              aria-label={`속도: ${product.speed}`}
            />
          )}
        </Box>

        {product.features && product.features.length > 0 && (
          <Box component="ul" sx={{ mb: 2, listStyle: 'none', p: 0, m: 0 }} aria-label="상품 특징">
            {product.features.slice(0, 2).map((feature, idx) => (
              <Typography key={idx} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                • {feature}
              </Typography>
            ))}
          </Box>
        )}

        <Box sx={{ mt: 'auto' }}>
          <Typography variant="h5" color="primary.main" sx={{ fontWeight: 700 }} aria-label={`가격: ${formatPrice(product.retail_price)}`}>
            {formatPrice(product.retail_price)}
          </Typography>
        </Box>
      </CardContent>

      <CardActions sx={{ p: 3, pt: 0 }}>
        <Button
          component={Link}
          href={`/${locale}/products/${product.slug}`}
          variant="contained"
          fullWidth
          size="large"
          sx={{ borderRadius: 2, fontWeight: 600 }}
          aria-label={`${product.country_name} ${product.name} 구매하기`}
        >
          구매하기
        </Button>
      </CardActions>
    </Card>
  );
}

function ProductCardSkeleton() {
  return (
    <Card sx={{ height: '100%', borderRadius: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Skeleton variant="rounded" width={80} height={24} />
          <Skeleton variant="rounded" width={60} height={24} />
          <Skeleton variant="rounded" width={50} height={24} />
        </Box>
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="text" width="40%" height={40} sx={{ mt: 2 }} />
      </CardContent>
      <CardActions sx={{ p: 3, pt: 0 }}>
        <Skeleton variant="rounded" width="100%" height={42} />
      </CardActions>
    </Card>
  );
}

export default function ProductsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ko';
  const announce = useAnnounce();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Generate unique IDs for ARIA relationships
  const searchId = useId();
  const sortId = useId();
  const filterGroupId = useId();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('perPage', '12');
      if (selectedCountry) params.set('country', selectedCountry);
      if (search) params.set('search', search);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data: ProductsResponse = await res.json();

      if (data.success) {
        setProducts(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.totalItems);
        // Announce results to screen readers
        announce(`${data.pagination.totalItems}개의 상품을 찾았습니다.`);
      } else {
        setError('상품을 불러오는데 실패했습니다.');
        announce('상품을 불러오는데 실패했습니다.', 'assertive');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      announce('네트워크 오류가 발생했습니다.', 'assertive');
    } finally {
      setLoading(false);
    }
  }, [page, selectedCountry, search, announce]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleCountryClick = (code: string) => {
    setSelectedCountry(code === selectedCountry ? '' : code);
    setPage(1);
  };

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: 'calc(100vh - 64px)' }}>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: { xs: 4, md: 6 },
          mb: 4,
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800, mb: 1 }}>
            eSIM 상품
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400 }}>
            전 세계 어디서나 연결되세요. 빠르고 간편한 eSIM.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pb: 6 }}>
        {/* Search & Filter */}
        <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              id={searchId}
              placeholder="국가 또는 상품명 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="eSIM 상품 검색"
              aria-describedby={`${searchId}-desc`}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" aria-hidden="true" />
                  </InputAdornment>
                ),
              }}
              sx={{
                minWidth: 280,
                flexGrow: 1,
                maxWidth: 400,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <span id={`${searchId}-desc`} style={{ display: 'none' }}>
              국가 이름 또는 상품명으로 검색하세요
            </span>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel id={`${sortId}-label`}>정렬</InputLabel>
              <Select
                labelId={`${sortId}-label`}
                id={sortId}
                value="popular"
                label="정렬"
                aria-label="상품 정렬 순서 선택"
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="popular">인기순</MenuItem>
                <MenuItem value="price_asc">가격 낮은순</MenuItem>
                <MenuItem value="price_desc">가격 높은순</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Popular Countries Quick Filter */}
          <Box component="fieldset" sx={{ border: 'none', p: 0, m: 0 }}>
            <Typography
              component="legend"
              id={filterGroupId}
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1.5 }}
            >
              인기 여행지
            </Typography>
            <Box
              role="group"
              aria-labelledby={filterGroupId}
              sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}
            >
              {POPULAR_COUNTRIES.map((country) => (
                <Chip
                  key={country.code}
                  label={`${country.flag} ${country.label}`}
                  onClick={() => handleCountryClick(country.code)}
                  variant={selectedCountry === country.code ? 'filled' : 'outlined'}
                  color={selectedCountry === country.code ? 'primary' : 'default'}
                  aria-pressed={selectedCountry === country.code}
                  aria-label={`${country.label} 필터 ${selectedCountry === country.code ? '선택됨' : ''}`}
                  sx={{
                    fontWeight: 500,
                    '&:hover': { bgcolor: 'primary.50' },
                  }}
                />
              ))}
              {selectedCountry && (
                <Chip
                  label="초기화"
                  onClick={() => setSelectedCountry('')}
                  variant="outlined"
                  color="error"
                  size="small"
                  sx={{ fontWeight: 500 }}
                  aria-label="필터 초기화"
                />
              )}
            </Box>
          </Box>
        </Paper>

        {/* Results Count */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            {loading ? (
              <Skeleton width={120} />
            ) : (
              `총 ${totalItems.toLocaleString()}개 상품`
            )}
          </Typography>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 4, borderRadius: 2 }}
            role="alert"
            aria-live="assertive"
          >
            {error}
          </Alert>
        )}

        {/* Products Grid */}
        <Grid container spacing={3}>
          {loading
            ? Array.from({ length: 12 }).map((_, idx) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={idx}>
                  <ProductCardSkeleton />
                </Grid>
              ))
            : products.map((product) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product.id}>
                  <ProductCard product={product} locale={locale} />
                </Grid>
              ))}
        </Grid>

        {!loading && products.length === 0 && (
          <Paper sx={{ textAlign: 'center', py: 8, borderRadius: 3 }}>
            <PublicIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              검색 결과가 없습니다
            </Typography>
            <Typography variant="body2" color="text.secondary">
              다른 검색어나 필터를 시도해보세요
            </Typography>
          </Paper>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box
            component="nav"
            aria-label="상품 목록 페이지 탐색"
            sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => {
                setPage(value);
                announce(`${value} 페이지로 이동합니다.`);
              }}
              color="primary"
              size="large"
              aria-label="상품 목록 페이지네이션"
              getItemAriaLabel={(type, pageNum, selected) => {
                if (type === 'page') {
                  return selected ? `현재 페이지, ${pageNum}` : `${pageNum} 페이지로 이동`;
                }
                if (type === 'first') return '첫 페이지로 이동';
                if (type === 'last') return '마지막 페이지로 이동';
                if (type === 'next') return '다음 페이지로 이동';
                if (type === 'previous') return '이전 페이지로 이동';
                return '';
              }}
              sx={{
                '& .MuiPaginationItem-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Box>
        )}
      </Container>
    </Box>
  );
}
