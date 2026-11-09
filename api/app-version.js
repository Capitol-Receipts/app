/* The oldest phone app version still allowed, read by the update gate in app/js/native.js.
   Set it in the database: app_meta row min_app_version (for example "1.2.0"); the admin can change it without a deploy.
   MIN_SUPPORTED_APP_VERSION in Vercel is a fallback. Anything unreadable means no minimum, so a database problem
   never locks people out of the app. */
const { watch } = require('./_watch');
const URL_ = 'https://hxgckcriehvrolwnabpd.supabase.co/rest/v1/app_meta?select=value&key=eq.min_app_version';
const KEY = 'sb_publishable_jiwF5q1sFMuaGXLKg6FKAQ_3rCjcZ1J'; // public, read-only
const VERSION = /^\d{1,4}(\.\d{1,4}){0,3}$/;
let cache = { at: 0, min: null };

async function fromDb() {
  if (Date.now() - cache.at < 60e3) return cache.min;
  let min = null;
  try {
    const r = await fetch(URL_, { headers: { apikey: KEY }, signal: AbortSignal.timeout(3000) });
    if (r.ok) { const rows = await r.json(); const v = rows && rows[0] && rows[0].value; if (typeof v === 'string' && VERSION.test(v)) min = v; }
  } catch (e) { /* fall back below */ }
  cache = { at: Date.now(), min };
  return min;
}

async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  const env = process.env.MIN_SUPPORTED_APP_VERSION;
  const min = (await fromDb()) || (env && VERSION.test(env) ? env : '0.0.0');
  res.status(200).json({ min });
}

module.exports = watch(handler);
module.exports._reset = () => { cache = { at: 0, min: null }; };
