/* Search-friendly pages for app.capitolreceipts.com.

Every record in the app (members, past members, bills, PACs, lobbying groups and firms, committees, caucuses,
judges, companies, races, outside groups, ethics statements, votes, states, districts, appointees, nominees)
gets its own URL with a unique title, description, canonical link, share tags, structured data, breadcrumbs,
readable content and links to related records. Record pages also boot the app, which then opens the same record.
Directory pages (/members, /bills, ...) link to every record so search engines can reach all of them.
Also serves /sitemap.xml, /sitemaps/*.xml and /robots.txt. Reads the public, read-only Supabase API. */
const fs = require('fs'), path = require('path');
const T = require('./_seo_types');
const { HOST, SITE, esc, abs, q, notFound } = T;

let SHELL = null;
const shell = () => SHELL || (SHELL = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8'));

const CSS = `<style id="sr-css">
.sr{--n:#14274e;--r:#c8323a;--i:#0e1116;--s:#5b6069;--l:#e4e6eb;--b:#f6f7f9;font-family:"Schibsted Grotesk",system-ui,sans-serif;color:var(--i);background:#fff;min-height:100vh}
.sr a{color:var(--n)}
.sr-top{background:var(--n);color:#fff}
.sr-top .in{max-width:980px;margin:0 auto;padding:12px 16px;display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center}
.sr-logo{font:800 22px "Barlow Condensed",system-ui,sans-serif;color:#fff!important;text-decoration:none;letter-spacing:-.01em;margin-right:auto}
.sr-logo span{background:var(--r);padding:1px 7px 2px;border-radius:5px;margin-right:3px}
.sr-top nav a{color:#dfe5f1;text-decoration:none;font-weight:600;font-size:14px}
.sr-top nav a:hover{color:#fff;text-decoration:underline}
.sr-main{max-width:980px;margin:0 auto;padding:16px 16px 48px}
.sr-crumbs{font-size:13px;color:var(--s);margin:0 0 14px;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:4px}
.sr-crumbs li+li:before{content:"›";margin-right:4px;color:#9aa0aa}
.sr-crumbs a{color:var(--s)}
.sr-hero{display:flex;gap:16px;align-items:center;margin-bottom:6px}
.sr-hero img{width:84px;height:84px;border-radius:50%;object-fit:cover;flex:none;background:var(--b)}
.sr h1{font:800 clamp(30px,5vw,44px)/1.04 "Barlow Condensed",system-ui,sans-serif;margin:0 0 6px;letter-spacing:-.01em}
.sr-sub{color:var(--s);font-weight:600;margin:0}
.sr-lead{font-size:18px;line-height:1.5;margin:16px 0 20px;max-width:720px}
.sr-facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin:0 0 26px;padding:0}
.sr-facts div{background:var(--b);border-radius:12px;padding:12px 14px}
.sr-facts dt{font-size:13px;color:var(--s);font-weight:600}
.sr-facts dd{margin:2px 0 0;font:700 24px "Barlow Condensed",system-ui,sans-serif}
.sr h2{font:700 24px "Barlow Condensed",system-ui,sans-serif;margin:28px 0 8px}
.sr p{line-height:1.55;max-width:760px}
.sr-list{list-style:none;margin:0;padding:0;border-top:1px solid var(--l)}
.sr-list li{padding:9px 2px;border-bottom:1px solid var(--l);display:flex;justify-content:space-between;gap:12px}
.sr-list li span:last-child{color:var(--s);white-space:nowrap;text-align:right}
.sr-cols{columns:3 220px;column-gap:24px;margin:0;padding:0;list-style:none}
.sr-cols li{break-inside:avoid;padding:3px 0}
.sr-pager{display:flex;flex-wrap:wrap;gap:6px;margin:22px 0}
.sr-pager a,.sr-pager b{padding:6px 11px;border-radius:999px;background:var(--b);text-decoration:none;font-weight:600;font-size:14px}
.sr-pager b{background:var(--n);color:#fff}
.sr-note{font-size:13px;color:var(--s);margin-top:28px}
.sr-foot{border-top:1px solid var(--l);margin-top:36px;padding-top:16px;font-size:14px;color:var(--s);display:flex;flex-wrap:wrap;gap:8px 16px}
.sr-foot a{color:var(--s)}
@media (prefers-color-scheme:dark){.sr{--i:#e9ecf2;--s:#a3abb9;--l:#2a3140;--b:#171c26;background:#0e1219}.sr a{color:#9db6ff}.sr-crumbs a,.sr-foot a{color:var(--s)}.sr-pager b{background:#2c4c9a}}
</style>`;

const NAV = [['/members', 'Members'], ['/bills', 'Bills'], ['/pacs', 'PACs'], ['/lobbying', 'Lobbying'], ['/elections', '2026 races'], ['/states', 'States'], ['/companies', 'Companies']];
const FOOT = [['/members', 'Members of Congress'], ['/past-members', 'Past members'], ['/appointees', 'Appointees'], ['/judges', 'Federal judges'], ['/committees', 'Committees'], ['/caucuses', 'Caucuses'], ['/votes', 'Votes'], ['/bills', 'Bills'], ['/pacs', 'PACs'], ['/lobbying', 'Lobbying groups'], ['/lobbying-firms', 'Lobbying firms'], ['/outside-groups', 'Outside spending'], ['/ethics', 'Ethics statements'], ['/companies', 'Companies'], ['/elections', '2026 elections'], ['/states', 'States']];

function frame(pg) {
  const crumbs = [['Home', HOST + '/'], ...(pg.crumbs || [])];
  const cl = `<ol class="sr-crumbs">${crumbs.map((c, i) => `<li>${i < crumbs.length - 1 && c[1] ? `<a href="${c[1].replace(HOST, '') || '/'}">${esc(c[0])}</a>` : esc(c[0])}</li>`).join('')}</ol>`;
  return `<div class="sr"><header class="sr-top"><div class="in"><a class="sr-logo" href="/"><span>Capitol</span>Receipts</a><nav aria-label="Browse">${NAV.map(([h, l]) => `<a href="${h}">${l}</a>`).join(' ')}</nav></div></header>
<main class="sr-main">${cl}${pg.body}${pg.route ? '<p id="bootmsg" hidden></p>' : ''}
<footer class="sr-foot">${FOOT.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}<a href="${SITE}/how-it-works">Where the data comes from</a><a href="${SITE}">About Capitol Receipts</a></footer></main></div>`;
}

function head(pg) {
  const url = abs(pg.path);
  const img = pg.image || `${SITE}/img/share.png`;
  const crumbs = [['Home', HOST + '/'], ...(pg.crumbs || []).map(c => [c[0], c[1] || url])];
  const ld = [...(pg.ld || []), { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: c[1] })) }];
  return [
    pg.noindex ? '' : `<link rel="canonical" href="${esc(url)}">`,
    pg.noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">',
    '<meta property="og:site_name" content="Capitol Receipts">',
    `<meta property="og:type" content="${pg.ogType || 'website'}">`,
    `<meta property="og:title" content="${esc(pg.title)}">`,
    `<meta property="og:description" content="${esc(pg.desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(img)}">`,
    '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${esc(pg.title)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(pg.title)}">`,
    `<meta name="twitter:description" content="${esc(pg.desc)}">`,
    `<meta name="twitter:image" content="${esc(img)}">`,
    ...ld.map(x => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`),
    CSS,
  ].join('\n');
}

function html(pg) {
  let h = shell();
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(pg.title)}</title>`);
  h = h.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(pg.desc)}">`);
  h = h.replace(/<link rel="canonical"[^>]*>\n?/, '').replace(/<meta property="og:[^>]*>\n?/g, '').replace(/<meta name="twitter:[^>]*>\n?/g, '').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, '').replace(/<meta name="robots"[^>]*>\n?/, '');
  h = h.replace('</head>', head(pg) + '\n</head>');
  const body = frame(pg);
  h = h.replace(/<div id="app">[\s\S]*?<\/div><\/div><\/div>/, `<div id="app">${body}</div>`);
  if (pg.route) h = h.replace('<script>\n/* Supabase', `<script>window.__ROUTE=${JSON.stringify(pg.route)};window.__HOLD=true;</script>\n<script>\n/* Supabase`);
  else {
    // directory pages are plain pages: keep the app's look but don't start the app on them
    h = h.replace(/<nav class="tabbar"[\s\S]*?<\/nav>\n?/, '').replace(/<div id="sheet"[\s\S]*?<\/div><\/div>\n?/, '');
    h = h.replace(/<script>\n\/\* Supabase[\s\S]*?<\/script>/, '');
  }
  return h;
}

