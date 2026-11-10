/* Turns a page description from the data builders (title, description, body, crumbs...) into everything the React
search-page component prints. Mirrors head(), frame() and citeBox() in server/seo.js, which still serve the types
that have not moved to React yet. */
const T = require('../server/_seo_types');
const { NAV, NAV_ES, FOOT, addJump } = require('./seo-chrome');
const { HOST, SITE, abs } = T;
const APP = 'https://app.capitolreceipts.com';

function seoModel(pg, { appMode = false, today = new Date().toISOString().slice(0, 10) } = {}) {
  const es = pg.lang === 'es', url = abs(pg.path);
  if (!appMode && pg.body && !pg.jumped) { pg.body = addJump(pg.body, es); pg.jumped = true; }
  const crumbs = [[es ? 'Inicio' : 'Home', HOST + '/'], ...(pg.crumbs || [])];
  const ldCrumbs = [[es ? 'Inicio' : 'Home', HOST + '/'], ...(pg.crumbs || []).map((c) => [c[0], c[1] || url])];
  const ld = [...(pg.ld || []), { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: ldCrumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: c[1] })) }];
  const name = pg.title.replace(/ \| Capitol Receipts$/, '');
  const bio = pg.route && /^[A-Z]\d{6}$/.test(pg.route) ? pg.route : null;
  const cite = pg.route && !pg.noindex ? {
    summary: es ? 'Cita o inserta esta página' : 'Cite or embed this page',
    text: `Capitol Receipts, “${name},” ${url} (${es ? 'consultado el' : 'accessed'} ${today}).`,
    embedHelp: bio ? (es ? 'Para insertar esta ficha en tu sitio, copia este código:' : 'Embed this member’s card on your site:') : null,
    embed: bio ? `<iframe src="${APP}/embed/member/${bio}" title="${name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}" width="420" height="320" style="border:0;max-width:100%" loading="lazy"></iframe>` : null,
  } : null;
  return {
    lang: es ? 'es' : 'en', title: pg.title, desc: pg.desc, url, noindex: !!pg.noindex,
    alt: !pg.noindex && pg.alt ? { en: abs(pg.alt.en), es: abs(pg.alt.es) } : null,
    ogType: pg.ogType || 'website', ogLocale: es ? 'es_US' : 'en_US', image: pg.image || `${SITE}/img/share.png?v=20261015`,
    ld, body: pg.body || '',
    logoHref: es ? '/es/members' : '/', navLabel: es ? 'Explorar' : 'Browse', nav: es ? NAV_ES : NAV,
    crumbs: crumbs.map((c, i) => [c[0], i < crumbs.length - 1 && c[1] ? c[1].replace(HOST, '') || '/' : null]),
    cta: pg.route && !appMode ? { href: `${APP}${pg.path}?app=1${es ? '&lang=es' : ''}`, text: es ? 'Abrir en la app' : 'Open in the app' } : null,
    cite, foot: FOOT, footHow: es ? 'De dónde vienen los datos' : 'Where the data comes from', footAbout: es ? 'Acerca de Capitol Receipts' : 'About Capitol Receipts',
    site: SITE, bootmsg: !!(pg.route && appMode),
  };
}
module.exports = { seoModel };
