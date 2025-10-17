import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Support AWS Amplify SSR deployment
  output: 'standalone',

  // Image optimization configuration
  images: {
    domains: [],
    unoptimized: false,
  },

  // Environment variables
  env: {
    AUTH_URL: process.env.AUTH_URL || 'http://localhost:3000/api/auth',
  },

  // Compression
  compress: true,

  // Production environment optimization
  productionBrowserSourceMaps: false,

  // PoweredByHeader
  poweredByHeader: false,
};

export default nextConfig;
