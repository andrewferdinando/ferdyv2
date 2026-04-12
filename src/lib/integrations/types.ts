export type SupportedProvider = 'facebook' | 'instagram' | 'linkedin'

export type ConnectedAccount = {
  provider: SupportedProvider
  accountId: string
  handle: string
  accessToken: string
  refreshToken?: string | null
  expiresAt?: Date | null
  metadata?: Record<string, unknown>
}

export type OAuthStartOptions = {
  state: string
  redirectUri?: string
}

export type OAuthStartResult = {
  url: string
}

export type OAuthCallbackArgs = {
  code: string
  redirectUri?: string
}

export type FacebookPageData = {
  id: string
  name: string
  access_token: string
  instagram_business_account?: { id: string }
  picture?: { data?: { url?: string } }
  category?: string
}

export type OAuthCallbackResult = {
  accounts: ConnectedAccount[]
  allPages?: FacebookPageData[]
  facebookUserId?: string | null
}

export type OAuthLogger = (event: string, payload: Record<string, unknown>) => void


