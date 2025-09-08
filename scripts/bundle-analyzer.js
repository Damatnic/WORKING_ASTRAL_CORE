/**
 * Bundle Analysis Script for Astral Core Performance Optimization
 * Provides detailed bundle analysis, performance metrics, and optimization recommendations
 */

const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const execAsync = promisify(exec);

class BundleAnalyzer {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || './bundle-analysis',
      thresholds: {
        maxBundleSize: 500 * 1024, // 500KB
        maxChunkSize: 300 * 1024,  // 300KB
        maxAssetSize: 100 * 1024,  // 100KB
      },
      criticalRoutes: ['/crisis', '/dashboard', '/auth'],
      ...options
    };
  }

  /**
   * Run complete bundle analysis
   */
  async analyze() {
    console.log('🔍 Starting bundle analysis...');
    
    try {
      // Ensure output directory exists
      await fs.mkdir(this.options.outputDir, { recursive: true });

      // Run Next.js build with analysis
      console.log('📦 Building with bundle analyzer...');
      await this.buildWithAnalysis();

      // Analyze bundle composition
      console.log('🧪 Analyzing bundle composition...');
      const bundleStats = await this.analyzeBundleComposition();

      // Check performance thresholds
      console.log('⚡ Checking performance thresholds...');
      const thresholdResults = await this.checkThresholds(bundleStats);

      // Generate recommendations
      console.log('💡 Generating optimization recommendations...');
      const recommendations = await this.generateRecommendations(bundleStats, thresholdResults);

      // Generate comprehensive report
      console.log('📊 Generating analysis report...');
      const report = await this.generateReport(bundleStats, thresholdResults, recommendations);

      console.log('✅ Bundle analysis complete!');
      console.log(`📁 Results saved to: ${this.options.outputDir}`);
      
      return report;

    } catch (error) {
      console.error('❌ Bundle analysis failed:', error);
      throw error;
    }
  }

  /**
   * Build project with bundle analysis enabled
   */
  async buildWithAnalysis() {
    const env = {
      ...process.env,
      ANALYZE: 'true',
      NODE_ENV: 'production'
    };

    try {
      const { stdout, stderr } = await execAsync('npm run build:analyze', { 
        env,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      if (stderr && !stderr.includes('warn')) {
        console.warn('Build warnings:', stderr);
      }
      
      return stdout;
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  /**
   * Analyze bundle composition from Next.js output
   */
  async analyzeBundleComposition() {
    const buildManifest = await this.loadBuildManifest();
    const stats = {
      bundles: {},
      chunks: {},
      totalSize: 0,
      gzippedSize: 0,
      routes: {},
      dependencies: {}
    };

    // Analyze .next/static/chunks directory
    const chunksDir = path.join(process.cwd(), '.next/static/chunks');
    
    try {
      const chunkFiles = await fs.readdir(chunksDir);
      
      for (const file of chunkFiles) {
        if (file.endsWith('.js')) {
          const filePath = path.join(chunksDir, file);
          const fileStat = await fs.stat(filePath);
          
          stats.chunks[file] = {
            size: fileStat.size,
            gzippedSize: await this.getGzippedSize(filePath),
            type: this.categorizeChunk(file),
            critical: this.isCriticalChunk(file)
          };
          
          stats.totalSize += fileStat.size;
          stats.gzippedSize += stats.chunks[file].gzippedSize;
        }
      }
    } catch (error) {
      console.warn('Could not analyze chunks directory:', error.message);
    }

    // Analyze route-specific bundles
    await this.analyzeRouteBundles(stats);

    // Analyze dependencies
    await this.analyzeDependencies(stats);

    return stats;
  }

  /**
   * Categorize chunk by its filename
   */
  categorizeChunk(filename) {
    if (filename.includes('crisis')) return 'critical';
    if (filename.includes('auth')) return 'auth';
    if (filename.includes('dashboard')) return 'core';
    if (filename.includes('wellness')) return 'feature';
    if (filename.includes('community')) return 'feature';
    if (filename.includes('vendor') || filename.includes('node_modules')) return 'vendor';
    if (filename.includes('react') || filename.includes('next')) return 'framework';
    if (filename.includes('charts') || filename.includes('animation')) return 'enhancement';
    return 'other';
  }

  /**
   * Determine if chunk is critical for initial load
   */
  isCriticalChunk(filename) {
    const criticalPatterns = [
      'main-',
      'runtime-',
      'webpack-',
      'crisis',
      'auth',
      'framework-'
    ];
    
    return criticalPatterns.some(pattern => filename.includes(pattern));
  }

  /**
   * Get gzipped size of file
   */
  async getGzippedSize(filePath) {
    try {
      const { stdout } = await execAsync(`gzip -c "${filePath}" | wc -c`);
      return parseInt(stdout.trim(), 10);
    } catch (error) {
      // Fallback: estimate gzipped size as ~30% of original
      const stats = await fs.stat(filePath);
      return Math.round(stats.size * 0.3);
    }
  }

  /**
   * Load Next.js build manifest
   */
  async loadBuildManifest() {
    try {
      const manifestPath = path.join(process.cwd(), '.next/build-manifest.json');
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(manifestContent);
    } catch (error) {
      console.warn('Could not load build manifest:', error.message);
      return {};
    }
  }

  /**
   * Analyze route-specific bundles
   */
  async analyzeRouteBundles(stats) {
    const routeAnalysis = {};
    
    // Analyze critical routes
    for (const route of this.options.criticalRoutes) {
      routeAnalysis[route] = {
        chunks: [],
        totalSize: 0,
        loadTime: 0,
        critical: true
      };
      
      // Find chunks related to this route
      Object.keys(stats.chunks).forEach(chunkName => {
        const routePath = route.replace('/', '');
        if (chunkName.includes(routePath) || chunkName.includes('pages' + route)) {
          routeAnalysis[route].chunks.push(chunkName);
          routeAnalysis[route].totalSize += stats.chunks[chunkName].size;
        }
      });
    }
    
    stats.routes = routeAnalysis;
  }

  /**
   * Analyze dependencies and their impact
   */
  async analyzeDependencies(stats) {
    try {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      const dependencies = { ...packageJson.dependencies };
      const depAnalysis = {};
      
      // Categorize dependencies by impact
      for (const [dep, version] of Object.entries(dependencies)) {
        depAnalysis[dep] = {
          version,
          category: this.categorizeDependency(dep),
          estimatedSize: await this.estimateDependencySize(dep),
          treeshakeable: this.isTreeShakeable(dep),
          critical: this.isCriticalDependency(dep)
        };
      }
      
      stats.dependencies = depAnalysis;
    } catch (error) {
      console.warn('Could not analyze dependencies:', error.message);
    }
  }

  /**
   * Categorize dependency by its purpose
   */
  categorizeDependency(dep) {
    if (dep.includes('react') || dep.includes('next')) return 'framework';
    if (dep.includes('chart') || dep.includes('motion')) return 'visualization';
    if (dep.includes('auth') || dep.includes('crypto')) return 'security';
    if (dep.includes('ui') || dep.includes('radix')) return 'ui';
    if (dep.includes('lucide') || dep.includes('icon')) return 'icons';
    if (dep.includes('date') || dep.includes('moment')) return 'utility';
    if (dep.includes('socket') || dep.includes('pusher')) return 'realtime';
    return 'other';
  }

  /**
   * Estimate dependency bundle size
   */
  async estimateDependencySize(dep) {
    // This would ideally use bundlephobia API or analyze node_modules
    const sizeMap = {
      'framer-motion': 180000,
      'lucide-react': 350000,
      'chart.js': 250000,
      'react-chartjs-2': 50000,
      '@radix-ui/react-dialog': 30000,
      '@radix-ui/react-dropdown-menu': 35000,
      'socket.io-client': 280000,
      'axios': 30000,
      'date-fns': 150000,
    };
    
    return sizeMap[dep] || 25000; // Default estimate
  }

  /**
   * Check if dependency supports tree shaking
   */
  isTreeShakeable(dep) {
    const treeshakeableDeps = [
      'lucide-react',
      'date-fns',
      '@radix-ui',
      'chart.js'
    ];
    
    return treeshakeableDeps.some(pattern => dep.includes(pattern));
  }

  /**
   * Check if dependency is critical for core functionality
   */
  isCriticalDependency(dep) {
    const criticalDeps = [
      'react',
      'react-dom',
      'next',
      'next-auth',
      '@prisma/client'
    ];
    
    return criticalDeps.some(pattern => dep.includes(pattern));
  }

  /**
   * Check performance thresholds
   */
  async checkThresholds(stats) {
    const results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };

    // Check total bundle size
    if (stats.totalSize > this.options.thresholds.maxBundleSize) {
      results.failed++;
      results.details.push({
        type: 'error',
        category: 'bundle-size',
        message: `Total bundle size (${this.formatSize(stats.totalSize)}) exceeds threshold (${this.formatSize(this.options.thresholds.maxBundleSize)})`,
        impact: 'high',
        suggestion: 'Consider code splitting and removing unused dependencies'
      });
    } else {
      results.passed++;
    }

    // Check individual chunk sizes
    Object.entries(stats.chunks).forEach(([chunkName, chunk]) => {
      if (chunk.size > this.options.thresholds.maxChunkSize) {
        if (chunk.critical) {
          results.failed++;
          results.details.push({
            type: 'error',
            category: 'chunk-size',
            message: `Critical chunk ${chunkName} (${this.formatSize(chunk.size)}) is too large`,
            impact: 'high',
            suggestion: 'Split critical chunks further or optimize imports'
          });
        } else {
          results.warnings++;
          results.details.push({
            type: 'warning',
            category: 'chunk-size',
            message: `Chunk ${chunkName} (${this.formatSize(chunk.size)}) could be smaller`,
            impact: 'medium',
            suggestion: 'Consider lazy loading or code splitting'
          });
        }
      }
    });

    return results;
  }

  /**
   * Generate optimization recommendations
   */
  async generateRecommendations(stats, thresholds) {
    const recommendations = [];

    // Tree shaking opportunities
    Object.entries(stats.dependencies).forEach(([dep, info]) => {
      if (info.treeshakeable && info.estimatedSize > 50000) {
        recommendations.push({
          priority: 'high',
          category: 'tree-shaking',
          title: `Optimize ${dep} imports`,
          description: `Use named imports instead of default imports for ${dep}`,
          impact: `Could save ~${this.formatSize(info.estimatedSize * 0.6)}`,
          implementation: `import { SpecificIcon } from '${dep}' instead of import { ... } from '${dep}'`
        });
      }
    });

    // Code splitting opportunities
    Object.entries(stats.chunks).forEach(([chunkName, chunk]) => {
      if (chunk.size > 100000 && !chunk.critical) {
        recommendations.push({
          priority: 'medium',
          category: 'code-splitting',
          title: `Split ${chunkName}`,
          description: `Large non-critical chunk should be split further`,
          impact: `Improve initial load time`,
          implementation: 'Use dynamic imports and React.lazy for this component'
        });
      }
    });

    // Dependency optimization
    const heavyDeps = Object.entries(stats.dependencies)
      .filter(([, info]) => info.estimatedSize > 200000)
      .sort((a, b) => b[1].estimatedSize - a[1].estimatedSize);

    heavyDeps.forEach(([dep, info]) => {
      if (info.category === 'visualization') {
        recommendations.push({
          priority: 'medium',
          category: 'lazy-loading',
          title: `Lazy load ${dep}`,
          description: `Heavy visualization library should be loaded on demand`,
          impact: `Reduce initial bundle by ${this.formatSize(info.estimatedSize)}`,
          implementation: 'Use dynamic imports for chart components'
        });
      }
    });

    // Critical path optimization
    recommendations.push({
      priority: 'high',
      category: 'critical-path',
      title: 'Optimize crisis page loading',
      description: 'Crisis intervention features should load with highest priority',
      impact: 'Potentially life-saving performance improvement',
      implementation: 'Ensure crisis components are preloaded and cached'
    });

    return recommendations;
  }

  /**
   * Generate comprehensive analysis report
   */
  async generateReport(stats, thresholds, recommendations) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalBundleSize: stats.totalSize,
        gzippedSize: stats.gzippedSize,
        compressionRatio: (stats.gzippedSize / stats.totalSize * 100).toFixed(1) + '%',
        chunkCount: Object.keys(stats.chunks).length,
        thresholdsPassed: thresholds.passed,
        thresholdsFailed: thresholds.failed,
        recommendationsCount: recommendations.length
      },
      chunks: stats.chunks,
      routes: stats.routes,
      dependencies: stats.dependencies,
      thresholds: thresholds,
      recommendations: recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
    };

    // Save detailed JSON report
    const jsonPath = path.join(this.options.outputDir, 'bundle-analysis.json');
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

    // Generate human-readable HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = path.join(this.options.outputDir, 'bundle-analysis.html');
    await fs.writeFile(htmlPath, htmlReport);

    // Generate console summary
    this.logSummary(report);

    return report;
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Bundle Analysis Report - Astral Core</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', roboto, sans-serif; margin: 2rem; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 8px; margin-bottom: 2rem; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .stat-card { background: #f8f9fa; padding: 1rem; border-radius: 8px; border-left: 4px solid #007bff; }
        .stat-value { font-size: 2rem; font-weight: bold; color: #007bff; }
        .recommendations { margin-bottom: 2rem; }
        .recommendation { background: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
        .priority-high { border-left: 4px solid #dc3545; }
        .priority-medium { border-left: 4px solid #ffc107; }
        .priority-low { border-left: 4px solid #28a745; }
        .chunk-table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
        .chunk-table th, .chunk-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #dee2e6; }
        .chunk-table th { background: #f8f9fa; font-weight: 600; }
        .critical { color: #dc3545; font-weight: bold; }
        .warning { color: #ffc107; }
        .success { color: #28a745; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Bundle Analysis Report</h1>
        <p>Generated on ${new Date(report.timestamp).toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="stat-card">
            <div class="stat-value">${this.formatSize(report.summary.totalBundleSize)}</div>
            <div>Total Bundle Size</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${this.formatSize(report.summary.gzippedSize)}</div>
            <div>Gzipped Size</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${report.summary.compressionRatio}</div>
            <div>Compression Ratio</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${report.summary.chunkCount}</div>
            <div>Total Chunks</div>
        </div>
    </div>

    <div class="recommendations">
        <h2>🚀 Optimization Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation priority-${rec.priority}">
                <h3>${rec.title}</h3>
                <p><strong>Category:</strong> ${rec.category}</p>
                <p><strong>Description:</strong> ${rec.description}</p>
                <p><strong>Impact:</strong> ${rec.impact}</p>
                <p><strong>Implementation:</strong> <code>${rec.implementation}</code></p>
            </div>
        `).join('')}
    </div>

    <div>
        <h2>📦 Chunk Analysis</h2>
        <table class="chunk-table">
            <thead>
                <tr>
                    <th>Chunk</th>
                    <th>Size</th>
                    <th>Gzipped</th>
                    <th>Type</th>
                    <th>Critical</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(report.chunks).map(([name, chunk]) => `
                    <tr>
                        <td><code>${name}</code></td>
                        <td>${this.formatSize(chunk.size)}</td>
                        <td>${this.formatSize(chunk.gzippedSize)}</td>
                        <td>${chunk.type}</td>
                        <td class="${chunk.critical ? 'critical' : ''}">${chunk.critical ? 'Yes' : 'No'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>
    `;
  }

  /**
   * Log summary to console
   */
  logSummary(report) {
    console.log('\n📊 Bundle Analysis Summary');
    console.log('='.repeat(50));
    console.log(`Total Bundle Size: ${this.formatSize(report.summary.totalBundleSize)}`);
    console.log(`Gzipped Size: ${this.formatSize(report.summary.gzippedSize)} (${report.summary.compressionRatio})`);
    console.log(`Chunks: ${report.summary.chunkCount}`);
    console.log(`Thresholds Passed: ${report.summary.thresholdsPassed}`);
    console.log(`Thresholds Failed: ${report.summary.thresholdsFailed}`);
    console.log(`Recommendations: ${report.summary.recommendationsCount}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n🚀 Top Recommendations:');
      report.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
        console.log(`   ${rec.description}`);
      });
    }
    console.log('\n');
  }

  /**
   * Format file size for display
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// CLI usage
if (require.main === module) {
  const analyzer = new BundleAnalyzer({
    outputDir: './bundle-analysis',
    thresholds: {
      maxBundleSize: 500 * 1024,
      maxChunkSize: 300 * 1024,
      maxAssetSize: 100 * 1024,
    }
  });

  analyzer.analyze()
    .then(() => {
      console.log('✅ Bundle analysis completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Bundle analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { BundleAnalyzer };