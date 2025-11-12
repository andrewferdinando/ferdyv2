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
}

export type OAuthStartResult = {
  url: string
}

export type OAuthCallbackArgs = {
  code: string
}

export type OAuthCallbackResult = {
  accounts: ConnectedAccount[]
}

