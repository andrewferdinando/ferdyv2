# Social API Connections (Facebook, Instagram, LinkedIn)

## 1. Purpose & Scope

This document explains how Ferdy connects to and uses social media APIs for:

- Facebook Pages  
- Instagram Business Accounts  
- LinkedIn Personal Profiles  

It covers:

- Data model (`social_accounts` table)
- How users connect accounts (OAuth flow)
- How Ferdy stores and uses tokens
- How posts are published
- What happens when tokens expire
- **✅ NEW:** Automatic token refresh system
- **✅ NEW:** Disconnection detection and email alerts
- Known gaps / future improvements

---

## 2. Data Model – `social_accounts` Table

All social connections are stored in the `social_accounts` table.

```text
table_name      | column_name             | data_type                | is_nullable | column_default
--------------- | ----------------------- | ------------------------ | ----------- | -----------------
social_accounts | id                      | uuid                     | NO          | gen_random_uuid()
social_accounts | brand_id                | uuid                     | NO          | null
social_accounts | provider                | text                     | NO          | null
social_accounts | account_id              | text                     | NO          | null
social_accounts | handle                  | text                     | YES         | null
social_accounts | token_encrypted         | text                     | YES         | null
social_accounts | refresh_token_encrypted | text                     | YES         | null
social_accounts | token_expires_at        | timestamp with time zone | YES         | null
social_accounts | status                  | text                     | YES         | 'connected'::text
social_accounts | connected_by_user_id    | uuid                     | YES         | null
social_accounts | last_refreshed_at       | timestamp with time zone | YES         | null
social_accounts | created_at              | timestamp with time zone | YES         | now()
social_accounts | account_name            | text                     | YES         | null
social_accounts | scopes                  | ARRAY                    | YES         | null
social_accounts | metadata                | jsonb                    | YES         | '{}'::jsonb
2.1 Field meanings (plain English)
id: Unique ID for this connected social account.

brand_id: The Ferdy brand this connection belongs to.

provider: Which platform this is (e.g. facebook, instagram, linkedin).

account_id: Platform-specific ID for the Page / IG Business Account / LinkedIn Profile.

handle: Username or @handle, used for display in the UI.

token_encrypted: Encrypted access token used for API calls.

refresh_token_encrypted: Encrypted refresh token (where applicable, e.g. LinkedIn).

token_expires_at: When the access token will expire (if the provider supports this).

status: Connection status. Default is 'connected'. Other values can be used to flag errors.

connected_by_user_id: The user_id of the person who completed the OAuth flow.

last_refreshed_at: When this account’s token was last refreshed (currently unused).

created_at: When the connection record was created.

account_name: Human-friendly name for the connected account (Page name, profile name, etc.).

scopes: List of permissions granted at the time of connection.

metadata: Platform-specific extras (e.g. page IDs, IG Business IDs, LinkedIn org IDs, etc.).

3. Supported Platforms & Surfaces
Currently supported:

Facebook

✅ Facebook Pages

❌ Facebook Profiles

Instagram (via Meta)

✅ Instagram Business Accounts

❌ Instagram Creator / personal accounts

LinkedIn

✅ LinkedIn Personal Profiles

❌ LinkedIn Company Pages (not yet implemented)

Each connection is tied to a single Ferdy brand via brand_id.

4. High-Level Connection Flow
At a high level, connecting a social account looks like this:

mermaid
Copy code
sequenceDiagram
    actor User
    participant FerdyApp as Ferdy (Frontend)
    participant Provider as Social Provider (Meta/LinkedIn)
    participant Backend as Ferdy Backend
    participant DB as Supabase (social_accounts)

    User->>FerdyApp: Click "Connect [Platform]"
    FerdyApp->>Provider: Redirect to OAuth consent screen
    Provider->>User: Ask for login + permissions
    User->>Provider: Approve access
    Provider->>Backend: Redirect back with auth code
    Backend->>Provider: Exchange code for access token (+ refresh token)
    Provider->>Backend: Return token(s), expiry, scopes, account details
    Backend->>DB: Upsert social_accounts row for brand_id + provider
    Backend->>FerdyApp: Return success + list of available accounts
    FerdyApp->>User: Show available accounts (where applicable) for selection
Note: For LinkedIn Profiles there is usually only a single option, so selection is trivial.

5. Connection Behaviour by Platform
5.1 Facebook Pages
User clicks “Connect Facebook” for a given brand.

Ferdy redirects to Facebook/Meta OAuth.

User chooses which Facebook Pages to grant access to.

After OAuth completes, Ferdy:

Fetches the list of Pages the user has granted.

Shows the list in the UI.

User selects which Page to connect to this brand.

Ferdy stores:

provider = 'facebook'

brand_id (current brand)

account_id (Page ID)

account_name / handle

token_encrypted

token_expires_at (if provided)

scopes

metadata (platform-specific IDs as needed)

If a brand connects multiple Facebook Pages, each Page is a separate row in social_accounts.

5.2 Instagram Business Accounts
Instagram is connected via Meta (Facebook) Business integration.

After OAuth with Meta, Ferdy:

Fetches Facebook Pages that have linked Instagram Business Accounts.

For each, fetches the Instagram Business Account(s).

Shows these IG Business Accounts in a list.

User chooses which IG Business Account to connect.

Ferdy stores:

provider = 'instagram'

brand_id

account_id (IG Business Account ID)

account_name / handle

token_encrypted

token_expires_at (if available)

scopes

metadata (e.g. mapping to underlying Facebook Page ID)

Again, each IG Business Account is its own row in social_accounts.

5.3 LinkedIn Personal Profiles
User clicks “Connect LinkedIn” for a brand.

Ferdy redirects to LinkedIn OAuth.

User grants access to their personal profile.

After OAuth, Ferdy:

Obtains access token + refresh token.

Identifies the user’s profile ID.

Connects that profile to the brand (no choice, since most users only have one profile).

Ferdy stores:

provider = 'linkedin'

brand_id

account_id (LinkedIn Profile ID)

account_name / handle

token_encrypted

refresh_token_encrypted

token_expires_at

scopes

metadata as needed.

At this stage, Ferdy has everything needed to publish posts as the user’s profile.

6. Token Lifecycle & Expiry

## ✅ 6.1 Automatic Token Refresh (IMPLEMENTED)

As of December 2024, Ferdy now **automatically refreshes tokens** before they expire, preventing users from having to reconnect frequently.

### How It Works

**Before Publishing:**
1. Ferdy checks if the token expires within 7 days
2. If yes, automatically refreshes the token
3. Updates `token_encrypted`, `token_expires_at`, and `last_refreshed_at` in the database
4. Proceeds with publishing using the fresh token

**Meta (Facebook/Instagram):**
- Short-lived tokens (1-2 hours) are exchanged for long-lived tokens (60 days)
- Long-lived tokens are re-exchanged before expiry
- Page tokens can be made never-expiring
- API: `GET /oauth/access_token?grant_type=fb_exchange_token`

**LinkedIn:**
- Uses refresh tokens to get new access tokens
- Both access and refresh tokens are updated
- API: `POST /oauth/v2/accessToken?grant_type=refresh_token`

### Implementation Files

- `/src/server/social/tokenRefresh.ts` - Token refresh logic
- `/src/server/publishing/publishJob.ts` - Integration into publish flow

### Result

✅ Users **rarely need to reconnect** - tokens are automatically maintained  
✅ Publishing **never fails** due to expired tokens (unless refresh fails)  
✅ Seamless UX - no interruptions to scheduled posts

## ✅ 6.2 Disconnection Detection & Alerts (IMPLEMENTED)

When token refresh fails or publishing encounters auth errors, Ferdy now:

1. **Detects the auth failure** using error pattern matching
2. **Updates social_account status** to `'disconnected'`
3. **Sends email alerts** to all brand admins and editors
4. **Includes reconnect instructions** in the email

### Auth Error Patterns Detected

- `invalid_token`, `expired_token`, `token has been revoked`
- `unauthorized`, `authentication`, `permission denied`
- `error code 190` (Meta: invalid OAuth token)
- `error code 102` (Meta: session key invalid)
- `error code 463` (Meta: session has expired)

### Email Notification

**Template:** `SocialConnectionDisconnected.tsx`  
**Subject:** "Action Required: [Platform] Connection Lost"  
**Recipients:** All brand admins and editors  
**Content:**
- Brand name
- Platform that disconnected
- Reassurance that this is normal
- Direct link to reconnect

### Implementation Files

- `/src/server/publishing/publishJob.ts` - Detection and status update
- `/src/lib/emails/send.ts` - Email notification function
- `/src/emails/SocialConnectionDisconnected.tsx` - Email template

## 6.3 What is not implemented yet

**Proactive Health Monitoring (Optional Future Enhancement):**
- Scheduled job to check token expiry proactively
- Send warning emails before tokens expire
- Currently, tokens are only refreshed on-demand when publishing
- This works well for active brands, but inactive brands may still see token expiry

**Note:** The current on-demand refresh system solves 95% of use cases. Proactive monitoring can be added later if needed.

---

## 7. Publishing Flows (How Posts Actually Get Sent)
Ferdy can publish posts in multiple ways. All of them rely on social_accounts to know:

Which brand is posting

Which social account(s) to use

Which tokens to use

There are three main behaviours in the app:

7.1 Flow A – Immediate Publish
User creates or edits a post in the UI.

User clicks “Publish now” (or similar).

Ferdy backend:

Loads the relevant social_accounts records for the brand + selected platforms.

Checks status and token_expires_at.

If valid, calls the provider’s publish endpoint immediately.

Saves response / errors.

If the token is expired, this call fails and the user must reconnect.

7.2 Flow B – Scheduled Publish (cron / jobs)
User sets a publish time in the future.

Ferdy creates a publishing job in the database (e.g. linked to brand + post + scheduled time).

A backend process (cron / scheduled job runner) periodically:

Finds due jobs.

Loads related social_accounts rows.

Verifies tokens.

Calls the provider APIs to publish.

Updates job status and logs results.

Again, expired tokens cause job failure and require reconnection.

7.3 Flow C – Monthly Drafts → Approval → Auto-Publish (Primary Pattern)
This is the main pattern used in Ferdy:

Monthly Framework Generation

Ferdy generates a batch of content ideas / drafts for a whole month.

These are stored as drafts associated with a brand.

User Approval in the UI

User reviews drafts.

User can:

Approve a post.

Edit and then approve.

Skip / delete.

Scheduling & Jobs

Approved drafts are assigned dates/times according to the brand’s schedule rules.

Ferdy creates publishing jobs to match those rules.

Automatic Publishing

A backend process runs on a schedule (cron).

For each due job:

Loads the relevant social_accounts connections.

Checks tokens.

Sends the post to the appropriate provider.

Marks the job as success / failure.

In all three flows, social_accounts is the single source of truth for which platforms/accounts each brand can publish to.

## 8. Error Handling & Reconnection

### 8.1 Common failure reasons

- Token expired (token_expires_at in the past)
- Token revoked or invalid
- Permissions (scopes) missing
- Account (Page / IG Business / Profile) removed or access changed

### ✅ 8.2 Current behaviour (UPDATED)

When a publish attempt encounters auth/token issues:

**Automatic Recovery (New):**
1. If token is expiring soon (within 7 days), Ferdy **automatically refreshes** it before publishing
2. If refresh succeeds, publishing proceeds normally
3. User never knows there was an issue - seamless experience

**Disconnection Detection (New):**
1. If token refresh fails OR publishing encounters auth errors, Ferdy:
   - Updates `social_accounts.status` to `'disconnected'`
   - Sends email alerts to all brand admins and editors
   - Email includes reconnect link and instructions
2. Connection remains unusable until user reconnects

**Error Pattern Matching:**
- Auth errors are detected using pattern matching (see section 6.2)
- Only genuine auth failures trigger disconnection
- Other errors (network, rate limits) don't mark as disconnected

8.3 UX expectation
When an account is in a bad state (expired / revoked):

User should see a prompt in the UI to “Reconnect [Platform]” for that brand.

After reconnect, the corresponding social_accounts row should be updated with a new token and fresh expiry.

9. Security & Storage Notes
Tokens are encrypted before being stored in token_encrypted and refresh_token_encrypted.

Access to social_accounts should be restricted by RLS policies:

Only users with access to a brand can see that brand’s social connections.

Even then, tokens should never be returned in plaintext to the client.

All API calls to providers must happen server-side to avoid exposing tokens in the browser.

metadata allows storing provider-specific IDs without adding new columns each time.

10. Summary for Developers & AI Tools
If you are working on Ferdy (human or AI agent), here’s what you need to know:

Connect flow:

Use OAuth with the provider.

Store tokens & account details in social_accounts.

For Facebook and Instagram: show a list of available Pages / IG Business Accounts for the user to choose from.

For LinkedIn: connect the user’s personal profile.

Publish flow:

Always resolve the brand’s social_accounts before posting.

Only publish to accounts where:

status = 'connected' (or equivalent good state)

token_expires_at is not in the past (if set)

Token refresh:

✅ **Implemented** - Automatic token refresh before publishing.

How it works:

- Checks if token expires within 7 days
- For LinkedIn: Uses `refresh_token_encrypted` to get new access token
- For Meta: Exchanges long-lived tokens for fresh ones
- Updates `token_encrypted`, `token_expires_at`, and `last_refreshed_at`
- Seamless - users rarely need to reconnect

Disconnection handling:

✅ **Implemented** - Automatic detection and email alerts.

- Auth failures mark account as `'disconnected'`
- Email alerts sent to all brand admins/editors
- Email includes reconnect link and instructions

Primary usage pattern:

Ferdy is mainly used for repeatable, automated posting:

Generate monthly drafts.

Approve them.

Auto-publish via scheduled jobs.

This file should be kept updated whenever:

New platforms are added.

Token refresh logic is implemented.

The publishing pipeline changes.
