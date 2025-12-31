'use client';

import React, { useEffect } from 'react';
import { Box, Container, Button, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SimCardIcon from '@mui/icons-material/SimCard';
import { SplitText, BlurText } from '@/components/animations';
import { useReducedMotion } from '@/lib/accessibility';

interface HeroSectionProps {
  locale: string;
}

export function HeroSection({ locale }: HeroSectionProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  // Inject keyframes once on mount, with reduced-motion support
  useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('hero-keyframes')) {
      const style = document.createElement('style');
      style.id = 'hero-keyframes';
      style.textContent = `
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Disable animations for users who prefer reduced motion */
        @media (prefers-reduced-motion: reduce) {
          @keyframes float {
            0%, 100% { transform: none; }
          }
          @keyframes fadeInUp {
            from { opacity: 1; transform: none; }
            to { opacity: 1; transform: none; }
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

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
      {/* Background decoration - hidden from screen readers */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          top: '10%',
          right: '10%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
          filter: 'blur(60px)',
          animation: prefersReducedMotion ? 'none' : 'float 6s ease-in-out infinite',
        }}
      />
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          bottom: '20%',
          left: '5%',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
          filter: 'blur(40px)',
          animation: prefersReducedMotion ? 'none' : 'float 8s ease-in-out infinite reverse',
        }}
      />

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
          <SplitText
            text="NumnaRoad"
            staggerDelay={80}
            gradientColors={['#6366F1', '#8B5CF6', '#EC4899', '#6366F1']}
          />
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
            delay={100}
            staggerDelay={20}
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
            delay={200}
            duration={400}
          />
        </Typography>

        {/* CTA Button */}
        <Box
          sx={{
            opacity: prefersReducedMotion ? 1 : 0,
            animation: prefersReducedMotion ? 'none' : 'fadeInUp 0.5s ease forwards',
            animationDelay: prefersReducedMotion ? '0s' : '0.3s',
          }}
        >
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon aria-hidden="true" />}
            onClick={() => router.push(`/${locale}/products`)}
            sx={{
              py: 1.5,
              px: 4,
              fontSize: '1.1rem',
              fontWeight: 600,
              borderRadius: 3,
              boxShadow: '0 10px 40px rgba(99, 102, 241, 0.3)',
              '&:hover': {
                transform: prefersReducedMotion ? 'none' : 'translateY(-2px)',
                boxShadow: '0 15px 50px rgba(99, 102, 241, 0.4)',
              },
              transition: prefersReducedMotion ? 'none' : 'all 0.3s ease',
            }}
          >
            {locale === 'ko' ? '상품 둘러보기' : 'Browse Products'}
          </Button>
        </Box>

        {/* Stats */}
        <Box
          component="section"
          aria-label={locale === 'ko' ? '주요 통계' : 'Key Statistics'}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: { xs: 4, md: 8 },
            mt: 8,
            opacity: prefersReducedMotion ? 1 : 0,
            animation: prefersReducedMotion ? 'none' : 'fadeInUp 0.5s ease forwards',
            animationDelay: prefersReducedMotion ? '0s' : '0.5s',
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
