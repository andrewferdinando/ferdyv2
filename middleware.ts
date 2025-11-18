import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(_req: NextRequest) {
  // Temporary pass-through middleware so the app does not crash.
  return NextResponse.next();
}

// Optional – if a config exists already, keep it, but make sure it does NOT
// reference any logic or environment variables. If unsure, just remove the
// config export entirely:
// export const config = {
//   matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
// };
