/* Cached, read-only window onto the public tables. Browsers ask /api/db?q=<path>; Vercel's CDN keeps each answer for
   5 minutes (and serves the last good copy for up to a day while it refreshes or if the database is slow), so a traffic
   spike costs the database one request per URL per few minutes instead of one per visitor. Bytes are passed through
   still gzipped, so even the largest payload stays small. Only public tables and get_light are allowed. */
const https = require('https');
const zlib = require('zlib');

const HOST = 'hxgckcriehvrolwnabpd.supabase.co';
const KEY = 'sb_publishable_jiwF5q1sFMuaGXLKg6FKAQ_3rCjcZ1J'; // public, read-only
const ALLOW = new Set(['members', 'nominations', 'roll_calls', 'photos', 'app_meta', 'people', 'careers', 'appointees', 'bills', 'pacs', 'lobby_clients', 'committees', 'zip_districts', 'corrections', 'races', 'outside_groups', 'congress_votes', 'companies', 'member_extras', 'caucuses', 'judges', 'vote_index', 'lobby_firms', 'ethics_matters', 'rpc/get_light', 'rpc/vote_slice']);
const OK_CC = 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400, stale-if-error=86400';

function upstream(path, range, count) {
  const headers = { apikey: KEY, Accept: 'application/json', 'Accept-Encoding': 'gzip' };
  if (range) { headers.Range = range; headers['Range-Unit'] = 'items'; }
  if (count) headers.Prefer = 'count=exact';
  return new Promise((resolve, reject) => {
    const r = https.get({ host: HOST, path: '/rest/v1/' + path, headers, timeout: 20000 }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    r.on('timeout', () => r.destroy(new Error('timeout')));
    r.on('error', reject);
  });
}

async function withRetry(q, range, count) {
  let r = null;
  for (let i = 0; i < 2; i++) { // one retry only, so a struggling database isn't hit with a retry storm
    try { r = await upstream(q, range, count); } catch (e) { return r; }
    if (r && r.status < 500) return r;
    await new Promise((f) => setTimeout(f, 1500));
  }
  return r;
}

// Per-instance memory: requests for the same URL arriving together share one database call, a fresh copy is reused
// for a minute, and if the database fails the last good copy (up to a day old) is served instead of an error.
const MEM = new Map(), INFLIGHT = new Map(), FRESH = 60e3, KEEP = 864e5, MAX_BYTES = 300e6;
let memBytes = 0;
function remember(key, r) {
  const old = MEM.get(key); if (old) memBytes -= old.r.body.length;
  MEM.delete(key); MEM.set(key, { at: Date.now(), r }); memBytes += r.body.length;
  for (const [k, v] of MEM) { if (memBytes <= MAX_BYTES) break; MEM.delete(k); memBytes -= v.r.body.length; }
}
async function shared(key, load) {
  const hit = MEM.get(key);
  if (hit && Date.now() - hit.at < FRESH) return hit.r;
  if (!INFLIGHT.has(key)) INFLIGHT.set(key, load().finally(() => INFLIGHT.delete(key)));
  const r = await INFLIGHT.get(key);
  if (r && r.status < 400) { remember(key, r); return r; }
  if (hit && Date.now() - hit.at < KEEP && (!r || r.status >= 500)) return hit.r;
  return r;
}

module.exports = async (req, res) => {
  const send = (status, body, cc) => { res.statusCode = status; res.setHeader('Cache-Control', cc); res.setHeader('Content-Type', 'application/json'); res.end(body); };
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, '{"error":"GET only"}', 'no-store');
  const sp = new URL(req.url, 'http://x').searchParams;
  const q = sp.get('q') || '', range = sp.get('range') || '', count = sp.get('count') === '1';
  if (range && !/^\d{1,7}-\d{1,7}$/.test(range)) return send(400, '{"error":"bad range"}', 'public, s-maxage=3600');
  const table = q.split('?')[0];
  if (!ALLOW.has(table) || q.length > 2000 || /[\r\n]/.test(q)) return send(400, '{"error":"not allowed"}', 'public, s-maxage=3600');

  const r = await shared(q + '|' + range + '|' + (count ? 1 : 0), () => withRetry(q, range, count));
  if (!r) return send(503, '{"error":"database unavailable"}', 'no-store');
  if (r.headers['content-range']) res.setHeader('Content-Range', r.headers['content-range']);
  if (r.status >= 400) {
    let eb = r.body; try { if (r.headers['content-encoding'] === 'gzip') eb = zlib.gunzipSync(eb); } catch (e) { /* keep raw */ }
    return send(r.status, eb.toString('utf8').slice(0, 500), r.status >= 500 ? 'no-store' : 'public, s-maxage=60');
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (r.headers['content-encoding']) res.setHeader('Content-Encoding', r.headers['content-encoding']);
  res.setHeader('Cache-Control', OK_CC);
  res.setHeader('CDN-Cache-Control', OK_CC);
  res.end(r.body);
};
