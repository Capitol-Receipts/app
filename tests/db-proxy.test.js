// The /api/db proxy is the only way browsers read the database through the app's CDN. It must stay read-only and
// limited to public tables: these tests send it requests that should be refused and check none reach the network.
const test = require('node:test');
const assert = require('node:assert/strict');
const https = require('node:https');

let calls = 0;
https.get = () => { calls++; throw new Error('network call in a refused request'); };
https.request = () => { calls++; throw new Error('network call in a refused request'); };
const handler = require('../api/db.js');

function call(method, url) {
  return new Promise((resolve) => {
    const res = { statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(body) { resolve({ status: this.statusCode, headers: this.headers, body: String(body || '') }); } };
    handler({ method, url, headers: {} }, res);
  });
}

test('refuses anything but GET and HEAD', async () => {
  for (const m of ['POST', 'PATCH', 'PUT', 'DELETE']) assert.equal((await call(m, '/api/db?q=members')).status, 405);
});

test('refuses private tables and admin functions', async () => {
  for (const t of ['subscriptions', 'support_requests', 'roadmap_items', 'admins', 'admin_log', 'apple_tokens', 'alert_log',
    'billing_email_log', 'portfolio_goals', 'follows', 'rpc/admin_overview', 'rpc/admin_users', 'rpc/my_plan', 'rpc/refresh_vote_rows']) {
    const r = await call('GET', '/api/db?q=' + encodeURIComponent(t + '?select=*'));
    assert.equal(r.status, 400, t);
  }
});

test('refuses header injection, oversize queries and bad ranges', async () => {
  assert.equal((await call('GET', '/api/db?q=' + encodeURIComponent('members?select=*\r\nX-Evil: 1'))).status, 400);
  assert.equal((await call('GET', '/api/db?q=members?select=' + 'a'.repeat(2100))).status, 400);
  assert.equal((await call('GET', '/api/db?q=members&range=0-abc')).status, 400);
  assert.equal((await call('GET', '/api/db?q=members&range=1-99999999')).status, 400);
});

test('refused requests never reach the database', () => assert.equal(calls, 0));
