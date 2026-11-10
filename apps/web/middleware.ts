// admin.capitolreceipts.com serves the admin portal at its root.
import { NextResponse, type NextRequest } from 'next/server';
export const config = { matcher: '/' };
export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase();
  if (host.startsWith('admin.')) return NextResponse.rewrite(new URL('/admin-portal', req.url));
}
