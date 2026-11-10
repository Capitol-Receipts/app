// Turns a Vercel routes file (the old vercel.json: headers, redirects, rewrites, cleanUrls) into Next.js config,
// so every public URL keeps working exactly as before the move to Next.js. One source of truth per app: routes.json.
import fs from 'node:fs';
import path from 'node:path';

const htmlPages = (pub) => fs.readdirSync(pub).filter((f) => f.endsWith('.html') && f !== 'index.html' && f !== '404.html')
  .map((f) => f.slice(0, -5));

export function nextRoutes(dir) {
  const v = JSON.parse(fs.readFileSync(path.join(dir, 'routes.json'), 'utf8'));
  const pages = v.cleanUrls ? htmlPages(path.join(dir, 'public')) : [];
  const keep = (r) => ({ source: r.source, destination: r.destination, ...(r.has ? { has: r.has } : {}) });
  return {
    async headers() { return (v.headers || []).map((h) => ({ source: h.source, headers: h.headers, ...(h.has ? { has: h.has } : {}) })); },
    async redirects() {
      const own = (v.redirects || []).map((r) => ({ ...keep(r), permanent: r.permanent ?? r.statusCode !== 307 }));
      // cleanUrls: /about.html and /index.html answer with a permanent redirect to /about and /
      const clean = v.cleanUrls ? [{ source: '/index.html', destination: '/', permanent: true },
        ...pages.map((p) => ({ source: `/${p}.html`, destination: `/${p}`, permanent: true }))] : [];
      return [...clean, ...own];
    },
    async rewrites() {
      return {
        // a static home page (apps/web) is served before any page route; apps with a pages/index.tsx need no rule
        beforeFiles: fs.existsSync(path.join(dir, 'public', 'index.html')) ? [{ source: '/', destination: '/index.html' }] : [],
        // cleanUrls: /about serves about.html; checked after real files, before the old rewrites
        afterFiles: [...pages.map((p) => ({ source: `/${p}`, destination: `/${p}.html` })), ...(v.rewrites || []).map(keep)],
        fallback: [],
      };
    },
  };
}
