/* Router table for the search-friendly pages, plus directory pages and sitemaps. */
const L = require('./_seo_lib');
const H = require('./_seo_people');
const R = require('./_seo_records');
const STK = require('./_seo_stocks');
const { q, all, MEMBERS, COMMITTEES, CAUCUSES, esc, P, a, ST, PN, num, money, date, clamp, title, cols, rows, facts, pager, HOST, cached } = L;

const PAGES = {
  'member': H.member, 'past-member': H.pastMember, 'appointee': H.appointee, 'nominee': H.nominee, 'judge': H.judge,
  'bill': R.bill, 'vote': R.vote, 'pac': R.pac, 'lobbying': R.lobbying, 'lobbying-firm': R.lobbyingFirm, 'company': R.company,
  'committee': R.committee, 'caucus': R.caucus, 'race': R.race, 'outside-group': R.outsideGroup, 'ethics': R.ethics,
  'state': R.state, 'district': R.district, 'stock': STK.stock,
};

const PER = 250;
function hub(o) { // o: {path, h1, sub, lead, title, desc, body, page, pages}
  if (o.page > o.pages) return L.notFound(o.path + '?page=' + o.page);
  const pg = o.page > 1 ? ` (page ${o.page} of ${o.pages})` : '';
  return { title: title(o.title + pg), desc: clamp(o.desc, 158), path: o.path + (o.page > 1 ? `?page=${o.page}` : ''), route: null, noindex: o.page > 1,
    crumbs: [[o.h1, null]], ld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: o.h1, description: o.desc, url: HOST + o.path }],
    body: `<h1>${esc(o.h1)}</h1>${o.sub ? `<p class="sr-sub">${esc(o.sub)}${pg}</p>` : ''}${o.lead ? `<p class="sr-lead">${esc(o.lead)}</p>` : ''}${o.body}${pager(o.path, o.page, o.pages)}` };
}
async function paged(table, select, order, page) {
  const from = (page - 1) * PER;
  const r = await q(`${table}?select=${select}&order=${order}`, { range: `${from}-${from + PER - 1}`, count: 'estimated' }); // exact counts of 100k+ rows are slow; big lists use the planner's estimate
  return { rows: r.rows, pages: Math.max(1, Math.ceil(r.total / PER)), total: r.total };
}

