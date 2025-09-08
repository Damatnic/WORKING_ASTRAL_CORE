import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
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
    // Optimize font loading
    optimizeCss: true,
    // Enable webpack 5 persistent cache
    webVitalsAttribution: ['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB'],
    // External packages for server components
    serverComponentsExternalPackages: ['bcryptjs', 'crypto-js'],
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.vercel.app',
      },
      {
        protocol: 'https',
        hostname: '**.astralcore.app',
      },
    ],
    minimumCacheTTL: 60,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https://r2cdn.perplexity.ai https://*.vercel.app; connect-src 'self' wss: ws: https:; media-src 'self' blob:",
          },
        ],
      },
    ];
  },

  // Build optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Bundle analyzer configuration
  ...(process.env.ANALYZE === 'true' && {
    bundleAnalyzer: {
      enabled: true,
      openAnalyzer: true,
    },
  }),

  // Compression
  compress: true,
  
  // Error handling
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration  
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Simplified Windows-compatible Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Core Windows compatibility fixes
    config.resolve.symlinks = false;
    
    // Windows-specific optimizations
    if (process.platform === 'win32') {
      // Disable caching to prevent filesystem issues
      config.cache = false;
      
      // Enhanced file watching for Windows
      config.watchOptions = {
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
        poll: 1000,
        aggregateTimeout: 300,
      };
      
      // Simplified snapshot configuration
      config.snapshot = {
        managedPaths: [],
        immutablePaths: [],
      };
    }

    // Basic performance optimizations that work on all platforms
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              priority: 10,
              chunks: 'initial',
              enforce: true,
            },
            react: {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              priority: 15,
              chunks: 'all',
              enforce: true,
            },
          },
        },
      };
    }

    // Safe alias configuration
    config.resolve.alias = {
      ...config.resolve.alias,
      'chart.js': 'chart.js/dist/chart.esm.js',
    };

    return config;
  },

  // Production optimizations
  poweredByHeader: false,
  
  // Generate optimized builds
  generateBuildId: async () => {
    const timestamp = Date.now();
    const shortHash = timestamp.toString(36);
    return `build_${shortHash}`;
  },
};

export default nextConfig;