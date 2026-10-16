/* Rankings: answers to the questions people search for ("which members of Congress trade the most stock?"),
each for all of Congress and for the Senate, House, Democrats and Republicans. */
const L = require('./_seo_lib');
const { q, cached, META, esc, P, a, ST, PN, num, money, pct, date, clamp, title, facts, rows, sec, cols, note, HOST } = L;

const SPEAKER = 'J000299'; // the Speaker by custom rarely votes
const DATA = () => cached('rank-members', async () => {
  const rs = await q('members?select=id,name,party,state,chamber,district,delegate:data->delegate,rec:data->money->rec,coh:data->money->coh,pac:data->money->pac,small:data->smallShare,tradeN:data->tradeN,present:data->present,elig:data->elig,unity:data->unity,unityN:data->unityN,comm:data->commTrades,rev:data->revolving&order=ord');
  rs.forEach(m => { m.revN = Array.isArray(m.rev) ? m.rev.length : 0; delete m.rev; });
  try { // stock picks vs the S&P 500 (pipeline/build_perf.py)
    const pf = ((await META(['perf'])).perf || {}).m || {};
    rs.forEach(m => { const p = pf[m.id]; if (p && p.n) { m.pn = p.n; m.pret = p.ret; m.pspx = p.spx; m.pex = p.ex; } });
  } catch (e) { /* ranking just stays empty */ }
  return rs;
});

