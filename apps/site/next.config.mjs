import { nextRoutes } from '@cr/config/next-routes';
const dir = new URL('.', import.meta.url).pathname;

/** @type {import('next').NextConfig} */
export default {
  ...nextRoutes(dir), // every URL, header and redirect from routes.json (the old site/vercel.json)
  poweredByHeader: false,
  reactStrictMode: true,
};
