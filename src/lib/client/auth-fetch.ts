import { supabase } from '@/lib/supabase-browser'

/**
 * Fetch wrapper that attaches the current Supabase session token as a Bearer.
 * Throws if the user is not signed in.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    throw new Error('Not signed in')
  }
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(input, { ...init, headers })
}

export function formatCurrencyCents(cents: number, currency: string = 'nzd'): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}
