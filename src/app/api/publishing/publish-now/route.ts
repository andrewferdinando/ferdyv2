import { NextRequest, NextResponse } from 'next/server'
import { publishDraftNow } from '@/server/publishing/publishDueDrafts'

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json()

    // Extract draftId (tolerant to field names)
    const draftId = body.draftId || body.draft_id || body.id

    if (!draftId || typeof draftId !== 'string') {
      return NextResponse.json(
        { error: 'draftId is required' },
        { status: 400 }
      )
    }

    // Call publishDraftNow
    const result = await publishDraftNow(draftId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in publish-now endpoint:', error)

    // Handle "Draft not found" specifically
    if (error instanceof Error && error.message === 'Draft not found') {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    // Generic error response
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to publish now',
      },
      { status: 500 }
    )
  }
}

