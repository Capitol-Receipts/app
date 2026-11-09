/* Stock pages: "which members of Congress trade NVIDIA?" One page per traded stock (/stock/NVDA/nvidia) and a
directory of the most-traded stocks (/stocks). Built from every trade reported since January 2025 (app_meta
'trades_all', written by pipeline/build_perf.py) and SEC company names/industries (app_meta 'tick_ind'). */
const L = require('./_seo_lib');
const { cached, META, MEMBERS, esc, P, a, num, money, date, clamp, title, facts, rows, sec, cols, note, HOST } = L;

const MIN_INDEX = 3; // stocks with fewer trades get a page but stay out of search results and the sitemap
const cleanName = s => String(s || '').split(' - ')[0].replace(/\s*\((?:The)\)/i, '').replace(/\s*\[[A-Z]{2}\]/g, '').replace(/\s*\([A-Z.\-]{1,8}\)\s*$/, '')
  .replace(/\b(Common Stock|Ordinary Shares?|Class [A-Z]( Common)?( Stock)?|Sponsored ADR|American Depositary Shares?|ADR|ADS)\b.*$/i, '').replace(/[,\s]+$/, '').trim();
const shortName = s => s.replace(/[,\s]+(Inc\.?|Incorporated|Corp\.?|Corporation|Co\.?|Company|Ltd\.?|Limited|plc|PLC|Holdings?|Group|N\.?V\.?|S\.?A\.?|AG|SE)$/i, '').replace(/[,\s]+(Inc\.?|Corp\.?|Corporation|Holdings?)$/i, '').trim() || s;
const titleCase = s => s.toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase()).replace(/\b(Inc|Corp|Co|Ltd|Plc|Llc|Lp)\b/g, w => w).replace(/\bAnd\b/g, 'and');

const DATA = () => cached('stocks', async () => {
  const [meta, { by: mem }] = await Promise.all([META(['trades_all', 'tick_ind', 'asOf']), MEMBERS()]);
  const ind = meta.tick_ind || {};
  const S = {};
  for (const [id, ts] of Object.entries(meta.trades_all || {})) {
    const m = mem[id]; if (!m) continue;
    for (const t of ts) {
      const tk = String(t[2] || '').toUpperCase().trim();
      if (!/^[A-Z][A-Z.\-]{0,6}$/.test(tk)) continue;
      const s = S[tk] || (S[tk] = { tk, trades: [], names: {}, members: {} });
      s.trades.push([m, t]); s.members[id] = (s.members[id] || 0) + 1;
      const n = cleanName(t[3]); if (n) s.names[n] = (s.names[n] || 0) + 1;
    }
  }
  for (const s of Object.values(S)) {
    const best = Object.entries(s.names).sort((x, y) => y[1] - x[1])[0];
    const sec = ind[s.tk];
    s.name = best ? best[0] : (sec && sec[1] ? titleCase(sec[1]) : s.tk);
    s.industry = sec ? sec[0] : null;
    s.trades.sort((x, y) => y[1][0].localeCompare(x[1][0]));
    s.buys = s.trades.filter(x => x[1][1] === 'Buy').length; s.sells = s.trades.filter(x => /^Sell/.test(x[1][1])).length;
    s.lo = s.trades.reduce((v, x) => v + (+x[1][4] || 0), 0); s.hi = s.trades.reduce((v, x) => v + (+x[1][5] || +x[1][4] || 0), 0);
    s.nm = Object.keys(s.members).length;
  }
  return { S, asOf: (meta.asOf || {}).ptr };
});

const who = m => `${m.chamber === 'Senate' ? 'Sen.' : (m.delegate ? 'Del.' : 'Rep.')} ${m.name}`;
const seat = m => m.chamber === 'Senate' ? `${m.party}-${m.state}` : `${m.party}-${m.state}-${+m.district || 'AL'}`;
const verb = k => /^Sell/.test(k) ? 'sold' : k === 'Buy' ? 'bought' : String(k || 'traded').toLowerCase();
const range = t => `${money(+t[4] || 0)}–${money(+t[5] || +t[4] || 0)}`;