const HUBS = {
  stocks: STK.stocks,
  async members() {
    const { rows: ms } = await MEMBERS();
    const byState = {}; ms.forEach(m => (byState[m.state] = byState[m.state] || []).push(m));
    const body = Object.keys(byState).sort((x, y) => (ST[x] || x).localeCompare(ST[y] || y)).map(s => `<section><h2>${a(P('state', s, ST[s]), ST[s] || s)}</h2>${cols(byState[s].sort((x, y) => (x.chamber === 'Senate' ? -1 : 1) - (y.chamber === 'Senate' ? -1 : 1) || (x.district || 0) - (y.district || 0)).map(m => `${a(P('member', m.id, m.name), m.name)} <small>${m.party} · ${m.chamber === 'Senate' ? 'Senate' : (+m.district ? 'District ' + m.district : 'At large')}</small>`))}</section>`).join('');
    return hub({ path: '/members', page: 1, pages: 1, h1: 'Members of Congress', sub: `${num(ms.length)} current senators and representatives`,
      title: 'All Members of Congress: Donors, Stock Trades & Votes', desc: `Every current member of the U.S. House and Senate, by state. See who funds them, what stocks they trade, how they vote and who lobbies them.`, body });
  },
  async 'this-week'() {
    const today = new Date(), iso = d => d.toISOString().slice(0, 10);
    const since = iso(new Date(today - 30 * 864e5)), since14 = iso(new Date(today - 14 * 864e5));
    const [ms, votes, eth, noms, og] = await Promise.all([
      q('members?select=id,name,party,state,chamber,trades:data->trades,rec:data->money->rec'),
      q(`vote_index?select=key,chamber,voted_on,title&congress=eq.119&order=voted_on.desc,roll.desc&limit=12`),
      q('ethics_matters?select=id,title,d:data->>d&order=ord.asc&limit=5'),
      q('nominations?select=id,name,position,confirmed_on&confirmed_on=not.is.null&order=confirmed_on.desc&limit=8'),
      q('outside_groups?select=id,name,total&order=total.desc.nullslast&limit=6')]);
    const trades = [];
    ms.forEach(m => (m.trades || []).forEach(t => { if (t[0] >= since) trades.push([m, t]); }));
    trades.sort((x, y) => (y[1][5] || 0) - (x[1][5] || 0) || String(y[1][0]).localeCompare(x[1][0]));
    const top = [...ms].sort((x, y) => (+y.rec || 0) - (+x.rec || 0)).slice(0, 10);
    const recent = votes.filter(v => v.voted_on >= since14);
    const wk = date(iso(today));
    const ml = m => `${a(P('member', m.id, m.name), m.name)} <small>${m.party}-${m.state}</small>`;
    const body = `<p class="sr-lead">What members of Congress traded, raised and voted on, from the latest public filings. Updated daily; this edition is from ${esc(wk)}.</p>
${facts([['Stock trades in the last 30 days', num(trades.length)], ['Members trading', num(new Set(trades.map(x => x[0].id)).size)], ['Votes in the last 14 days', num(recent.length)]])}
<section><h2>Biggest stock trades, last 30 days</h2>${trades.length ? rows(trades.slice(0, 25).map(([m, t]) => [`${ml(m)}<br><small>${esc(t[1])} · ${esc(clamp(t[3], 80))} · ${esc(date(t[0]))}</small>`, `${money(t[4])}–${money(t[5])}`])) : '<p>No trades reported in the last 30 days.</p>'}</section>
<section><h2>${recent.length ? 'Votes this week' : 'Latest votes'}</h2>${recent.length ? '' : '<p>Congress has not voted in the last two weeks. These are the most recent votes.</p>'}${rows((recent.length ? recent : votes.slice(0, 8)).map(v => [a(P('vote', v.key, v.title), clamp(R.unshout(v.title), 110)), `${v.chamber === 'S' ? 'Senate' : 'House'} · ${esc(date(v.voted_on))}`]))}</section>
<section><h2>Recently confirmed</h2>${rows(noms.map(n => [a(P('nominee', n.id, n.name), n.name) + ` <small>${esc(n.position)}</small>`, esc(date(n.confirmed_on))]))}</section>
<section><h2>Top fundraisers for 2026</h2>${rows(top.map(m => [ml(m), money(+m.rec)]))}</section>
<section><h2>Biggest outside spenders in the 2026 races</h2>${rows(og.map(g => [a(P('outside-group', g.id, g.name), g.name), money(g.total)]))}</section>
<section><h2>Latest House ethics statements</h2>${rows(eth.map(e => [a(P('ethics', e.id, e.title), clamp(e.title, 110)), esc(date(e.d))]))}</section>
<section><h2>Use this in your reporting</h2><p>Every number links to its public source. Quote it with a link to this page, or embed any member's card from their profile. Questions or corrections: <a href="mailto:corrections@capitolreceipts.com">corrections@capitolreceipts.com</a>.</p></section>`;
    return hub({ path: '/this-week', page: 1, pages: 1, h1: 'This week in Congress', sub: `Trades, votes and money · ${wk}`,
      title: `This Week in Congress: Stock Trades, Votes & Money`, desc: `The biggest stock trades by members of Congress in the last 30 days, the latest votes, confirmations, top fundraisers and outside spending. Updated daily.`, body });
  },
  async states() {
    const { rows: ms } = await MEMBERS();
    const c = {}; ms.forEach(m => c[m.state] = (c[m.state] || 0) + 1);
    const body = cols(Object.keys(ST).filter(s => c[s]).sort((x, y) => ST[x].localeCompare(ST[y])).map(s => `${a(P('state', s, ST[s]), ST[s])} <small>${c[s]} members</small>`));
    return hub({ path: '/states', page: 1, pages: 1, h1: 'Congress by state', sub: 'Find your senators and representative', title: 'Congress by State: Find Your Senators & Representative',
      desc: 'Pick your state to see its senators and House members, how much they raised for 2026, their stock trades and the 2026 races.', body });
  },
  async 'past-members'(page) {
    const r = await paged('people', 'id,name,party,first_year,last_year', 'name.asc', page);
    return hub({ path: '/past-members', page, pages: r.pages, h1: 'Past members of Congress', sub: `${num(r.total)} former senators and representatives since 1789`,
      title: 'Past Members of Congress since 1789', desc: 'Every former U.S. senator and representative since 1789: terms, party, bills sponsored and voting records.',
      body: cols(r.rows.map(p => `${a(P('past-member', p.id, p.name), p.name)} <small>${esc((p.party || '')[0] || '')} · ${p.first_year || ''}–${p.last_year || ''}</small>`)) });
  },
  async appointees(page) {
    const [r, noms] = await Promise.all([paged('appointees', 'id,name,light->>ttl', 'ord.asc', page), page === 1 ? q('nominations?select=id,name,position,confirmed_on&order=ord') : []]);
    return hub({ path: '/appointees/all', page, pages: r.pages, h1: 'Appointees and nominees', sub: 'Cabinet members, agency heads, ambassadors and other Senate-confirmed officials',
      title: 'Presidential Appointees & Nominees: Votes and Finances', desc: 'Cabinet members, agency heads and ambassadors: who they are, how the Senate voted on them and what their financial disclosures show.',
      body: (noms.length ? `<section><h2>Current administration nominees</h2>${cols(noms.map(n => `${a(P('nominee', n.id, n.name), n.name)} <small>${esc(n.position)}</small>`))}</section><h2>All appointees</h2>` : '') +
        cols(r.rows.map(p => `${a(P('appointee', p.id, p.name), p.name)}${p.ttl ? ` <small>${esc(clamp(p.ttl, 60))}</small>` : ''}`)) });
  },
  async judges(page) {
    const r = await paged('judges', 'id,name,court,active', 'active.desc,name.asc', page);
    return hub({ path: '/judges', page, pages: r.pages, h1: 'Federal judges', sub: `${num(r.total)} federal judges, current and past`,
      title: 'Federal Judges: Who Appointed Them & Their Records', desc: 'Every federal judge: court, the president who appointed them, Senate confirmation votes, education and career.',
      body: cols(r.rows.map(j => `${a(P('judge', j.id, j.name), j.name)} <small>${esc(clamp(j.court.replace('U.S. ', ''), 50))}${j.active ? '' : ' · former'}</small>`)) });
  },
  async bills(page) {
    const r = await paged('bills', 'key,title,congress,became_law', 'congress.desc,bill_type.asc,number.desc', page);
    return hub({ path: '/bills', page, pages: r.pages, h1: 'Bills in Congress', sub: `${num(r.total)} bills since 1947, newest Congress first`,
      title: 'Bills in Congress: Status, Sponsors, Votes & Lobbying', desc: 'Every bill in Congress since 1947: what it does, who sponsored it, how Congress voted and who lobbied on it.',
      body: rows(r.rows.map(b => [a(P('bill', b.key, b.title), `${H.billLabel(b.key)}: ${clamp(b.title, 110)}`), `${L.ord(b.congress)} Congress${b.became_law ? ' · Law' : ''}`])) });
  },
  async votes(page) {
    const r = await paged('vote_index', 'key,chamber,voted_on,title,congress', 'congress.desc,chamber.asc,roll.desc', page);
    return hub({ path: '/votes', page, pages: r.pages, h1: 'Every vote in Congress', sub: `${num(r.total)} recorded House and Senate votes since 1789, newest first`,
      title: 'Every Vote in Congress since 1789: How Each Member Voted', desc: 'Every recorded House and Senate roll call vote since 1789: what was voted on, the result, the party split and how each member voted.',
      body: rows(r.rows.map(v => [a(P('vote', v.key, v.title), clamp(R.unshout(v.title), 120)), `${v.chamber === 'S' ? 'Senate' : 'House'} · ${esc(date(v.voted_on))}`])) });
  },
  async pacs(page) {
    const r = await paged('pacs', 'id,name,light->>fn,category,total', 'total.desc.nullslast', page);
    return hub({ path: '/pacs', page, pages: r.pages, h1: 'PACs giving to Congress', sub: `${num(r.total)} political action committees, biggest givers first`,
      title: 'PACs: Who Funds Members of Congress', desc: 'Political action committees ranked by how much they give to members of Congress, and which members they fund.',
      body: rows(r.rows.map(p => [a(P('pac', p.id, p.fn || p.name), p.fn || p.name) + (p.category ? ` <small>${esc(p.category)}</small>` : ''), money(p.total)])) });
  },
  async lobbying(page) {
    const r = await paged('lobby_clients', 'id,name,spend', 'spend.desc.nullslast', page);
    return hub({ path: '/lobbying', page, pages: r.pages, h1: 'Who lobbies Congress', sub: `${num(r.total)} organizations, biggest spenders first`,
      title: 'Who Lobbies Congress: Biggest Lobbying Spenders', desc: 'The organizations spending the most to lobby Congress and federal agencies, the bills they target and the ex-staffers they hire.',
      body: rows(r.rows.map(c => [a(P('lobbying', c.id, c.name), c.name), money(c.spend)])) });
  },
  async 'lobbying-firms'(page) {
    const r = await paged('lobby_firms', 'id,name,income', 'income.desc.nullslast', page);
    return hub({ path: '/lobbying-firms', page, pages: r.pages, h1: 'Lobbying firms', sub: `${num(r.total)} firms, highest-earning first`,
      title: 'Top Lobbying Firms in Washington: Clients & Income', desc: 'Washington lobbying firms ranked by lobbying income, with every client they represent.',
      body: rows(r.rows.map(f => [a(P('lobbying-firm', f.id, f.name), f.name), money(f.income)])) });
  },
  async companies(page) {
    const r = await paged('companies', 'id,name,tickers', 'score.desc.nullslast', page);
    return hub({ path: '/companies', page, pages: r.pages, h1: 'Companies and Congress', sub: 'Stock trades by members, federal contracts, lobbying and PAC money',
      title: 'Companies & Congress: Stock Trades, Contracts, Lobbying', desc: 'Which companies members of Congress trade, and how much those companies get in federal contracts, spend on lobbying and give through PACs.',
      body: cols(r.rows.map(c => `${a(P('company', c.id, c.name), c.name)}${(c.tickers || []).length ? ` <small>${esc(c.tickers.join(', '))}</small>` : ''}`)) });
  },
  async committees() {
    const { rows: cs } = await COMMITTEES();
    const grp = ch => cols(cs.filter(c => (c.data.ch || '') === ch).map(c => a(P('committee', c.id, c.name), c.name)));
    return hub({ path: '/committees', page: 1, pages: 1, h1: 'Congressional committees', sub: `${num(cs.length)} House, Senate and joint committees`,
      title: 'Congressional Committees: Members & Jurisdiction', desc: 'Every House, Senate and joint committee in Congress: who sits on it, who leads it and what it oversees.',
      body: `<h2>House</h2>${grp('house')}<h2>Senate</h2>${grp('senate')}${cs.some(c => c.data.ch === 'joint') ? `<h2>Joint</h2>${grp('joint')}` : ''}` });
  },
  async caucuses() {
    const cs = await CAUCUSES();
    return hub({ path: '/caucuses', page: 1, pages: 1, h1: 'Caucuses in Congress', sub: 'Groups of members who organize around shared views', title: 'Caucuses in Congress: Members & Voting Unity',
      desc: 'Major caucuses in Congress, their members and how often they vote together.', body: cols(cs.map(c => `${a(P('caucus', c.id, c.name), c.name)} <small>${num((c.data.members || []).length)} members</small>`)) });
  },
  async elections() {
    const rs = await q('races?select=id,state,data->o,data->d,data->sp,data->st,data->rt&order=state,id');
    const by = {}; rs.forEach(r => (by[r.state] = by[r.state] || []).push(r));
    const body = Object.keys(by).sort((x, y) => (ST[x] || x).localeCompare(ST[y] || y)).map(s => `<section><h2>${esc(ST[s] || s)}</h2>${cols(by[s].map(r => { const nm = R.raceName({ st: s, o: r.o, d: r.d, sp: r.sp }); return a(P('race', r.id, '2026 ' + nm), nm) + (r.rt ? ` <small>${money(r.rt)} raised</small>` : ''); }))}</section>`).join('');
    return hub({ path: '/elections', page: 1, pages: 1, h1: '2026 congressional elections', sub: `${num(rs.length)} House and Senate races on Nov 3, 2026`,
      title: '2026 Congressional Elections: Every Race & the Money', desc: 'Every 2026 House and Senate race: the candidates, how much they raised and which outside groups are spending.', body });
  },
  async 'outside-groups'(page) {
    const r = await paged('outside_groups', 'id,name,total', 'total.desc.nullslast', page);
    return hub({ path: '/outside-groups', page, pages: r.pages, h1: 'Outside spending in 2026', sub: 'Super PACs and other groups spending on congressional races',
      title: 'Outside Spending in the 2026 Elections: Super PACs', desc: 'Super PACs and outside groups ranked by spending on 2026 House and Senate races, and who they support or oppose.',
      body: rows(r.rows.map(g => [a(P('outside-group', g.id, g.name), g.name), money(g.total)])) });
  },
  async ethics(page) {
    const r = await paged('ethics_matters', 'id,title,data->>d', 'ord.asc', page);
    return hub({ path: '/ethics', page, pages: r.pages, h1: 'House ethics statements', sub: `${num(r.total)} statements from the House Committee on Ethics`,
      title: 'House Ethics Committee Statements & Investigations', desc: 'Every public statement from the House Committee on Ethics on investigations of members of Congress, newest first.',
      body: rows(r.rows.map(e => [a(P('ethics', e.id, e.title), clamp(e.title, 120)), esc(date(e.d))])) });
  },
};

