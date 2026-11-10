// The React search pages print the same shared scripts and head data as the string pages in server/seo.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const { shellParts } = require('../apps/web/lib/shell-parts');
const { seoModel } = require('../apps/web/lib/seo-model');

test('shared scripts are found in index.html', () => {
  const p = shellParts();
  assert.equal(p.before.length, 3);
  assert.ok(p.before[0].includes('__CR') && p.before[1].includes('__PH') && p.before[2].includes('Error reporting'));
  assert.ok(p.gaSrc.startsWith('https://www.googletagmanager.com/gtag/js'));
  assert.ok(p.after[0].includes("gtag('config'"));
  assert.ok(p.sw.includes('serviceWorker') && p.consent.includes('cr_consent') && p.bootCss.includes('.boot'));
});

test('page model: breadcrumbs, structured data and links', () => {
  const m = seoModel({ title: 'Guides | Capitol Receipts', desc: 'd', path: '/guides', route: null, crumbs: [['Guides', null]], ld: [], body: '<h1>Guides</h1>' });
  assert.equal(m.url, 'https://www.capitolreceipts.com/guides');
  assert.deepEqual(m.crumbs, [['Home', '/'], ['Guides', null]]);
  assert.equal(m.ld.at(-1)['@type'], 'BreadcrumbList');
  assert.equal(m.cta, null);
  assert.equal(m.cite, null);
});

test('record pages get the app button and the cite box', () => {
  const m = seoModel({ title: 'Nancy Pelosi | Capitol Receipts', desc: 'd', path: '/member/P000197/nancy-pelosi', route: 'P000197', crumbs: [], ld: [], body: '' }, { today: '2026-11-10' });
  assert.ok(m.cta.href.includes('?app=1'));
  assert.ok(m.cite.text.includes('accessed 2026-11-10') && m.cite.embed.includes('/embed/member/P000197'));
});

test('routes.json: record pages go to the React page, app mode keeps the old handler', () => {
  const fs = require('node:fs');
  for (const f of ['apps/web/routes.json', 'apps/site/routes.json']) {
    const r = JSON.parse(fs.readFileSync(f, 'utf8')).rewrites;
    const rec = r.filter((x) => /seo-page\?t=:t&id=:id$/.test(x.destination) || /seo-page\?t=:t&id=:id&via=www$/.test(x.destination));
    assert.ok(rec.length >= 1, f + ' sends record pages to /seo-page');
    assert.ok(!r.some((x) => /api\/seo\?t=:t/.test(x.destination) && !x.has && f.includes('site')), f + ' no longer proxies records to the old handler');
  }
  const web = JSON.parse(fs.readFileSync('apps/web/routes.json', 'utf8')).rewrites;
  assert.ok(web.some((x) => /api\/seo\?t=:t&id=:id$/.test(x.destination) && x.has?.[0]?.key === 'app'));
});
