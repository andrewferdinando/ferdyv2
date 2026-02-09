import { useState, useCallback, useRef, useEffect } from 'react'
import { isGoogleDriveConfigured, getPickerConfig } from '@/lib/google-drive/config'
import {
  validateGoogleDriveFiles,
  GoogleDriveFile,
} from '@/lib/google-drive/validation'

// Extend Window interface for Google APIs
declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void
      client: {
        init: (config: { apiKey: string; discoveryDocs?: string[] }) => Promise<void>
      }
    }
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string }) => void
          }) => { requestAccessToken: () => void }
        }
      }
      picker: {
        PickerBuilder: new () => GooglePickerBuilder
        ViewId: {
          DOCS_IMAGES_AND_VIDEOS: string
          DOCS_IMAGES: string
          DOCS_VIDEOS: string
        }
        Feature: {
          MULTISELECT_ENABLED: string
        }
        DocsView: new (viewId?: string) => GoogleDocsView
        Action: {
          PICKED: string
          CANCEL: string
        }
      }
    }
  }
}

interface GoogleDocsView {
  setMimeTypes: (mimeTypes: string) => GoogleDocsView
  setIncludeFolders: (include: boolean) => GoogleDocsView
}

interface GooglePickerBuilder {
  setOAuthToken: (token: string) => GooglePickerBuilder
  setDeveloperKey: (key: string) => GooglePickerBuilder
  setAppId: (appId: string) => GooglePickerBuilder
  addView: (view: GoogleDocsView) => GooglePickerBuilder
  enableFeature: (feature: string) => GooglePickerBuilder
  setCallback: (callback: (data: GooglePickerResponse) => void) => GooglePickerBuilder
  build: () => { setVisible: (visible: boolean) => void }
}

interface GooglePickerDocument {
  id: string
  name: string
  mimeType: string
  sizeBytes?: string
}

interface GooglePickerResponse {
  action: string
  docs?: GooglePickerDocument[]
}

export interface PickerFile extends GoogleDriveFile {
  accessToken: string
}

interface UseGoogleDrivePickerResult {
  openPicker: () => void
  loading: boolean
  error: string | null
  isConfigured: boolean
}

interface UseGoogleDrivePickerOptions {
  onSelect: (files: PickerFile[]) => void
  onError?: (error: string) => void
}

// Script loading state
let gapiLoaded = false
let gsiLoaded = false
let pickerApiLoaded = false

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

export function useGoogleDrivePicker({
  onSelect,
  onError,
}: UseGoogleDrivePickerOptions): UseGoogleDrivePickerResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const accessTokenRef = useRef<string | null>(null)
  const tokenClientRef = useRef<{ requestAccessToken: () => void } | null>(null)
  const isConfigured = isGoogleDriveConfigured()

  // Initialize GAPI and GSI
  const initializeGoogleApis = useCallback(async (): Promise<boolean> => {
    try {
      // Load GAPI script
      if (!gapiLoaded) {
        await loadScript('https://apis.google.com/js/api.js')
        gapiLoaded = true
      }

      // Load GSI (Google Sign-In) script
      if (!gsiLoaded) {
        await loadScript('https://accounts.google.com/gsi/client')
        gsiLoaded = true
      }

      // Initialize GAPI client
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('picker', async () => {
          try {
            pickerApiLoaded = true
            resolve()
          } catch (err) {
            reject(err)
          }
        })
      })

      return true
    } catch (err) {
      console.error('Failed to initialize Google APIs:', err)
      return false
    }
  }, [])

  // Get access token via OAuth
  const getAccessToken = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!isConfigured) {
        reject(new Error('Google Drive is not configured'))
        return
      }

      const config = getPickerConfig()

      if (!tokenClientRef.current) {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: config.clientId,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: (response) => {
            if (response.error) {
              reject(new Error(response.error))
              return
            }
            if (response.access_token) {
              accessTokenRef.current = response.access_token
              resolve(response.access_token)
            }
          },
        })
      }

      // If we already have a token, use it
      if (accessTokenRef.current) {
        resolve(accessTokenRef.current)
        return
      }

      // Request a new token
      tokenClientRef.current.requestAccessToken()
    })
  }, [isConfigured])

  // Create and show the picker
  const showPicker = useCallback(
    (accessToken: string) => {
      if (!isConfigured) return

      const config = getPickerConfig()

      // Create view for images and videos
      const view = new window.google.picker.DocsView()
      view.setMimeTypes(
        'image/jpeg,image/png,image/gif,image/webp,video/mp4'
      )
      view.setIncludeFolders(true)

      const picker = new window.google.picker.PickerBuilder()
        .setOAuthToken(accessToken)
        .setDeveloperKey(config.developerKey)
        .setAppId(config.appId)
        .addView(view)
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .setCallback((data: GooglePickerResponse) => {
          if (data.action === window.google.picker.Action.PICKED && data.docs) {
            // Convert to our file format
            const files: PickerFile[] = data.docs.map((doc) => ({
              id: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
              sizeBytes: doc.sizeBytes,
              accessToken,
            }))

            // Validate files
            const validation = validateGoogleDriveFiles(files)
            if (!validation.valid) {
              const errorMsg = validation.error || 'Invalid file selected'
              setError(errorMsg)
              onError?.(errorMsg)
              return
            }

            onSelect(files)
          } else if (data.action === window.google.picker.Action.CANCEL) {
            // User cancelled - don't show error
          }

          setLoading(false)
        })
        .build()

      picker.setVisible(true)
    },
    [isConfigured, onSelect, onError]
  )

  // Main function to open the picker
  const openPicker = useCallback(async () => {
    if (!isConfigured) {
      const errorMsg = 'Google Drive is not configured'
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Initialize APIs if needed
      const initialized = await initializeGoogleApis()
      if (!initialized) {
        throw new Error('Failed to initialize Google APIs')
      }

      // Get access token
      const accessToken = await getAccessToken()

      // Show picker
      showPicker(accessToken)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to open Google Drive picker'
      setError(errorMsg)
      onError?.(errorMsg)
      setLoading(false)
    }
  }, [isConfigured, initializeGoogleApis, getAccessToken, showPicker, onError])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      accessTokenRef.current = null
    }
  }, [])

  return {
    openPicker,
    loading,
    error,
    isConfigured,
  }
}
