# Process: Connect Social Accounts via API (OAuth)

## Purpose

Allow a brand user to securely connect their social media accounts (Facebook Page, Instagram Business, LinkedIn) to Ferdy so the system can:

- Read basic account/page information
- Read recent posts for analytics/post-information
- Publish posts on behalf of the brand
- Monitor connection health and token expiry

This document describes the full flow from user clicking "Connect" through to successful storage of tokens and activation of publishing.

---

## Scope

**Includes**
- UI flow in Integrations
- Building OAuth URLs
- Handling OAuth callbacks
- Token storage in `social_accounts`
- Account metadata retrieval
- Status updates, errors, and reconnection logic

**Excludes**
- Publishing pipeline (see publishing docs)
- Draft generation (see draft_lifecycle.md)

---

## Actors

- **Brand User**
- **Ferdy Web App (Next.js)**
- **Ferdy API / Server**
- **Social Providers**: Facebook, Instagram, LinkedIn

---

## Key Data Structures

### `social_accounts` table

| Column | Description |
|--------|-------------|
| `id` | Primary key |
| `brand_id` | Foreign key to brands |
| `provider` | `'facebook' | 'instagram' | 'linkedin'` |
| `account_id` | Provider account/page/IG business ID |
| `account_name` | Display name |
| `access_token` | Stored encrypted |
| `refresh_token` | Nullable (varies by provider) |
| `expires_at` | Token expiry timestamp |
| `scopes` | Granted permissions |
| `status` | `'connected' | 'expired' | 'disconnected' | 'error'` |
| `last_health_check_at` | Timestamp |
| `created_at`, `updated_at` | Audit fields |

---

## High-level OAuth Flow

```mermaid
flowchart TD
    A[User opens Integrations page] --> B[Clicks 'Connect']
    B --> C[API returns OAuth URL]
    C --> D[Frontend redirects user<br/>to provider OAuth]

    D --> E[User approves permissions]
    E --> F[Provider redirects to Ferdy callback<br/>with code + state]

    F --> G[Validate state<br/>verify brand + user]
    G --> H[Exchange code for access token]
    H --> I[Fetch account/page metadata]
    I --> J[Upsert into social_accounts<br/>status = connected]

    J --> K[Health check request<br/>(optional but recommended)]
    K --> L[Redirect back to Integrations page]
    L --> M[UI updates provider to Connected]

    %% Error paths
    E --> ED[User denies permissions] --> EX
    H --> EI[Token exchange fails] --> EX
    G --> ES[State mismatch] --> EX

    EX[Error: Show safe message<br/>Status = 'error']
```

## Detailed Steps

### 1. User opens Integrations page

**Route:** `/brands/[brandId]/engine-room/integrations`

UI loads all rows in `social_accounts` for the brand.

Shows:
- **Not Connected** → Connect button
- **Connected** → account name + Disconnect/Refresh
- **Error/Expired** → Reconnect option

### 2. User clicks "Connect"

UI calls:
```
POST /api/integrations/{provider}/auth-url
```

**API response:**
- Builds OAuth URL
- Packs a signed state object containing:
  - `brandId`
  - `userId`
  - `provider`
  - `redirectPath`
  - random nonce

UI redirects browser to OAuth URL.

### 3. Provider OAuth

User authenticates and approves permissions.

Provider redirects back to Ferdy:
```
/api/integrations/{provider}/callback?code=...&state=...
```

### 4. OAuth Callback Processing (Server)

1. Validate state
2. Exchange auth code for tokens (short-lived → long-lived for Meta)
3. Fetch provider account metadata
4. **For Facebook/Instagram:** Fetch pages via `me/accounts`. If empty, fall back to `debug_token` granular_scopes (see below)
5. Upsert into `social_accounts`
6. Run a health check to confirm token validity
7. Redirect user back to the integrations page

#### Facebook Login for Business – `me/accounts` Fallback

**Problem:** When using Facebook Login for Business (FLIB), the `me/accounts` endpoint can return empty `{"data":[]}` even though the user granted page access and all permissions show as granted. This affects non-tester users despite the app being in Live mode with all permissions approved through App Review.

**Root cause:** FLIB grants granular page-level access that is visible in the `debug_token` API response (`granular_scopes` field) but not returned by `me/accounts`.

**Solution (implemented Feb 2025):** When `me/accounts` returns empty:

1. Call the **Debug Token API** (`GET /v21.0/debug_token`) using the App Token to inspect the user's token
2. Extract page IDs from `granular_scopes` where `scope` is `pages_show_list` or `pages_manage_posts`
3. Fetch each page directly via `GET /{page-id}?fields=id,name,access_token,...` using the user's access token
4. Use the directly-fetched page data (including page access tokens) as the result

**Implementation:** `src/lib/integrations/facebook.ts` – `fetchFacebookPages()`

**OAuth URL parameters:**
- `auth_type=reauthenticate` — Forces fresh login on every connect attempt, preventing cached session issues when multiple users share a browser
- Graph API version: `v21.0`

---

## Reconnect Flow

Triggered when:
- Token expired
- Token refresh failed
- Provider permissions changed

System sets `status = 'error'`.

Uses the same OAuth flow as initial connection.

---

## Disconnect Flow

When user clicks Disconnect:

1. UI calls `DELETE` endpoint.
2. Server marks `status = 'disconnected'`.
3. (Optional) Revoke token via provider API.
4. UI updates to show disconnected state.

Draft publishing jobs will detect missing connections and skip/post errors safely.

---

## Error Handling

Common errors:

- **Invalid state**
  - Mitigation: Fail safely, never continue.

- **Token exchange failure**
  - `status = 'error'`

- **Missing scopes**
  - Inform user to reconnect with correct permissions.

- **Empty `me/accounts` despite granted permissions (Facebook/Instagram)**
  - Caused by Facebook Login for Business granular scopes.
  - Handled automatically by the `debug_token` fallback (see section 4).

- **Provider downtime**
  - Set `status = 'error'` and allow retry.

- **Publishing with disconnected account**
  - Publishing pipeline checks `status = 'connected'` before proceeding.

---

## Security Considerations

- Never store raw tokens in logs.
- Encrypt access/refresh tokens at rest.
- Validate OAuth state strictly.
- Use minimal required scopes.
- Redirect only to whitelisted URLs.

---

## TODO / Open Questions

- Should we add automated periodic token refresh + health checks?
- Should UI display granted permissions for transparency?
- Should connecting a social account trigger optional onboarding flows?

