'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import DataUsageIcon from '@mui/icons-material/DataUsage';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Link from 'next/link';

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

// Popular countries for filter
const POPULAR_COUNTRIES = [
  { code: '', label: '전체' },
  { code: 'US', label: '미국' },
  { code: 'JP', label: '일본' },
  { code: 'CN', label: '중국' },
  { code: 'TH', label: '태국' },
  { code: 'VN', label: '베트남' },
  { code: 'SG', label: '싱가포르' },
  { code: 'TW', label: '대만' },
  { code: 'HK', label: '홍콩' },
  { code: 'EU', label: '유럽' },
  { code: 'GB', label: '영국' },
  { code: 'FR', label: '프랑스' },
  { code: 'DE', label: '독일' },
  { code: 'AU', label: '호주' },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(price);
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
            {product.country_name}
          </Typography>
          {product.is_featured && (
            <Chip label="추천" color="primary" size="small" />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip
            icon={<DataUsageIcon />}
            label={product.data_limit}
            size="small"
            variant="outlined"
          />
          <Chip
            icon={<AccessTimeIcon />}
            label={`${product.duration}일`}
            size="small"
            variant="outlined"
          />
          <Chip
            icon={<SignalCellularAltIcon />}
            label={product.speed}
            size="small"
            variant="outlined"
            color={product.speed === '5G' ? 'success' : 'default'}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          {product.features?.slice(0, 3).map((feature, idx) => (
            <Typography key={idx} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              • {feature}
            </Typography>
          ))}
        </Box>

        <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
          {formatPrice(product.retail_price)}
        </Typography>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          component={Link}
          href={`/products/${product.slug}`}
          variant="contained"
          fullWidth
        >
          상품 보기
        </Button>
      </CardActions>
    </Card>
  );
}

function ProductCardSkeleton() {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Skeleton variant="text" width="60%" height={32} />
        <Box sx={{ display: 'flex', gap: 1, my: 2 }}>
          <Skeleton variant="rounded" width={80} height={24} />
          <Skeleton variant="rounded" width={60} height={24} />
          <Skeleton variant="rounded" width={50} height={24} />
        </Box>
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="text" width="40%" height={40} sx={{ mt: 2 }} />
      </CardContent>
      <CardActions sx={{ p: 2 }}>
        <Skeleton variant="rounded" width="100%" height={36} />
      </CardActions>
    </Card>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('perPage', '12');
      if (country) params.set('country', country);
      if (search) params.set('search', search);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data: ProductsResponse = await res.json();

      if (data.success) {
        setProducts(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.totalItems);
      } else {
        setError('상품을 불러오는데 실패했습니다.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, country, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
        eSIM 상품
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        전 세계 {totalItems.toLocaleString()}개 이상의 eSIM 상품을 만나보세요
      </Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <TextField
          placeholder="국가 또는 상품명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250, flexGrow: 1, maxWidth: 400 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>국가 필터</InputLabel>
          <Select
            value={country}
            label="국가 필터"
            onChange={(e) => {
              setCountry(e.target.value);
              setPage(1);
            }}
          >
            {POPULAR_COUNTRIES.map((c) => (
              <MenuItem key={c.code} value={c.code}>
                {c.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
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
                <ProductCard product={product} />
              </Grid>
            ))}
      </Grid>

      {!loading && products.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            검색 결과가 없습니다
          </Typography>
          <Typography variant="body2" color="text.secondary">
            다른 검색어를 시도해보세요
          </Typography>
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            size="large"
          />
        </Box>
      )}
    </Container>
  );
}
