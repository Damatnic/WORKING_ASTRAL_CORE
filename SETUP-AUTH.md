# Authentication Platform Setup Guide

This guide will help you set up all the required authentication services and platforms for AstralCore V5.

## 🔧 Required Services Setup

### 1. Database Setup (PostgreSQL)

#### Option A: Local PostgreSQL (Recommended for Development)
```bash
# Install PostgreSQL (Windows)
# Download from: https://www.postgresql.org/download/windows/

# Or use Docker
docker run --name astral-postgres \
  -e POSTGRES_DB=astralcore \
  -e POSTGRES_USER=astraluser \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  -d postgres:15
```

#### Option B: Cloud Database (Recommended for Production)
**Neon Database (Free tier available):**
1. Go to https://neon.tech
2. Sign up for free account
3. Create new project named "AstralCore"
4. Copy the connection string

**Alternative: Supabase**
1. Go to https://supabase.com
2. Create new project
3. Go to Settings > Database
4. Copy connection string

### 2. Google OAuth Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com
   - Create new project or select existing one

2. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     ```
     http://localhost:3000/api/auth/callback/google
     https://yourdomain.com/api/auth/callback/google
     ```
   - Save and copy Client ID and Client Secret

### 3. Email Service Setup (SMTP)

#### Option A: Gmail SMTP (Free)
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate password for "Mail"
3. **Use these settings**:
   ```
   SMTP Host: smtp.gmail.com
   Port: 587
   Username: your.email@gmail.com
   Password: [generated app password]
   ```

#### Option B: SendGrid (Recommended for Production)
1. Go to https://sendgrid.com
2. Create free account (100 emails/day free)
3. Go to Settings > API Keys
4. Create new API key with "Mail Send" permissions
5. Verify sender email address

#### Option C: Resend (Modern Alternative)
1. Go to https://resend.com
2. Sign up for free account
3. Go to API Keys section
4. Create new API key

### 4. Redis Setup (Optional - for rate limiting)

#### Option A: Local Redis
```bash
# Windows (using chocolatey)
choco install redis-64

# Or download from: https://github.com/microsoftarchive/redis/releases
```

#### Option B: Upstash Redis (Free tier)
1. Go to https://upstash.com
2. Create free account
3. Create new Redis database
4. Copy connection URL

## 📝 Environment Variables Configuration

Create/update your `.env` file with the following:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/astralcore"

# NextAuth.js Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secure-nextauth-secret-min-32-characters"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email Provider (Choose one)
# Gmail SMTP
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your.email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@astralcore.com"

# OR SendGrid
SENDGRID_API_KEY="SG.your-sendgrid-api-key"
EMAIL_FROM="noreply@astralcore.com"

# OR Resend
RESEND_API_KEY="re_your-resend-api-key"
EMAIL_FROM="noreply@astralcore.com"

# Redis (Optional)
REDIS_URL="redis://localhost:6379"
# OR Upstash
UPSTASH_REDIS_REST_URL="https://your-redis-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-redis-token"

# Security Keys
JWT_SECRET="your-jwt-secret-key-min-32-characters"
ENCRYPTION_KEY="your-32-character-encryption-key"
```

## 🚀 Setup Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Setup Database
```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (for development)
npx prisma db push

# OR run migrations (for production)
npx prisma migrate dev --name init
```

### Step 3: Seed Database (Optional)
```bash
# We'll create a seed script for demo users
npx prisma db seed
```

### Step 4: Test Authentication
```bash
# Start development server
npm run dev

# Navigate to:
# http://localhost:3000/auth/signup - Test registration
# http://localhost:3000/auth/signin - Test login
```

## 🔒 Security Configuration

### Generate Secure Keys
```bash
# Generate NEXTAUTH_SECRET (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY (exactly 32 characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## 📧 Email Templates Setup

We'll need to create email templates for:
- Email verification
- Password reset
- Welcome emails
- Crisis alerts

## 🧪 Testing Checklist

After setup, test these flows:

- [ ] User registration with different roles
- [ ] Email/password login
- [ ] Google OAuth login
- [ ] Password reset flow
- [ ] Email verification
- [ ] Role-based page access
- [ ] API authentication

## 🚨 Troubleshooting

### Common Issues:

1. **Database Connection Error**
   - Check DATABASE_URL format
   - Ensure database server is running
   - Verify credentials

2. **Google OAuth Error**
   - Check redirect URIs match exactly
   - Verify Google+ API is enabled
   - Check client ID and secret

3. **Email Not Sending**
   - Verify SMTP credentials
   - Check spam folder
   - Ensure app password (not regular password) for Gmail

4. **NextAuth Error**
   - Ensure NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches your domain
   - Verify all providers are configured correctly

## 📚 Next Steps

After basic setup works:
1. Configure email templates
2. Set up proper domain for production
3. Configure SSL certificates
4. Set up monitoring and logging
5. Implement rate limiting
6. Add 2FA support

## 🆘 Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Check server logs
3. Verify all environment variables
4. Test each service individually

Would you like me to help with any specific service setup?