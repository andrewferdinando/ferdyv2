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
2. Exchange auth code for tokens
3. Fetch provider account metadata
4. Upsert into `social_accounts`
5. Run a health check to confirm token validity
6. Redirect user back to the integrations page

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