async function stock(id) {
  const tk = String(id || '').toUpperCase();
  const { S, asOf } = await DATA();
  const s = S[tk]; if (!s) return null;
  const top = Object.entries(s.members).sort((x, y) => y[1] - x[1]);
  const { by: mem } = await MEMBERS();
  const party = { D: 0, R: 0, I: 0 }; top.forEach(([mid]) => { const p = mem[mid]?.party; if (p in party) party[p]++; });
  const name = s.name, h1 = `Members of Congress trading ${name} (${tk})`;
  const lead = `${num(s.nm)} member${s.nm === 1 ? '' : 's'} of Congress reported ${num(s.trades.length)} trade${s.trades.length === 1 ? '' : 's'} in ${name} (${tk}) since January 2025: ${num(s.buys)} purchase${s.buys === 1 ? '' : 's'} and ${num(s.sells)} sale${s.sells === 1 ? '' : 's'}, worth ${money(s.lo)} to ${money(s.hi)} in total.` +
    (top[0] ? ` ${who(mem[top[0][0]])} traded it most, ${num(top[0][1])} time${top[0][1] === 1 ? '' : 's'}.` : '') +
    (s.trades[0] ? ` The latest reported trade was on ${date(s.trades[0][1][0])}.` : '');
  const body = `<p class="sr-sub">Stock · ${esc(tk)}${s.industry ? ' · ' + esc(s.industry) : ''}</p><h1>${esc(h1)}</h1>
<p class="sr-lead">${esc(lead)}</p>
${facts([['Members who traded it', num(s.nm)], ['Trades since 2025', num(s.trades.length)], ['Purchases', num(s.buys)], ['Sales', num(s.sells)], ['Reported value', `${money(s.lo)}–${money(s.hi)}`], ['Democrats / Republicans', `${party.D} / ${party.R}${party.I ? ` / ${party.I} independent` : ''}`]])}
${sec('Who in Congress trades it', rows(top.slice(0, 60).map(([mid, n]) => { const m = mem[mid]; return [`${a(P('member', mid, m.name), who(m))} <small>${esc(seat(m))}</small>`, `${num(n)} trade${n === 1 ? '' : 's'}`]; })))}
${sec('Latest trades', rows(s.trades.slice(0, 40).map(([m, t]) => [`${a(P('member', m.id, m.name), who(m))} ${esc(verb(t[1]))}${t[6] && t[6] !== 'Self' ? ` <small>(${esc(t[6] === 'SP' ? 'spouse' : t[6] === 'JT' ? 'joint' : t[6] === 'DC' ? 'dependent child' : t[6])})</small>` : ''}`, `${esc(date(t[0]))} · ${esc(range(t))}`])))}
${sec('About these numbers', `<p>Members of Congress must report stock trades by themselves, their spouses and dependent children within 45 days, in dollar ranges rather than exact amounts. Trading stock is legal. This page lists trades reported on House and Senate periodic transaction reports since January 1, 2025, as of ${esc(date(asOf) || 'the latest update')}.</p>`)}
${sec('Related', cols([a('/stocks', 'Most-traded stocks in Congress'), a('/rankings/most-stock-trades', 'Members with the most stock trades'), a('/rankings/committee-tied-trades', 'Trades tied to their committees'), a('/rankings/stock-picks', 'Who beats the market')]))}
${note('From House Clerk and Senate disclosure reports. Each member’s profile links to the original filings.')}`;
  return {
    title: title(`${shortName(name)} (${tk}) Stock Trades by Members of Congress`), desc: clamp(lead, 158), path: P('stock', tk, name), route: 'stock:' + tk,
    noindex: s.trades.length < MIN_INDEX, ogType: 'article', crumbs: [['Stocks', L.abs('/stocks')], [`${name} (${tk})`, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Dataset', name: h1, description: lead, url: L.abs(P('stock', tk, name)), dateModified: new Date().toISOString().slice(0, 10),
      creator: { '@type': 'Organization', name: 'Capitol Receipts', url: L.SITE + '/' }, isAccessibleForFree: true, about: { '@type': 'Corporation', name, tickerSymbol: tk } },
      { '@context': 'https://schema.org', '@type': 'ItemList', name: `Members of Congress who traded ${tk}`, numberOfItems: top.length,
        itemListElement: top.slice(0, 25).map(([mid, n], i) => ({ '@type': 'ListItem', position: i + 1, name: `${mem[mid].name}: ${n} trades`, url: L.abs(P('member', mid, mem[mid].name)) })) }],
    body,
  };
}

async function stocks(page = 1) {
  const { S, asOf } = await DATA();
  const list = Object.values(S).filter(s => s.trades.length >= MIN_INDEX).sort((x, y) => y.trades.length - x.trades.length || y.nm - x.nm);
  if (page > 1) return L.notFound('/stocks?page=' + page);
  const lead = `The stocks members of Congress traded most since January 2025, from ${num(Object.values(S).reduce((v, s) => v + s.trades.length, 0))} trades in ${num(Object.keys(S).length)} companies. ${list[0] ? `${list[0].name} (${list[0].tk}) leads with ${num(list[0].trades.length)} trades by ${num(list[0].nm)} members.` : ''}`;
  return { title: title('Stocks Most Traded by Members of Congress (2025–2026)'), desc: clamp(lead, 158), path: '/stocks', route: null, crumbs: [['Stocks', null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Stocks most traded by members of Congress', numberOfItems: Math.min(list.length, 100),
      itemListElement: list.slice(0, 100).map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: `${s.name} (${s.tk})`, url: L.abs(P('stock', s.tk, s.name)) })) }],
    body: `<h1>Stocks most traded by members of Congress</h1><p class="sr-sub">Updated ${esc(date(asOf) || '')}</p><p class="sr-lead">${esc(lead)}</p>
${rows(list.slice(0, 400).map((s, i) => [`<b>${i + 1}.</b> ${a(P('stock', s.tk, s.name), `${s.name} (${s.tk})`)}${s.industry ? ` <small>${esc(s.industry)}</small>` : ''}`, `${num(s.trades.length)} trades · ${num(s.nm)} member${s.nm === 1 ? '' : 's'}`]))}
${note('Trades by members, spouses and dependent children reported on House and Senate periodic transaction reports. Trading stock is legal.')}` };
}

async function sitemap() {
  const { S } = await DATA();
  return Object.values(S).filter(s => s.trades.length >= MIN_INDEX).map(s => [P('stock', s.tk, s.name), s.trades[0] && s.trades[0][1][0]]);
}

module.exports = { stock, stocks, sitemap, DATA };
