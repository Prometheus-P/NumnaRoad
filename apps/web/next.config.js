/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Required for Docker deployment
  images: {
    domains: ['pocketbase.yourdomain.com'],
  },
};

module.exports = nextConfig;
