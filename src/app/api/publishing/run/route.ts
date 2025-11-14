import { NextRequest, NextResponse } from 'next/server'
import { publishDueDrafts } from '@/server/publishing/publishDueDrafts'

function parseLimitFromRequest(req: NextRequest): number {
  const url = new URL(req.url)
  const raw = url.searchParams.get('limit')
  if (!raw) return 20
  const parsed = Number.parseInt(raw, 10)
  return Number.isNaN(parsed) || parsed <= 0 ? 20 : Math.min(parsed, 100)
}

export async function GET(req: NextRequest) {
  const limit = parseLimitFromRequest(req)
  const summary = await publishDueDrafts(limit)
  return NextResponse.json(summary)
}

export async function POST(req: NextRequest) {
  const limit = parseLimitFromRequest(req)
  const summary = await publishDueDrafts(limit)
  return NextResponse.json(summary)
}

