import { nextRoutes } from '@cr/config/next-routes';
// Handlers live in server/, not api/: Vercel would treat an api/ folder as separate functions and bypass Next.js.
const dir = new URL('.', import.meta.url).pathname;

/** @type {import('next').NextConfig} */
export default {
  ...nextRoutes(dir), // every URL, header and redirect from routes.json (the old vercel.json)
  poweredByHeader: false,
  reactStrictMode: true,
  // files the API reads from disk at run time
  outputFileTracingIncludes: { '/': ['./app-shell/**'], '/go/[id]': ['./app-shell/**'], '/guides': ['./app-shell/**'], '/guides/[id]': ['./app-shell/**'], '/seo-page': ['./app-shell/**'], '/quizscore/[n]': ['./app-shell/**'], '/api/og': ['./server/_fonts/**'] },
  serverExternalPackages: ['@resvg/resvg-js', '@sentry/node'],
};
