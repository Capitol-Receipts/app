/* One member photo as an image file (/face/<bioguide id>.webp). Pages load only the faces on screen, and the CDN keeps
   each one for a week, so the database is asked about each photo a few times a week at most. */
const https = require('https');
const HOST = 'hxgckcriehvrolwnabpd.supabase.co';
const KEY = 'sb_publishable_jiwF5q1sFMuaGXLKg6FKAQ_3rCjcZ1J'; // public, read-only
const CC = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000, stale-if-error=2592000';

function get(path) {
  return new Promise((resolve, reject) => {
    const r = https.get({ host: HOST, path: '/rest/v1/' + path, headers: { apikey: KEY, Accept: 'application/json' }, timeout: 15000 }, (res) => {
      const c = []; res.on('data', (d) => c.push(d)); res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(c) })); res.on('error', reject);
    });
    r.on('timeout', () => r.destroy(new Error('timeout'))); r.on('error', reject);
  });
}

module.exports = async (req, res) => {
  const id = new URL(req.url, 'http://x').searchParams.get('id') || '';
  const miss = (cc) => { res.statusCode = 404; res.setHeader('Cache-Control', cc); res.end(); };
  if (!/^[A-Z]\d{6}$/.test(id)) return miss('public, s-maxage=86400');
  try {
    const r = await get(`photos?id=eq.${id}&select=img`);
    if (r.status !== 200) { res.statusCode = 502; res.setHeader('Cache-Control', 'no-store'); return res.end(); }
    const row = JSON.parse(r.body.toString())[0];
    if (!row || !row.img) return miss('public, s-maxage=86400');
    const img = Buffer.from(row.img, 'base64');
    res.statusCode = 200;
    res.setHeader('Content-Type', img[0] === 0xff ? 'image/jpeg' : img[0] === 0x89 ? 'image/png' : 'image/webp');
    res.setHeader('Cache-Control', CC); res.setHeader('CDN-Cache-Control', CC);
    res.end(img);
  } catch (e) { res.statusCode = 502; res.setHeader('Cache-Control', 'no-store'); res.end(); }
};
