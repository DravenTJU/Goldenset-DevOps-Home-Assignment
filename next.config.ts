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

  // Ignore CDK and node_modules
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/cdk/**', '**/node_modules/**', '**/.git/**'],
    };
    return config;
  },
};

export default nextConfig;
