export type PostJobSummary = {
  id: string
  draft_id: string | null
  channel: string
  status: string
  error: string | null
  external_post_id: string | null
  external_url: string | null
  last_attempt_at?: string | null
}

