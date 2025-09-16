const nextJest = require('next/jest')
const path = require('path')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Test environment
  testEnvironment: 'jest-environment-jsdom',
  
  // Module name mapping for path aliases (Windows-compatible)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/generated/(.*)$': '<rootDir>/src/generated/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '^@/middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@/constants/(.*)$': '<rootDir>/src/constants/$1',
    // Static file mocks
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
  },
  
  // Test file patterns (Windows path-compatible)
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}',
    '<rootDir>/tests/**/*.(test|spec).{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/**/*.(test|spec).{js,jsx,ts,tsx}',
  ],
  
  // Files to ignore
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
    '<rootDir>/playwright-tests/',
    '<rootDir>/build/',
    '<rootDir>/dist/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/accessibility/',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/not-found.tsx',
    '!src/app/**/page.tsx', // Only exclude basic page files, not complex ones
    '!src/generated/**/*',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.config.{js,ts}',
    '!**/node_modules/**',
    '!**/*.d.ts',
  ],
  
  coverageReporters: ['text', 'lcov', 'html', 'json', 'text-summary'],
  coverageDirectory: 'coverage',
  
  // Enhanced coverage thresholds
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    // Critical modules require higher coverage
    './src/lib/auth/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/lib/encryption/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/lib/rbac/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/lib/crisis/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/components/crisis/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  
  // Transform configuration (Windows-compatible)
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@testing-library|@babel|babel-preset-react-app|uuid|nanoid|@radix-ui|@faker-js))',
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  
  // Test timeout (increased for Windows)
  testTimeout: 45000,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Detect open handles (helpful for Windows debugging)
  detectOpenHandles: true,
  forceExit: true,
  
  // Max workers for parallel execution (Windows-optimized)
  maxWorkers: process.env.CI ? 1 : Math.max(1, Math.floor(require('os').cpus().length / 2)),
  
  // Test result processors
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      ancestorSeparator: ' › ',
      uniqueOutputName: 'false',
      suiteNameTemplate: '{filepath}',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
    }],
  ],
  
  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/', '<rootDir>/src'],
  
  // Globals
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
    __DEV__: true,
    __TEST__: true,
  },
  
  // Verbose output for debugging
  verbose: process.env.NODE_ENV === 'test' || process.env.CI,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Cache directory (Windows-compatible)
  cacheDirectory: path.join(__dirname, 'node_modules', '.cache', 'jest'),
  
  // Snapshot serializers (commented out due to missing dependency)
  // snapshotSerializers: ['@emotion/jest/serializer'],
  
  // Watch plugins for better development experience (commented out due to missing dependencies)
  // watchPlugins: [
  //   'jest-watch-typeahead/filename',
  //   'jest-watch-typeahead/testname',
  // ],
  
  // Collect coverage only when requested
  collectCoverage: process.env.CI || process.argv.includes('--coverage'),
  
  // Windows-specific resolver configuration
  resolver: undefined, // Will create if needed
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)