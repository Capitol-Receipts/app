// admin.capitolreceipts.com must serve the admin portal at its root; every other host must be left alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import middleware from '../middleware.js';

const req = (host) => ({ url: `https://${host}/`, headers: new Headers({ host }) });

test('admin host is rewritten to /admin', () => {
  const r = middleware(req('admin.capitolreceipts.com'));
  assert.equal(r.headers.get('x-middleware-rewrite'), 'https://admin.capitolreceipts.com/admin');
});

test('other hosts pass through', () => {
  assert.equal(middleware(req('app.capitolreceipts.com')), undefined);
  assert.equal(middleware(req('www.capitolreceipts.com')), undefined);
});
