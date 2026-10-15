/* Candidate photos served from our own domain: fetched once from Wikimedia Commons, then kept on Vercel's CDN for a
   year, so visitors never depend on Wikimedia being up or rate-limiting us. Only Wikimedia Commons images are allowed. */
const https = require('https');

const OK = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/(commons|en)\/[^?#\s]+\.(jpe?g|png|webp|gif)$/i;
const UA = 'CapitolReceiptsBot/1.0 (https://www.capitolreceipts.com; admin@squaredawaylabs.com)';

function get(url, hops = 0) {
  return new Promise((resolve, reject) => {
    const r = https.get(url, { headers: { 'User-Agent': UA, Accept: 'image/*' }, timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hops < 2) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        return OK.test(next) ? resolve(get(next, hops + 1)) : reject(new Error('bad redirect'));
      }
      const chunks = [];
      let size = 0;
      res.on('data', (c) => { size += c.length; if (size > 3e6) { r.destroy(new Error('too big')); } else chunks.push(c); });
      res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'] || '', body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    r.on('timeout', () => r.destroy(new Error('timeout')));
    r.on('error', reject);
  });
}

module.exports = async (req, res) => {
  const u = new URL(req.url, 'http://x').searchParams.get('u') || '';
  const fail = (status, cc) => { res.statusCode = status; res.setHeader('Cache-Control', cc); res.end(); };
  if (!OK.test(u)) return fail(400, 'public, s-maxage=86400');
  let r = null;
  for (let i = 0; i < 3 && !r; i++) {   // Wikimedia answers 429 to bursts: back off and try again
    try { const x = await get(u); if (x.status === 200 && /^image\//.test(x.type) && x.body.length) r = x; else if (x.status === 404) return fail(404, 'public, s-maxage=86400'); }
    catch (e) { /* try again */ }
    if (!r) await new Promise((f) => setTimeout(f, 1200 * (i + 1)));
  }
  if (!r) return fail(502, 'no-store');
  res.statusCode = 200;
  res.setHeader('Content-Type', r.type);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('CDN-Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(r.body);
};
