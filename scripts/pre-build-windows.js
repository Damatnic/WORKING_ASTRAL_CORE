// Pre-build script for Windows compatibility
// Applies filesystem patches before Next.js build starts

console.log('🔧 Applying Windows filesystem compatibility fixes...');

// Apply the filesystem patches
require('../webpack-fs-fix.js').apply();

console.log('✅ Windows compatibility fixes applied successfully');
console.log('🚀 Ready for Next.js build...');