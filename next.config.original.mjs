import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Apply Windows filesystem fixes immediately
if (process.platform === 'win32') {
  try {
    require('./webpack-fs-fix.js').apply();
  } catch (e) {
    console.log('Warning: Could not apply filesystem fixes:', e.message);
  }
}

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
      'react-hook-form',
      'zod',
      '@prisma/client',
    ],
    // Optimize font loading and CSS
    optimizeCss: true,
    optimizeServerReact: true,
    // Enable webpack 5 persistent cache
    webVitalsAttribution: ['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB'],
    // External packages for server components
    serverComponentsExternalPackages: ['bcryptjs', 'crypto-js', 'node-crypto', 'sharp'],
    // Memory optimizations
    workerThreads: true,
    esmExternals: true,
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

  // Aggressive Windows-compatible Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Core Windows compatibility fixes - disable symlinks completely
    config.resolve.symlinks = false;
    
    // Windows-specific optimizations and fixes
    if (process.platform === 'win32') {
      // Disable caching completely on Windows to avoid readlink issues
      config.cache = false;
      
      // Enhanced file watching for Windows with better performance
      config.watchOptions = {
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**', '**/dist/**', '**/.vscode/**'],
        poll: 500, // Reduced polling for better performance
        aggregateTimeout: 200,
        followSymlinks: false,
      };
      
      // Completely disable snapshot functionality on Windows to prevent readlink calls
      config.snapshot = {
        managedPaths: [],
        immutablePaths: [],
        buildDependencies: {
          hash: false,
          timestamp: false,
        },
        module: {
          hash: false,
          timestamp: false,
        },
        resolve: {
          hash: false,
          timestamp: false,
        },
      };

      // Monkey patch the Node.js fs module to intercept readlink calls
      const fs = require('fs');
      const originalReadlink = fs.readlink;
      const originalReadlinkSync = fs.readlinkSync;
      
      // Override readlink to prevent EISDIR errors
      fs.readlink = function(path, options, callback) {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        try {
          const stats = fs.statSync(path);
          if (stats.isFile()) {
            // If it's a regular file, return an error that webpack can handle
            const error = new Error(`ENOENT: no such file or directory, readlink '${path}'`);
            error.code = 'ENOENT';
            error.errno = -2;
            error.syscall = 'readlink';
            error.path = path;
            if (callback) callback(error);
            return;
          }
        } catch (e) {
          // Continue with original readlink if stat fails
        }
        
        return originalReadlink.call(this, path, options, callback);
      };
      
      fs.readlinkSync = function(path, options) {
        try {
          const stats = fs.statSync(path);
          if (stats.isFile()) {
            // If it's a regular file, throw an error that webpack can handle
            const error = new Error(`ENOENT: no such file or directory, readlink '${path}'`);
            error.code = 'ENOENT';
            error.errno = -2;
            error.syscall = 'readlink';
            error.path = path;
            throw error;
          }
        } catch (e) {
          // Continue with original readlinkSync if stat fails
        }
        
        return originalReadlinkSync.call(this, path, options);
      };

      // Add a custom webpack plugin to handle file resolution
      config.plugins = config.plugins || [];
      config.plugins.push(
        new (class WindowsFileSystemFixPlugin {
          apply(compiler) {
            compiler.hooks.compilation.tap('WindowsFileSystemFixPlugin', (compilation) => {
              compilation.hooks.buildModule.tap('WindowsFileSystemFixPlugin', (module) => {
                if (module.resource && module.resource.includes('\\src\\app\\')) {
                  // Force webpack to treat all files as regular files
                  module._source = module._source;
                }
              });
            });
          }
        })()
      );
    }

    // Enhanced performance optimizations for all platforms
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        usedExports: true,
        sideEffects: false,
        concatenateModules: true,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            vendor: {
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              priority: 10,
              chunks: 'initial',
              enforce: true,
              reuseExistingChunk: true,
            },
            react: {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              priority: 15,
              chunks: 'all',
              enforce: true,
              reuseExistingChunk: true,
            },
            ui: {
              name: 'ui-components',
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
              priority: 12,
              chunks: 'all',
              reuseExistingChunk: true,
            },
            charts: {
              name: 'charts',
              test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
              priority: 11,
              chunks: 'all',
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Memory management optimizations
    config.stats = {
      preset: 'minimal',
      moduleTrace: false,
      errorDetails: false,
    };

    // Resolve optimizations
    config.resolve.cacheWithContext = false;
    config.resolve.unsafeCache = true;

    // Module optimization - commented out due to webpack schema validation
    // config.module.unsafeCache = true;

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