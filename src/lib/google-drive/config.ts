/**
 * Google Drive API Configuration
 *
 * Environment variables required:
 * - NEXT_PUBLIC_GOOGLE_CLIENT_ID: OAuth 2.0 Client ID
 * - NEXT_PUBLIC_GOOGLE_API_KEY: API Key for Google Picker
 * - NEXT_PUBLIC_GOOGLE_APP_ID: Google Cloud Project Number
 * - GOOGLE_CLIENT_SECRET: OAuth 2.0 Client Secret (server-side only)
 */

export const GOOGLE_DRIVE_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
  appId: process.env.NEXT_PUBLIC_GOOGLE_APP_ID || '',

  // Scopes for OAuth
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],

  // Discovery docs for the Google APIs
  discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
}

export const GOOGLE_DRIVE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

/**
 * Check if Google Drive integration is configured
 */
export function isGoogleDriveConfigured(): boolean {
  return Boolean(
    GOOGLE_DRIVE_CONFIG.clientId &&
    GOOGLE_DRIVE_CONFIG.apiKey &&
    GOOGLE_DRIVE_CONFIG.appId
  )
}

/**
 * Get the Google Picker configuration
 */
export function getPickerConfig() {
  if (!isGoogleDriveConfigured()) {
    throw new Error('Google Drive is not configured. Please set the required environment variables.')
  }

  return {
    clientId: GOOGLE_DRIVE_CONFIG.clientId,
    developerKey: GOOGLE_DRIVE_CONFIG.apiKey,
    appId: GOOGLE_DRIVE_CONFIG.appId,
  }
}
