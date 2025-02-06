import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware function will run for every request
export function middleware(request: NextRequest) {
  // Simply return NextResponse.next() to let the request continue
  return NextResponse.next()
}

export const config = {
    matcher: [
      /*
       * Match all request paths except for the ones starting with:
       * - api (API routes)
       * - _next/static (static files)
       * - _next/image (image optimization files)
       * - favicon.ico, sitemap.xml, robots.txt (metadata files)
       */
      '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
  }