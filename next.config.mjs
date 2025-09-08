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
    ignoreBuildErrors: true, // Temporarily ignore TS errors for build test
  },

  // ESLint configuration  
  eslint: {
    ignoreDuringBuilds: true, // Temporarily ignore linting for build test
  },

  // Minimal webpack configuration
  webpack: (config) => {
    // Disable symlinks completely
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;