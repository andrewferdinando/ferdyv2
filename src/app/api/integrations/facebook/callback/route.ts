import type { NextRequest } from 'next/server'
import { GET as handleCallback } from '../../[provider]/callback/route'

export const runtime = 'nodejs' as const

export function GET(request: NextRequest) {
  return handleCallback(request, { params: { provider: 'facebook' } })
}
