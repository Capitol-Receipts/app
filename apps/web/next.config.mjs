import { nextRoutes } from '@cr/config/next-routes';
const dir = new URL('.', import.meta.url).pathname;

/** @type {import('next').NextConfig} */
export default {
  ...nextRoutes(dir), // every URL, header and redirect from routes.json (the old vercel.json)
  poweredByHeader: false,
  reactStrictMode: true,
  // files the API reads from disk at run time
  outputFileTracingIncludes: { '/api/seo': ['./public/index.html'], '/api/og': ['./api/_fonts/**'] },
  serverExternalPackages: ['@resvg/resvg-js', '@sentry/node'],
};
