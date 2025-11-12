import { getFacebookAuthorizationUrl, handleFacebookCallback, revokeFacebookAccess } from './facebook'
import { getLinkedInAuthorizationUrl, handleLinkedInCallback, revokeLinkedInAccess } from './linkedin'
import type {
  ConnectedAccount,
  OAuthCallbackArgs,
  OAuthCallbackResult,
  OAuthLogger,
  OAuthStartOptions,
  OAuthStartResult,
  SupportedProvider,
} from './types'

export function getAuthorizationUrl(provider: SupportedProvider, options: OAuthStartOptions): OAuthStartResult {
  const normalized = provider === 'instagram' ? 'facebook' : provider

  switch (normalized) {
    case 'facebook':
      return getFacebookAuthorizationUrl(options)
    case 'linkedin':
      return getLinkedInAuthorizationUrl(options)
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

export async function handleOAuthCallback(
  provider: SupportedProvider,
  args: OAuthCallbackArgs,
  logger?: OAuthLogger,
): Promise<OAuthCallbackResult> {
  const normalized = provider === 'instagram' ? 'facebook' : provider

  switch (normalized) {
    case 'facebook':
      return handleFacebookCallback(args, logger)
    case 'linkedin':
      return handleLinkedInCallback(args, logger)
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

export async function revokeProviderAccess(provider: SupportedProvider, account: ConnectedAccount) {
  const normalized = provider === 'instagram' ? 'facebook' : provider

  switch (normalized) {
    case 'facebook':
      await revokeFacebookAccess(account.accountId, account.accessToken)
      break
    case 'linkedin':
      await revokeLinkedInAccess(account.accessToken)
      break
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

