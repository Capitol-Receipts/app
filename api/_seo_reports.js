/* Monthly reports: "Congress stock trades in September 2026". One page per month since January 2025 (/reports/2026-09)
and a hub (/reports). Built from every trade reported since January 2025 (app_meta 'trades_all'). */
const L = require('./_seo_lib');
const { cached, META, MEMBERS, esc, P, a, num, money, date, clamp, title, facts, rows, sec, cols, note } = L;
const STK = require('./_seo_stocks');

const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const label = k => `${MON[+k.slice(5, 7) - 1]} ${k.slice(0, 4)}`;
const who = m => `${m.chamber === 'Senate' ? 'Sen.' : (m.delegate ? 'Del.' : 'Rep.')} ${m.name}`;
const seat = m => m.chamber === 'Senate' ? `${m.party}-${m.state}` : `${m.party}-${m.state}-${+m.district || 'AL'}`;
const verb = k => /^Sell/.test(k) ? 'sold' : k === 'Buy' ? 'bought' : String(k || 'traded').toLowerCase();
const range = t => `${money(+t[4] || 0)}–${money(+t[5] || +t[4] || 0)}`;
const s_ = (n, w) => `${num(n)} ${w}${n === 1 ? '' : 's'}`;
const chg = (a_, b_) => !b_ ? '' : a_ === b_ ? 'the same as' : `${Math.round(Math.abs(a_ - b_) / b_ * 100)}% ${a_ > b_ ? 'more than' : 'fewer than'}`;

const DATA = () => cached('reports', async () => {
  const [meta, { by: mem }] = await Promise.all([META(['trades_all', 'asOf']), MEMBERS()]);
  const now = new Date().toISOString().slice(0, 7), M = {};
  for (const [id, ts] of Object.entries(meta.trades_all || {})) {
    const m = mem[id]; if (!m) continue;
    for (const t of ts) {
      const k = String(t[0] || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(k) || k < '2025-01' || k > now) continue;
      (M[k] = M[k] || []).push([m, t]);
    }
  }
  const months = {};
  for (const [k, list] of Object.entries(M)) {
    list.sort((x, y) => (+y[1][5] || +y[1][4] || 0) - (+x[1][5] || +x[1][4] || 0) || y[1][0].localeCompare(x[1][0]));
    const by = {}, tk = {}, party = { D: 0, R: 0, I: 0 }, ch = { House: 0, Senate: 0 };
    for (const [m, t] of list) {
      by[m.id] = (by[m.id] || 0) + 1; if (m.party in party) party[m.party]++; if (m.chamber in ch) ch[m.chamber]++;
      const x = String(t[2] || '').toUpperCase(); if (/^[A-Z][A-Z.\-]{0,6}$/.test(x)) tk[x] = (tk[x] || 0) + 1;
    }
    months[k] = { k, list, by, tk, party, ch, stats: { trades: list.length, members: Object.keys(by).length,
      buys: list.filter(x => x[1][1] === 'Buy').length, sells: list.filter(x => /^Sell/.test(x[1][1])).length,
      lo: list.reduce((v, x) => v + (+x[1][4] || 0), 0), hi: list.reduce((v, x) => v + (+x[1][5] || +x[1][4] || 0), 0) } };
  }
  return { months, keys: Object.keys(months).sort(), asOf: (meta.asOf || {}).ptr, now };
});

async function month(id) {
  const { months, keys, asOf, now } = await DATA();
  const r = months[String(id || '')]; if (!r) return null;
  return { ...r, label: label(r.k), prev: months[keys[keys.indexOf(r.k) - 1]], next: months[keys[keys.indexOf(r.k) + 1]], asOf, recent: r.k >= isoMonthsAgo(2) || r.k === now };
}
const isoMonthsAgo = n => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - n); return d.toISOString().slice(0, 7); };

