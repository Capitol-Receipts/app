// Every indexable marketing page is in sitemaps/site.xml, and nothing else (scripts/site_sitemap.py writes it).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const site = path.join(__dirname, '..', 'apps', 'site'), pub = path.join(site, 'public'), pagesDir = path.join(site, 'pages');

test('site.xml lists exactly the indexable marketing pages, each with a date', () => {
  const xml = fs.readFileSync(path.join(pub, 'sitemaps', 'site.xml'), 'utf8');
  const listed = [...xml.matchAll(/<loc>https:\/\/www\.capitolreceipts\.com\/([^<]*)<\/loc><lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g)].map((m) => m[1] || 'index').sort();
  const pages = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.tsx') && !/^(404|_document)\.tsx$/.test(f))
    .filter((f) => !/<meta\s+key="[^"]*"\s+name="robots"\s+content="[^"]*noindex/i.test(fs.readFileSync(path.join(pagesDir, f), 'utf8')))
    .map((f) => f.slice(0, -4)).sort();
  assert.deepEqual(listed, pages);
  assert.equal((xml.match(/<url>/g) || []).length, pages.length);
});
