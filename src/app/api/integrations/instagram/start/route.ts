import type { NextRequest } from 'next/server'
import { POST as handleStart } from '../../[provider]/start/route'

export const runtime = 'nodejs' as const

export function POST(request: NextRequest) {
  return handleStart(request, { params: { provider: 'instagram' } })
}
