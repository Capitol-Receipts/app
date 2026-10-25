/* Search-friendly pages for www.capitolreceipts.com (served by the app project; www proxies here).

Every record in the app (members, past members, bills, PACs, lobbying groups and firms, committees, caucuses,
judges, companies, races, outside groups, ethics statements, votes, states, districts, appointees, nominees)
gets its own URL with a unique title, description, canonical link, share tags, structured data, breadcrumbs,
readable content and links to related records. Record pages also boot the app, which then opens the same record.
Directory pages (/members, /bills, ...) link to every record so search engines can reach all of them.
Also serves /sitemap.xml, /sitemaps/*.xml and /robots.txt. Reads the public, read-only Supabase API. */
const fs = require('fs'), path = require('path');
const T = require('./_seo_types');
const ESP = require('./_seo_es');
const RK = require('./_seo_rank');
const ES_TYPES = new Set(['member', 'state', 'district', 'race', 'stock', 'official-trades']), ES_HUBS = new Set(['members', 'states', 'elections']);
const { HOST, SITE, esc, abs, q, notFound } = T;

let SHELL = null;
const shell = () => SHELL || (SHELL = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8'));

const CSS = `<style id="sr-css">
.sr{--n:#14274e;--r:#c8323a;--i:#0e1116;--s:#5b6069;--l:#e4e6eb;--b:#f6f7f9;font-family:"Schibsted Grotesk",system-ui,sans-serif;color:var(--i);background:#fff;min-height:100vh}
.sr a{color:var(--n)}
.sr-top{background:var(--n);color:#fff}
.sr-top .in{max-width:980px;margin:0 auto;padding:12px 16px;display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center}
.sr-logo{font:800 22px "Barlow Condensed",system-ui,sans-serif;color:#fff!important;text-decoration:none;letter-spacing:-.01em;margin-right:auto}
.sr-logo::before{content:"";display:inline-block;width:1.48em;height:1.4em;margin-right:.36em;vertical-align:-.32em;background:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%2222%2011%20156%20147%22%3E%3Cpath%20d%3D%22M95%2016a5%205%200%201%200%2010%200a5%205%200%201%200-10%200ZM97%2018h6v16h-6ZM88%2034h24v20H88ZM58%20104C58%2072%2078%2050%20100%2050S142%2072%20142%20104ZM50%20104h100v8H50ZM57%20112h6v26h-6ZM67%20112h6v26h-6ZM77%20112h6v26h-6ZM87%20112h6v26h-6ZM97%20112h6v26h-6ZM107%20112h6v26h-6ZM117%20112h6v26h-6ZM127%20112h6v26h-6ZM137%20112h6v26h-6ZM46%20138h108v8H46ZM22%20146h156v12H22Z%22%2F%3E%3C%2Fsvg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%2222%2011%20156%20147%22%3E%3Cpath%20d%3D%22M95%2016a5%205%200%201%200%2010%200a5%205%200%201%200-10%200ZM97%2018h6v16h-6ZM88%2034h24v20H88ZM58%20104C58%2072%2078%2050%20100%2050S142%2072%20142%20104ZM50%20104h100v8H50ZM57%20112h6v26h-6ZM67%20112h6v26h-6ZM77%20112h6v26h-6ZM87%20112h6v26h-6ZM97%20112h6v26h-6ZM107%20112h6v26h-6ZM117%20112h6v26h-6ZM127%20112h6v26h-6ZM137%20112h6v26h-6ZM46%20138h108v8H46ZM22%20146h156v12H22Z%22%2F%3E%3C%2Fsvg%3E") center/contain no-repeat}
.sr-logo span{background:var(--r);padding:1px 7px 2px;border-radius:5px;margin-right:3px}
.sr-top nav a{color:#dfe5f1;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;padding:6px 0}
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
.sr-jump{display:flex;flex-wrap:wrap;gap:8px;margin:-6px 0 22px}.sr-jump a{font-size:14px;font-weight:600;text-decoration:none;padding:7px 12px;border-radius:999px;background:var(--b);color:var(--i)}
.sr-more summary{cursor:pointer;font-weight:700;padding:12px 2px;text-decoration:underline;text-underline-offset:3px}.sr-more[open] summary{display:none}
.sr-facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin:0 0 26px;padding:0}
.sr-facts div{background:var(--b);border-radius:12px;padding:12px 14px}
.sr-facts dt{font-size:13px;color:var(--s);font-weight:600}
.sr-facts dd{margin:2px 0 0;font:700 24px "Barlow Condensed",system-ui,sans-serif}
.sr h2{font:700 24px "Barlow Condensed",system-ui,sans-serif;margin:28px 0 8px}
.sr p{line-height:1.55;max-width:760px}
.sr-list{list-style:none;margin:0;padding:0;border-top:1px solid var(--l)}
.sr-list li{padding:9px 2px;border-bottom:1px solid var(--l);display:flex;justify-content:space-between;gap:12px}
.sr-list li span:first-child{min-width:0;overflow-wrap:anywhere}
.sr-list li span:first-child{flex:1 1 auto}
.sr-list li span:last-child{color:var(--s);text-align:right;flex:0 1 auto;max-width:52%;overflow-wrap:normal;word-break:normal}
.sr-list li span.nw{white-space:nowrap;flex:0 0 auto;max-width:none}
.sr-cols{columns:3 220px;column-gap:24px;margin:0;padding:0;list-style:none}
.sr-cols li{break-inside:avoid;padding:3px 0}
.sr-pager{display:flex;flex-wrap:wrap;gap:6px;margin:22px 0}
.sr-pager a,.sr-pager b{padding:6px 11px;border-radius:999px;background:var(--b);text-decoration:none;font-weight:600;font-size:14px}
.sr-pager b{background:var(--n);color:#fff}
.sr-note{font-size:13px;color:var(--s);margin-top:28px}
main.has-cta{padding-bottom:96px}
.sr-cta{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:20;background:var(--n);color:#fff!important;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:999px;box-shadow:0 10px 30px rgba(14,17,22,.28);white-space:nowrap;font-size:15px}
.sr-cta:hover{background:var(--r)}
.sr-cite p{font-size:14px;color:var(--s);overflow-wrap:anywhere}
.sr-code{background:var(--b);padding:12px;border-radius:10px;font-size:12px;white-space:pre-wrap;word-break:break-all;max-width:760px}
.sr-foot{border-top:1px solid var(--l);margin-top:36px;padding-top:16px;font-size:14px;color:var(--s);display:flex;flex-wrap:wrap;gap:8px 16px}
.sr-foot a{color:var(--s);display:inline-block;padding:4px 0}
@media (prefers-color-scheme:dark){.sr{--i:#e9ecf2;--s:#a3abb9;--l:#2a3140;--b:#171c26;background:#0e1219}.sr a{color:#9db6ff}.sr-crumbs a,.sr-foot a{color:var(--s)}.sr-pager b{background:#2c4c9a}}
</style>`;

const NAV = [['/members', 'Members'], ['/states', 'States'], ['/rankings', 'Rankings'], ['/stocks', 'Stocks'], ['/guides', 'Guides']];
const NAV_ES = [['/es/members', 'Miembros'], ['/es/states', 'Estados'], ['/es/elections', 'Elecciones 2026'], ['/members', 'English']];
const FOOT = [['/members', 'Members of Congress'], ['/past-members', 'Past members'], ['/appointees/all', 'Appointees'], ['/judges', 'Federal judges'], ['/committees', 'Committees'], ['/caucuses', 'Caucuses'], ['/votes', 'Votes'], ['/bills', 'Bills'], ['/pacs', 'PACs'], ['/lobbying', 'Lobbying groups'], ['/lobbying-firms', 'Lobbying firms'], ['/outside-groups', 'Outside spending'], ['/ethics', 'Ethics statements'], ['/companies', 'Companies'], ['/elections', '2026 elections'], ['/states', 'States'], ['/this-week', 'This week in Congress'], ['/rankings', 'Rankings'], ['/stocks', 'Stocks in Congress'], ['/official-trades', 'Officials’ stock trades'], ['/reports', 'Monthly reports'], ['/guides', 'Guides'], ['/es/members', 'En español']];
const APP = 'https://app.capitolreceipts.com';
const OG_TYPES = new Set(['member', 'past-member', 'bill', 'vote', 'pac', 'lobbying', 'company', 'race', 'state', 'district', 'nominee', 'stock', 'official-trades', 'reports']);

function citeBox(pg) {
  const es = pg.lang === 'es', url = abs(pg.path), name = pg.title.replace(/ \| Capitol Receipts$/, '');
  const today = new Date().toISOString().slice(0, 10);
  const cite = `Capitol Receipts, “${name},” ${url} (${es ? 'consultado el' : 'accessed'} ${today}).`;
  const m = pg.route && /^[A-Z]\d{6}$/.test(pg.route) ? pg.route : null;
  const embed = m ? `<iframe src="${APP}/embed/member/${m}" title="${esc(name)}" width="420" height="320" style="border:0;max-width:100%" loading="lazy"></iframe>` : '';
  return `<section class="sr-cite"><h2>${es ? 'Cita o inserta esta página' : 'Cite or embed this page'}</h2><p>${esc(cite)}</p>${embed ? `<p>${es ? 'Para insertar esta ficha en tu sitio, copia este código:' : 'Embed this member’s card on your site:'}</p><pre class="sr-code">${esc(embed)}</pre>` : ''}</section>`;
}

// long pages get a row of jump links under the intro
function addJump(body, es) {
  const hs = []; let i = 0;
  body = body.replace(/<section><h2>([^<]{2,60})<\/h2>/g, (m, h) => { const id = 's' + (++i); hs.push([id, h]); return `<section id="${id}"><h2>${h}</h2>`; });
  if (hs.length < 4) return body;
  const nav = `<nav class="sr-jump" aria-label="${es ? 'En esta página' : 'On this page'}">${hs.filter(([, h]) => !/^(Related|More|Más|About these numbers|Sobre estas cifras|Common questions|More guides|Other months|Contact|Contacto)$|^(More from|Más de)/.test(h)).slice(0, 7).map(([id, h]) => `<a href="#${id}">${h}</a>`).join('')}</nav>`;
  const at = body.indexOf('</p>', body.indexOf('class="sr-lead"'));
  return at > 0 ? body.slice(0, at + 4) + nav + body.slice(at + 4) : nav + body;
}
function frame(pg, mode) {
  if (mode !== 'app' && pg.body && !pg.jumped) { pg.body = addJump(pg.body, pg.lang === 'es'); pg.jumped = true; }
  const es = pg.lang === 'es';
  const crumbs = [[es ? 'Inicio' : 'Home', HOST + '/'], ...(pg.crumbs || [])];
  const cl = `<ol class="sr-crumbs">${crumbs.map((c, i) => `<li>${i < crumbs.length - 1 && c[1] ? `<a href="${c[1].replace(HOST, '') || '/'}">${esc(c[0])}</a>` : esc(c[0])}</li>`).join('')}</ol>`;
  // search pages stay light: the full app opens on its own domain when someone asks for it
  const cta = pg.route && mode !== 'app' ? `<a class="sr-cta" href="${APP}${pg.path}?app=1${es ? '&lang=es' : ''}" rel="nofollow">${es ? 'Abrir en la app interactiva' : 'Open the interactive version'} ›</a>` : '';
  return `<div class="sr" lang="${es ? 'es' : 'en'}"><header class="sr-top"><div class="in"><a class="sr-logo" href="${es ? '/es/members' : '/'}"><span>Capitol</span>Receipts</a><nav aria-label="${es ? 'Explorar' : 'Browse'}">${(es ? NAV_ES : NAV).map(([h, l]) => `<a href="${h}">${l}</a>`).join(' ')}</nav></div></header>
<main class="sr-main${cta ? ' has-cta' : ''}">${cl}${pg.body}${pg.route && !pg.noindex ? citeBox(pg) : ''}${pg.route && mode === 'app' ? '<p id="bootmsg" hidden></p>' : ''}
<footer class="sr-foot">${FOOT.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}<a href="${SITE}/how-it-works">${es ? 'De dónde vienen los datos' : 'Where the data comes from'}</a><a href="${SITE}/">${es ? 'Acerca de Capitol Receipts' : 'About Capitol Receipts'}</a></footer></main>${cta}</div>`;
}

function head(pg) {
  const url = abs(pg.path);
  const img = pg.image || `${SITE}/img/share.png?v=20261015`;
  const crumbs = [[pg.lang === 'es' ? 'Inicio' : 'Home', HOST + '/'], ...(pg.crumbs || []).map(c => [c[0], c[1] || url])];
  const ld = [...(pg.ld || []), { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: c[1] })) }];
  const alt = pg.alt ? [`<link rel="alternate" hreflang="en" href="${esc(abs(pg.alt.en))}">`, `<link rel="alternate" hreflang="es" href="${esc(abs(pg.alt.es))}">`, `<link rel="alternate" hreflang="x-default" href="${esc(abs(pg.alt.en))}">`] : [];
  return [
    pg.noindex ? '' : `<link rel="canonical" href="${esc(url)}">`,
    ...(pg.noindex ? [] : alt),
    pg.noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">',
    '<meta property="og:site_name" content="Capitol Receipts">',
    `<meta property="og:locale" content="${pg.lang === 'es' ? 'es_US' : 'en_US'}">`,
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

function html(pg, mode) {
  let h = shell();
  if (pg.lang === 'es') h = h.replace('<html lang="en">', '<html lang="es">');
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(pg.title)}</title>`);
  h = h.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(pg.desc)}">`);
  h = h.replace(/<link rel="canonical"[^>]*>\n?/, '').replace(/<meta property="og:[^>]*>\n?/g, '').replace(/<meta name="twitter:[^>]*>\n?/g, '').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/g, '').replace(/<meta name="robots"[^>]*>\n?/, '');
  h = h.replace('</head>', head(pg) + '\n</head>');
  h = h.replace(/<div id="app">[\s\S]*?<\/div><\/div><\/div>/, `<div id="app">${frame(pg, mode)}</div>`);
  if (pg.route && mode === 'app') {
    h = h.replace('<script>\n/* Supabase', `<script>window.__ROUTE=${JSON.stringify(pg.route)};window.__HOLD=true;${pg.lang === 'es' ? "try{localStorage.setItem('pt_lang',JSON.stringify('es'))}catch(e){}" : ''}</script>\n<script>\n/* Supabase`);
  } else {
    // search pages are plain, fast pages: no app download, nothing that moves after it loads
    h = h.replace(/<nav class="tabbar"[\s\S]*?<\/nav>\n?/, '').replace(/<div id="sheet"[\s\S]*?<\/div><\/div>\n?/, '');
    h = h.replace(/<script>\n\/\* Supabase[\s\S]*?<\/script>/, '');
    h = h.replace(/<script>\/\* boot-prefetch[\s\S]*?<\/script>\n?/, '');
    h = h.replace(/<link rel="stylesheet" href="\/app\/css\/[^"]*"[^>]*>\n?/g, '').replace(/<link rel="preconnect" href="https:\/\/hxgckcriehvrolwnabpd[^>]*>\n?/, '');
  }
  return h;
}

