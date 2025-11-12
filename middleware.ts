import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/api/integrations/facebook/callback') ||
    pathname.startsWith('/api/integrations/instagram/callback') ||
    pathname.startsWith('/api/integrations/linkedin/callback')
  ) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api/integrations|_next|static|favicon.ico|.*\\.(?:js|css|png|jpg|svg|ico)).*)'],
}


