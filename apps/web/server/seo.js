const { watch } = require('./_watch');
/* The text and data files for search engines and AI assistants (served by the app project; www proxies here):
/sitemap.xml, /sitemaps/*.xml, /robots.txt, /llms.txt, /llms-full.txt, the member card that other sites embed and the
pulse numbers. The record and directory pages themselves are React pages (pages/seo-page.tsx, lib/seo-ssp.js).
Reads the public, read-only Supabase API. */
const T = require('./_seo_types');
const RK = require('./_seo_rank');
const { HOST, SITE, esc } = T;

function send(res, status, type, body, maxAge) {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  // Pages are kept at Vercel's edge for a week (data changes once a day; the app itself always loads live data),
  // so search-engine crawling rarely reaches the database.
  const cc = status === 200 ? `public, max-age=600, s-maxage=${maxAge || 604800}, stale-while-revalidate=2592000` : 'public, max-age=60, s-maxage=600';
  res.setHeader('Cache-Control', cc); res.setHeader('CDN-Cache-Control', cc);
  // www serves these pages through a rewrite and caches them; without Vary a brotli copy cached for one visitor was
  // sent to crawlers and tools that never asked for brotli, which then saw unreadable bytes instead of the page
  res.setHeader('Vary', 'Accept-Encoding');
  res.end(body);
}

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


const handler = async (req, res) => {
  const u = new URL(req.url, HOST);
  const t = u.searchParams.get('t') || '', id = u.searchParams.get('id') || '';
  try {
    if (t === 'embed') return embedCard(res, id);
    if (t === 'pulse') { res.setHeader('Access-Control-Allow-Origin', '*'); return send(res, 200, 'application/json; charset=utf-8', JSON.stringify(await require('./_seo_pulse').pulse()), 3600); }
    if (t === 'robots') return send(res, 200, 'text/plain; charset=utf-8', `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`, 86400);
    if (t === 'sitemap') return send(res, 200, 'application/xml; charset=utf-8', await T.sitemapIndex(), 86400);
    if (t === 'sitemaps') {
      const xml = await T.sitemapFile(id.replace(/\.xml$/, ''));
      return xml ? send(res, 200, 'application/xml; charset=utf-8', xml, 86400) : send(res, 404, 'text/plain', 'Not found');
    }
    if (t === 'llms') return send(res, 200, 'text/plain; charset=utf-8', await llms(), 86400);
    if (t === 'llms-full') return send(res, 200, 'text/plain; charset=utf-8', await llmsFull(), 86400);
    return send(res, 404, 'text/plain', 'Not found');
  } catch (e) {
    console.error(t, id, e);
    res.statusCode = 503; res.setHeader('Cache-Control', 'no-store'); res.setHeader('Retry-After', '600');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Back in a moment. Please try again in a minute.');
  }
};

module.exports = watch(handler);
