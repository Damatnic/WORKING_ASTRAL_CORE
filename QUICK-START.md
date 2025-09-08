# 🚀 Quick Start Guide - AstralCore V5 Authentication

Follow these steps to get the authentication system up and running in **15 minutes**.

## ✅ Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)
- [ ] Database access (see options below)

## 🏃‍♂️ Quick Setup (15 minutes)

### Step 1: Generate Security Keys (1 minute)
```bash
npm run auth:setup
```
This creates secure keys and updates your `.env` file.

### Step 2: Choose Database Option

#### Option A: Quick Local Database (5 minutes)
**Using Docker (Recommended):**
```bash
# Install Docker Desktop first, then run:
docker run --name astral-postgres \
  -e POSTGRES_DB=astralcore \
  -e POSTGRES_USER=astraluser \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  -d postgres:15
```

**Update your `.env` file:**
```env
DATABASE_URL="postgresql://astraluser:secure_password@localhost:5432/astralcore"
```

#### Option B: Free Cloud Database (3 minutes)
1. Go to https://neon.tech (free tier)
2. Create account and new project "AstralCore"
3. Copy connection string to `.env` file

### Step 3: Setup Google OAuth (5 minutes)
1. Go to https://console.cloud.google.com
2. Create new project or select existing
3. Enable "Google+ API" in APIs & Services > Library
4. Create OAuth credentials:
   - Type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Secret to `.env`:
```env
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

### Step 4: Setup Email (2 minutes)
**Quick Gmail Setup:**
1. Enable 2FA on your Gmail account
2. Generate app password: Google Account > Security > 2-Step Verification > App passwords
3. Update `.env`:
```env
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your.email@gmail.com"
EMAIL_SERVER_PASSWORD="your-16-char-app-password"
EMAIL_FROM="noreply@astralcore.com"
```

### Step 5: Initialize Database (2 minutes)
```bash
npm run db:setup
```
This creates the database schema and adds demo users.

### Step 6: Start Development Server
```bash
npm run dev
```

## 🎉 Test Your Setup

Visit these URLs to test:

### Authentication Pages
- **Sign Up**: http://localhost:3000/auth/signup
- **Sign In**: http://localhost:3000/auth/signin
- **Demo Login**: http://localhost:3000/login

### Test Accounts (Created Automatically)
```
Regular User:
📧 user@demo.astralcore.com
🔑 Demo123!

Helper:
📧 helper@demo.astralcore.com  
🔑 Helper123!

Therapist:
📧 therapist@demo.astralcore.com
🔑 Therapist123!

Crisis Counselor:
📧 crisis@demo.astralcore.com
🔑 Crisis123!

Admin:
📧 admin@demo.astralcore.com
🔑 Admin123!
```

## 🔧 Troubleshooting

### "Database connection failed"
```bash
# Check if Docker container is running
docker ps

# Restart container if needed
docker restart astral-postgres
```

### "Google OAuth error"
- Verify redirect URI matches exactly: `http://localhost:3000/api/auth/callback/google`
- Check Google+ API is enabled
- Try incognito browser window

### "Email not sending"
- Check spam folder
- Verify app password (not regular password)
- Try with different email service

### "NextAuth error"
```bash
# Regenerate keys
npm run auth:setup

# Check environment variables
echo $NEXTAUTH_SECRET
```

## 🚀 You're Ready!

Once everything works:

1. **Create your first account** at `/auth/signup`
2. **Test role-based access** by signing in as different users
3. **Explore the demo accounts** to see different role capabilities
4. **Start customizing** the authentication flow

## 📚 Next Steps

- [ ] Customize email templates
- [ ] Add your domain/branding
- [ ] Configure production database
- [ ] Set up monitoring
- [ ] Add 2FA support

## 🆘 Need Help?

1. Check the full setup guide: `SETUP-AUTH.md`
2. View browser console for errors
3. Check server logs in terminal
4. Verify all environment variables are set

**Common Environment Variables Check:**
```bash
# Run this to verify your setup
node -e "
const required = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'EMAIL_SERVER_USER'];
required.forEach(key => {
  console.log(key + ':', process.env[key] ? '✅ Set' : '❌ Missing');
});
"
```

🎊 **Congratulations! Your authentication system is ready for development.**