// Every indexable marketing page is in sitemaps/site.xml, and nothing else (scripts/site_sitemap.py writes it).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const pub = path.join(__dirname, '..', 'apps', 'site', 'public');

test('site.xml lists exactly the indexable marketing pages, each with a date', () => {
  const xml = fs.readFileSync(path.join(pub, 'sitemaps', 'site.xml'), 'utf8');
  const listed = [...xml.matchAll(/<loc>https:\/\/www\.capitolreceipts\.com\/([^<]*)<\/loc><lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g)].map((m) => m[1] || 'index').sort();
  const pages = fs.readdirSync(pub).filter((f) => f.endsWith('.html') && f !== '404.html')
    .filter((f) => !/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(fs.readFileSync(path.join(pub, f), 'utf8')))
    .map((f) => f.slice(0, -5)).sort();
  assert.deepEqual(listed, pages);
  assert.equal((xml.match(/<url>/g) || []).length, pages.length);
});
