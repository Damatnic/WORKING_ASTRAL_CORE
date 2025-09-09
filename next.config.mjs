import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal configuration for testing
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      'framer-motion', 
      'date-fns',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      'react-chartjs-2',
      'chart.js',
    ],
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: true, // Temporarily ignore to focus on webpack issue
  },

  // ESLint configuration  
  eslint: {
    ignoreDuringBuilds: true, // Temporarily ignore to focus on webpack issue
  },

  // Webpack configuration for Windows compatibility
  webpack: (config, { isServer }) => {
    // Disable symlinks completely (Windows compatibility)
    config.resolve.symlinks = false;
    
    // Add fallback for Node.js modules (Windows compatibility)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    // Disable webpack cache that causes issues on Windows
    config.cache = false;
    
    // Force Windows path normalization
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    return config;
  },
};

export default nextConfig;