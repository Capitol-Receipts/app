/* Server side of a React search page: runs the data builder, applies the same rules as server/seo.js (app domain sends
visitors to www, one canonical address per record, 404 pages stay out of search) and sets the same cache headers. */
const T = require('../server/_seo_types');
const { shellParts } = require('./shell-parts');
const { seoModel } = require('./seo-model');
const { CSS_TEXT } = require('./seo-chrome');
const { SITE, notFound } = T;

const clean = (x) => JSON.parse(JSON.stringify(x));

// kind: the type name used in addresses ('guides'); hub: build the directory page; one: build a record page by id
async function seoProps({ req, res, query }, kind, { hub, one, id }) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
  const onApp = host === 'app.capitolreceipts.com';
  const appMode = onApp && query.app === '1';
  const asked = id == null ? `/${kind}` : `/${kind}/${encodeURIComponent(id)}`;
  // the app's domain is for using the app; every public page lives on www.capitolreceipts.com
  if (onApp && !appMode && query.via !== 'www') return { redirect: { destination: SITE + asked, statusCode: 301 } };
  let pg = id == null ? await hub() : await one(id);
  const missing = !pg;
  if (!pg) pg = notFound(id == null ? `/${kind}` : `/${kind}/${id}`);
  if (id != null && !missing && pg.status !== 404 && pg.path !== asked) return { redirect: { destination: pg.path + (appMode ? '?app=1' : ''), statusCode: 301 } };
  const status = pg.status || 200;
  res.statusCode = status;
  const cc = status === 200 ? 'public, max-age=600, s-maxage=604800, stale-while-revalidate=2592000' : 'public, max-age=60, s-maxage=600';
  res.setHeader('Cache-Control', cc); res.setHeader('CDN-Cache-Control', cc);
  res.setHeader('Vary', 'Accept-Encoding');
  const p = shellParts();
  return { props: { m: clean(seoModel(pg, { appMode })), parts: { before: p.before, gaSrc: p.gaSrc, after: p.after, bootCss: p.bootCss, sw: p.sw, consent: p.consent, css: CSS_TEXT } } };
}
module.exports = { seoProps };
