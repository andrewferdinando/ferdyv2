import type { NextRequest } from 'next/server'
import { GET as handleCallback } from '../../[provider]/callback/route'

export const runtime = 'nodejs'

export function GET(request: NextRequest) {
  return handleCallback(request, { params: Promise.resolve({ provider: 'facebook' }) })
}
