# Astral Core V5 - Testing, Security & Deployment Guide

## Mission Statement
"We built Astral Core to be the voice people find when they've lost their own"

This document outlines the comprehensive testing, security, and deployment infrastructure for Astral Core V5, ensuring HIPAA compliance and production readiness for our mental health platform.

## Table of Contents
1. [Testing Infrastructure](#testing-infrastructure)
2. [Security & HIPAA Compliance](#security--hipaa-compliance)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [Deployment](#deployment)
5. [Monitoring & Observability](#monitoring--observability)
6. [Backup & Disaster Recovery](#backup--disaster-recovery)
7. [Emergency Procedures](#emergency-procedures)

## Testing Infrastructure

### Unit Testing
```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test CrisisButton.test.tsx
```

**Coverage Requirements:**
- Minimum 70% overall coverage
- 80% for critical components (crisis, auth, therapy)
- 90% for utility functions

### Integration Testing
API endpoints are tested with comprehensive integration tests:
- Authentication flows
- Crisis intervention endpoints
- AI therapy interactions
- Community features
- Data protection validation

### End-to-End Testing
```bash
# Run E2E tests
npm run test:e2e

# Run with UI mode for debugging
npm run test:e2e:ui

# Run specific browser
npx playwright test --project=chromium
```

**Critical User Flows Tested:**
- Crisis intervention accessibility
- Emergency resource availability
- User registration and authentication
- Therapy session workflows
- Privacy mode functionality

### Security Testing
```bash
# Run comprehensive security audit
npm run test:security

# OWASP dependency check
npm run test:owasp

# Accessibility audit
npm run test:a11y
```

## Security & HIPAA Compliance

### Security Audit
Run the comprehensive security audit:
```bash
node scripts/security-audit.js
```

This checks:
- Dependency vulnerabilities
- Encryption configuration
- Authentication security
- API protection
- Data protection measures
- Access controls
- Audit logging
- Session management
- Input validation
- Error handling
- Security headers
- SSL/TLS configuration
- Backup security
- Privacy controls
- Incident response readiness

### HIPAA Compliance Checklist
Review the comprehensive checklist at: `security/HIPAA-COMPLIANCE-CHECKLIST.md`

Key requirements:
- End-to-end encryption for all ePHI
- Comprehensive audit logging
- Access controls and authentication
- Regular security assessments
- Incident response procedures
- Business Associate Agreements
- Data retention policies

### Sensitive Data Protection
- All PII encrypted at rest (AES-256)
- TLS 1.3 for data in transit
- Field-level encryption for sensitive fields
- Secure key management
- Data anonymization for analytics

## CI/CD Pipeline

### GitHub Actions Workflow
The CI/CD pipeline (`./github/workflows/ci-cd.yml`) includes:

1. **Security Scan** - Dependency vulnerabilities, OWASP checks
2. **Linting & Type Checking** - Code quality validation
3. **Unit & Integration Tests** - Full test suite with coverage
4. **E2E Tests** - Critical user flow validation
5. **Accessibility Testing** - WCAG compliance
6. **Performance Testing** - Lighthouse CI
7. **Docker Build** - Multi-platform image creation
8. **Deployment** - Automated staging/production deployment

### Running CI Locally
```bash
# Simulate CI environment
npm run test:ci
npm run build
npm run test:e2e
```

## Deployment

### Docker Deployment
```bash
# Build Docker image
npm run docker:build

# Run locally
npm run docker:run

# Push to registry
docker push astralcore/v5:latest
```

### Kubernetes Deployment
```bash
# Deploy to production
kubectl apply -f k8s/production/

# Check deployment status
kubectl get pods -n production

# Scale deployment
kubectl scale deployment astralcore-app --replicas=5 -n production
```

### Environment Variables
Required environment variables:
```env
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://astralcore.app

# Encryption
ENCRYPTION_KEY=... # 32-byte hex key

# Redis
REDIS_URL=redis://...

# AWS (for backups)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BACKUP_BUCKET=astralcore-backups

# Monitoring
SENTRY_DSN=...
STATSD_HOST=...
```

## Monitoring & Observability

### Starting Monitoring
```bash
npm run monitor:start
```

### Metrics Exposed
- HTTP request metrics
- Crisis intervention response times
- User engagement metrics
- System health indicators
- Security events
- Database performance
- Cache hit ratios

### Accessing Metrics
- Prometheus metrics: `http://localhost:9090/metrics`
- Health check: `http://localhost:9090/health`
- Grafana dashboards: Configure separately

### Alerts Configured
- High error rate (>5%)
- Slow crisis response (>30s)
- High memory usage (>90%)
- Database pool exhaustion (>80%)
- Failed backups
- Security incidents

## Backup & Disaster Recovery

### Creating Backups
```bash
# Manual backup
npm run backup:create

# Scheduled via cron
0 2 * * * npm run backup:create
```

### Restoring from Backup
```bash
# List available backups
node scripts/backup.js list

# Restore specific backup
npm run backup:restore backup-2024-01-15-abc123

# Verify backup integrity
node scripts/backup.js verify backup-2024-01-15-abc123
```

### Backup Components
- PostgreSQL database
- Redis cache
- File uploads
- Configuration
- Audit logs (HIPAA requirement)

### Recovery Objectives
- **RTO (Recovery Time Objective):** < 4 hours
- **RPO (Recovery Point Objective):** < 1 hour
- Backups retained for 90 days
- Encrypted with AES-256-GCM
- Stored in AWS S3 Glacier

## Emergency Procedures

### Crisis System Failure
1. Immediately redirect to static crisis page
2. Ensure phone numbers are visible
3. Alert on-call team
4. Initiate incident response

### Data Breach Response
1. Isolate affected systems
2. Preserve evidence
3. Notify security officer
4. Begin HIPAA breach assessment
5. Prepare breach notifications if required

### Rollback Procedure
```bash
# Rollback deployment
kubectl rollout undo deployment astralcore-app -n production

# Restore from backup if needed
npm run backup:restore <last-known-good-backup>
```

### Contact Information
- Security Officer: security@astralcore.com
- On-Call Engineer: Via PagerDuty
- Crisis Response Team: crisis-team@astralcore.com
- HIPAA Compliance: compliance@astralcore.com

## Performance Benchmarks

Target metrics:
- Page load time: < 2s (LCP)
- Time to Interactive: < 3.5s
- Crisis button response: < 100ms
- API response time (p95): < 500ms
- Database query time (p95): < 100ms

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Regular dependency updates** - Weekly security patches
3. **Code review required** - All PRs need approval
4. **Penetration testing** - Quarterly external assessments
5. **Security training** - Annual HIPAA training for all team members

## Testing Commands Summary

```bash
# Development
npm run dev           # Start development server
npm run lint         # Run ESLint
npm run type-check   # TypeScript validation

# Testing
npm test             # Run unit tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
npm run test:e2e     # E2E tests
npm run test:security # Security audit
npm run test:ci      # Full CI test suite

# Deployment
npm run build        # Production build
npm run docker:build # Build Docker image
npm run deploy:staging # Deploy to staging
npm run deploy:production # Deploy to production

# Maintenance
npm run backup:create # Create backup
npm run backup:restore # Restore backup
npm run monitor:start # Start monitoring
```

## Compliance Documentation

All compliance documentation is maintained in:
- `security/HIPAA-COMPLIANCE-CHECKLIST.md` - HIPAA compliance tracking
- `security/audit-report-*.json` - Security audit reports
- `docs/privacy-policy.md` - Privacy policy
- `docs/terms-of-service.md` - Terms of service
- `docs/incident-response.md` - Incident response plan

## Continuous Improvement

- Weekly security reviews
- Monthly performance audits
- Quarterly penetration testing
- Annual HIPAA assessment
- Continuous monitoring and alerting

## Support

For technical support or security concerns:
- Email: support@astralcore.com
- Security: security@astralcore.com
- Emergency: Follow incident response procedures

---

Remember: Every line of code, every test, and every deployment impacts real people in vulnerable moments. We maintain the highest standards because lives depend on it.

"We built Astral Core to be the voice people find when they've lost their own" - Let's ensure it's always there when needed.