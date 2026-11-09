// The phone app's forced-update gate asks /api/app-version for the oldest version still allowed.
const test = require('node:test');
const assert = require('node:assert/strict');

function call(handler) {
  return new Promise((resolve) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code, headers: this.headers, body: b }); } };
    handler({}, res);
  });
}

test('no minimum set means every version is allowed', async () => {
  delete process.env.MIN_SUPPORTED_APP_VERSION;
  delete require.cache[require.resolve('../api/app-version.js')];
  const r = await call(require('../api/app-version.js'));
  assert.equal(r.code, 200);
  assert.equal(r.body.min, '0.0.0');
  assert.equal(r.headers['cache-control'], 'no-store');
});

test('the minimum comes from MIN_SUPPORTED_APP_VERSION', async () => {
  process.env.MIN_SUPPORTED_APP_VERSION = '1.2.0';
  const r = await call(require('../api/app-version.js'));
  assert.equal(r.body.min, '1.2.0');
  delete process.env.MIN_SUPPORTED_APP_VERSION;
});