function send(res, status, type, body, maxAge) {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  // Pages are kept at Vercel's edge for a week (data changes once a day; the app itself always loads live data),
  // so search-engine crawling rarely reaches the database.
  const cc = status === 200 ? `public, max-age=600, s-maxage=${maxAge || 604800}, stale-while-revalidate=2592000` : 'public, max-age=60, s-maxage=600';
  res.setHeader('Cache-Control', cc); res.setHeader('CDN-Cache-Control', cc);
  res.end(body);
}
const redirect = (res, loc, permanent = true) => { res.statusCode = permanent ? 301 : 302; res.setHeader('Location', loc); res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400'); res.end(); };

// llms.txt: a plain-text guide for AI assistants, with current facts from the rankings
async function llms() {
  const [meta, leaders] = await Promise.all([T.META(['asOf']), Promise.all(Object.entries(RK.METRICS).map(async ([s, M]) => { const r = await RK.ranking(s); return r ? `- [${M.h}](${SITE}${RK.rpath(s, '')}): ${r.lead}` : ''; }))]);
  const a = meta.asOf || {};
  return `# Capitol Receipts

> Nonpartisan, plain-English profiles of every member of the U.S. Congress, built entirely from public records: who funds their campaigns, what stocks they trade, how they vote, who lobbies them, and the appointees, judges and bills around them. Data is updated daily.

Data as of: campaign finance ${a.fec || ''}, stock trade reports ${a.ptr || ''}, votes ${a.votes || ''}, roster ${a.roster || ''}.
When citing, link to the specific page (each page has a stable address and a "Cite or embed" section). Corrections: corrections@capitolreceipts.com.

## Current rankings
${leaders.filter(Boolean).join('\n')}

## Directories
- [Members of Congress](${SITE}/members): all current senators and representatives, by state
- [Congress by state](${SITE}/states) and congressional districts
- [This week in Congress](${SITE}/this-week): latest trades, votes, confirmations and money, updated daily
- [Rankings](${SITE}/rankings): each ranking for all of Congress, the Senate, the House, Democrats and Republicans
- [Bills since 1947](${SITE}/bills), [every recorded vote since 1789](${SITE}/votes)
- [PACs](${SITE}/pacs), [lobbying groups](${SITE}/lobbying), [lobbying firms](${SITE}/lobbying-firms), [outside spending](${SITE}/outside-groups), [companies](${SITE}/companies)
- [Committees](${SITE}/committees), [caucuses](${SITE}/caucuses), [appointees and nominees](${SITE}/appointees/all), [federal judges](${SITE}/judges), [past members since 1789](${SITE}/past-members), [House ethics statements](${SITE}/ethics)
- [2026 elections](${SITE}/elections): every House and Senate race on the November 3, 2026 ballot, with candidates, money raised and outside spending
- [Stocks traded by members of Congress](${SITE}/stocks): one page per stock, listing every member who traded it since January 2025
- [Stock trades by the President and cabinet officials](${SITE}/official-trades): OGE Form 278-T reports posted since January 2025, one page per official
- [Monthly reports](${SITE}/reports): Congress stock trades month by month, with top traders, top stocks and the biggest trades
- [Guides](${SITE}/guides): plain-English answers on the STOCK Act, PAC limits and how to look up trades
- [En español](${SITE}/es/members)

## Page addresses
- Member: ${SITE}/member/{bioguide ID}/{name}, for example ${SITE}/member/P000197/nancy-pelosi
- Bill: ${SITE}/bill/{congress}-{type}-{number}, for example ${SITE}/bill/119-hr-1
- Vote: ${SITE}/vote/{congress}-{H or S}-{roll call number}, for example ${SITE}/vote/119-S-911
- Stock: ${SITE}/stock/{ticker}, for example ${SITE}/stock/NVDA
- Also: /pac/{FEC ID}, /state/{postal code}, /district/{state}-{number}, /race/{race ID}, /company/{name}, /committee/{code}

## Sources
- Campaign finance: Federal Election Commission bulk data
- Stock trades: House Clerk and Senate periodic transaction reports
- Votes: Voteview roll call records; bills: GovInfo, Congressional Research Service summaries and the Congressional Bills Project
- Lobbying: Senate Lobbying Disclosure Act database
- Appointees: Senate roll calls and Office of Government Ethics filings; judges: Federal Judicial Center
- Method and definitions: ${SITE}/how-it-works

## Optional
- [Every member in one file](${SITE}/llms-full.txt): key numbers for all current members of Congress, for quoting
- [Sitemap](${SITE}/sitemap.xml)
- [About and pricing](${SITE}/pricing)
`;
}

async function llmsFull() {
  const [rows, meta, stk] = await Promise.all([
    T.q('members?select=id,name,party,state,chamber,district,rec:data->money->rec,coh:data->money->coh,pac:data->money->pac,small:data->smallShare,tradeN:data->tradeN,comm:data->commTrades,present:data->present,elig:data->elig,unity:data->unity,since:data->since,next:data->next,rev:data->revolving&order=ord'),
    T.META(['asOf', 'perf']), require('./_seo_stocks').DATA().catch(() => ({ S: {} }))]);
  const a = meta.asOf || {}, pf = (meta.perf || {}).m || {};
  const pct = (x, d = 0) => x == null ? 'n/a' : (x * 100).toFixed(d) + '%';
  const lines = rows.map(m => {
    const seat = m.chamber === 'Senate' ? `Sen., ${m.state}` : `Rep., ${m.state}-${+m.district || 'AL'}`, p = pf[m.id];
    const parts = [`raised ${m.rec != null ? T.money(m.rec) : 'n/a'} for 2026 (${pct(m.small)} from small donors, ${m.rec ? pct((m.pac || 0) / m.rec) : 'n/a'} from PACs)`,
      `cash on hand ${m.coh != null ? T.money(m.coh) : 'n/a'}`, `${T.num(m.tradeN || 0)} stock trades since Jan 2025${m.comm ? ` (${T.num(m.comm)} in industries their committees oversee)` : ''}`,
      m.elig >= 25 ? `missed ${pct(1 - m.present, 1)} of votes` : null, m.unity != null ? `voted with their party ${pct(m.unity, 1)} on party-line votes` : null,
      Array.isArray(m.rev) && m.rev.length ? `${m.rev.length} former staff now registered lobbyists` : null,
      p && p.n >= 5 ? `stock purchases returned ${pct(p.ret)} vs ${pct(p.spx)} for the S&P 500 over the same days (${p.n} buys)` : null,
      m.since ? `in Congress since ${m.since}` : null, m.next ? `next election ${m.next}` : null].filter(Boolean);
    return `- [${m.name}](${SITE}${T.P('member', m.id, m.name)}) (${m.party}, ${seat}): ${parts.join('; ')}.`;
  });
  const top = Object.values(stk.S || {}).sort((x, y) => y.trades.length - x.trades.length).slice(0, 50)
    .map(s => `- [${s.name} (${s.tk})](${SITE}${T.P('stock', s.tk, s.name)}): ${T.num(s.trades.length)} trades by ${T.num(s.nm)} members since Jan 2025`);
  return `# Capitol Receipts: every member of Congress, key numbers

> One line per current member of the U.S. Congress, from public records. Each line links to the member's full profile with sources. Campaign finance as of ${a.fec || ''}; stock trade reports as of ${a.ptr || ''}; votes as of ${a.votes || ''}. Nonpartisan; every member is measured the same way. Definitions: ${SITE}/how-it-works

## Members of Congress (${rows.length})
${lines.join('\n')}

## Most-traded stocks in Congress
${top.join('\n')}
`;
}

async function embedCard(res, id) {
  const r = await T.one(`members?id=eq.${encodeURIComponent(id)}&select=id,name,party,state,chamber,district,data`);
  if (!r) return send(res, 404, 'text/plain', 'Not found');
  const d = r.data, f = d.money || {}, page = SITE + T.P('member', id, d.name);
  const seat = r.chamber === 'Senate' ? `Senator · ${T.ST[r.state]}` : `Representative · ${r.state}-${+r.district ? r.district : 'AL'}`;
  const col = { D: '#2557a8', R: '#c8323a' }[r.party] || '#14274e';
  const stat = (k, v) => `<div><b>${esc(v)}</b><span>${esc(k)}</span></div>`;
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(d.name)} | Capitol Receipts</title>
<link rel="canonical" href="${page}"><style>body{margin:0;font-family:-apple-system,"Segoe UI",Roboto,sans-serif;color:#0e1116;background:#fff}
.c{border:1px solid #e4e6eb;border-radius:14px;overflow:hidden;max-width:420px}.t{background:${col};color:#fff;padding:14px 16px}.t h1{margin:0;font-size:22px}.t p{margin:2px 0 0;opacity:.9;font-size:14px}
.g{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#e4e6eb}.g div{background:#fff;padding:12px 16px;display:flex;flex-direction:column}.g b{font-size:22px}.g span{font-size:12px;color:#5b6069}
.f{padding:10px 16px;font-size:12px;color:#5b6069;display:flex;justify-content:space-between;gap:8px}.f a{color:#14274e;font-weight:700}</style></head><body>
<div class="c"><div class="t"><h1>${esc(d.name)}</h1><p>${esc(T.PN[r.party] || r.party)} · ${esc(seat)}</p></div>
<div class="g">${stat('Raised for 2026', f.rec ? T.money(f.rec) : '—')}${stat('Stock trades since 2025', T.num(d.tradeN || 0))}${stat('Votes missed', d.elig >= 25 ? T.pct(1 - d.present, 1) : '—')}${stat('From small donors', T.pct(d.smallShare))}</div>
<div class="f"><span>Public records · updated daily</span><a href="${page}" target="_blank" rel="noopener">Full profile on Capitol Receipts</a></div></div></body></html>`;
  res.setHeader('Content-Security-Policy', 'frame-ancestors *');
  return send(res, 200, 'text/html; charset=utf-8', body);
}


/* app screens with no public page of their own (/go/<screen>): the app itself, with a title and preview that name the screen */
const GO_SCREENS = {
  industries: ['Money by industry', 'Which industries fund each member of Congress, from FEC records.'],
  ind: ['Money by industry', 'How much one industry gives to members of Congress, from FEC records.'],
  radar: ['Conflict radar', 'Stock trades, donors and lobbying that touch the same companies, from public records.'],
  compare: ['Compare members of Congress', 'Put two members of Congress side by side: money, votes, stock trades and lobbying.'],
  mystocks: ['Your stocks in Congress', 'See which members of Congress trade the stocks you own.'],
  perf: ['Stock picks vs the market', 'How each member of Congress’s stock purchases did against the S&P 500.'],
  rank: ['Rankings', 'Members of Congress ranked by stock trades, missed votes, fundraising and more, from public records.'],
  hist: ['Congress history', 'Past members of Congress, past appointees and presidents, from public records.'],
  corrections: ['Corrections', 'Every correction Capitol Receipts has made, and how to report one.'],
  following: ['Following', 'Members of Congress you follow on Capitol Receipts.'],
};
function goScreen(res, id) {
  const k = String(id || '').split(':')[0];
  const g = GO_SCREENS[id] || GO_SCREENS[k] || ['Capitol Receipts', 'Who funds Congress, what they trade and how they vote, from public records.'];
  const title = g[0] === 'Capitol Receipts' ? g[0] : `${g[0]} · Capitol Receipts`, url = `https://app.capitolreceipts.com/go/${encodeURIComponent(id)}`;
  let h = shell();
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(g[1])}">`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(title)}`).replace(/(<meta name="twitter:title" content=")[^"]*/, `$1${esc(title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(g[1])}`).replace(/(<meta name="twitter:description" content=")[^"]*/, `$1${esc(g[1])}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${esc(url)}`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(url)}">`)
    .replace('</head>', '<meta name="robots" content="noindex">\n</head>');
  return send(res, 200, 'text/html; charset=utf-8', h, 3600);
}

module.exports = async (req, res) => {
  const u = new URL(req.url, HOST);
  const t = u.searchParams.get('t') || '', id = u.searchParams.get('id') || '', slug = u.searchParams.get('slug') || '';
  const page = Math.max(1, parseInt(u.searchParams.get('page') || '1', 10) || 1);
  const lang = u.searchParams.get('lang') === 'es' ? 'es' : 'en';
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
  const onApp = host === 'app.capitolreceipts.com';
  const appMode = onApp && u.searchParams.get('app') === '1';
  const pre = lang === 'es' ? '/es' : '';
  const asked = `${pre}/${t}/${encodeURIComponent(decodeURIComponent(id))}${slug ? '/' + slug : ''}`;
  const publicPath = t === 'sitemap' ? '/sitemap.xml' : t === 'sitemaps' ? `/sitemaps/${id}` : id ? asked : `${pre}/${t === 'appointees' ? 'appointees/all' : t}${page > 1 ? `?page=${page}` : ''}`;
  try {
    if (t === 'embed') return embedCard(res, id);
    if (t === 'go') return goScreen(res, id);
    if (t === 'pulse') { res.setHeader('Access-Control-Allow-Origin', '*'); return send(res, 200, 'application/json; charset=utf-8', JSON.stringify(await require('./_seo_pulse').pulse()), 3600); }
    if (t === 'quizscore') { // a shared quiz score: its own preview card, then on to the quiz
      const n = Math.max(0, Math.min(9, parseInt(id, 10) || 0));
      return send(res, 200, 'text/html; charset=utf-8', html({ title: `I got ${n} of 9 on the Congress quiz | Capitol Receipts`, desc: 'Nine questions about stock trades, campaign money and votes in Congress, each answered from public records. How many can you get?',
        path: `/quiz/score/${n}`, noindex: true, route: null, image: `${APP}/og/quiz/${n}.png`,
        body: `<h1>I got ${n} of 9 on the Congress quiz</h1><p class="sr-lead">Nine questions about stock trades, campaign money and votes, each answered from public records.</p><p><a href="/quiz">Take the quiz</a></p><script>location.replace('/quiz?from=score')</script>` }, 'seo'), 604800);
    }
    if (t === 'robots') return send(res, 200, 'text/plain; charset=utf-8', `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`, 86400);
    // the app's domain is for using the app; every public page lives on www.capitolreceipts.com
    if (onApp && !appMode && u.searchParams.get('via') !== 'www') return redirect(res, SITE + publicPath);
    if (t === 'sitemap') return send(res, 200, 'application/xml; charset=utf-8', await T.sitemapIndex(), 86400);
    if (t === 'sitemaps') {
      const xml = await T.sitemapFile(id.replace(/\.xml$/, ''));
      return xml ? send(res, 200, 'application/xml; charset=utf-8', xml, 86400) : send(res, 404, 'text/plain', 'Not found');
    }
    if (t === 'llms') return send(res, 200, 'text/plain; charset=utf-8', await llms(), 86400);
    if (t === 'llms-full') return send(res, 200, 'text/plain; charset=utf-8', await llmsFull(), 86400);
    if (t === 'rankings') {
      const pg = id ? await RK.ranking(decodeURIComponent(id), slug) : await RK.index();
      return send(res, pg ? 200 : 404, 'text/html; charset=utf-8', html(pg || notFound(publicPath), 'seo'));
    }
    let pg;
    const HUBS = lang === 'es' ? ESP.HUBS : T.HUBS, PAGES = lang === 'es' ? ESP.PAGES : T.PAGES;
    if (!id && HUBS[t]) pg = await HUBS[t](page);
    else if (id && PAGES[t]) pg = await PAGES[t](decodeURIComponent(id));
    // English and Spanish versions point at each other
    if (pg && pg.status !== 404 && !pg.noindex && ((id && ES_TYPES.has(t)) || (!id && ES_HUBS.has(t) && page === 1))) {
      const en = pg.path.replace(/^\/es(?=\/)/, ''); pg.alt = { en, es: '/es' + en };
    }
    if (!pg) pg = notFound(id ? `/${t}/${id}` : `/${t}`);
    // one canonical address per record
    if (id && pg.status !== 404 && OG_TYPES.has(t)) pg.image = `${APP}/og/${t}/${encodeURIComponent(decodeURIComponent(id))}.png?v=${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    if (id && pg.status !== 404 && PAGES[t] && pg.path !== asked) return redirect(res, pg.path + (appMode ? `?app=1${lang === 'es' ? '&lang=es' : ''}` : ''));
    return send(res, pg.status || 200, 'text/html; charset=utf-8', html(pg, appMode ? 'app' : 'seo'));
  } catch (e) {
    console.error(t, id, e);
    res.statusCode = 503; res.setHeader('Cache-Control', 'no-store'); res.setHeader('Retry-After', '60');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(html({ title: 'Capitol Receipts', desc: 'Temporarily unavailable.', path: u.pathname, noindex: true, route: null, body: '<h1>Back in a moment</h1><p>We couldn’t load this page. Please try again in a minute.</p>' }, 'seo'));
  }
};
