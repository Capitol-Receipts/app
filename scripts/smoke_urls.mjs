import http from 'node:http';
// Compares how two servers answer the same public URLs (status, redirect target, content type).
//   node scripts/smoke_urls.mjs <new-base> <old-base> [host-header] < urls.txt
// Used to prove the Next.js build keeps every URL. Sends one GET per URL, one at a time.
const [base, ref, host] = process.argv.slice(2);
const urls = (await new Response(process.stdin).text()).split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
const norm = (loc, b) => (loc || '').replace(b, '').replace(/^https:\/\/(app|www)\.capitolreceipts\.com/, '');
// Local server: plain http with a real Host header (fetch can't set Host). Remote: fetch.
const local = (b, u, h) => new Promise((resolve) => {
  const req = http.get(b + u, { headers: h ? { host: h } : {}, timeout: 30000 }, (r) => {
    r.resume();
    resolve({ s: r.statusCode, l: norm(r.headers.location, b), t: (r.headers['content-type'] || '').split(';')[0] });
  });
  req.on('error', (e) => resolve({ s: 'ERR', l: '', t: e.code || e.name }));
  req.on('timeout', () => req.destroy(new Error('timeout')));
});
const hit = async (b, u, h) => {
  if (b.startsWith('http://')) return local(b, u, h);
  try {
    const r = await fetch(b + u, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
    return { s: r.status, l: norm(r.headers.get('location'), b), t: (r.headers.get('content-type') || '').split(';')[0] };
  } catch (e) { return { s: 'ERR', l: '', t: e.cause?.code || e.name }; }
};
let bad = 0;
for (const u of urls) {
  const a = await hit(base, u, host), b = await hit(ref, u);
  const redir = String(a.s)[0] === '3', same = (x, y) => x.replace(/^\/$/, '') === y.replace(/^\/$/, '');
  const ok = String(a.s)[0] === String(b.s)[0] && same(a.l, b.l) && (redir || String(a.s)[0] === '4' || a.t === b.t);
  if (!ok) bad++;
  console.log(`${ok ? 'same' : 'DIFF'}  ${u}  new ${a.s} ${a.t} ${a.l}  |  old ${b.s} ${b.t} ${b.l}`);
}
console.log(bad ? `${bad} of ${urls.length} differ` : `all ${urls.length} match`);
process.exit(bad ? 1 : 0);
