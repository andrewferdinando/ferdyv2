import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow social OAuth handshake routes through untouched
  if (pathname.startsWith('/api/integrations/')) {
    return NextResponse.next()
  }

  if (pathname.match(/^\/brands\/[^/]+\/engine-room\/integrations/)) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api/integrations|_next|static|favicon.ico|.*\\.(?:js|css|png|jpg|svg|ico)).*)'],
}


