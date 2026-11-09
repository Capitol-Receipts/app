// The phone app's forced-update gate asks /api/app-version for the oldest version still allowed. The value lives in
// the database (app_meta.min_app_version) with an environment fallback, and any failure must mean "no minimum".
const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/app-version.js');

function call() {
  return new Promise((resolve) => {
    const res = { headers: {}, headersSent: false, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code, headers: this.headers, body: b }); } };
    handler({ url: '/api/app-version', method: 'GET' }, res);
  });
}
const dbReturns = (value, ok = true) => { global.fetch = async () => ({ ok, json: async () => (value === undefined ? [] : [{ value }]) }); };

test.beforeEach(() => { handler._reset(); delete process.env.MIN_SUPPORTED_APP_VERSION; });

test('reads the minimum from the database', async () => {
  dbReturns('1.2.0');
  const r = await call();
  assert.equal(r.code, 200);
  assert.equal(r.body.min, '1.2.0');
  assert.equal(r.headers['cache-control'], 'no-store');
});

test('falls back to MIN_SUPPORTED_APP_VERSION when the database has no row', async () => {
  dbReturns(undefined);
  process.env.MIN_SUPPORTED_APP_VERSION = '1.1.0';
  assert.equal((await call()).body.min, '1.1.0');
});

test('a database failure never locks people out', async () => {
  global.fetch = async () => { throw new Error('down'); };
  assert.equal((await call()).body.min, '0.0.0');
  handler._reset();
  dbReturns(null, false);
  assert.equal((await call()).body.min, '0.0.0');
});

test('ignores values that are not version numbers', async () => {
  dbReturns('<script>');
  process.env.MIN_SUPPORTED_APP_VERSION = 'latest';
  assert.equal((await call()).body.min, '0.0.0');
});

test('the Sentry test endpoint does nothing outside preview deploys', async () => {
  const st = require('../api/sentry-test.js');
  for (const env of [undefined, 'production', 'development']) {
    if (env) process.env.VERCEL_ENV = env; else delete process.env.VERCEL_ENV;
    const r = await new Promise((resolve) => st({ url: '/api/sentry-test', method: 'GET' }, { headersSent: false, status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code, b }); } }));
    assert.equal(r.code, 404, String(env));
  }
});
