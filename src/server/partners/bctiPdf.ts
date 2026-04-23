// BCTI (Buyer-Created Tax Invoice) PDF generator.
// Produces an IRD-compliant BCTI for NZ partner commission payouts.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export interface BctiLineItem {
  month: string
  customerReference: string
  amountCents: number
}

export interface BctiPdfInput {
  bctiNumber: string
  issueDate: string
  periodStart: string
  periodEnd: string
  currency: string
  ferdy: {
    legalName: string
    address: string
    gstNumber: string | null
  }
  partner: {
    fullName: string
    tradingName: string
    address: string
    gstNumber: string | null
    gstRegistered: boolean
  }
  lineItems: BctiLineItem[]
  subtotalCents: number
  gstCents: number
  totalCents: number
}

function fmtCents(cents: number, currency: string): string {
  const formatted = new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: currency.toUpperCase(),
    currencyDisplay: 'narrowSymbol',
  }).format(cents / 100)
  return formatted
}

export async function generateBctiPdf(input: BctiPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()

  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const black = rgb(0.04, 0.04, 0.04)
  const gray = rgb(0.4, 0.4, 0.4)
  const brand = rgb(0.388, 0.4, 0.945) // #6366F1

  const marginX = 48
  let y = height - 56

  // Title
  page.drawText('Buyer-created tax invoice', {
    x: marginX,
    y,
    size: 20,
    font: bold,
    color: black,
  })
  y -= 10
  page.drawLine({
    start: { x: marginX, y },
    end: { x: width - marginX, y },
    thickness: 2,
    color: brand,
  })
  y -= 24

  // IRD compliance sub-heading
  page.drawText('Issued by the recipient under section 24(2) of the Goods and Services Tax Act 1985.', {
    x: marginX,
    y,
    size: 9,
    font: regular,
    color: gray,
  })
  y -= 30

  // Two-column block: Ferdy (buyer) | Partner (supplier)
  const colWidth = (width - marginX * 2 - 24) / 2
  const leftX = marginX
  const rightX = marginX + colWidth + 24
  const blockTop = y

  function drawParty(x: number, topY: number, heading: string, lines: string[]) {
    let ly = topY
    page.drawText(heading, { x, y: ly, size: 9, font: bold, color: gray })
    ly -= 14
    for (const line of lines) {
      if (!line) continue
      // Wrap at approx 60 chars.
      const chunks = wrapText(line, 60)
      for (const c of chunks) {
        page.drawText(c, { x, y: ly, size: 10, font: regular, color: black })
        ly -= 13
      }
    }
    return ly
  }

  const ferdyBlockEnd = drawParty(leftX, blockTop, 'BUYER (ISSUER OF BCTI)', [
    input.ferdy.legalName,
    ...input.ferdy.address.split('\n'),
    input.ferdy.gstNumber ? `GST #: ${input.ferdy.gstNumber}` : '',
  ])

  const partnerLines = [
    input.partner.fullName,
    input.partner.tradingName && input.partner.tradingName !== input.partner.fullName
      ? `t/a ${input.partner.tradingName}`
      : '',
    ...input.partner.address.split('\n'),
    input.partner.gstNumber
      ? `GST #: ${input.partner.gstNumber}`
      : 'Not GST-registered',
  ].filter(Boolean)

  const partnerBlockEnd = drawParty(rightX, blockTop, 'SUPPLIER (PARTNER)', partnerLines)

  y = Math.min(ferdyBlockEnd, partnerBlockEnd) - 14

  // Meta block
  const metaBoxY = y - 4
  page.drawRectangle({
    x: marginX,
    y: metaBoxY - 48,
    width: width - marginX * 2,
    height: 52,
    borderColor: rgb(0.88, 0.88, 0.88),
    borderWidth: 1,
    color: rgb(0.98, 0.98, 1),
  })

  const metaTop = metaBoxY - 16
  const col1 = marginX + 14
  const col2 = marginX + 190
  const col3 = marginX + 370

  page.drawText('BCTI number', { x: col1, y: metaTop, size: 9, font: bold, color: gray })
  page.drawText(input.bctiNumber, { x: col1, y: metaTop - 16, size: 12, font: bold, color: black })

  page.drawText('Issue date', { x: col2, y: metaTop, size: 9, font: bold, color: gray })
  page.drawText(input.issueDate, { x: col2, y: metaTop - 16, size: 12, font: regular, color: black })

  page.drawText('Period covered', { x: col3, y: metaTop, size: 9, font: bold, color: gray })
  page.drawText(`${input.periodStart} to ${input.periodEnd}`, {
    x: col3,
    y: metaTop - 16,
    size: 11,
    font: regular,
    color: black,
  })

  y = metaBoxY - 68

  // Line items table
  page.drawText('Commissions', { x: marginX, y, size: 11, font: bold, color: black })
  y -= 14

  // Header row
  const cMonth = marginX
  const cRef = marginX + 100
  const cAmount = width - marginX

  page.drawLine({
    start: { x: marginX, y: y + 4 },
    end: { x: width - marginX, y: y + 4 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  })
  page.drawText('Month', { x: cMonth, y: y - 10, size: 9, font: bold, color: gray })
  page.drawText('Customer reference', { x: cRef, y: y - 10, size: 9, font: bold, color: gray })
  drawRightAligned(page, 'Amount', cAmount, y - 10, 9, bold, gray)
  y -= 20
  page.drawLine({
    start: { x: marginX, y: y + 4 },
    end: { x: width - marginX, y: y + 4 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  })

  for (const item of input.lineItems) {
    page.drawText(item.month, { x: cMonth, y: y - 10, size: 10, font: regular, color: black })
    const refChunks = wrapText(item.customerReference, 48)
    page.drawText(refChunks[0] ?? '', { x: cRef, y: y - 10, size: 10, font: regular, color: black })
    drawRightAligned(page, fmtCents(item.amountCents, input.currency), cAmount, y - 10, 10, regular, black)
    y -= 18
    if (refChunks.length > 1) {
      for (let i = 1; i < refChunks.length; i++) {
        page.drawText(refChunks[i]!, { x: cRef, y: y - 10, size: 9, font: regular, color: gray })
        y -= 14
      }
    }
  }

  page.drawLine({
    start: { x: marginX, y: y + 4 },
    end: { x: width - marginX, y: y + 4 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  })
  y -= 18

  // Totals
  const totalsLabelX = width - marginX - 220
  const totalsAmountX = cAmount

  page.drawText('Subtotal', { x: totalsLabelX, y: y - 10, size: 10, font: regular, color: black })
  drawRightAligned(page, fmtCents(input.subtotalCents, input.currency), totalsAmountX, y - 10, 10, regular, black)
  y -= 18

  if (input.partner.gstRegistered) {
    page.drawText('GST (15%)', { x: totalsLabelX, y: y - 10, size: 10, font: regular, color: black })
    drawRightAligned(page, fmtCents(input.gstCents, input.currency), totalsAmountX, y - 10, 10, regular, black)
    y -= 18
  } else {
    page.drawText('GST not applicable - supplier not GST-registered', {
      x: totalsLabelX - 60,
      y: y - 10,
      size: 9,
      font: regular,
      color: gray,
    })
    y -= 18
  }

  page.drawLine({
    start: { x: totalsLabelX - 20, y: y + 4 },
    end: { x: width - marginX, y: y + 4 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  })
  y -= 4

  page.drawText('Total due', { x: totalsLabelX, y: y - 14, size: 12, font: bold, color: black })
  drawRightAligned(page, fmtCents(input.totalCents, input.currency), totalsAmountX, y - 14, 13, bold, black)
  y -= 40

  // Payment terms
  page.drawRectangle({
    x: marginX,
    y: y - 46,
    width: width - marginX * 2,
    height: 48,
    borderColor: rgb(0.88, 0.88, 0.88),
    borderWidth: 1,
    color: rgb(0.99, 0.99, 1),
  })
  page.drawText('Payment terms', { x: marginX + 14, y: y - 14, size: 9, font: bold, color: gray })
  page.drawText('Paid by bank transfer within 7 days of issue.', {
    x: marginX + 14,
    y: y - 30,
    size: 10,
    font: regular,
    color: black,
  })

  // Footer
  page.drawText(
    `Questions? Email andrew@ferdy.io · BCTI generated ${input.issueDate}`,
    {
      x: marginX,
      y: 40,
      size: 8,
      font: regular,
      color: gray,
    },
  )

  return await pdf.save()
}

function drawRightAligned(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  rightX: number,
  y: number,
  size: number,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  color: ReturnType<typeof rgb>,
) {
  const textWidth = font.widthOfTextAtSize(text, size)
  page.drawText(text, { x: rightX - textWidth, y, size, font, color })
}

function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxChars) {
      if (current) lines.push(current)
      current = w
    } else {
      current = (current + ' ' + w).trim()
    }
  }
  if (current) lines.push(current)
  return lines
}
