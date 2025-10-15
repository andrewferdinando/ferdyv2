# Ferdy Deployment Guide

This guide covers the complete deployment process for the Ferdy social media management platform.

## 🚀 Quick Start

1. **Set up Supabase project** and run database migrations
2. **Deploy Edge Functions** to Supabase
3. **Configure environment variables** in Vercel
4. **Set up scheduled tasks** for automation
5. **Deploy Next.js app** to Vercel

---

## 📋 Prerequisites

- [Supabase account](https://supabase.com) with a new project
- [Vercel account](https://vercel.com) for hosting
- [GitHub repository](https://github.com) for code hosting
- Domain name (optional, for custom domain)

---

## 🗄️ Database Setup

### 1. Run Database Migrations

In your Supabase SQL Editor, run these files in order:

```sql
-- 1. Main schema migration
-- Copy and paste the contents of: supabase_migration.sql

-- 2. RPC functions
-- Copy and paste the contents of: supabase_rpc_functions.sql
```

### 2. Verify Database Setup

Check that all tables and RPC functions are created:
- ✅ 14 tables with RLS enabled
- ✅ 5 RPC functions for data operations
- ✅ Helper functions for asset rotation and scheduling

---

## ⚙️ Environment Variables

### Vercel Environment Variables

Set these in your Vercel project settings:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Analytics and Monitoring
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your-analytics-id
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### Supabase Edge Functions Secrets

Set these using the Supabase CLI or dashboard:

```bash
# Core Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Content Generation (choose one)
OPENAI_API_KEY=sk-your-openai-key
# OR
ANTHROPIC_API_KEY=your-anthropic-key
# OR
GOOGLE_AI_API_KEY=your-google-ai-key

# Image Processing (optional)
IMG_PROCESSOR_SECRET=your-image-service-secret
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret

# Social Media API Keys
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=https://your-domain.com/api/oauth/facebook

INSTAGRAM_APP_ID=your-instagram-app-id
INSTAGRAM_APP_SECRET=your-instagram-app-secret

TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
TWITTER_BEARER_TOKEN=your-twitter-bearer-token

LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

TIKTOK_CLIENT_KEY=your-tiktok-client-key
TIKTOK_CLIENT_SECRET=your-tiktok-client-secret

# Frontend Configuration
FRONTEND_URL=https://your-domain.com
```

---

## 🔧 Supabase Edge Functions Deployment

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login and Link Project

```bash
supabase login
supabase link --project-ref your-project-ref
```

### 3. Deploy All Functions

```bash
# Deploy content generation function
supabase functions deploy generate-drafts-for-month

# Deploy slot regeneration function
supabase functions deploy regenerate-slot

# Deploy publishing automation
supabase functions deploy publisher-runner

# Deploy OAuth callbacks
supabase functions deploy oauth-callback-facebook
supabase functions deploy oauth-callback-instagram
supabase functions deploy oauth-callback-twitter
supabase functions deploy oauth-callback-linkedin
supabase functions deploy oauth-callback-tiktok
```

### 4. Set Function Secrets

```bash
# Set all secrets at once
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set OPENAI_API_KEY=sk-your-openai-key
supabase secrets set FACEBOOK_APP_ID=your-facebook-app-id
supabase secrets set FACEBOOK_APP_SECRET=your-facebook-app-secret
supabase secrets set FRONTEND_URL=https://your-domain.com
# ... add all other secrets
```

---

## ⏰ Scheduled Tasks Setup

### 1. Publisher Runner (Every 15 minutes)

Create a cron job or use a service like [cron-job.org](https://cron-job.org):

```bash
# Cron expression: */15 * * * *
# URL: https://your-project.supabase.co/functions/v1/publisher-runner
# Method: POST
# Headers: Authorization: Bearer your-service-role-key
```

### 2. Monthly Draft Generation (Hourly check)

```bash
# Cron expression: 0 * * * *
# URL: https://your-project.supabase.co/functions/v1/generate-drafts-for-month
# Method: POST
# Body: {
#   "brand_id": "all",
#   "target_month": "auto",
#   "check_schedule": true
# }
```

### 3. Alternative: Supabase Cron Extension

If you prefer database-level scheduling:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule publisher runner every 15 minutes
SELECT cron.schedule(
  'publisher-runner',
  '*/15 * * * *',
  'SELECT net.http_post(
    url:=''https://your-project.supabase.co/functions/v1/publisher-runner'',
    headers:=''{"Authorization": "Bearer your-service-role-key"}''::jsonb
  );'
);

-- Schedule monthly generation check every hour
SELECT cron.schedule(
  'monthly-generation',
  '0 * * * *',
  'SELECT net.http_post(
    url:=''https://your-project.supabase.co/functions/v1/generate-drafts-for-month'',
    headers:=''{"Authorization": "Bearer your-service-role-key"}''::jsonb,
    body:=''{"brand_id": "all", "target_month": "auto", "check_schedule": true}''::jsonb
  );'
);
```

---

## 🌐 Vercel Deployment

### 1. Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the root directory

### 2. Configure Build Settings

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### 3. Set Environment Variables

Add all the Vercel environment variables listed above in the project settings.

### 4. Deploy

Click "Deploy" and wait for the build to complete.

---

## 🔐 Social Media App Setup

### Facebook/Instagram

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create a new app
3. Add Facebook Login and Instagram Basic Display products
4. Configure OAuth redirect URIs:
   - `https://your-domain.com/api/oauth/facebook`
   - `https://your-domain.com/api/oauth/instagram`

### Twitter/X

1. Go to [Twitter Developer Portal](https://developer.twitter.com)
2. Create a new project and app
3. Enable OAuth 2.0
4. Set callback URL: `https://your-domain.com/api/oauth/twitter`

### LinkedIn

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers)
2. Create a new app
3. Add "Sign In with LinkedIn" product
4. Set redirect URL: `https://your-domain.com/api/oauth/linkedin`

### TikTok

1. Go to [TikTok for Developers](https://developers.tiktok.com)
2. Create a new app
3. Configure OAuth settings
4. Set redirect URI: `https://your-domain.com/api/oauth/tiktok`

---

## 🧪 Local Development

### 1. Environment Setup

Create `.env.local` in your project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Local development overrides
NEXT_PUBLIC_VERCEL_ENV=development
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Database Development

- Use Supabase SQL Editor for running migrations
- Use Supabase Dashboard for data management
- Use Supabase CLI for local function development

---

## 🔍 Testing & Verification

### 1. Database Tests

```sql
-- Test RPC functions
SELECT rpc_create_manual_post(
  'your-brand-id'::uuid,
  'Test post',
  ARRAY['#test'],
  ARRAY['asset-id']::uuid[],
  ARRAY['facebook'],
  NOW() + INTERVAL '1 hour',
  false
);
```

### 2. Edge Function Tests

```bash
# Test content generation
curl -X POST https://your-project.supabase.co/functions/v1/generate-drafts-for-month \
  -H "Authorization: Bearer your-service-role-key" \
  -H "Content-Type: application/json" \
  -d '{"brand_id": "your-brand-id", "target_month": "2025-01-01"}'
```

### 3. Frontend Tests

1. Navigate to your deployed app
2. Create a test brand
3. Connect a social media account
4. Create a test post
5. Verify it appears in the schedule

---

## 📊 Monitoring & Maintenance

### 1. Supabase Monitoring

- Monitor function invocations in Supabase Dashboard
- Check database performance and query logs
- Review RLS policies and security

### 2. Vercel Monitoring

- Monitor build logs and deployments
- Check function execution times
- Review error logs and analytics

### 3. Social Media API Limits

- Monitor API rate limits for each platform
- Set up alerts for quota exhaustion
- Implement proper error handling and retries

---

## 🚨 Troubleshooting

### Common Issues

1. **RLS Policy Errors**
   - Check user authentication
   - Verify brand membership
   - Review RLS policies

2. **Edge Function Timeouts**
   - Increase function timeout limits
   - Optimize database queries
   - Implement proper error handling

3. **OAuth Connection Issues**
   - Verify redirect URIs match exactly
   - Check app permissions and scopes
   - Ensure HTTPS for production

4. **Database Connection Issues**
   - Verify environment variables
   - Check Supabase project status
   - Review connection pooling settings

### Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Social Media API Documentation](https://developers.facebook.com/docs)

---

## 🔄 Updates & Maintenance

### Regular Tasks

- **Weekly**: Review error logs and performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and optimize database queries
- **Annually**: Audit social media API usage and costs

### Backup Strategy

- Supabase provides automatic database backups
- Export critical data regularly
- Maintain code repository backups
- Document configuration changes

---

## ✅ Deployment Checklist

- [ ] Database migrations run successfully
- [ ] RPC functions deployed and tested
- [ ] Edge functions deployed with secrets
- [ ] Environment variables configured in Vercel
- [ ] Social media apps created and configured
- [ ] Scheduled tasks set up and running
- [ ] OAuth redirects working
- [ ] Frontend deployed and accessible
- [ ] Test posts created and published
- [ ] Monitoring and alerts configured

---

**🎉 Congratulations! Your Ferdy social media management platform is now deployed and ready to use!**
