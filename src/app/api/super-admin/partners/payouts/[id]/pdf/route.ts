import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { authenticateSuperAdmin } from '@/lib/server/super-admin-auth'

export const runtime = 'nodejs'

interface Ctx {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const user = await authenticateSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params

  const { data: payout, error } = await supabaseAdmin
    .from('partner_payouts')
    .select('id, bcti_number, pdf_storage_path')
    .eq('id', id)
    .single()

  if (error || !payout || !payout.pdf_storage_path) {
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
  }

  const { data: blob, error: dlErr } = await supabaseAdmin.storage
    .from('partner-bctis')
    .download(payout.pdf_storage_path)

  if (dlErr || !blob) {
    console.error('[payouts/pdf] download', dlErr)
    return NextResponse.json({ error: 'Could not fetch PDF' }, { status: 500 })
  }

  const buffer = Buffer.from(await blob.arrayBuffer())

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${payout.bcti_number}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
