/* Cached, read-only window onto the public tables. Browsers ask /api/db?q=<path>; Vercel's CDN keeps each answer for
   5 minutes (and serves the last good copy for up to a day while it refreshes or if the database is slow), so a traffic
   spike costs the database one request per URL per few minutes instead of one per visitor. Bytes are passed through
   still gzipped, so even the largest payload stays small. Only public tables and get_light are allowed. */
const https = require('https');

const HOST = 'hxgckcriehvrolwnabpd.supabase.co';
const KEY = 'sb_publishable_jiwF5q1sFMuaGXLKg6FKAQ_3rCjcZ1J'; // public, read-only
const ALLOW = new Set(['members', 'nominations', 'roll_calls', 'photos', 'app_meta', 'people', 'careers', 'appointees', 'bills', 'pacs', 'lobby_clients', 'committees', 'zip_districts', 'corrections', 'races', 'outside_groups', 'congress_votes', 'companies', 'member_extras', 'caucuses', 'judges', 'rpc/get_light', 'rpc/vote_slice']);
const OK_CC = 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400, stale-if-error=86400';

function upstream(path) {
  return new Promise((resolve, reject) => {
    const r = https.get({ host: HOST, path: '/rest/v1/' + path, headers: { apikey: KEY, Accept: 'application/json', 'Accept-Encoding': 'gzip' }, timeout: 55000 }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    r.on('timeout', () => r.destroy(new Error('timeout')));
    r.on('error', reject);
  });
}

module.exports = async (req, res) => {
  const send = (status, body, cc) => { res.statusCode = status; res.setHeader('Cache-Control', cc); res.setHeader('Content-Type', 'application/json'); res.end(body); };
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, '{"error":"GET only"}', 'no-store');
  const q = new URL(req.url, 'http://x').searchParams.get('q') || '';
  const table = q.split('?')[0];
  if (!ALLOW.has(table) || q.length > 2000 || /[\r\n]/.test(q)) return send(400, '{"error":"not allowed"}', 'public, s-maxage=3600');

  let r;
  for (let i = 0; i < 3; i++) {
    try { r = await upstream(q); } catch (e) { r = null; }
    if (r && r.status < 500) break;
    await new Promise((f) => setTimeout(f, 500 * (i + 1)));
  }
  if (!r) return send(503, '{"error":"database unavailable"}', 'no-store');
  if (r.status >= 400) return send(r.status, r.body.toString('utf8').slice(0, 500), r.status >= 500 ? 'no-store' : 'public, s-maxage=60');

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (r.headers['content-encoding']) res.setHeader('Content-Encoding', r.headers['content-encoding']);
  if (r.headers['content-range']) res.setHeader('Content-Range', r.headers['content-range']);
  res.setHeader('Cache-Control', OK_CC);
  res.setHeader('CDN-Cache-Control', OK_CC);
  res.end(r.body);
};
