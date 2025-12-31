const path = require('path');
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Required for Docker deployment
  // Monorepo support: trace files from root to include @services/*
  outputFileTracingRoot: path.join(__dirname, '../../'),
  images: {
    domains: ['pocketbase.yourdomain.com'],
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  experimental: {
    // Optimize MUI and other large package imports
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      '@mui/x-data-grid',
      'recharts',
    ],
  },
  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

module.exports = withNextIntl(nextConfig);
