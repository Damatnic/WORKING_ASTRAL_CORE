# 🚀 Vercel Deployment Guide - Astral Core V5

This guide will help you deploy Astral Core V5 to Vercel with all production features enabled.

## 📋 Prerequisites

- GitHub repository connected to Vercel
- OpenAI API key (for GPT-4 therapy assistant)
- Google Gemini API key (for Gemini Pro backup)
- Database provider (Supabase, PlanetScale, or Vercel Postgres)

## 🔧 Environment Variables Setup

### Required for AI Features

Add these environment variables in your Vercel dashboard:

```bash
# AI Services (REQUIRED for therapy assistant)
OPENAI_API_KEY=your-openai-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here

# NextAuth (REQUIRED)
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-here

# Database (REQUIRED - choose one)
DATABASE_URL=postgresql://user:password@host:port/database

# Security Keys (REQUIRED)
ENCRYPTION_KEY=generate-with-openssl-rand-hex-32
ENCRYPTION_IV=generate-with-openssl-rand-hex-16
JWT_SECRET=your-jwt-secret-here

# Environment
NODE_ENV=production
VERCEL_ENV=production
```

### Optional but Recommended

```bash
# Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@astralcore.app

# Crisis hotline integrations
CRISIS_TEXT_LINE_API=your-crisis-api-key
SUICIDE_PREVENTION_LIFELINE_API=your-api-key

# Analytics (privacy-focused)
PLAUSIBLE_DOMAIN=your-domain.vercel.app
ANALYTICS_ENABLED=true

# Feature flags
ENABLE_AI_THERAPY=true
ENABLE_CRISIS_DETECTION=true
ENABLE_PEER_SUPPORT=true
ENABLE_OFFLINE_MODE=true
```

## 🚀 Deployment Steps

### 1. Connect Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings

### 2. Configure Environment Variables
1. In your Vercel project dashboard, go to "Settings" → "Environment Variables"
2. Add all the required variables listed above
3. Make sure to set them for all environments (Production, Preview, Development)

### 3. Deploy
1. Click "Deploy" in Vercel
2. Wait for the build to complete (usually 2-3 minutes)
3. Your site will be available at `https://your-app.vercel.app`

## ✅ Post-Deployment Verification

### 1. Check System Health
Visit `https://your-app.vercel.app/api/health` to verify:
- ✅ System initialization completed
- ✅ Database connectivity
- ✅ AI services configured
- ✅ Demo users created

### 2. Test AI Services
Visit `https://your-app.vercel.app/status` to:
- ✅ See AI configuration status
- ✅ Test therapy chat with both OpenAI and Gemini
- ✅ Verify crisis detection works
- ✅ Check risk assessment levels

### 3. Demo Access
Use these credentials to test the platform:
- **User**: `demo@astralcore.app` / `demo123`
- **Helper**: `helper@astralcore.app` / `demo123`
- **Admin**: `admin@astralcore.app` / `demo123`

## 🎯 Available Features

### ✅ AI-Powered Therapy Assistant
- **OpenAI GPT-4** integration with therapy-focused prompts
- **Google Gemini** backup for reliability
- **Crisis detection** with automatic risk assessment
- **Emergency resource provision** for high-risk situations

### ✅ System Monitoring
- **Real-time health checks** at `/api/health`
- **Comprehensive status dashboard** at `/status`
- **Performance monitoring** with Core Web Vitals
- **Cache statistics** and optimization metrics

### ✅ Production Features
- **Auto-initialization** of demo users and crisis resources
- **Advanced caching** with stale-while-revalidate
- **Error boundaries** with graceful degradation
- **Security headers** and CSP policies
- **Bundle optimization** with code splitting

## 🔍 Troubleshooting

### AI Services Not Working
1. Check environment variables are set correctly
2. Verify API keys are valid and have credits
3. Check `/api/ai/chat` endpoint response
4. Look at Vercel function logs for errors

### Database Issues
1. Verify DATABASE_URL is correct
2. Check database provider is accessible from Vercel
3. Run database migrations if needed
4. Check `/api/health` for database status

### Build Failures
1. Check TypeScript compilation: `npm run typecheck`
2. Verify all dependencies are installed
3. Check ESLint: `npm run lint`
4. Review Vercel build logs

## 📊 Monitoring

### Production Monitoring
- **Health Endpoint**: `/api/health` - System health and uptime
- **Status Dashboard**: `/status` - Comprehensive system overview
- **AI Testing**: `/status` - Live AI chat testing interface

### Performance Metrics
- **Core Web Vitals**: FCP, LCP, FID, CLS tracking
- **Bundle Analysis**: Code splitting and tree shaking metrics
- **Cache Performance**: Hit rates and invalidation statistics

## 🚨 Security Considerations

### API Key Security
- ✅ API keys stored as environment variables (not in code)
- ✅ Rate limiting on AI endpoints
- ✅ Input validation and sanitization
- ✅ Error messages don't expose sensitive data

### Crisis Safety
- ✅ Automatic crisis detection in AI responses
- ✅ Emergency resource injection for high-risk users
- ✅ Crisis text line and suicide prevention hotline integration
- ✅ Professional referral recommendations

## 🎉 Your Mental Health Platform is Ready!

Once deployed, you'll have a fully functional mental health support platform with:
- 🤖 AI therapy assistant (OpenAI + Gemini)
- 🚨 Crisis detection and intervention
- 👥 Demo user system for testing
- 📊 Comprehensive monitoring and status dashboards
- ⚡ Production-optimized performance
- 🔒 Enterprise-grade security

Visit your deployment URL and start helping people find their voice! 💜

---

**Need Help?** Check the system status at `/status` or health endpoint at `/api/health` for diagnostics.