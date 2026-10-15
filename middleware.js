// admin.capitolreceipts.com serves the admin portal at its root (a static index.html would otherwise win over rewrites).
export const config = { matcher: '/' };
export default function middleware(req) {
  const host = (req.headers.get('host') || '').toLowerCase();
  if (host.startsWith('admin.')) {
    return new Response(null, { headers: { 'x-middleware-rewrite': new URL('/admin', req.url).toString() } });
  }
}
