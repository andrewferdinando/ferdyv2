# Ferdy Edge Functions

This directory contains Supabase Edge Functions for the Ferdy social media management platform.

## Functions Overview

### 1. `generate-drafts-for-month`
**Purpose**: Generates post jobs and drafts for a specific month based on schedule rules.

**Trigger**: Manual API call or scheduled cron job

**Request Body**:
```json
{
  "brand_id": "uuid",
  "target_month": "2025-11-01",
  "force": false
}
```

**Response**:
```json
{
  "jobsCreated": 25,
  "draftsCreated": 23,
  "skipped": 2,
  "errors": []
}
```

### 2. `regenerate-slot`
**Purpose**: Regenerates content for a specific post job.

**Trigger**: Manual API call

**Request Body**:
```json
{
  "post_job_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "draft_id": "uuid"
}
```

### 3. `publisher-runner`
**Purpose**: Publishes approved posts to social media platforms.

**Trigger**: Cron job (every 5-15 minutes)

**Response**:
```json
{
  "processed": 5,
  "published": 4,
  "failed": 1,
  "errors": ["Job 123: Token expired"]
}
```

### 4. `oauth-callback-facebook`
**Purpose**: Handles Facebook OAuth redirect and stores encrypted tokens.

**Trigger**: OAuth redirect from Facebook

**Query Parameters**:
- `code`: OAuth authorization code
- `state`: Encoded state data (brand_id, user_id)

## Shared Utilities

### `_shared/tz.ts`
Timezone conversion utilities for handling IANA timezones and UTC conversion.

### `_shared/lru.ts`
LRU (Least Recently Used) asset rotation to ensure fair asset distribution.

### `_shared/ai.ts`
AI content generation utilities (stub implementation ready for AI service integration).

## Providers

### `providers/facebook.ts`
Facebook Graph API integration for publishing and insights.

### `providers/instagram.ts`
Instagram Graph API integration for media publishing.

### `providers/twitter.ts`
Twitter API v2 integration for tweet publishing.

## Deployment

1. **Deploy to Supabase**:
   ```bash
   supabase functions deploy generate-drafts-for-month
   supabase functions deploy regenerate-slot
   supabase functions deploy publisher-runner
   supabase functions deploy oauth-callback-facebook
   ```

2. **Set Environment Variables**:
   ```bash
   supabase secrets set FACEBOOK_APP_ID=your_app_id
   supabase secrets set FACEBOOK_APP_SECRET=your_app_secret
   supabase secrets set FACEBOOK_REDIRECT_URI=your_redirect_uri
   supabase secrets set FRONTEND_URL=your_frontend_url
   ```

3. **Set up Cron Jobs**:
   - Configure `publisher-runner` to run every 5-15 minutes
   - Configure `generate-drafts-for-month` to run monthly

## Development

### Local Testing
```bash
# Start Supabase locally
supabase start

# Deploy functions locally
supabase functions deploy --local generate-drafts-for-month
```

### Environment Variables
Required environment variables for production:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `FACEBOOK_REDIRECT_URI`
- `FRONTEND_URL`

## TODO Items

### High Priority
- [ ] Implement actual AI service integration in `ai.ts`
- [ ] Add proper token encryption/decryption in OAuth callbacks
- [ ] Implement real social media API integrations in providers
- [ ] Add error handling and retry logic for failed publishes
- [ ] Implement asset image processing and resizing

### Medium Priority
- [ ] Add LinkedIn and TikTok providers
- [ ] Implement comprehensive logging and monitoring
- [ ] Add rate limiting for API calls
- [ ] Implement webhook handling for social media events
- [ ] Add analytics and reporting functions

### Low Priority
- [ ] Add support for video content
- [ ] Implement A/B testing for content
- [ ] Add content approval workflows
- [ ] Implement advanced scheduling features

## Security Considerations

1. **Token Encryption**: All social media tokens are encrypted before storage
2. **RLS Policies**: All database operations respect Row Level Security
3. **Input Validation**: All inputs are validated and sanitized
4. **Error Handling**: Sensitive information is not exposed in error messages
5. **Rate Limiting**: API calls are rate-limited to prevent abuse

## Monitoring

Each function includes comprehensive logging and error tracking:
- Function execution time
- Success/failure rates
- Error messages and stack traces
- Database operation results

Use Supabase Dashboard to monitor function performance and logs.
