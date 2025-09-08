# Multi-stage Docker build for AstralCore Mental Health Platform
# Optimized for production deployment with security and HIPAA compliance considerations

# Stage 1: Dependencies
FROM node:20-alpine AS deps
LABEL stage=deps
WORKDIR /app

# Install security updates and necessary packages
RUN apk update && apk upgrade && \
    apk add --no-cache libc6-compat && \
    rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies with security configurations
RUN npm ci --only=production --audit --fund=false && \
    npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
LABEL stage=builder
WORKDIR /app

# Install build dependencies with security updates
RUN apk update && apk upgrade && \
    apk add --no-cache libc6-compat python3 make g++ && \
    rm -rf /var/cache/apk/*

# Copy dependencies from deps stage and all dependencies for build
COPY package*.json ./
RUN npm ci --audit --fund=false

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Set build environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build arguments for CI/CD integration
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=latest

# Build the application
RUN npm run build && \
    npm cache clean --force

# Stage 3: Runtime
FROM node:20-alpine AS runner
LABEL maintainer="AstralCore Team <security@astralcore.app>" \
      org.opencontainers.image.title="AstralCore Mental Health Platform" \
      org.opencontainers.image.description="HIPAA-compliant mental health platform" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.source="https://github.com/astralcore/astralcore-v5" \
      org.opencontainers.image.vendor="AstralCore" \
      org.opencontainers.image.licenses="Proprietary"

WORKDIR /app

# Install security updates and runtime dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
        dumb-init \
        tini \
        curl \
        ca-certificates \
        tzdata && \
    rm -rf /var/cache/apk/* && \
    # Create non-root user for security
    addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy production dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy Prisma files for runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated

# Create necessary directories with proper permissions
RUN mkdir -p /app/.next/cache && \
    mkdir -p /app/logs && \
    mkdir -p /app/tmp && \
    chown -R nextjs:nodejs /app/.next/cache /app/logs /app/tmp

# Create healthcheck script
RUN echo '#!/bin/sh' > /app/healthcheck.sh && \
    echo 'curl -f http://localhost:3000/api/health || exit 1' >> /app/healthcheck.sh && \
    chmod +x /app/healthcheck.sh && \
    chown nextjs:nodejs /app/healthcheck.sh

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /app/healthcheck.sh

# Security: Run as non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application with proper process management
CMD ["npm", "start"]

# Security metadata
LABEL security.scan.enabled="true" \
      security.hipaa.compliant="true" \
      security.phi.handling="encrypted" \
      security.audit.enabled="true"