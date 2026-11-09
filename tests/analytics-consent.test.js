// Analytics opt-in check. The PostHog snippet in index.html must not send anything, or store an id, for visitors in
// Europe and the UK until they accept, for anyone who said no, or for browsers sending Global Privacy Control.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const snippet = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('window.__PH='));
assert.ok(snippet, 'PostHog snippet not found in index.html');

function run({ tz, consent, gpc }) {
  const store = new Map(consent ? [['cr_consent', consent]] : []);
  const sent = [];
  const win = {
    localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) },
    sessionStorage: { getItem: () => null, setItem() {} },
    navigator: { globalPrivacyControl: !!gpc },
    location: { origin: 'https://app.capitolreceipts.com', pathname: '/', host: 'app.capitolreceipts.com' },
    crypto: { randomUUID: () => 'test-id' },
    Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: tz }) }) },
    fetch: (url, opt) => { sent.push(JSON.parse(opt.body).event); return Promise.resolve(); },
    JSON, Date, Math, String,
  };
  win.window = win;
  vm.runInContext(snippet, vm.createContext(win));
  return { sent, win, store };
}

test('US visitors are counted', () => {
  const { sent, store } = run({ tz: 'America/New_York' });
  assert.deepEqual(sent, ['$pageview']);
  assert.ok(store.has('ph_id'));
});

test('visitors in Europe and the UK are not counted until they accept', () => {
  for (const tz of ['Europe/London', 'Europe/Berlin', 'Atlantic/Reykjavik']) {
    const { sent, win, store } = run({ tz });
    assert.deepEqual(sent, [], tz);
    assert.ok(!store.has('ph_id'), tz + ' stored an id before consent');
    win.__track('key_action', {});
    assert.deepEqual(sent, [], tz + ' named event sent before consent');
    win.localStorage.setItem('cr_consent', 'granted');
    win.__phStart();
    assert.deepEqual(sent, ['$pageview'], tz + ' did not start after accepting');
  }
});

test('nobody is counted after saying no', () => {
  assert.deepEqual(run({ tz: 'America/Chicago', consent: 'denied' }).sent, []);
});

test('Global Privacy Control turns analytics off', () => {
  assert.deepEqual(run({ tz: 'America/Los_Angeles', gpc: true }).sent, []);
});

test('an explicit yes is honoured everywhere', () => {
  assert.deepEqual(run({ tz: 'Europe/Paris', consent: 'granted' }).sent, ['$pageview']);
});
