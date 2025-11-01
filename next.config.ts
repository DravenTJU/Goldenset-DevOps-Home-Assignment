import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Note: Removed 'output: standalone' for AWS Amplify compatibility
  // Amplify has its own way of handling Next.js deployments

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
