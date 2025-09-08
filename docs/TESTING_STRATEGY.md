# AstralCore Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for AstralCore, a mental health support platform. Our testing approach ensures reliability, security, and accessibility while maintaining high code quality standards.

## Testing Philosophy

### Core Principles

1. **Safety First**: Critical features like crisis detection and intervention must have 100% test coverage
2. **User-Centric**: Tests should reflect real user workflows and edge cases
3. **Automated Quality**: Every commit is validated through automated testing pipelines
4. **Windows Compatibility**: All testing infrastructure works seamlessly on Windows development environments
5. **Fast Feedback**: Tests provide quick feedback to developers during development

### Testing Pyramid

```
    🔺 E2E Tests (10%)
       - Critical user journeys
       - Cross-browser compatibility
       - Accessibility validation
   
   🔶 Integration Tests (30%)
      - API endpoints
      - Database operations
      - Service interactions
   
  🔷 Unit Tests (60%)
     - Individual functions
     - Component behavior
     - Business logic
```

## Testing Infrastructure

### 🧪 Unit Testing (Jest + React Testing Library)

**Configuration**: `jest.config.js`
- **Framework**: Jest with jsdom environment
- **React Testing**: React Testing Library for component testing
- **Coverage Target**: 75% overall, 85%+ for critical modules
- **Windows Optimizations**: Adjusted timeouts and worker limits

**Key Features**:
- Custom matchers for common validations
- Mock database with realistic data factories
- Comprehensive test utilities
- Parallel execution with Windows-optimized settings

### 🎭 E2E Testing (Playwright)

**Configuration**: `playwright.config.ts`
- **Browsers**: Chromium, Firefox, WebKit, Microsoft Edge
- **Viewports**: Desktop, tablet, mobile
- **Special Projects**: Accessibility and performance testing
- **Windows Support**: Optimized Chrome flags and process handling

**Key Features**:
- Visual regression testing
- Cross-browser compatibility
- Mobile responsiveness testing
- Accessibility audits

### 🔧 Development Tools

**Scripts Available**:
```bash
# Basic testing
npm run test              # Run unit tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
npm run test:e2e          # E2E tests

# Validation
npm run validate          # Full validation suite
npm run validate:quick    # Skip tests for speed
npm run typecheck         # TypeScript validation
npm run lint              # ESLint check
npm run lint:fix          # Auto-fix lint issues
npm run format            # Format code

# CI/CD
npm run ci:validate       # CI validation
npm run pre-commit        # Pre-commit hooks
```

## Test Organization

### 📁 Directory Structure

```
├── src/
│   ├── __tests__/              # Unit tests co-located with source
│   ├── lib/
│   │   ├── auth/__tests__/      # Auth module tests
│   │   ├── crisis/__tests__/    # Crisis detection tests
│   │   └── test-utils/          # Testing utilities
│   └── components/
│       └── __tests__/           # Component tests
├── tests/
│   ├── integration/             # Integration tests
│   ├── setup/                   # Global test setup
│   └── fixtures/                # Test data fixtures
├── e2e/                        # Playwright tests
│   ├── tests/                  # E2E test files
│   └── fixtures/               # E2E test data
└── __mocks__/                  # Global mocks
```

### 📝 Naming Conventions

- **Unit Tests**: `*.test.{js,ts,tsx}`
- **Integration Tests**: `*.integration.test.{js,ts}`
- **E2E Tests**: `*.spec.ts` in e2e directory
- **Mock Files**: `__mocks__/*.js`
- **Test Utilities**: `test-utils/*.ts`

## Testing Strategies by Feature

### 🔐 Authentication & Authorization

**Critical Test Areas**:
- User registration with validation
- Login with various scenarios (success, failure, locked accounts)
- Multi-factor authentication flows
- Session management and expiration
- Role-based access control
- Password security (strength, hashing, reset)

**Security Focus**:
```typescript
// Example: Account lockout testing
it('should lock account after 5 failed attempts', async () => {
  // Simulate 5 failed login attempts
  // Verify account is locked
  // Test unlock after timeout
})
```

### 🚨 Crisis Detection & Intervention

**Critical Test Areas**:
- Keyword detection algorithms
- Crisis escalation workflows
- Emergency contact integration
- Safety plan activation
- Real-time notification systems

**Safety Requirements**:
- 100% test coverage
- Zero false negatives for critical keywords
- Response time under 500ms
- Failover testing for critical services

```typescript
// Example: Crisis keyword detection
it('should detect suicide-related keywords', async () => {
  const dangerousMessage = 'I want to hurt myself'
  const result = await crisisDetection.analyze(dangerousMessage)
  expect(result.isCritical).toBe(true)
  expect(result.interventionRequired).toBe(true)
})
```

### 📊 Data Privacy & Security

**Test Areas**:
- Data encryption at rest and in transit
- GDPR compliance workflows
- Data anonymization
- Audit logging
- API security (rate limiting, input validation)

### 🎯 User Experience

**Accessibility Testing**:
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader compatibility
- Color contrast validation
- Focus management

**Performance Testing**:
- Page load times
- Crisis response times
- Database query optimization
- Memory usage patterns

## Data Management

### 🏭 Test Data Factories

**User Factory Example**:
```typescript
const user = userFactory.create({
  role: UserRole.THERAPIST,
  isVerified: true,
  mfaEnabled: true
})
```

**Available Factories**:
- `userFactory`: User accounts with various roles
- `crisisSessionFactory`: Crisis intervention sessions
- `safetyPlanFactory`: Personal safety plans
- `moodEntryFactory`: Mood tracking data
- `apiResponseFactory`: API response mocks

### 🎭 Mocking Strategy

**Database Mocking**:
- In-memory mock database for unit tests
- Real database for integration tests (optional)
- Transaction rollback for test isolation

