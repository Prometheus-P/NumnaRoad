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
};

module.exports = withNextIntl(nextConfig);
