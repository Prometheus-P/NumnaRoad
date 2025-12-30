'use client';

import React from 'react';
import { Box, Container, Button, Typography } from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SimCardIcon from '@mui/icons-material/SimCard';
import { SplitText, BlurText, GradientText } from '@/components/animations';

export default function Home() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ko';

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #F5F7FA 0%, #E4E8F0 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          right: '10%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
          filter: 'blur(60px)',
          animation: 'float 6s ease-in-out infinite',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          left: '5%',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
          filter: 'blur(40px)',
          animation: 'float 8s ease-in-out infinite reverse',
        }}
      />

      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-20px) scale(1.05);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <Container maxWidth="md" sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        {/* Icon */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 80,
            height: 80,
            borderRadius: 3,
            bgcolor: 'primary.main',
            color: 'white',
            mb: 4,
            boxShadow: '0 10px 40px rgba(99, 102, 241, 0.3)',
          }}
        >
          <SimCardIcon sx={{ fontSize: 40 }} />
        </Box>

        {/* Title */}
        <Typography
          variant="h1"
          component="h1"
          sx={{
            fontSize: { xs: '3rem', md: '4.5rem' },
            fontWeight: 800,
            mb: 3,
            letterSpacing: '-0.02em',
          }}
        >
          <GradientText colors={['#6366F1', '#8B5CF6', '#EC4899', '#6366F1']}>
            <SplitText text="NumnaRoad" staggerDelay={80} />
          </GradientText>
        </Typography>

        {/* Tagline */}
        <Typography
          variant="h4"
          component="p"
          sx={{
            fontSize: { xs: '1.25rem', md: '1.75rem' },
            fontWeight: 600,
            color: 'text.primary',
            mb: 2,
          }}
        >
          <SplitText
            text={locale === 'ko' ? '해외여행 eSIM 자동 판매 플랫폼' : 'Automated eSIM Platform for Travelers'}
            delay={500}
            staggerDelay={30}
          />
        </Typography>

        {/* Description */}
        <Typography
          variant="h6"
          component="p"
          sx={{
            fontSize: { xs: '1rem', md: '1.25rem' },
            color: 'text.secondary',
            mb: 5,
            fontWeight: 400,
          }}
        >
          <BlurText
            text={locale === 'ko' ? '주문부터 발급까지 10초 내 자동 처리' : 'From order to delivery in 10 seconds'}
            delay={1200}
            duration={800}
          />
        </Typography>

        {/* CTA Button */}
        <Box
          sx={{
            opacity: 0,
            animation: 'fadeInUp 0.6s ease forwards',
            animationDelay: '1.8s',
          }}
        >
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            onClick={() => router.push(`/${locale}/products`)}
            sx={{
              py: 1.5,
              px: 4,
              fontSize: '1.1rem',
              fontWeight: 600,
              borderRadius: 3,
              boxShadow: '0 10px 40px rgba(99, 102, 241, 0.3)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 15px 50px rgba(99, 102, 241, 0.4)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            {locale === 'ko' ? '상품 둘러보기' : 'Browse Products'}
          </Button>
        </Box>

        {/* Stats */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: { xs: 4, md: 8 },
            mt: 8,
            opacity: 0,
            animation: 'fadeInUp 0.6s ease forwards',
            animationDelay: '2.2s',
          }}
        >
          {[
            { value: '10초', label: locale === 'ko' ? '발급 시간' : 'Delivery Time' },
            { value: '24/7', label: locale === 'ko' ? '자동 처리' : 'Auto Processing' },
            { value: '100+', label: locale === 'ko' ? '지원 국가' : 'Countries' },
          ].map((stat, idx) => (
            <Box key={idx} sx={{ textAlign: 'center' }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: 'primary.main',
                  fontSize: { xs: '1.5rem', md: '2rem' },
                }}
              >
                {stat.value}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: '0.875rem', md: '1rem' },
                }}
              >
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