**External Services**:
- HTTP request mocking with MSW
- WebSocket connection simulation
- Email service mocking
- SMS service mocking

## Continuous Integration

### ✅ Pre-commit Validation

**Automated Checks**:
1. TypeScript compilation
2. ESLint code quality
3. Prettier formatting
4. Related tests execution
5. Common issue detection

**Installation**:
```bash
npm run pre-commit:install
```

### 🚀 CI/CD Pipeline

**GitHub Actions Workflow**:
1. **Install**: Dependencies and setup
2. **Validate**: TypeScript, ESLint, Prettier
3. **Test**: Unit and integration tests
4. **Build**: Production build verification
5. **E2E**: Cross-browser testing
6. **Security**: Vulnerability scanning
7. **Deploy**: Conditional deployment

**Matrix Testing**:
- Node.js versions: 18.x, 20.x
- Operating Systems: Ubuntu, Windows, macOS
- Browsers: Chrome, Firefox, Safari, Edge

## Quality Metrics

### 📈 Coverage Targets

| Module | Coverage Target | Rationale |
|--------|-----------------|-----------|
| Crisis Detection | 90% | Critical safety feature |
| Authentication | 85% | Security-sensitive |
| Encryption | 90% | Data protection |
| RBAC | 85% | Access control |
| Global | 75% | Overall quality |

### 🎯 Performance Benchmarks

| Metric | Target | Critical Path |
|--------|--------|--------------|
| Crisis Response | <500ms | Keyword detection → intervention |
| Page Load | <2s | Initial app load |
| Test Suite | <5min | Full CI pipeline |
| API Response | <200ms | Average endpoint response |

## Windows Development Setup

### 🪟 Windows-Specific Optimizations

**Jest Configuration**:
- Adjusted worker limits for Windows performance
- Extended timeouts for slower Windows I/O
- Windows-compatible path handling
- Optimized cache directory placement

**Playwright Configuration**:
- Windows-specific browser flags
- Process isolation improvements
- File system permission handling
- npm.cmd usage for Windows command execution

**Common Windows Issues & Solutions**:

1. **Path Length Limits**:
   ```bash
   git config --system core.longpaths true
   ```

2. **Node.js Memory**:
   ```bash
   set NODE_OPTIONS=--max-old-space-size=4096
   ```

3. **Execution Policy**:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

## Best Practices

### 🏆 Writing Effective Tests

1. **Descriptive Names**:
   ```typescript
   it('should lock user account after 5 consecutive failed login attempts within 15 minutes')
   ```

2. **Arrange-Act-Assert Pattern**:
   ```typescript
   it('should create new user with hashed password', async () => {
     // Arrange
     const userData = { email: 'test@example.com', password: 'secret' }
     
     // Act
     const user = await authService.createUser(userData)
     
     // Assert
     expect(user.hashedPassword).not.toBe('secret')
     expect(user.hashedPassword).toMatch(/^\$2b\$12\$/)
   })
   ```

3. **Test Isolation**:
   - Each test should be independent
   - Clean up after each test
   - Use fresh mock instances

4. **Real User Scenarios**:
   - Test happy paths and edge cases
   - Include accessibility considerations
   - Validate error states

### 🚫 Anti-patterns to Avoid

1. **Testing Implementation Details**: Focus on behavior, not internals
2. **Brittle Selectors**: Use semantic queries over CSS selectors
3. **Shared State**: Avoid test interdependencies
4. **Excessive Mocking**: Balance mocking with real integrations
5. **Slow Tests**: Optimize for fast feedback loops

## Debugging Tests

### 🔍 Common Issues

1. **Flaky Tests**:
   - Add proper wait conditions
   - Check for race conditions
   - Verify mock setup

2. **Windows Path Issues**:
   - Use `path.join()` for cross-platform compatibility
   - Normalize path separators

3. **Timeout Errors**:
   - Increase timeout for slow operations
   - Check for hanging promises
   - Verify mock responses

### 🛠 Debug Tools

```typescript
// Debug test output
screen.debug() // Print current DOM

// Wait for elements with better error messages
await screen.findByRole('button', { name: /submit/i }, {
  timeout: 10000
})

// Capture console logs
const consoleLogs = captureConsole()
// ... run test
console.log(consoleLogs.getLogs('error'))
```

## Monitoring & Reporting

### 📊 Test Reports

- **Coverage Reports**: HTML and LCOV formats
- **Test Results**: JUnit XML for CI integration
- **Performance Metrics**: Execution time tracking
- **Visual Diffs**: Screenshot comparison for E2E tests

### 🔔 Notifications

- **Failed Tests**: Slack/Teams integration
- **Coverage Drops**: Automated alerts
- **Performance Regression**: Benchmark comparisons

## Contributing

### 📋 Checklist for New Features

- [ ] Unit tests with edge cases
- [ ] Integration tests for API changes
- [ ] E2E tests for critical user flows
- [ ] Accessibility testing
- [ ] Performance impact assessment
- [ ] Security review for sensitive features
- [ ] Documentation updates

### 🎓 Resources for Team

- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro/
- **Playwright Documentation**: https://playwright.dev/
- **Testing Best Practices**: Internal wiki
- **Crisis Testing Protocols**: Security team guidelines

---

## Summary

Our testing strategy prioritizes user safety, code quality, and developer experience. The Windows-compatible testing infrastructure ensures all team members can contribute effectively while maintaining the highest standards for our mental health platform.

For questions or improvements to this strategy, please reach out to the Testing & Validation team or create an issue in the project repository.

**Key Contacts**:
- Testing Lead: [Your Name]
- Security Testing: [Security Team]
- Accessibility Testing: [Accessibility Team]
- Performance Testing: [Performance Team]