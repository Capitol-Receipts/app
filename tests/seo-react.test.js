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
