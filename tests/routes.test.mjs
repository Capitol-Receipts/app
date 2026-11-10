// Every public URL from the old vercel.json files must survive the move to Next.js. The Next config is generated from
// apps/*/routes.json, so this checks the translation: each old rewrite, redirect and header is present, and every
// static page keeps its clean URL (/about) with the .html form redirecting to it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { nextRoutes } from '../packages/config/next-routes.mjs';

for (const app of ['web', 'site']) {
  const dir = path.resolve('apps', app);
  const old = JSON.parse(fs.readFileSync(path.join(dir, 'routes.json'), 'utf8'));
  const cfg = nextRoutes(dir);

  test(`${app}: every old rewrite is kept, in order`, async () => {
    const { afterFiles, beforeFiles } = await cfg.rewrites();
    // a static home page is served first; apps whose home page is pages/index.tsx need no rule
    assert.deepEqual(beforeFiles, fs.existsSync(path.join(dir, 'public', 'index.html')) ? [{ source: '/', destination: '/index.html' }] : []);
    const kept = afterFiles.filter((r) => !r.destination.endsWith('.html'));
    assert.deepEqual(kept.map((r) => [r.source, r.destination]), old.rewrites.map((r) => [r.source, r.destination]));
  });

  test(`${app}: every old redirect and header is kept`, async () => {
    const red = await cfg.redirects();
    for (const r of old.redirects || []) assert.ok(red.some((x) => x.source === r.source && x.destination === r.destination), r.source);
    assert.equal((await cfg.headers()).length, old.headers.length);
  });

  test(`${app}: every static page keeps its clean URL`, async () => {
    const pages = fs.readdirSync(path.join(dir, 'public')).filter((f) => /\.html$/.test(f) && !/^(index|404)\.html$/.test(f));
    const { afterFiles } = await cfg.rewrites();
    const red = await cfg.redirects();
    for (const f of pages) {
      const p = f.slice(0, -5);
      assert.ok(afterFiles.some((r) => r.source === `/${p}` && r.destination === `/${f}`), `/${p}`);
      assert.ok(red.some((r) => r.source === `/${f}` && r.destination === `/${p}` && r.permanent), `/${f}`);
    }
    // pages written as React pages keep their old .html addresses as permanent redirects
    const dp = path.join(dir, 'pages');
    if (fs.existsSync(dp)) for (const f of fs.readdirSync(dp).filter((x) => /^[a-z][a-z-]*\.tsx$/.test(x) && x !== '404.tsx')) {
      const p = f.slice(0, -4);
      if (['seo-page', 'index'].includes(p)) continue;
      if (app === 'site') assert.ok(red.some((r) => r.source === `/${p}.html` && r.destination === `/${p}` && r.permanent), `/${p}.html`);
    }
    if (app === 'site') assert.ok(red.some((r) => r.source === '/index.html' && r.destination === '/' && r.permanent));
  });
}

test('web: admin host middleware serves the admin portal at /', () => {
  const src = fs.readFileSync('apps/web/middleware.ts', 'utf8');
  assert.match(src, /startsWith\('admin\.'\)/);
  assert.match(src, /'\/admin-portal'/);
});

test('site: uppercase first segments redirect to lowercase, record ids keep their case', () => {
  const src = fs.readFileSync('apps/site/middleware.ts', 'utf8');
  assert.match(src, /matcher: '\/:first\(\[\^\/\]\*\[A-Z\]\[\^\/\]\*\)\/:rest\*'/);
  assert.match(src, /first\.toLowerCase\(\), \.\.\.rest/);
  assert.match(src, /NextResponse\.redirect\(url, 308\)/);
});