/* ---------------- sitemaps ---------------- */
const SM = 10000;
const SOURCES = { // sitemap name -> table, columns, how to build the URL
  'members': ['members', 'id,name,updated_at', 'ord', r => P('member', r.id, r.name)],
  'past-members': ['people', 'id,name,updated_at', 'id', r => P('past-member', r.id, r.name)],
  'appointees': ['appointees', 'id,name,updated_at', 'id&indexable=is.true', r => P('appointee', r.id, r.name)],
  'nominees': ['nominations', 'id,name,updated_at', 'id', r => P('nominee', r.id, r.name)],
  'judges': ['judges', 'id,name,updated_at', 'id', r => P('judge', r.id, r.name)],
  'bills': ['bills', 'key,title,updated_at', 'key&indexable=is.true', r => P('bill', r.key, r.title)],
  'votes': ['vote_index', 'key,title,updated_at', 'key&indexable=is.true', r => P('vote', r.key, r.title)],
  'pacs': ['pacs', 'id,name,light->>fn,updated_at', 'id&indexable=is.true', r => P('pac', r.id, r.fn || r.name)],
  'lobbying': ['lobby_clients', 'id,name,updated_at', 'id&indexable=is.true', r => P('lobbying', r.id, r.name)],
  'lobbying-firms': ['lobby_firms', 'id,name,updated_at', 'id&indexable=is.true', r => P('lobbying-firm', r.id, r.name)],
  'companies': ['companies', 'id,name,updated_at', 'id&indexable=is.true', r => P('company', r.id, r.name)],
  'committees': ['committees', 'id,name,updated_at', 'id', r => P('committee', r.id, r.name)],
  'caucuses': ['caucuses', 'id,name,updated_at', 'id', r => P('caucus', r.id, r.name)],
  'races': ['races', 'id,office,state,district,data->sp,updated_at', 'id', r => P('race', r.id, '2026 ' + R.raceName({ st: r.state, o: r.office, d: r.district, sp: r.sp }))],
  'outside-groups': ['outside_groups', 'id,name,updated_at', 'id&indexable=is.true', r => P('outside-group', r.id, r.name)],
  'ethics': ['ethics_matters', 'id,title,updated_at', 'id&indexable=is.true', r => P('ethics', r.id, r.title)],
};
const counts = () => cached('sm-counts', async () => Object.fromEntries(await Promise.all(Object.entries(SOURCES).map(async ([k, [t]]) => [k, (await q(`${t}?select=${['bills', 'vote_index'].includes(t) ? 'key' : 'id'}${SOURCES[k][2].includes('indexable') ? '&indexable=is.true' : ''}`, { range: '0-0', count: true })).total]))), 6 * 3600e3);
const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
async function sitemapIndex() {
  const c = await counts(), files = ['hubs', 'places', 'es', 'stocks'];
  const today = new Date().toISOString().slice(0, 10);
  const site = `<sitemap><loc>${HOST}/sitemaps/site.xml</loc><lastmod>${today}</lastmod></sitemap>\n`; // marketing pages (a static file on www)
  Object.keys(SOURCES).forEach(k => { const n = Math.ceil((c[k] || 0) / SM); for (let i = 1; i <= n; i++) files.push(n > 1 ? `${k}-${i}` : k); });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${site}${files.map(f => `<sitemap><loc>${HOST}/sitemaps/${f}.xml</loc><lastmod>${today}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`;
}
const urlset = list => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list.map(([u, lm]) => `<url><loc>${xmlEsc(HOST + u)}</loc>${lm ? `<lastmod>${String(lm).slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
async function sitemapFile(name) {
  if (name === 'hubs') {
    const c = await counts();
    const pages = (k, path) => [[path]]; // later pages are link lists marked noindex
    const RK = require('./_seo_rank');
    const rk = [['/rankings'], ...Object.keys(RK.METRICS).flatMap(k => Object.keys(RK.VIEWS).map(v => [RK.rpath(k, v)]))];
    return urlset([['/'], ['/members'], ['/this-week'], ...rk, ['/es/members'], ['/es/states'], ['/es/elections'], ['/states'], ...pages('votes', '/votes'), ['/committees'], ['/caucuses'], ['/elections'], ['/stocks'], ...pages('past-members', '/past-members'), ...pages('appointees', '/appointees/all'),
      ...pages('judges', '/judges'), ...pages('bills', '/bills'), ...pages('pacs', '/pacs'), ...pages('lobbying', '/lobbying'), ...pages('lobbying-firms', '/lobbying-firms'),
      ...pages('companies', '/companies'), ...pages('outside-groups', '/outside-groups'), ...pages('ethics', '/ethics')]);
  }
  if (name === 'stocks') return urlset([['/stocks'], ...(await STK.sitemap())]);
  if (name === 'places') {
    const { rows: ms } = await MEMBERS();
    const states = [...new Set(ms.map(m => m.state))];
    return urlset([...states.map(s => [P('state', s, ST[s])]), ...ms.filter(m => m.chamber === 'House').map(m => [P('district', `${m.state}-${+m.district || 0}`, H.distName(m.state, m.district))])]);
  }
  if (name === 'es') { // Spanish pages: members, states, districts and 2026 races
    const [{ rows: ms }, races] = await Promise.all([MEMBERS(), q('races?select=id,office,state,district,data->sp&order=id')]);
    const states = [...new Set(ms.map(m => m.state))];
    return urlset([...ms.map(m => ['/es' + P('member', m.id, m.name)]), ...states.map(s => ['/es' + P('state', s, ST[s])]),
      ...ms.filter(m => m.chamber === 'House').map(m => ['/es' + P('district', `${m.state}-${+m.district || 0}`, H.distName(m.state, m.district))]),
      ...races.map(r => ['/es' + P('race', r.id, '2026 ' + R.raceName({ st: r.state, o: r.office, d: r.district, sp: r.sp }))])]);
  }
  const m = name.match(/^([a-z-]+?)(?:-(\d+))?$/); if (!m || !SOURCES[m[1]]) return null;
  const [table, cols, order, url] = SOURCES[m[1]], part = +(m[2] || 1);
  const from = (part - 1) * SM, size = 1000, reqs = [];
  for (let f = from; f < from + SM; f += size) reqs.push(q(`${table}?select=${cols}&order=${order}`, { range: `${f}-${f + size - 1}` }));
  const rs = [].concat(...(await Promise.all(reqs)));
  if (!rs.length) return null;
  return urlset(rs.map(r => [url(r), r.updated_at]));
}

module.exports = { ...L, PAGES, HUBS, sitemapIndex, sitemapFile };