function send(res, status, type, body, maxAge) {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', status === 200 ? `public, max-age=600, s-maxage=${maxAge || 21600}, stale-while-revalidate=604800` : 'public, max-age=60, s-maxage=600');
  res.end(body);
}

module.exports = async (req, res) => {
  const u = new URL(req.url, HOST);
  const t = u.searchParams.get('t') || '', id = u.searchParams.get('id') || '', slug = u.searchParams.get('slug') || '';
  const page = Math.max(1, parseInt(u.searchParams.get('page') || '1', 10) || 1);
  try {
    if (t === 'robots') return send(res, 200, 'text/plain; charset=utf-8', `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${HOST}/sitemap.xml\n`, 86400);
    if (t === 'sitemap') return send(res, 200, 'application/xml; charset=utf-8', await T.sitemapIndex(), 21600);
    if (t === 'sitemaps') {
      const xml = await T.sitemapFile(id.replace(/\.xml$/, ''));
      return xml ? send(res, 200, 'application/xml; charset=utf-8', xml, 21600) : send(res, 404, 'text/plain', 'Not found');
    }
    let pg;
    if (!id && T.HUBS[t]) pg = await T.HUBS[t](page);
    else if (id && T.PAGES[t]) pg = await T.PAGES[t](decodeURIComponent(id));
    if (!pg) pg = notFound(id ? `/${t}/${id}` : `/${t}`);
    // send visitors and crawlers to the one canonical address for this record
    const asked = `/${t}/${encodeURIComponent(decodeURIComponent(id))}${slug ? '/' + slug : ''}`;
    if (id && pg.status !== 404 && T.PAGES[t] && pg.path !== asked) {
      res.statusCode = 301; res.setHeader('Location', pg.path); res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400'); return res.end();
    }
    return send(res, pg.status || 200, 'text/html; charset=utf-8', html(pg));
  } catch (e) {
    console.error(t, id, e);
    res.statusCode = 503; res.setHeader('Cache-Control', 'no-store'); res.setHeader('Retry-After', '60');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(html({ title: 'Capitol Receipts', desc: 'Temporarily unavailable.', path: u.pathname, noindex: true, route: null, body: '<h1>Back in a moment</h1><p>We couldn’t load this page. Please try again in a minute.</p>' }));
  }
};
