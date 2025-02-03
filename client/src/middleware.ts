import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: {
  nextUrl: { pathname: any };
  url: string | URL | undefined;
}) {
  const { pathname } = req.nextUrl;
  // Target path for redirection

  if (pathname === '/') {
    const redirectUrl = new URL('/dashboard/properties', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Allow other routes
  return NextResponse.next();
}

// Apply middleware to `/dashboard` and its subpaths
export const config = { matcher: ['/'] };