async function page(id) {
  const r = await month(id); if (!r) return null;
  const [{ by: mem }, { S }] = await Promise.all([MEMBERS(), STK.DATA()]);
  const st = r.stats, lbl = r.label;
  const topM = Object.entries(r.by).sort((x, y) => y[1] - x[1]);
  const topS = Object.entries(r.tk).sort((x, y) => y[1] - x[1]);
  const sname = tk => (S[tk] && S[tk].name) || tk;
  const h1 = `Congress stock trades in ${lbl}`;
  const cmp = r.prev ? chg(st.trades, r.prev.stats.trades) : '';
  const lead = `${s_(st.members, 'member')} of Congress reported ${s_(st.trades, 'stock trade')} made in ${lbl}: ${s_(st.buys, 'purchase')} and ${s_(st.sells, 'sale')}, worth ${money(st.lo)} to ${money(st.hi)} in total.` +
    (cmp ? ` That is ${cmp} the ${num(r.prev.stats.trades)} trades in ${label(r.prev.k)}.` : '') +
    (topM[0] ? ` ${who(mem[topM[0][0]])} made the most, ${num(topM[0][1])}.` : '') +
    (topS[0] ? ` The most-traded stock was ${sname(topS[0][0])} (${topS[0][0]}).` : '');
  const body = `<p class="sr-sub">Monthly report · Updated ${esc(date(r.asOf) || '')}</p><h1>${esc(h1)}</h1>
<p class="sr-lead">${esc(lead)}</p>
${r.recent ? `<p>Members have up to 45 days to report a trade, so this month’s numbers will grow as late reports come in.</p>` : ''}
${facts([['Trades', num(st.trades)], ['Members trading', num(st.members)], ['Purchases', num(st.buys)], ['Sales', num(st.sells)], ['Reported value', `${money(st.lo)}–${money(st.hi)}`], ['By Democrats / Republicans', `${num(r.party.D)} / ${num(r.party.R)}`], ['House / Senate', `${num(r.ch.House)} / ${num(r.ch.Senate)}`], r.prev ? [`Trades in ${label(r.prev.k)}`, num(r.prev.stats.trades)] : null].filter(Boolean))}
${sec('Members who traded the most', rows(topM.slice(0, 20).map(([mid, n]) => { const m = mem[mid]; return [`${a(P('member', mid, m.name), who(m))} <small>${esc(seat(m))}</small>`, s_(n, 'trade')]; })))}
${sec('Most-traded stocks', rows(topS.slice(0, 20).map(([tk, n]) => [a(P('stock', tk, sname(tk)), `${sname(tk)} (${tk})`), s_(n, 'trade')])))}
${sec('Biggest trades', rows(r.list.slice(0, 25).map(([m, t]) => [`${a(P('member', m.id, m.name), who(m))} ${esc(verb(t[1]))} ${esc(clamp(t[3], 70))}${t[6] && t[6] !== 'Self' ? ` <small>(${esc(t[6] === 'SP' ? 'spouse' : t[6] === 'JT' ? 'joint' : t[6] === 'DC' ? 'dependent child' : t[6])})</small>` : ''}`, `${esc(date(t[0]))} · ${esc(range(t))}`])))}
${sec('About these numbers', `<p>This counts trades by the date they were made, not the date they were reported. Members of Congress report trades by themselves, their spouses and dependent children in dollar ranges, so values are shown as a low and high total. Trading stock is legal. Amended reports replace the trade they correct.</p>`)}
${sec('Other months', cols([r.prev ? a(`/reports/${r.prev.k}`, `← ${label(r.prev.k)}`) : '', r.next ? a(`/reports/${r.next.k}`, `${label(r.next.k)} →`) : '', a('/reports', 'All monthly reports'), a('/stocks', 'Most-traded stocks'), a('/rankings/most-stock-trades', 'Members with the most trades'), a('/guides/stock-act', 'What the STOCK Act requires')].filter(Boolean)))}
${note('From House Clerk and Senate periodic transaction reports. Each member’s profile links to the original filings.')}`;
  return { title: title(`Congress Stock Trades in ${lbl}: Who Traded What`), desc: clamp(lead, 158), path: `/reports/${r.k}`, route: null, ogType: 'article',
    crumbs: [['Monthly reports', L.abs('/reports')], [lbl, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Article', headline: h1, description: clamp(lead, 300), url: L.abs(`/reports/${r.k}`), dateModified: new Date().toISOString().slice(0, 10),
      author: { '@type': 'Organization', name: 'Capitol Receipts', url: L.SITE + '/' }, publisher: { '@type': 'Organization', name: 'Capitol Receipts', logo: { '@type': 'ImageObject', url: L.SITE + '/img/logo-512.png' } } },
      { '@context': 'https://schema.org', '@type': 'Dataset', name: h1, description: lead, url: L.abs(`/reports/${r.k}`), isAccessibleForFree: true, temporalCoverage: `${r.k}`, creator: { '@type': 'Organization', name: 'Capitol Receipts' } }],
    body };
}

async function hub() {
  const { months, keys, asOf } = await DATA();
  const tot = keys.reduce((v, k) => v + months[k].stats.trades, 0);
  const lead = `Each month’s stock trades by members of Congress: how many, who traded most, which stocks and the biggest trades. ${num(tot)} trades across ${keys.length} months since January 2025.`;
  return { title: title('Monthly Reports: Congress Stock Trades by Month'), desc: clamp(lead, 158), path: '/reports', route: null, crumbs: [['Monthly reports', null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Monthly reports on Congress stock trades', numberOfItems: keys.length,
      itemListElement: [...keys].reverse().map((k, i) => ({ '@type': 'ListItem', position: i + 1, name: `Congress stock trades in ${label(k)}`, url: L.abs(`/reports/${k}`) })) }],
    body: `<h1>Monthly reports</h1><p class="sr-sub">Updated ${esc(date(asOf) || '')}</p><p class="sr-lead">${esc(lead)}</p>
${rows([...keys].reverse().map(k => { const s = months[k].stats; return [a(`/reports/${k}`, `Congress stock trades in ${label(k)}`), `${num(s.trades)} trades · ${num(s.members)} members`]; }))}
${note('Trades are counted by the month they were made. Recent months grow as late reports come in.')}` };
}

async function sitemap() { const { keys } = await DATA(); return [['/reports'], ...keys.map(k => [`/reports/${k}`])]; }
module.exports = { page, hub, month, sitemap, DATA, label };
