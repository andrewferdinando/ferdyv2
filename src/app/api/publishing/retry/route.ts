import { NextRequest, NextResponse } from 'next/server'
import { retryFailedChannels } from '@/server/publishing/publishDueDrafts'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const draftId = typeof body?.draftId === 'string' ? body.draftId : null

    if (!draftId) {
      return NextResponse.json(
        { error: 'draftId is required' },
        { status: 400 },
      )
    }

    const summary = await retryFailedChannels(draftId)
    return NextResponse.json(summary)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

