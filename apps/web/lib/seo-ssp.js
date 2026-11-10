/* Server side of a React search page: runs the data builder, applies the same rules as server/seo.js (app domain sends
visitors to www, one canonical address per record, 404 pages stay out of search) and sets the same cache headers. */
const T = require('../server/_seo_types');
const { shellParts } = require('./shell-parts');
const { appProps } = require('./app-parts');
const { seoModel } = require('./seo-model');
const { CSS_TEXT } = require('./seo-chrome');
const { SITE, notFound } = T;

const clean = (x) => JSON.parse(JSON.stringify(x));

// kind: the type name used in addresses ('guides'); hub: build the directory page; one: build a record page by id
// the props every record page gets; in app mode the record also carries what the app shell needs
function build(pg, extra) {
  const p = shellParts();
  const out = { m: clean(seoModel(pg, extra)), parts: { before: p.before, gaSrc: p.gaSrc, after: p.after, bootCss: p.bootCss, sw: p.sw, consent: p.consent, css: CSS_TEXT }, app: null };
  if (extra && extra.appMode && pg.route) out.app = { parts: clean(appProps()), route: String(pg.route), es: pg.lang === 'es' };
  return out;
}

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
  return { props: build(pg, { appMode }) };
}
module.exports = { seoProps };


// ---- every other record and directory page: reached through the rewrites in routes.json (?t=member&id=...) ----
const ESP = require('../server/_seo_es');
const RK = require('../server/_seo_rank');
const ES_TYPES = new Set(['member', 'state', 'district', 'race', 'stock', 'official-trades']), ES_HUBS = new Set(['members', 'states', 'elections']);
const OG_TYPES = new Set(['member', 'past-member', 'bill', 'vote', 'pac', 'lobbying', 'company', 'race', 'state', 'district', 'nominee', 'stock', 'official-trades', 'reports']);
const APP = 'https://app.capitolreceipts.com';
const one = (v) => String(Array.isArray(v) ? v[0] : v || '');
const dec = (v) => { try { return decodeURIComponent(v); } catch { return v; } };

function respond(res, pg, extra) {
  const status = pg.status || 200;
  res.statusCode = status;
  const cc = status === 200 ? 'public, max-age=600, s-maxage=604800, stale-while-revalidate=2592000' : 'public, max-age=60, s-maxage=600';
  res.setHeader('Cache-Control', cc); res.setHeader('CDN-Cache-Control', cc); res.setHeader('Vary', 'Accept-Encoding');
  return { props: build(pg, extra) };
}

async function seoGeneric({ req, res, query }) {
  const t = one(query.t), id = one(query.id), slug = one(query.slug);
  const page = Math.max(1, parseInt(one(query.page) || '1', 10) || 1);
  const lang = one(query.lang) === 'es' ? 'es' : 'en';
  if (!t) return { notFound: true };
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
  const onApp = host === 'app.capitolreceipts.com';
  const appMode = onApp && one(query.app) === '1';
  const pre = lang === 'es' ? '/es' : '';
  const asked = `${pre}/${t}/${encodeURIComponent(dec(id))}${slug ? '/' + slug : ''}`;
  const publicPath = id ? asked : `${pre}/${t === 'appointees' ? 'appointees/all' : t}${page > 1 ? `?page=${page}` : ''}`;
  // the app's domain is for using the app; every public page lives on www.capitolreceipts.com
  if (onApp && !appMode && query.via !== 'www') return { redirect: { destination: SITE + publicPath, statusCode: 301 } };
  try {
    let pg;
    if (t === 'rankings') {
      pg = id ? await RK.ranking(dec(id), slug) : await RK.index();
      return respond(res, pg || notFound(publicPath), {});
    }
    const HUBS = lang === 'es' ? ESP.HUBS : T.HUBS, PAGES = lang === 'es' ? ESP.PAGES : T.PAGES;
    if (!id && HUBS[t]) pg = await HUBS[t](page);
    else if (id && PAGES[t]) pg = await PAGES[t](dec(id));
    // English and Spanish versions point at each other
    if (pg && pg.status !== 404 && !pg.noindex && ((id && ES_TYPES.has(t)) || (!id && ES_HUBS.has(t) && page === 1))) {
      const en = pg.path.replace(/^\/es(?=\/)/, ''); pg.alt = { en, es: '/es' + en };
    }
    if (!pg) pg = notFound(id ? `/${t}/${id}` : `/${t}`);
    // one canonical address per record
    if (id && pg.status !== 404 && OG_TYPES.has(t)) pg.image = `${APP}/og/${t}/${encodeURIComponent(dec(id))}.png?v=${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    if (id && pg.status !== 404 && PAGES[t] && pg.path !== asked) return { redirect: { destination: pg.path + (appMode ? `?app=1${lang === 'es' ? '&lang=es' : ''}` : ''), statusCode: 301 } };
    return respond(res, pg, { appMode });
  } catch (e) {
    console.error(t, id, e);
    res.setHeader('Retry-After', '600');
    const out = respond(res, { title: 'Capitol Receipts', desc: 'Temporarily unavailable.', path: publicPath, noindex: true, route: null, body: '<h1>Back in a moment</h1><p>We couldn’t load this page. Please try again in a minute.</p>' }, {});
    res.statusCode = 503; res.setHeader('Cache-Control', 'no-store'); res.setHeader('CDN-Cache-Control', 'no-store');
    return out;
  }
}
module.exports.seoGeneric = seoGeneric;
module.exports.respond = respond;
