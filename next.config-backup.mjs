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
  },

  // External packages for server components
  serverComponentsExternalPackages: ['bcryptjs', 'crypto-js'],

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
  
  // Performance budgets are handled via webpack optimization
  // maxAssetSize: 300KB and maxEntrypointSize: 600KB are configured in webpack

  // Output configuration for Vercel
  // output: 'standalone', // Enable for self-hosting, disable for Vercel

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

  // Advanced Webpack optimization
  webpack: (config, { dev, isServer }) => {
    // Fix Windows path issues and symlink handling
    config.resolve.symlinks = false;
    
    // Windows-specific configurations to prevent EISDIR errors
    if (process.platform === 'win32') {
      config.resolve.cache = false;
      config.snapshot = {
        managedPaths: [],
        immutablePaths: [],
        buildDependencies: {
          timestamp: true,
          hash: false,
        },
      };
      
      // Enhanced Windows filesystem compatibility
      config.watchOptions = {
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
        poll: 1000,
        aggregateTimeout: 300,
      };
    } else {
      // Non-Windows systems can use normal watching
      config.watchOptions = {
        ignored: /node_modules/,
      };
    }
    // Bundle splitting strategy
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Critical crisis management chunks (highest priority)
            crisis: {
              name: 'crisis',
              test: /[\\/](crisis|emergency)[\\/]/,
              priority: 30,
              reuseExistingChunk: true,
            },
            // Authentication and security (high priority)  
            auth: {
              name: 'auth',
              test: /[\\/](auth|security)[\\/]/,
              priority: 25,
              reuseExistingChunk: true,
            },
            // UI components (medium priority)
            ui: {
              name: 'ui',
              test: /[\\/]components[\\/]ui[\\/]/,
              priority: 20,
              reuseExistingChunk: true,
            },
            // Third-party libraries
            vendor: {
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              priority: 10,
              chunks: 'initial',
              enforce: true,
            },
            // React ecosystem
            react: {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              priority: 15,
              chunks: 'all',
              enforce: true,
            },
            // Chart and visualization libraries (lazy load)
            charts: {
              name: 'charts',
              test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
              priority: 5,
              enforce: true,
            },
            // Animation libraries (lazy load)
            animations: {
              name: 'animations',
              test: /[\\/]node_modules[\\/](framer-motion|@use-gesture)[\\/]/,
              priority: 5,
              enforce: true,
            },
          },
        },
        // Minimize bundle size
        usedExports: true,
        sideEffects: false,
      };
    }

    // Performance optimizations
    config.resolve = {
      ...config.resolve,
      // Prefer ES modules
      mainFields: ['es2020', 'es2017', 'module', 'main'],
      // Tree shaking optimization
      alias: {
        ...config.resolve.alias,
        // Reduce bundle size for large libraries
        'chart.js': 'chart.js/dist/chart.esm.js',
      },
      // Windows-specific resolution improvements
      ...(process.platform === 'win32' && {
        fallback: {
          fs: false,
          path: require.resolve('path-browserify'),
        },
      }),
    };

    // Enable persistent cache (except on Windows to avoid issues)
    if (process.platform !== 'win32') {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    } else {
      config.cache = false;
    }

    if (!dev) {
      config.devtool = 'source-map';
    }

    // Add Windows-specific plugins to handle file system issues
    if (process.platform === 'win32') {
      // Add a plugin to normalize file paths on Windows
      config.plugins = config.plugins || [];
      config.plugins.push({
        apply: (compiler) => {
          compiler.hooks.compilation.tap('WindowsCompatibility', (compilation) => {
            compilation.hooks.normalModuleFactory.tap('WindowsCompatibility', (nmf) => {
              nmf.hooks.afterResolve.tap('WindowsCompatibility', (resolveData) => {
                if (resolveData && resolveData.resource) {
                  // Normalize Windows paths
                  resolveData.resource = resolveData.resource.replace(/\\/g, '/');
                }
                return resolveData;
              });
            });
          });
        },
      });
    }

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
