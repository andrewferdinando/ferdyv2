import { CHANNEL_PROVIDER_MAP, getChannelLabel } from '@/lib/channels'
import type { PostJobSummary } from '@/types/postJobs'
import type { SocialAccountSummary } from '@/hooks/useSocialAccounts'

export type ActionType = 'reconnect' | 'retry' | 'edit'

export interface ActionButton {
  type: ActionType
  label: string
  /** Provider to reconnect (only for 'reconnect' type) */
  provider?: string
}

export interface ActionableMessage {
  headline: string
  explanation: string
  instruction: string
  actions: ActionButton[]
  severity: 'error' | 'warning'
}

/**
 * Resolves a contextual, actionable message for a draft that needs attention.
 *
 * @param draftStatus - The draft's current status ('failed' | 'partially_published')
 * @param jobs - All post_jobs for this draft
 * @param socialAccounts - All social accounts for the brand
 */
export function resolveActionableMessage(
  draftStatus: string,
  jobs: PostJobSummary[],
  socialAccounts: SocialAccountSummary[],
): ActionableMessage {
  const failedJobs = jobs.filter((j) => j.status === 'failed')
  const succeededJobs = jobs.filter((j) => j.status === 'success')

  // Determine which providers are disconnected among the failed channels
  const disconnectedProviders = new Set<string>()
  const failedChannelLabels: string[] = []
  const succeededChannelLabels: string[] = []

  for (const job of failedJobs) {
    const provider = CHANNEL_PROVIDER_MAP[job.channel]
    const label = getChannelLabel(job.channel)
    failedChannelLabels.push(label)

    if (provider) {
      const account = socialAccounts.find((a) => a.provider === provider)
      if (!account || account.status !== 'connected') {
        disconnectedProviders.add(provider)
      }
    }
  }

  for (const job of succeededJobs) {
    succeededChannelLabels.push(getChannelLabel(job.channel))
  }

  const isPartial = draftStatus === 'partially_published'
  const hasDisconnected = disconnectedProviders.size > 0

  // Format provider names for display
  const providerNames: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
  }
  const disconnectedNames = Array.from(disconnectedProviders).map(
    (p) => providerNames[p] || p,
  )

  // Build headline
  let headline: string
  if (isPartial) {
    headline = `Published to ${succeededChannelLabels.join(', ')}, failed on ${failedChannelLabels.join(', ')}`
  } else if (hasDisconnected) {
    headline = `${disconnectedNames.join(' and ')} account disconnected`
  } else {
    headline = 'Publishing failed'
  }

  // Build explanation and instruction
  let explanation: string
  let instruction: string

  if (hasDisconnected) {
    const reconnectList = disconnectedNames.join(' and ')
    explanation = `The ${reconnectList} connection was lost, so Ferdy couldn't publish to ${failedChannelLabels.join(', ')}.`
    instruction = `Reconnect your ${reconnectList} account, then come back and retry.`
  } else {
    explanation = `Publishing to ${failedChannelLabels.join(', ')} failed due to an unexpected error.`
    instruction = 'Your accounts are still connected. Try retrying now.'
  }

  // Build actions
  const actions: ActionButton[] = []

  if (hasDisconnected) {
    for (const provider of disconnectedProviders) {
      actions.push({
        type: 'reconnect',
        label: `Reconnect ${providerNames[provider] || provider}`,
        provider,
      })
    }
  }

  actions.push({
    type: 'retry',
    label: isPartial ? 'Retry failed' : 'Retry',
  })

  actions.push({
    type: 'edit',
    label: 'Edit post',
  })

  return {
    headline,
    explanation,
    instruction,
    actions,
    severity: isPartial ? 'warning' : 'error',
  }
}
