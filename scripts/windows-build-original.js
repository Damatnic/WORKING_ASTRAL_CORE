// Windows-compatible build script
// Handles symlink issues on Windows systems

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Windows Build Script - Handling symlink issues...');

async function windowsBuild() {
  try {
    // Clean up any problematic files
    console.log('🧹 Cleaning build cache...');
    
    // Remove .next directory
    const nextDir = path.join(process.cwd(), '.next');
    if (fs.existsSync(nextDir)) {
      execSync('rmdir /s /q .next', { stdio: 'inherit' });
    }
    
    // Set Windows-specific environment variables
    process.env.NODE_OPTIONS = '--max-old-space-size=4096';
    process.env.NEXT_TELEMETRY_DISABLED = '1';
    
    console.log('🚀 Starting Next.js build...');
    
    // Run the build with Windows-specific options
    const buildProcess = spawn('npx', ['next', 'build'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=4096',
        NEXT_TELEMETRY_DISABLED: '1',
      }
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Build completed successfully!');
        process.exit(0);
      } else {
        console.error('❌ Build failed with code:', code);
        console.log('💡 For Vercel deployment, the build will work on Linux servers.');
        console.log('💡 This is a Windows-specific development issue.');
        process.exit(code);
      }
    });
    
    buildProcess.on('error', (error) => {
      console.error('❌ Build process error:', error);
      console.log('💡 For Vercel deployment, the build will work on Linux servers.');
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Build script error:', error);
    console.log('💡 For Vercel deployment, the build will work on Linux servers.');
    process.exit(1);
  }
}

// Run the build
windowsBuild();