// slug -> definition. value(m) returns the number to rank by (null = not ranked); fmt formats it.
const METRICS = {
  'most-stock-trades': { q: 'most stock trades', h: 'Members of Congress with the most stock trades', short: 'Most stock trades', col: 'Trades since Jan 2025',
    value: m => +m.tradeN || 0, fmt: num, min: v => v > 0, unit: 'stock trades since January 2025',
    how: 'Counts every transaction members reported on periodic transaction reports (PTRs) filed with the House Clerk or the Senate since January 1, 2025, including trades by spouses and dependent children. Each line on a report counts as one trade.', src: 'House and Senate periodic transaction reports' },
  'committee-tied-trades': { q: 'trades in industries their committees oversee', h: 'Members who traded stocks their committees oversee', short: 'Trades tied to their committees', col: 'Committee-tied trades',
    value: m => +m.comm || 0, fmt: num, min: v => v > 0, unit: 'trades in industries overseen by their committees',
    how: 'Counts trades in companies whose industry falls under the jurisdiction of a committee the member sits on, such as a defense stock traded by a member of the Armed Services Committee. Industry comes from each company’s SEC classification.', src: 'House and Senate trade reports, SEC industry codes and committee rosters' },
  'top-fundraisers': { q: 'top fundraisers', h: 'Top fundraisers in Congress for 2026', short: 'Top fundraisers', col: 'Raised 2025–26',
    value: m => m.rec != null ? +m.rec : null, fmt: money, min: v => v > 0, unit: 'raised for the 2026 election',
    how: 'Total receipts reported to the Federal Election Commission by each member’s principal campaign committee for the 2025–26 cycle, through the latest filing deadline.', src: 'FEC candidate summaries' },
  'most-cash-on-hand': { q: 'most campaign cash on hand', h: 'Members of Congress with the most campaign cash', short: 'Most cash on hand', col: 'Cash on hand',
    value: m => m.coh != null ? +m.coh : null, fmt: money, min: v => v > 0, unit: 'in campaign cash on hand',
    how: 'Cash on hand at the end of the latest FEC reporting period for each member’s principal campaign committee.', src: 'FEC candidate summaries' },
  'small-donors': { q: 'most small-donor funded', h: 'Members of Congress most funded by small donors', short: 'Most small-donor money', col: 'From small donors',
    value: m => (+m.rec || 0) >= 50000 && m.small != null ? +m.small : null, fmt: x => pct(x), min: () => true, unit: 'of campaign money from donors giving under $200',
    how: 'Share of total campaign receipts that came from individual donors giving $200 or less (unitemized contributions) in the 2025–26 cycle. Members who raised under $50,000 are left out so tiny totals don’t skew the list.', src: 'FEC candidate summaries' },
  'pac-funded': { q: 'most PAC-funded', h: 'Members of Congress most funded by PACs', short: 'Most PAC-funded', col: 'From PACs',
    value: m => (+m.rec || 0) >= 50000 ? (+m.pac || 0) / +m.rec : null, fmt: x => pct(x), min: () => true, unit: 'of campaign money from political action committees',
    how: 'Share of 2025–26 campaign receipts that came from political action committees, which are funded by companies, unions and interest groups. Members who raised under $50,000 are left out.', src: 'FEC candidate summaries' },
  'most-missed-votes': { q: 'most missed votes', h: 'Members of Congress who missed the most votes', short: 'Most missed votes', col: 'Votes missed',
    value: m => m.id !== SPEAKER && (+m.elig || 0) >= 50 ? 1 - (+m.present || 0) : null, fmt: x => pct(x, 1), min: () => true, unit: 'of recorded votes missed',
    how: 'Share of the recorded roll call votes a member was eligible for in the current Congress where they did not vote (neither yes, no nor present). Members eligible for fewer than 50 votes are left out, and so is the Speaker, who by custom rarely votes.', src: 'Voteview roll call records' },
  'breaks-with-party': { q: 'most likely to break with their party', h: 'Members of Congress who break with their party most', short: 'Break with their party most', col: 'Voted against party',
    value: m => (+m.unityN || 0) >= 50 && m.unity != null ? 1 - +m.unity : null, fmt: x => pct(x, 1), min: () => true, unit: 'of party-line votes cast against their own party',
    how: 'On votes where most Democrats and most Republicans took opposite sides, the share of the time a member voted with the other party. Only members with at least 50 such votes are ranked.', src: 'Voteview roll call records' },
  'former-staff-lobbying': { q: 'most former staff now lobbying', h: 'Members whose former staff became lobbyists', short: 'Most ex-staff now lobbying', col: 'Ex-staff lobbying',
    value: m => m.revN || 0, fmt: num, min: v => v > 0, unit: 'former staffers now registered lobbyists',
    how: 'Counts people listed on current lobbying registrations whose disclosed past jobs include work in the member’s office, from the “covered position” field lobbyists must fill in under the Lobbying Disclosure Act.', src: 'Senate Lobbying Disclosure Act database' },
  'stock-picks': { q: 'best stock pickers', h: 'Members of Congress whose stock picks beat the market', short: 'Stock picks vs the S&P 500', col: 'Points above the S&P 500',
    value: m => (m.pn || 0) >= 5 ? m.pex : null, fmt: x => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(0)}`, min: () => true, unit: 'percentage points above the S&P 500 on their stock purchases',
    how: 'For each stock purchase reported since January 2025, the return from the trade-date closing price to the latest close, weighted by the middle of the reported dollar range, minus what the S&P 500 (SPY) did over exactly the same days. Members with fewer than five purchases of priced, publicly traded stocks are left out. Past results say nothing about future ones.', src: 'House Clerk and Senate periodic transaction reports; daily closing prices' },
};
const VIEWS = { '': ['in Congress', m => true], senate: ['in the Senate', m => m.chamber === 'Senate'], house: ['in the House', m => m.chamber === 'House'],
  democrats: ['among Democrats', m => m.party === 'D'], republicans: ['among Republicans', m => m.party === 'R'] };
const VIEW_LABEL = { '': 'All of Congress', senate: 'Senate', house: 'House', democrats: 'Democrats', republicans: 'Republicans' };
const rpath = (slug, view) => `/rankings/${slug}${view ? '/' + view : ''}`;
const seat = m => m.chamber === 'Senate' ? `${m.party}-${m.state}` : `${m.party}-${m.state}-${+m.district || 'AL'}`;
const who = m => `${m.chamber === 'Senate' ? 'Sen.' : (m.delegate ? 'Del.' : 'Rep.')} ${m.name} (${seat(m)})`;

async function ranking(slug, view = '') {
  const M = METRICS[slug], V = VIEWS[view];
  if (!M || !V) return null;
  const [all, meta] = await Promise.all([DATA(), META(['asOf'])]);
  const asOf = (meta.asOf || {});
  const asOfDate = date(M.src.startsWith('FEC') ? asOf.fec : M.src.startsWith('Voteview') ? asOf.votes : asOf.ptr) || date(new Date().toISOString());
  const pool = all.filter(m => !(m.delegate && (slug === 'most-missed-votes' || slug === 'breaks-with-party'))).filter(V[1]);
  const ranked = pool.map(m => [m, M.value(m)]).filter(([, v]) => v != null && M.min(v)).sort((x, y) => y[1] - x[1]);
  const top = ranked.slice(0, 100);
  if (!top.length) return null;
  const scope = V[0], h1 = view ? `${M.h.replace(/ in Congress| of Congress/, '')}: ${VIEW_LABEL[view]}` : M.h;
  const vals = ranked.map(r => r[1]), med = vals.length ? vals[Math.floor(vals.length / 2)] : null;
  const lead = `As of ${asOfDate}, ${who(top[0][0])} has the highest figure ${scope}: ${M.fmt(top[0][1])} ${M.unit}.` +
    (top[1] ? ` Next are ${who(top[1][0])} at ${M.fmt(top[1][1])}${top[2] ? ` and ${who(top[2][0])} at ${M.fmt(top[2][1])}` : ''}.` : '') +
    (slug === 'most-stock-trades' || slug === 'committee-tied-trades' || slug === 'former-staff-lobbying' ? ` ${num(ranked.length)} members have at least one; among them the median is ${M.fmt(med)}.` : ` ${num(ranked.length)} members are ranked; the typical (median) member is at ${M.fmt(med)}.`);
  const byParty = ['D', 'R'].map(p => { const r = ranked.filter(x => x[0].party === p); return r.length ? `${PN[p]}s: ${num(r.length)} ranked, median ${M.fmt(r[Math.floor(r.length / 2)][1])}` : null; }).filter(Boolean);
  const body = `<p class="sr-sub">Ranking · ${esc(VIEW_LABEL[view])} · Updated ${esc(asOfDate)}</p><h1>${esc(h1)}</h1>
<p class="sr-lead">${esc(lead)}</p>
${facts([['Members ranked', num(ranked.length)], ['Highest', M.fmt(top[0][1])], ['Median', M.fmt(med)], ...(view === '' || view === 'senate' || view === 'house' ? [] : [])])}
<nav class="sr-pager" aria-label="Views">${Object.keys(VIEWS).map(v => v === view ? `<b>${VIEW_LABEL[v]}</b>` : `<a href="${rpath(slug, v)}">${VIEW_LABEL[v]}</a>`).join('')}</nav>
${sec(`Top ${top.length}`, `<ol class="sr-list sr-rank">${top.map(([m, v], i) => `<li><span><b>${i + 1}.</b> ${a(P('member', m.id, m.name), m.name)} <small>${esc(seat(m))} · ${m.chamber}</small></span><span>${esc(M.fmt(v))}</span></li>`).join('')}</ol>`)}
${sec('By party', !view || view === 'senate' || view === 'house' ? `<p>${esc(byParty.join('. '))}.</p>` : '')}
${sec('How we count', `<p>${esc(M.how)}</p><p>Source: ${esc(M.src)}. Every member’s figure links to their profile, which links to the original filings. Data as of ${esc(asOfDate)}, updated daily.</p>`)}
${sec('Other rankings', cols(Object.entries(METRICS).filter(([s]) => s !== slug).map(([s, x]) => a(rpath(s, view), x.short))))}
${note('Capitol Receipts is nonpartisan. Every member is measured the same way, from public records.')}`;
  return {
    lead, title: title(`${view ? M.short + ': ' + VIEW_LABEL[view] : M.h} (2026)`), desc: clamp(lead, 158), path: rpath(slug, view), route: null, ogType: 'article',
    crumbs: [['Rankings', L.abs('/rankings')], [view ? `${M.short}: ${VIEW_LABEL[view]}` : M.short, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'ItemList', name: h1, description: M.how, numberOfItems: top.length, itemListOrder: 'https://schema.org/ItemListOrderDescending',
      itemListElement: top.slice(0, 50).map(([m, v], i) => ({ '@type': 'ListItem', position: i + 1, name: `${m.name} (${seat(m)}): ${M.fmt(v)}`, url: L.abs(P('member', m.id, m.name)) })) },
      { '@context': 'https://schema.org', '@type': 'Dataset', name: h1, description: `${M.how} Source: ${M.src}.`, url: L.abs(rpath(slug, view)), dateModified: new Date().toISOString().slice(0, 10),
        creator: { '@type': 'Organization', name: 'Capitol Receipts', url: L.SITE + '/' }, isAccessibleForFree: true, license: 'https://creativecommons.org/licenses/by/4.0/' }],
    body,
  };
}

async function index() {
  const all = await DATA();
  const lines = await Promise.all(Object.entries(METRICS).map(async ([s, M]) => { const r = await ranking(s); const top = r && r.desc.match(/^As of [A-Z][a-z]{2} \d{1,2}, \d{4}, (.*?) has the highest/); return `<li><span>${a(rpath(s, ''), M.h)}<br><small>${esc(top ? 'Leader: ' + top[1] : '')}</small></span><span>${Object.keys(VIEWS).filter(Boolean).map(v => a(rpath(s, v), VIEW_LABEL[v])).join(' · ')}</span></li>`; }));
  return { title: title('Congress Rankings: Stock Trades, Money, Votes & Lobbying'), desc: 'Who in Congress trades the most stock, raises the most money, misses the most votes and breaks with their party most. Rankings from public records, updated daily.',
    path: '/rankings', route: null, crumbs: [['Rankings', null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Congress rankings', url: L.abs('/rankings') }],
    body: `<h1>Congress rankings</h1><p class="sr-lead">Who trades the most stock, raises the most money, misses the most votes and breaks with their party most. Every list covers all ${num(all.length)} current members, measured the same way from public records, and can be narrowed to the Senate, House, Democrats or Republicans.</p><ul class="sr-list">${lines.join('')}</ul>` };
}

module.exports = { METRICS, VIEWS, ranking, index, rpath };
