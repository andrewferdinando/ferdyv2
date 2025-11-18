import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(_req: NextRequest) {
  // Temporary pass-through middleware so the app does not crash.
  return NextResponse.next();
}

// Keep matcher if you need middleware only on certain paths,
// otherwise you can omit this export completely.
// export const config = {
//   matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
// };
