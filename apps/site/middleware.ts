// /About and /MEMBER/C000127/... answer at the lowercase address with a permanent redirect, so there is one address
// per page. Only the first path segment is lowercased: record ids (C000127, WA) keep their case.
import { NextResponse, type NextRequest } from 'next/server';
export const config = { matcher: '/:first([^/]*[A-Z][^/]*)/:rest*' };
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const [, first, ...rest] = url.pathname.split('/');
  if (first === first.toLowerCase()) return;
  url.pathname = '/' + [first.toLowerCase(), ...rest].join('/');
  return NextResponse.redirect(url, 308);
}
