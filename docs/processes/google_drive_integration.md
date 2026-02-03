# Process: Google Drive Integration for Asset Upload

## Purpose

Allow users to import images and videos directly from their Google Drive into the Content Library and Category Wizard, in addition to the existing device upload functionality.

This provides a convenient way for users who store their media assets in Google Drive to quickly import them into Ferdy without first downloading to their device.

---

## Current Status: Implementation Complete, Pending Google Verification

The code implementation is complete and functional. However, Google requires OAuth consent screen verification for apps requesting sensitive scopes like `drive.readonly`. This verification process can take several weeks.

**The integration is currently dormant** - without the required environment variables, the UI behaves exactly like the original upload button (no dropdown, no Google-related code runs).

---

## Scope

**Includes**
- Google Picker API integration for file selection
- OAuth 2.0 flow for user authorization
- Server-side proxy for downloading files from Google Drive
- File validation (same rules as direct upload)
- Integration with existing `useUploadAsset` hook
- UI dropdown menu combining device upload and Google Drive import

**Excludes**
- Google Drive folder browsing (uses Google's native Picker UI)
- Saving files back to Google Drive
- Google Drive as permanent storage (files are copied to Supabase)

---

## Files Created

### Configuration & Validation

| File | Purpose |
|------|---------|
| `src/lib/google-drive/config.ts` | Environment variable configuration, validation helpers |
| `src/lib/google-drive/validation.ts` | File type/size validation matching direct upload rules |

### API Route

| File | Purpose |
|------|---------|
| `src/app/api/google-drive/download/route.ts` | Server-side proxy to download files from Google Drive (avoids CORS) |

### React Hooks

| File | Purpose |
|------|---------|
| `src/hooks/assets/useGoogleDrivePicker.ts` | Loads Google Picker API, handles OAuth, returns selected files |
| `src/hooks/assets/useGoogleDriveUpload.ts` | Downloads from Drive, passes to existing `useUploadAsset` hook |

### UI Component

| File | Purpose |
|------|---------|
| `src/components/assets/AssetUploadMenu.tsx` | Dropdown menu with "Upload from device" and "Import from Google Drive" options |

---

## Files Modified

| File | Change |
|------|--------|
| `src/app/(dashboard)/brands/[brandId]/engine-room/content-library/page.tsx` | Replaced `UploadAsset` with `AssetUploadMenu` (3 locations) |
| `src/components/wizards/FrameworkItemWizard.tsx` | Replaced `UploadAsset` with `AssetUploadMenu` in Step 4 |

---

## Data Flow

```
User clicks "Import from Google Drive"
    ↓
Google OAuth popup (user signs into their Google account)
    ↓
Google Picker modal (user selects files from their Drive)
    ↓
Client validates file types and sizes
    ↓
Files downloaded via /api/google-drive/download (server proxy)
    ↓
Files passed to existing useUploadAsset hook
    ↓
Upload to Supabase storage + create database record
    ↓
onUploadSuccess(assetIds)
```

---

## Validation Rules

Same as direct upload:

| File Type | Allowed Formats | Max Size |
|-----------|-----------------|----------|
| Images | JPEG, PNG, GIF, WebP | 50 MB |
| Videos | MP4 only | 200 MB |

---

## Environment Variables Required

Add to `.env.local` (development) and Vercel (production):

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_API_KEY=your-api-key
NEXT_PUBLIC_GOOGLE_APP_ID=your-project-number
GOOGLE_CLIENT_SECRET=your-client-secret
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console |
| `NEXT_PUBLIC_GOOGLE_API_KEY` | API Key restricted to Google Picker API |
| `NEXT_PUBLIC_GOOGLE_APP_ID` | Google Cloud project number (numeric ID) |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret (server-side only) |

---

## Steps to Complete Activation

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project

### 2. Enable Required APIs

In **APIs & Services → Library**, enable:
- Google Drive API
- Google Picker API

### 3. Configure OAuth Consent Screen

In **APIs & Services → OAuth consent screen**:

1. User Type: **External**
2. App Information:
   - App name: Ferdy
   - User support email: your email
   - Developer contact: your email
3. Scopes: Add `https://www.googleapis.com/auth/drive.readonly`
4. Test Users: Add test accounts (while in testing mode)

### 4. Create OAuth Credentials

In **APIs & Services → Credentials**:

**Create OAuth 2.0 Client ID:**
1. Application type: Web application
2. Name: Ferdy Web Client
3. Authorized JavaScript origins:
   - `https://ferdy.io`
   - `http://localhost:3000`
4. Save the Client ID and Client Secret

**Create API Key:**
1. Click "Create Credentials" → API Key
2. Restrict key to Google Picker API only

### 5. Submit for Verification

In **OAuth consent screen**:

1. Click "Publish App" to move from Testing to Production
2. Google will require verification for the `drive.readonly` scope
3. Submit verification request with:
   - Privacy policy URL
   - Terms of service URL
   - Explanation of how the app uses Drive access
   - Demo video showing the OAuth flow

**Note:** Verification can take 2-6 weeks depending on scope sensitivity.

### 6. Deploy

Once verified:
1. Add environment variables to Vercel
2. Redeploy the application
3. The upload button will now show a dropdown with Google Drive option

---

## Graceful Degradation

If environment variables are not set:
- `isGoogleDriveConfigured()` returns `false`
- `AssetUploadMenu` renders as a simple button (no dropdown)
- No Google-related scripts are loaded
- Behavior is identical to the original `UploadAsset` component

---

## Security Considerations

- Users authenticate with their own Google accounts (Ferdy never sees their Google password)
- Access tokens are short-lived and only used for the current session
- Tokens are never stored in Ferdy's database
- The `drive.readonly` scope provides read-only access (cannot modify user's Drive)
- Server-side download proxy prevents exposing access tokens to the browser

---

## Testing Checklist

When ready to test:

- [ ] Environment variables configured in Vercel
- [ ] Google Drive button appears in Content Library header
- [ ] Google Drive button appears in Category Wizard Step 4
- [ ] Clicking opens Google OAuth flow
- [ ] After authorization, Google Picker modal appears
- [ ] User can navigate their Drive and select files
- [ ] Selected images download and upload to Supabase
- [ ] Selected videos download and upload to Supabase
- [ ] Assets appear in library with correct metadata
- [ ] Invalid file types show appropriate error
- [ ] Files exceeding size limits show appropriate error
- [ ] Multiple file selection works correctly
- [ ] Progress indicator shows during import

---

## Rollback Instructions

To remove the integration entirely:

1. Replace `AssetUploadMenu` with `UploadAsset` in:
   - `src/app/(dashboard)/brands/[brandId]/engine-room/content-library/page.tsx`
   - `src/components/wizards/FrameworkItemWizard.tsx`

2. Delete these files:
   - `src/lib/google-drive/config.ts`
   - `src/lib/google-drive/validation.ts`
   - `src/app/api/google-drive/download/route.ts`
   - `src/hooks/assets/useGoogleDrivePicker.ts`
   - `src/hooks/assets/useGoogleDriveUpload.ts`
   - `src/components/assets/AssetUploadMenu.tsx`

3. Restore original import in modified files:
   ```typescript
   import UploadAsset from '@/components/assets/UploadAsset'
   ```
