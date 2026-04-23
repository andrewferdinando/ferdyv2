// Simple in-memory rate limiter, keyed per route+identifier.
// Sufficient for low-traffic endpoints (e.g. partner registration at 5/hr/IP).
// Note: Vercel serverless functions can be warm-split across instances, so
// this enforces "at most N per window per instance" rather than a global cap —
// acceptable for spam prevention on a marketing endpoint.

type Entry = { count: number; resetAt: number }

const buckets: Map<string, Entry> = new Map()

export interface RateLimitOptions {
  key: string
  max: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(options.key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs
    buckets.set(options.key, { count: 1, resetAt })
    return { allowed: true, remaining: options.max - 1, resetAt }
  }

  if (existing.count >= options.max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: options.max - existing.count,
    resetAt: existing.resetAt,
  }
}

// Best-effort IP extraction from Next.js request headers.
export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]!.trim()
  }
  const real = headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}
