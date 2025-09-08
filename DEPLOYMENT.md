# AstralCore V5 Deployment Guide

## 🚀 Vercel Deployment

### Prerequisites
- GitHub account with this repository
- Vercel account connected to GitHub
- PostgreSQL database (Neon, PlanetScale, or Supabase recommended)
- Redis instance (Upstash recommended for Vercel)

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/astralcore-v5)

### Manual Deployment Steps

1. **Fork/Clone Repository**
   ```bash
   git clone https://github.com/your-username/astralcore-v5.git
   cd astralcore-v5
   ```

2. **Set Up Database**
   - Create a PostgreSQL database
   - Copy the connection URL

3. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

4. **Configure Environment Variables**
   In Vercel dashboard, add these required variables:
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-32-char-secret
   ENCRYPTION_KEY=your-32-char-key
   AUDIT_LOG_KEY=your-32-char-key
   NEXTAUTH_SECRET=your-32-char-secret
   NEXTAUTH_URL=https://your-domain.vercel.app
   ```

5. **Optional Services**
   ```
   REDIS_URL=redis://...
   OPENAI_API_KEY=sk-...
   SENDGRID_API_KEY=SG...
   CRISIS_TEXT_LINE_API=...
   ```

### Database Setup

After deployment, initialize the database:

1. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

2. **Run Database Migrations**
   ```bash
   npx prisma db push
   ```

3. **Seed Database (Optional)**
   ```bash
   npx prisma db seed
   ```

### Security Configuration

#### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: 32+ character secret for JWT tokens
- `ENCRYPTION_KEY`: 32-character key for field encryption
- `AUDIT_LOG_KEY`: 32-character key for audit log encryption
- `NEXTAUTH_SECRET`: 32+ character secret for NextAuth.js

#### Optional but Recommended
- `REDIS_URL`: For session management and rate limiting
- `SENDGRID_API_KEY`: For email notifications
- `OPENAI_API_KEY`: For AI-powered features

### Performance Optimization

The application is pre-configured for Vercel with:
- Bundle splitting and optimization
- Image optimization
- Edge runtime for API routes
- CDN caching headers
- Gzip compression

### Monitoring

Access these endpoints after deployment:
- `https://your-domain.vercel.app/api/health` - Health check
- `https://your-domain.vercel.app/api/info` - System information

### Troubleshooting

#### Build Errors
```bash
# Clear Vercel cache
vercel env rm NODE_OPTIONS
vercel --prod

# Check logs
vercel logs
```

#### Database Issues
```bash
# Reset database
npx prisma migrate reset
npx prisma db push
```

#### Environment Variables
- Ensure all required variables are set in Vercel dashboard
- Variables are case-sensitive
- No quotes needed in Vercel dashboard

### HIPAA Compliance Notes

For production healthcare use:
1. Use a HIPAA-compliant database provider
2. Enable SSL/TLS encryption
3. Configure audit logging
4. Set up proper backup procedures
5. Review data retention policies

### Support

- Check `/api/health` for system status
- Review Vercel function logs for errors
- Ensure database connectivity
- Verify all environment variables are set

## 📱 Mobile PWA Features

The app automatically works as a PWA with:
- Offline crisis resources
- Background sync
- Push notifications (when configured)
- App-like experience on mobile devices

---

**Note**: This is a healthcare application. Ensure proper security measures and compliance with relevant regulations before using in production.