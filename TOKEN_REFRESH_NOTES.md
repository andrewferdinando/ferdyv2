# Token Refresh Implementation Notes

## Meta (Facebook/Instagram)

### Key Points
- **Short-lived tokens**: Expire in 1-2 hours
- **Long-lived tokens**: Expire in ~60 days
- **Page tokens**: Can be made never-expiring if generated from long-lived user token
- **No automatic refresh**: Must manually exchange tokens before expiry

### Exchange Flow

**1. Short-lived → Long-lived User Token**
```
GET https://graph.facebook.com/v24.0/oauth/access_token?
  grant_type=fb_exchange_token&
  client_id={app-id}&
  client_secret={app-secret}&
  fb_exchange_token={short-lived-token}

Response:
{
  "access_token": "{long-lived-user-token}",
  "token_type": "bearer",
  "expires_in": 5183944  // ~60 days in seconds
}
```

**2. Long-lived User Token → Never-expiring Page Token**
```
GET https://graph.facebook.com/v24.0/{user-id}/accounts?
  access_token={long-lived-user-token}

Response:
{
  "data": [{
    "access_token": "{never-expiring-page-token}",
    "name": "Page Name",
    "id": "{page-id}"
  }]
}
```

### Instagram
- Instagram Business Accounts use the same token as their linked Facebook Page
- Same refresh flow as Facebook Pages

### Implementation Strategy
1. On initial connection, immediately exchange for long-lived token
2. For Pages: Get never-expiring page token
3. Before publishing: Check if token expires within 7 days
4. If yes: Re-exchange for new long-lived token
5. Update `token_encrypted` and `token_expires_at` in database

---

## LinkedIn

### Key Points
- **Access tokens**: Expire in 60 days
- **Refresh tokens**: Provided and can be used to get new access tokens
- **Can refresh indefinitely**: As long as you refresh before expiry

### Refresh Flow

```
POST https://www.linkedin.com/oauth/v2/accessToken
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token={refresh-token}&
client_id={app-id}&
client_secret={app-secret}

Response:
{
  "access_token": "{new-access-token}",
  "expires_in": 5184000,  // ~60 days
  "refresh_token": "{new-refresh-token}",  // Optional: may be same or new
  "refresh_token_expires_in": 31536000  // ~1 year
}
```

### Implementation Strategy
1. On initial connection, store both access_token and refresh_token
2. Before publishing: Check if token expires within 7 days
3. If yes: Use refresh_token to get new access_token
4. Update `token_encrypted`, `refresh_token_encrypted`, and `token_expires_at`

---

## Implementation Plan

### Phase 1: Create Token Refresh Functions

**File**: `/src/lib/social/token-refresh.ts`

Functions:
- `refreshMetaToken(socialAccount)` - Exchange for new long-lived token
- `refreshLinkedInToken(socialAccount)` - Use refresh token to get new access token
- `shouldRefreshToken(expiresAt)` - Check if token expires within 7 days

### Phase 2: Integrate into Publish Flow

**File**: `/src/server/publishing/publishJob.ts`

Before publishing:
1. Load social_account
2. Check `token_expires_at`
3. If expires within 7 days, call appropriate refresh function
4. Update database with new token
5. Proceed with publishing

### Phase 3: Handle Refresh Failures

If refresh fails:
1. Update `social_accounts.status = 'disconnected'`
2. Send email notification to brand admins
3. Fail the publish job with clear error message

---

## Environment Variables Needed

- `FACEBOOK_APP_ID` - Already exists
- `FACEBOOK_APP_SECRET` - Already exists
- `LINKEDIN_CLIENT_ID` - Already exists
- `LINKEDIN_CLIENT_SECRET` - Already exists

---

## Testing Plan

1. Test Meta token refresh with a token expiring soon
2. Test LinkedIn token refresh with a token expiring soon
3. Test publish flow with auto-refresh
4. Test disconnection email when refresh fails
