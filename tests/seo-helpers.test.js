// Public record pages are built on the server from database text. esc() is what keeps a name or bill title from
// injecting HTML; slug() and P() build the permanent addresses search engines index.
const test = require('node:test');
const assert = require('node:assert/strict');
const { esc, slug, P } = require('../apps/web/server/_seo_lib.js');

test('esc neutralises HTML', () => {
  assert.equal(esc('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  assert.equal(esc('Tom & Jerry'), 'Tom &amp; Jerry');
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
});

test('slug makes stable, short, ascii addresses', () => {
  assert.equal(slug('Nancy Pelosi'), 'nancy-pelosi');
  assert.equal(slug('Alexandria Ocasio-Cortez'), 'alexandria-ocasio-cortez');
  assert.equal(slug('Ben Ray Luján'), 'ben-ray-lujan');
  assert.equal(slug("Beto O'Rourke"), 'beto-orourke');
  assert.equal(slug('AT&T Inc.'), 'at-and-t-inc');
  assert.equal(slug(''), '');
  assert.ok(slug('a '.repeat(100)).split('-').length <= 9);
  assert.ok(slug('x'.repeat(200)).length <= 70);
});

test('P builds record paths', () => {
  assert.equal(P('member', 'P000197', 'Nancy Pelosi'), '/member/P000197/nancy-pelosi');
  assert.equal(P('stock', 'BRK.B', ''), '/stock/BRK.B');
  assert.equal(P('bill', '119/hr/1', 'One Big Beautiful Bill Act'), '/bill/119%2Fhr%2F1/one-big-beautiful-bill-act');
});
