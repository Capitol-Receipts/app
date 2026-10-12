/* Pages for bills, votes, PACs, lobbying groups and firms, companies, committees, caucuses, races, outside groups,
ethics statements, states and districts. */
const L = require('./_seo_lib');
const H = require('./_seo_people');
const { q, one, inList, MEMBERS, COMMITTEES, CAUCUSES, META, names, esc, P, a, personLink, ST, PN, PADJ, ord, num, money, pct, date, isoOf,
  congYears, clamp, title, firstSentences, facts, rows, sec, cols, note, SITE } = L;
const { billKeyFromCode, billLabel, distName } = H;
const BURL = { hr: 'house-bill', s: 'senate-bill', hjres: 'house-joint-resolution', sjres: 'senate-joint-resolution' };

/* ---------------- bill ---------------- */
function stepsHtml(ty, ms, intro, la) {
  ms = ms || {};
  const sf = ty[0] === 's';
  const steps = [['Introduced', intro], [sf ? 'Passed the Senate' : 'Passed the House', sf ? ms.S : ms.H], [sf ? 'Passed the House' : 'Passed the Senate', sf ? ms.H : ms.S],
    ['Sent to the President', ms.P], [ms.V && !ms.L ? 'Vetoed' : 'Became law', ms.L || ms.V]];
  return rows(steps.map(([k, v]) => [esc(k), v ? (v === '?' ? 'Yes' : esc(date(v))) : '—'])) + (la && la[1] ? `<p>Latest action: ${esc(la[1])} (${esc(date(la[0]))})</p>` : '');
}
function billStatus(ms, law) {
  ms = ms || {};
  if (ms.L || law) return 'Became law'; if (ms.V) return 'Vetoed'; if (ms.P) return 'Sent to the President';
  if (ms.H && ms.S) return 'Passed both chambers'; if (ms.H) return 'Passed the House'; if (ms.S) return 'Passed the Senate'; return 'Introduced';
}
async function bill(key) {
  const r = await one(`bills?key=eq.${encodeURIComponent(key)}&select=key,congress,bill_type,number,light,detail`);
  if (!r) return null;
  const b = (r.light || []).slice();
  Object.entries(r.detail || {}).forEach(([i, v]) => b[+i] = v);
  const [ttl, short, spId, spn, intro, cos, cosp, pa, com, sum, ms, law, la, votes] = b;
  const c = r.congress, ty = r.bill_type, label = billLabel(key), name = short || ttl || label;
  const status = billStatus(ms, law);
  const [n, meta, comms] = await Promise.all([names([spId]), c === 119 ? META(['lobbied_bills', 'lobby']) : {}, COMMITTEES()]);
  const lob = c === 119 && meta.lobbied_bills ? meta.lobbied_bills[ty.toUpperCase() + r.number] : null;
  const clients = lob && lob.top && lob.top.length ? await q(`lobby_clients?select=id,name&name=${inList(lob.top)}`) : [];
  const cid = Object.fromEntries(clients.map(x => [x.name, x.id]));
  const commId = nm => { const s = String(nm).replace(/ Committee$/, '').toLowerCase(); const ch = ty[0] === 's' ? 'senate' : 'house';
    const hit = comms.rows.find(x => x.data.ch === ch && x.name.toLowerCase().replace(/^(house|senate) committee on /, '').replace(/^(house|senate) /, '') === s.replace(/^(house|senate) committee on /, '').replace(/^committee on /, ''));
    return hit; };
  const cs = ['D', 'R', 'I'].map(x => [x, (cosp || {})[x] || 0]).filter(x => x[1]);
  const lead = `${label} in the ${ord(c)} Congress (${congYears(c)})${short && ttl && short !== ttl ? `, the ${short},` : ''} ${status === 'Introduced' ? 'was introduced' : status.toLowerCase().startsWith('became') ? 'became law' : 'has ' + status.toLowerCase().replace('passed', 'passed')}${intro ? ` ${status === 'Introduced' ? 'on' : '— introduced'} ${date(intro)}` : ''}${spn ? `, sponsored by ${n[spId] ? n[spId].name : spn}` : ''}${cos ? ` with ${num(cos)} co-sponsors` : ''}.`;
  const t = `${label} (${ord(c)} Congress): ${name}`;
  const desc = clamp(`${lead} ${sum ? firstSentences(sum, 200) : ''}`, 158);
  const body = `<p class="sr-sub">${esc(label)} · ${ord(c)} Congress · ${congYears(c)}</p><h1>${esc(name)}</h1>
<p class="sr-lead">${esc(lead)}</p>
${facts([['Status', status], ['Introduced', intro ? date(intro) : null], ['Co-sponsors', cos != null ? num(cos) : null], ['Policy area', pa || null], ['Public law', law || null], ['Groups that lobbied', lob ? num(lob.n) : null]])}
${sec('What it does', sum ? `<p>${esc(sum)}</p><p><small>Summary by the nonpartisan Congressional Research Service.</small></p>` : '')}
${sec('Official title', short && ttl && short !== ttl ? `<p>${esc(ttl)}</p>` : '')}
${sec('Sponsor', spId || spn ? `<p>${spId && n[spId] ? personLink(n, spId) : esc(spn)}${cs.length ? `. Co-sponsors: ${cs.map(([p, k]) => `${k} ${PN[p]}${k > 1 ? 's' : ''}`).join(', ')}.` : ''}</p>` : '')}
${sec('Where it stands', stepsHtml(ty, ms, intro, la))}
${sec('How Congress voted', (votes || []).length ? rows(votes.map(v => [`${esc(v[5] || 'Vote')}<br><small>${v[0] === 'H' ? 'House' : 'Senate'} · ${esc(date(v[1]))}${v[4] ? ' · ' + esc(v[4]) : ''}</small>`, `${v[2]}–${v[3]}`])) : '')}
${sec('Who lobbied on it', lob ? `<p>${num(lob.n)} organizations named this bill in lobbying reports (${esc((meta.lobby || {}).periods || '')}). Biggest spenders among them:</p>${cols(lob.top.map(x => cid[x] ? a(P('lobbying', cid[x], x), x) : esc(x)))}` : '')}
${sec('Committees', (com || []).length ? cols(com.map(x => { const h = commId(x); return h ? a(P('committee', h.id, h.name), x) : esc(x); })) : '')}
${sec('More', cols([a(`https://www.congress.gov/bill/${ord(c)}-congress/${BURL[ty] || ty}/${r.number}`, 'Full text and every action on Congress.gov'), a('/bills', 'Browse all bills')]))}
${note(c < 108 ? 'From the Congressional Bills Project (Adler and Wilkerson), covering 1947–2002.' : 'From GovInfo bill records, Congressional Research Service summaries, Voteview roll calls and lobbying reports.')}`;
  return {
    title: title(t), desc, path: P('bill', key, name), route: 'bill:' + key, ogType: 'article',
    crumbs: [['Bills', L.abs('/bills')], [label, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Legislation', name, alternateName: label, legislationIdentifier: `${label} (${ord(c)} Congress)`,
      legislationJurisdiction: 'US', legislationType: ty.includes('res') ? 'Joint resolution' : 'Bill', legislationDate: intro || undefined,
      legislationLegalForce: law ? 'InForce' : undefined, abstract: sum ? firstSentences(sum, 500) : undefined, url: L.abs(P('bill', key, name)),
      legislationPassedBy: { '@type': 'GovernmentOrganization', name: 'United States Congress' },
      author: spId && n[spId] ? { '@type': 'Person', name: n[spId].name, url: L.abs(P(n[spId].cur ? 'member' : 'past-member', spId, n[spId].name)) } : undefined }],
    body,
  };
}

/* ---------------- roll call vote (every vote since 1789, member by member) ---------------- */
const CVC = new Map(); // a few per-Congress vote records, kept 30 minutes
function cvRow(id) {
  const c = CVC.get(id);
  if (c && Date.now() - c.at < 1800e3) return c.p;
  const p = one(`congress_votes?id=eq.${encodeURIComponent(id)}&select=congress,chamber,data`).catch(e => { CVC.delete(id); throw e; });
  CVC.set(id, { at: Date.now(), p }); if (CVC.size > 12) CVC.delete(CVC.keys().next().value);
  return p;
}
const VW = { Y: 'Yes', N: 'No', P: 'Present', '.': 'Did not vote' };
async function vote(key) {
  let m = String(key).match(/^([HS])(\d+)$/); if (m) key = `119-${m[1]}-${m[2]}`; // short IDs from the current Congress
  m = String(key).match(/^(\d{1,3})-([HS])-(\d+)$/); if (!m) return null;
  const c = +m[1], ch = m[2], roll = +m[3];
  const row = await cvRow(`${c}-${ch}`); if (!row || !row.data) return null;
  const d = row.data, i = (d.rc || []).findIndex(r => +r[0] === roll); if (i < 0) return null;
  const [, dt, code, qn, res, y, n, descr] = d.rc[i];
  const chamber = ch === 'S' ? 'Senate' : 'House', who = ch === 'S' ? 'senator' : 'representative';
  const bm = String(code || '').match(/^(HR|S|HJRES|SJRES)(\d+)$/i);
  const [{ by }, bill] = await Promise.all([MEMBERS(), bm && c >= 80 ? one(`bills?key=eq.${c}-${bm[1].toLowerCase()}-${+bm[2]}&select=key,title`) : null]);
  const casts = { Y: [], N: [], P: [], '.': [] }, parties = {};
  (d.m || []).forEach((mm, j) => {
    const v = ((d.v || [])[j] || '')[i]; if (!v || !casts[v]) return;
    casts[v].push(mm);
    const pp = parties[mm[2]] = parties[mm[2]] || { Y: 0, N: 0, P: 0, '.': 0 }; pp[v]++;
  });
  const what = descr || qn || 'Roll call vote';
  const split = Object.entries(parties).filter(([, v]) => v.Y + v.N).sort((x, z) => (z[1].Y + z[1].N) - (x[1].Y + x[1].N)).map(([p, v]) => `${PN[p] || p}s ${v.Y}–${v.N}`).join(', ');
  const lead = `On ${date(dt)}, the ${chamber} voted ${y}–${n} on “${qn}”${code ? ` (${code.replace(/^([A-Z]+)(\d+)$/, '$1 $2')})` : ''}. Result: ${res || (y > n ? 'passed' : 'failed')}.${split ? ` By party: ${split}.` : ''}`;
  const ml = mm => `${a(P(by[mm[0]] ? 'member' : 'past-member', mm[0], mm[1]), mm[1])} <small>${esc(mm[2] || '')}-${esc(mm[3] || '')}</small>`;
  const prev = d.rc[i - 1], next = d.rc[i + 1];
  const body = `<p class="sr-sub">${chamber} roll call ${roll} · ${ord(c)} Congress · ${esc(date(dt))}</p><h1>${esc(clamp(what, 180))}</h1>
<p class="sr-lead">${esc(lead)}</p>
${facts([['Result', res || null], ['Yes', num(y)], ['No', num(n)], ['Did not vote', casts['.'].length ? num(casts['.'].length) : null], ['Date', date(dt)]])}
${sec('By party', rows(Object.entries(parties).filter(([, v]) => v.Y + v.N + v.P).map(([p, v]) => [esc(PN[p] || p) + 's', `${v.Y} yes · ${v.N} no${v['.'] ? ` · ${v['.']} didn’t vote` : ''}`])))}
${sec('The bill', bill ? `<p>${a(P('bill', bill.key, bill.title), `${billLabel(bill.key)}: ${bill.title}`)}</p>` : '')}
${sec(`How each ${who} voted: Yes`, cols(casts.Y.map(ml)))}${sec(`How each ${who} voted: No`, cols(casts.N.map(ml)))}
${sec('Voted present', cols(casts.P.map(ml)))}${sec('Did not vote', cols(casts['.'].map(ml)))}
${sec('Other votes', cols([prev ? a(P('vote', `${c}-${ch}-${prev[0]}`, prev[7] || prev[3]), `Previous: ${clamp(prev[7] || prev[3], 80)}`) : '', next ? a(P('vote', `${c}-${ch}-${next[0]}`, next[7] || next[3]), `Next: ${clamp(next[7] || next[3], 80)}`) : '', a('/votes', 'All votes in Congress')].filter(Boolean)))}
${note('From Voteview roll call records.')}`;
  return { title: title(`${clamp(what, 46)}: ${chamber} Vote, ${date(dt)}`), desc: clamp(lead + ` See how every ${who} voted.`, 158), path: P('vote', key, what), route: 'vote:' + key, ogType: 'article',
    crumbs: [['Votes', L.abs('/votes')], [`${chamber} vote ${roll} (${c}th Congress)`.replace(/(\d+)th Congress/, (x, k) => ord(+k) + ' Congress'), null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Event', name: `${chamber} vote: ${clamp(what, 100)}`, startDate: dt, eventStatus: 'https://schema.org/EventScheduled',
      location: { '@type': 'Place', name: `U.S. ${chamber}`, address: 'Washington, DC' }, description: lead }],
    body };
}

/* ---------------- PAC ---------------- */
async function pac(id) {
  const r = await one(`pacs?id=eq.${encodeURIComponent(id)}&select=id,name,category,total,cycle_total,light,detail`);
  if (!r) return null;
  const p = { ...(r.light || {}), ...(r.detail || {}) };
  const nm = p.fn || r.name || p.n;
  const cur = p.cur || [], top = p.top || [];
  const [n, co] = await Promise.all([names([...cur.map(x => x[0]), ...top.map(x => x[0])].slice(0, 300)), one(`companies?pac=eq.${encodeURIComponent(id)}&select=id,name`).catch(() => null)]);
  const sp = p.sp || {}, spT = Object.values(sp).reduce((s, v) => s + v, 0) || 1;
  const split = Object.entries(sp).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${pct(v / spT)} to ${PN[k] || k}s`).join(', ');
  const yrs = p.yrs || [];
  const lead = `${nm}${p.cat ? `, a ${String(p.cat).replace(/s$/, '').replace(/PAC$/, 'PAC').toLowerCase()}` : ''}, ${p.curT ? `gave ${money(p.curT)} to ${num(p.curN)} current members of Congress in 2025–26` : 'has made no contributions to current members in 2025–26'}${p.tot ? `, and ${money(p.tot)} to candidates since ${yrs[0] || 'records began'}` : ''}.${split ? ` ${split}.` : ''}`;
  const t = `${nm}: Who This PAC Gives To in Congress`;
  const body = `<h1>${esc(nm)}</h1><p class="sr-sub">Political action committee${p.cat ? ' · ' + esc(p.cat) : ''}${p.loc ? ' · ' + esc(p.loc) : ''}</p>
<p class="sr-lead">${esc(lead)}</p>
${facts([['Given in 2025–26', p.curT ? money(p.curT) : null], ['Members funded', p.curN ? num(p.curN) : null], ['Given since ' + (yrs[0] || ''), p.tot ? money(p.tot) : null], ...Object.entries(sp).map(([k, v]) => [`To ${PN[k] || k}s`, money(v)])])}
${sec('Members it funds now (2025–26)', cur.length ? rows(cur.slice(0, 60).map(x => [personLink(n, x[0]), money(x[1])])) : '')}
${sec('Biggest recipients over time', top.length ? rows(top.slice(0, 30).map(x => [personLink(n, x[0]), `${money(x[1])}${x[2] ? ` · ${x[2]}${x[3] && x[3] !== x[2] ? '–' + x[3] : ''}` : ''}`])) : '')}
${sec('Connected company', co ? `<p>${a(P('company', co.id, co.name), co.name)}</p>` : '')}
${sec('More', cols([a(`https://www.fec.gov/data/committee/${id}/`, 'FEC filings'), a('/pacs', 'All PACs')]))}
${note('From FEC itemized contribution records.')}`;
  return { title: title(t), desc: clamp(lead, 158), path: P('pac', id, nm), route: 'pac:' + id, crumbs: [['PACs', L.abs('/pacs')], [nm, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Organization', name: nm, url: L.abs(P('pac', id, nm)), identifier: id, description: lead, address: p.loc || undefined }], body };
}

/* ---------------- lobbying client ---------------- */
async function lobbying(id) {
  const r = await one(`lobby_clients?id=eq.${encodeURIComponent(id)}&select=id,name,spend,light,detail`);
  if (!r) return null;
  const d = { ...(r.light || {}), ...(r.detail || {}) };
  const meta = await META(['pages_issue', 'lobby']);
  const iss = meta.pages_issue || {}, periods = (meta.lobby || {}).periods || '';
  const bks = (d.bills || []).slice(0, 25).map(x => x[0]);
  const [bills, n, co] = await Promise.all([bks.length ? q(`bills?select=key,title&key=${inList(bks)}`) : [], names((d.ex || []).map(x => x[0])), one(`companies?lob=eq.${encodeURIComponent(id)}&select=id,name`).catch(() => null)]);
  const bt = Object.fromEntries(bills.map(b => [b.key, b.title]));
  const issues = (d.iss || []).map(x => iss[x[0]] || x[0]);
  const lead = `${r.name} spent ${money(r.spend)} lobbying the federal government${periods ? ` (${periods})` : ''}${issues.length ? `, mostly on ${issues.slice(0, 3).join(', ').toLowerCase()}` : ''}.${d.nlob ? ` It used ${num(d.nlob)} lobbyists` : ''}${(d.ex || []).length ? `, including people who worked for ${num(new Set(d.ex.map(x => x[0])).size)} members of Congress` : ''}${d.nlob ? '.' : ''}`;
  const t = `${r.name}: Lobbying Spending, Issues & Bills`;
  const body = `<h1>${esc(r.name)}</h1><p class="sr-sub">Lobbying group${periods ? ' · ' + esc(periods) : ''}</p>
<p class="sr-lead">${esc(lead)}</p>
${facts([['Spent on lobbying', money(r.spend)], ['Lobbyists', d.nlob ? num(d.nlob) : null], ['Bills lobbied', (d.bills || []).length ? num(d.bills.length) : null], ['Issues', issues.length ? num(issues.length) : null]])}
${sec('Spending by quarter', (d.q || []).length ? rows(d.q.map(x => [esc(x[0]), money(x[1])])) : '')}
${sec('Issues lobbied', issues.length ? cols(issues.map(esc)) : '')}
${sec('Bills lobbied on', bks.length ? rows((d.bills || []).slice(0, 25).map(x => [bt[x[0]] ? a(P('bill', x[0], bt[x[0]]), `${billLabel(x[0])}: ${clamp(bt[x[0]], 90)}`) : esc(billLabel(x[0])), `${x[1]} report${x[1] === 1 ? '' : 's'}`])) : '')}
${sec('Lobbying firms hired', (d.firms || []).length ? rows(d.firms.slice(0, 20).map(f => [f[4] ? a(P('lobbying-firm', f[4], f[0]), f[0]) : esc(f[0]), money(f[1])])) : '')}
${sec('Lobbyists who worked in Congress', (d.ex || []).length ? rows(d.ex.slice(0, 20).map(x => [`${esc(x[1])}<br><small>${esc(clamp(String(x[2] || '').split(' // ')[0], 120))}</small>`, personLink(n, x[0])])) : '')}
${sec('Agencies contacted', (d.ents || []).length ? cols(d.ents.slice(0, 15).map(x => `${esc(x[0])} · ${x[1]}`)) : '')}
${sec('Related', cols([co ? a(P('company', co.id, co.name), `${co.name}: stock trades, contracts and PAC`) : '', a('/lobbying', 'All lobbying groups')].filter(Boolean)))}
${sec('Filings', (d.fil || []).length ? rows(d.fil.slice(0, 8).map(f => [a(f[1], `${f[0]} report`), money(f[2])])) : '')}
${note('From Lobbying Disclosure Act reports filed with the Senate and House.')}`;
  return { title: title(t), desc: clamp(lead, 158), path: P('lobbying', id, r.name), route: 'lob:' + id, crumbs: [['Lobbying', L.abs('/lobbying')], [r.name, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Organization', name: r.name, url: L.abs(P('lobbying', id, r.name)), description: lead }], body };
}

/* ---------------- lobbying firm ---------------- */
async function lobbyingFirm(id) {
  const r = await one(`lobby_firms?id=eq.${encodeURIComponent(id)}&select=id,name,income,data`);
  if (!r) return null;
  const d = r.data || {}, cl = d.cl || [];
  const meta = await META(['lobby']); const periods = (meta.lobby || {}).periods || '';
  const lead = `${r.name} earned ${money(r.income)} lobbying for ${num(cl.length)} clients${periods ? ` (${periods})` : ''}${cl.length ? `. Biggest clients: ${cl.slice(0, 3).map(c => c[1]).join(', ')}` : ''}.`;
  const t = `${r.name}: Lobbying Firm Clients & Income`;
  const body = `<h1>${esc(r.name)}</h1><p class="sr-sub">Lobbying firm${periods ? ' · ' + esc(periods) : ''}</p><p class="sr-lead">${esc(lead)}</p>
${facts([['Lobbying income', money(r.income)], ['Clients', num(cl.length)]])}
${sec('Clients', rows(cl.slice(0, 80).map(c => [c[0] ? a(P('lobbying', c[0], c[1]), c[1]) : esc(c[1]), money(c[2])])))}
${sec('More', cols([a('/lobbying-firms', 'All lobbying firms'), a('/lobbying', 'All lobbying groups')]))}
${note('From Lobbying Disclosure Act reports.')}`;
  return { title: title(t), desc: clamp(lead, 158), path: P('lobbying-firm', id, r.name), route: 'firm:' + id, crumbs: [['Lobbying firms', L.abs('/lobbying-firms')], [r.name, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Organization', name: r.name, url: L.abs(P('lobbying-firm', id, r.name)), description: lead }], body };
}

/* ---------------- company ---------------- */
async function company(id) {
  const r = await one(`companies?id=eq.${encodeURIComponent(id)}&select=id,name,tickers,data`);
  if (!r) return null;
  const d = r.data || {}, tr = d.tr || [], gov = d.gov || {};
  const [n, lobc, pacr] = await Promise.all([names(tr.map(x => x[0])), d.lob ? one(`lobby_clients?id=eq.${encodeURIComponent(d.lob)}&select=id,name,spend`) : null, d.pac ? one(`pacs?id=eq.${encodeURIComponent(d.pac)}&select=id,name,light->>fn`) : null]);
  const trades = tr.reduce((s, x) => s + (x[1] || 0), 0);
  const tk = (r.tickers || []).join(', ');
  const lead = `${r.name}${tk ? ` (${tk})` : ''}${d.ind ? `, ${d.ind.toLowerCase()} company,` : ''} ${tr.length ? `was traded ${num(trades)} times by ${num(tr.length)} members of Congress since 2025` : 'has no reported trades by members of Congress since 2025'}.${gov.amt ? ` It received ${money(gov.amt)} in federal contracts.` : ''}${lobc ? ` Spent ${money(lobc.spend)} on lobbying.` : ''}${d.pacT ? ` Its PAC gave ${money(d.pacT)} to members.` : ''}`;
  const t = `${r.name}${tk ? ` (${tk})` : ''}: Congress Stock Trades & Lobbying`;
  const body = `<h1>${esc(r.name)}</h1><p class="sr-sub">${esc([d.ind, tk].filter(Boolean).join(' · '))}</p><p class="sr-lead">${esc(lead)}</p>
${facts([['Members trading it', num(tr.length)], ['Trades since 2025', num(trades)], ['Federal contracts', gov.amt ? money(gov.amt) : null], ['Lobbying spend', lobc ? money(lobc.spend) : null], ['PAC giving to members', d.pacT ? money(d.pacT) : null], ['Employees', d.emp && d.emp[0] ? num(d.emp[0]) : null]])}
${sec('Members of Congress who traded it', tr.length ? rows(tr.slice(0, 50).map(x => [personLink(n, x[0]) + (x[5] ? ' <small>· on a committee that oversees it</small>' : ''), `${num(x[1])} trade${x[1] === 1 ? '' : 's'} · last ${esc(date(x[4]))}`])) : '')}
${sec('Federal contracts by agency', (gov.ag || []).length ? rows(gov.ag.slice(0, 8).map(x => [esc(x[0]), money(x[1])])) : '')}
${sec('Lobbying and PAC', cols([lobc ? a(P('lobbying', lobc.id, lobc.name), `${lobc.name} lobbying: ${money(lobc.spend)}`) : '', pacr ? a(P('pac', pacr.id, pacr.fn || pacr.name), `${pacr.fn || pacr.name}`) : ''].filter(Boolean)))}
${sec('Former congressional staff lobbying for it', (d.rev || []).length ? rows(d.rev.slice(0, 10).map(x => [esc(x[0]), esc(clamp(x[1], 110))])) : '')}
${sec('More', cols([a('/companies', 'All companies'), a(`${SITE}/receipts`, 'Biggest stock traders in Congress')]))}
${note('From House and Senate stock trade disclosures, USAspending.gov, lobbying reports and FEC records.')}`;
  return { title: title(t), desc: clamp(lead, 158), path: P('company', id, r.name), route: 'co:' + id, crumbs: [['Companies', L.abs('/companies')], [r.name, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Corporation', name: r.name, tickerSymbol: tk || undefined, url: L.abs(P('company', id, r.name)), description: lead }], body };
}

/* ---------------- committee ---------------- */
async function committee(id) {
  const { by } = await COMMITTEES(); const r = by[id];
  if (!r) return null;
  const d = r.data || {}, mem = d.mem || [];
  const n = await names(mem.map(x => x[0]));
  const maj = mem.filter(x => x[2] === 'majority'), min = mem.filter(x => x[2] !== 'majority');
  const chair = mem.find(x => /^Chair/.test(x[1])), rank = mem.find(x => /Ranking/.test(x[1]));
  const lead = `The ${r.name} has ${num(mem.length)} members${chair && n[chair[0]] ? `, chaired by ${n[chair[0]].name}` : ''}${rank && n[rank[0]] ? ` with ${n[rank[0]].name} as ranking member` : ''}. ${firstSentences(d.jur || '', 220)}`;
  const t = `${r.name}: Members & What It Oversees`;
  const list = arr => rows(arr.map(x => [personLink(n, x[0]), esc(x[1] || '')]));
  const body = `<h1>${esc(r.name)}</h1><p class="sr-sub">${d.ch === 'senate' ? 'Senate' : d.ch === 'joint' ? 'Joint' : 'House'} committee · ${num(mem.length)} members</p><p class="sr-lead">${esc(lead)}</p>
${sec('What it oversees', d.jur ? `<p>${esc(d.jur)}</p>` : '')}
${sec('Majority members', list(maj))}${sec('Minority members', list(min))}
${sec('More', cols([a('/committees', 'All committees')]))}
${note('From the congress-legislators project and official House and Senate committee rosters.')}`;
  return { title: title(t), desc: clamp(lead, 158), path: P('committee', id, r.name), route: 'com:' + id, crumbs: [['Committees', L.abs('/committees')], [r.name, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'GovernmentOrganization', name: r.name, url: L.abs(P('committee', id, r.name)), description: d.jur || undefined,
      member: mem.slice(0, 80).filter(x => n[x[0]]).map(x => ({ '@type': 'Person', name: n[x[0]].name })) }], body };
}

/* ---------------- caucus ---------------- */
async function caucus(id) {
  const all = await CAUCUSES(); const r = all.find(c => c.id === id);
  if (!r) return null;
  const d = r.data || {}, ids = d.members || [];
  const n = await names(ids);
  const lead = `The ${r.name} has ${num(ids.length)} members in Congress.${d.cohesion != null ? ` Its members voted together ${pct(d.cohesion)} of the time` : ''}${d.splits ? `, and split on ${num(d.splits)} votes` : ''}${d.cohesion != null ? '.' : ''}`;
  const body = `<h1>${esc(r.name)}</h1><p class="sr-sub">Caucus · ${num(ids.length)} members</p><p class="sr-lead">${esc(lead)}</p>
${facts([['Members', num(ids.length)], ['Vote together', pct(d.cohesion)], ['Split votes', d.splits != null ? num(d.splits) : null]])}
${sec('Members', cols(ids.map(i => personLink(n, i)).sort()))}
${sec('More', cols([a('/caucuses', 'All caucuses')]))}${note('From caucus member lists and Voteview roll calls.')}`;
  return { title: title(`${r.name}: Members & How They Vote`), desc: clamp(lead, 158), path: P('caucus', id, r.name), route: 'caucus:' + id,
    crumbs: [['Caucuses', L.abs('/caucuses')], [r.name, null]], ld: [{ '@context': 'https://schema.org', '@type': 'Organization', name: r.name, url: L.abs(P('caucus', id, r.name)), description: lead }], body };
}

/* ---------------- 2026 race ---------------- */
function raceName(r) {
  const st = ST[r.st] || r.st;
  return r.o === 'S' ? `${st} Senate race${r.sp ? ' (special)' : ''}` : `${distName(r.st, r.d)} House race${r.sp ? ' (special)' : ''}`;
}
async function race(id) {
  const r = await one(`races?id=eq.${encodeURIComponent(id)}&select=id,data`);
  if (!r) return null;
  const d = r.data || {}, cands = d.c || [];
  const n = await names(cands.map(c => c.bg).filter(Boolean));
  const groups = d.out || [];
  const name = raceName(d);
  const money2 = cands.filter(c => c.r).map(c => `${c.n} (${c.p}) ${money(c.r)}`).slice(0, 3).join(', ');
  const lead = `The 2026 ${name}${d.pvi ? ` (partisan lean ${d.pvi})` : ''}: ${cands.length ? cands.slice(0, 4).map(c => `${c.n} (${c.p})`).join(', ') : 'candidates not yet set'}.${money2 ? ` Raised so far: ${money2}.` : ''}${d.ot ? ` Outside groups have spent ${money(d.ot)}.` : ''}`;
  const t = `2026 ${name.replace(' race', ' Race')}: Candidates & Money`;
  const body = `<h1>2026 ${esc(name)}</h1><p class="sr-sub">${esc(d.status || '')}${d.pvi ? ' · Lean ' + esc(d.pvi) : ''} · Election Nov 3, 2026</p><p class="sr-lead">${esc(lead)}</p>
${facts([['Raised by candidates', d.rt ? money(d.rt) : null], ['Outside spending', d.ot ? money(d.ot) : null], ['Partisan lean', d.pvi || null]])}
${sec('Candidates', rows(cands.map(c => [`${c.bg && n[c.bg] ? a(P(n[c.bg].cur ? 'member' : 'past-member', c.bg, c.n), c.n) : esc(c.n)} · ${esc(c.pl || PN[c.p] || c.p || '')}${c.inc ? ' · Incumbent' : ''}`, c.r != null ? `Raised ${money(c.r)}${c.cash != null ? ` · ${money(c.cash)} cash` : ''}` : ''])))}
${sec('Outside groups spending', groups.length ? rows(groups.slice(0, 20).map(g => [`${a(P('outside-group', g[1], g[0]), g[0])} <small>${g[2] === 'S' ? 'supporting' : 'opposing'} ${esc(g[3])}</small>`, money(g[4])])) : '')}
${sec('More', cols([a(P('state', d.st, ST[d.st]), `${ST[d.st] || d.st} in Congress`), a('/elections', 'All 2026 races')]))}
${note('From FEC candidate summaries and independent expenditure reports.')}`;
  return { title: title(t), desc: clamp(lead, 158), path: P('race', id, '2026 ' + name), route: 'race:' + id, crumbs: [['2026 elections', L.abs('/elections')], [name, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Event', name: `2026 ${name}`, startDate: '2026-11-03', eventStatus: 'https://schema.org/EventScheduled',
      location: { '@type': 'Place', name: ST[d.st] || d.st }, description: lead }], body };
}

/* ---------------- outside spending group ---------------- */
async function outsideGroup(id) {
  const r = await one(`outside_groups?id=eq.${encodeURIComponent(id)}&select=id,name,total,data`);
  if (!r) return null;
  const d = r.data || {}, rs = d.rows || [];
  const lead = `${r.name} has spent ${money(r.total)} on 2026 congressional races: ${money(d.for || 0)} supporting candidates and ${money(d.vs || 0)} opposing them.${rs.length ? ` Biggest target: ${rs[0][1]} (${money(rs[0][4])}).` : ''}`;
  const raceLabel = rid => { const m = String(rid).match(/^([SH])-([A-Z]{2})(?:-(\d+|SP))?(?:-SP)?$/); if (!m) return rid; return m[1] === 'S' ? `${ST[m[2]] || m[2]} Senate` : `${m[2]}-${m[3]}`; };
  const body = `<h1>${esc(r.name)}</h1><p class="sr-sub">Outside spending group · FEC ID ${esc(id)}</p><p class="sr-lead">${esc(lead)}</p>
${facts([['Total spent', money(r.total)], ['Supporting', money(d.for || 0)], ['Opposing', money(d.vs || 0)]])}
${sec('Where the money went', rows(rs.slice(0, 60).map(x => [`${esc(x[1])} <small>${x[3] === 'S' ? 'supporting' : 'opposing'}${x[2] ? ' · ' + a(P('race', x[2], ''), raceLabel(x[2])) : ''}</small>`, money(x[4])])))}
${sec('More', cols([a(`https://www.fec.gov/data/committee/${id}/`, 'FEC filings'), a('/outside-groups', 'All outside spending groups'), a('/elections', '2026 races')]))}
${note('From FEC independent expenditure reports.')}`;
  return { title: title(`${r.name}: 2026 Election Spending`), desc: clamp(lead, 158), path: P('outside-group', id, r.name), route: 'og:' + id,
    crumbs: [['Outside spending', L.abs('/outside-groups')], [r.name, null]], ld: [{ '@context': 'https://schema.org', '@type': 'Organization', name: r.name, identifier: id, url: L.abs(P('outside-group', id, r.name)), description: lead }], body };
}

/* ---------------- House ethics statement ---------------- */
async function ethics(id) {
  const r = await one(`ethics_matters?id=eq.${encodeURIComponent(id)}&select=id,title,data`);
  if (!r) return null;
  const d = r.data || {}, who = d.who || [];
  const n = await names(who);
  const lead = `${d.t || r.title}. Issued by the House Committee on Ethics on ${date(d.d)}${d.st ? ` (${d.st.toLowerCase()})` : ''}${who.length ? `, involving ${who.map(w => n[w] ? n[w].name : w).join(', ')}` : ''}.`;
  const body = `<p class="sr-sub">House Committee on Ethics · ${esc(date(d.d))}</p><h1>${esc(d.t || r.title)}</h1><p class="sr-lead">${esc(lead)}</p>
${sec('Members involved', who.length ? cols(who.map(w => personLink(n, w))) : '')}
${sec('Statement', d.body && d.body.length > 40 ? `<p>${esc(firstSentences(d.body, 1200))}</p>` : '')}
${sec('Documents', rows([d.url ? [a(d.url, 'Statement on ethics.house.gov'), ''] : null, ...(d.pdfs || []).slice(0, 8).map((u, i) => [a(u, `Document ${i + 1} (PDF)`), ''])].filter(Boolean)))}
${sec('More', cols([a('/ethics', 'All House ethics statements')]))}${note('From the House Committee on Ethics.')}`;
  return { title: title(clamp(d.t || r.title, 70)), desc: clamp(lead, 158), path: P('ethics', id, d.t || r.title), route: 'eth:' + id, ogType: 'article',
    crumbs: [['Ethics statements', L.abs('/ethics')], [clamp(d.t || r.title, 60), null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'NewsArticle', headline: clamp(d.t || r.title, 110), datePublished: d.d, publisher: { '@type': 'Organization', name: 'House Committee on Ethics' }, url: L.abs(P('ethics', id, d.t || r.title)) }], body };
}

/* ---------------- state ---------------- */
async function state(code) {
  code = String(code || '').toUpperCase(); if (!ST[code]) return null;
  const { rows: mem } = await MEMBERS();
  const ms = mem.filter(m => m.state === code);
  const races = await q(`races?select=id,data->c,data->o,data->d,data->sp,data->st&state=eq.${code}&order=id`);
  const sen = ms.filter(m => m.chamber === 'Senate'), hou = ms.filter(m => m.chamber === 'House').sort((x, y) => (x.district || 0) - (y.district || 0));
  const raised = ms.reduce((s, m) => s + (+m.rec || 0), 0), trades = ms.reduce((s, m) => s + (+m.tradeN || 0), 0);
  const nm = ST[code];
  const lead = `${nm} has ${num(sen.length)} senator${sen.length === 1 ? '' : 's'} and ${num(hou.length)} House member${hou.length === 1 ? '' : 's'}${sen.length ? `: Senators ${sen.map(m => m.name).join(' and ')}` : ''}. Together they have raised ${money(raised)} for 2026 and reported ${num(trades)} stock trades since 2025.`;
  const ml = m => `${a(P('member', m.id, m.name), m.name)} (${m.party})`;
  const body = `<h1>${esc(nm)} in Congress</h1><p class="sr-sub">Senators, representatives and 2026 races</p><p class="sr-lead">${esc(lead)}</p>
${facts([['Senators', num(sen.length)], ['House members', num(hou.length)], ['Raised for 2026', money(raised)], ['Stock trades since 2025', num(trades)]])}
${sec('Senators', rows(sen.map(m => [ml(m), m.rec ? `Raised ${money(+m.rec)}` : ''])))}
${sec('House members', rows(hou.map(m => [`${a(P('district', `${code}-${+m.district || 0}`, distName(code, m.district)), +m.district ? `District ${m.district}` : 'At large')}: ${ml(m)}`, m.rec ? `Raised ${money(+m.rec)}` : ''])))}
${sec('2026 races', races.length ? cols(races.map(r => a(P('race', r.id, '2026 ' + raceName({ st: code, o: r.o, d: r.d, sp: r.sp })), raceName({ st: code, o: r.o, d: r.d, sp: r.sp })))) : '')}
${sec('More', cols([a('/states', 'All states'), a('/past-members', 'Past members of Congress')]))}`;
  return { title: title(`${nm}'s Members of Congress: Money, Trades & Votes`), desc: clamp(lead, 158), path: P('state', code, nm), route: 'state:' + code,
    crumbs: [['States', L.abs('/states')], [nm, null]], ld: [{ '@context': 'https://schema.org', '@type': 'AdministrativeArea', name: nm, url: L.abs(P('state', code, nm)) }], body };
}

/* ---------------- congressional district ---------------- */
async function district(key) {
  const m0 = String(key || '').toUpperCase().match(/^([A-Z]{2})-(\d{1,2})$/); if (!m0 || !ST[m0[1]]) return null;
  const st = m0[1], dn = +m0[2];
  const { rows: mem } = await MEMBERS();
  const rep = mem.find(m => m.chamber === 'House' && m.state === st && (+m.district || 0) === dn);
  if (!rep) return null;
  const rid = `H-${st}-${String(dn).padStart(2, '0')}`;
  const races = await q(`races?select=id,data&id=in.(${rid},${rid}-SP)`);
  const name = distName(st, dn), code = `${st}-${dn ? String(dn).padStart(2, '0') : 'AL'}`;
  const r = races[0] && races[0].data;
  const lead = `${name} (${code}) is represented by ${rep.name} (${PN[rep.party] || rep.party})${rep.rec ? `, who has raised ${money(+rep.rec)} for 2026` : ''}.${r && (r.c || []).length ? ` 2026 candidates: ${r.c.slice(0, 4).map(c => `${c.n} (${c.p})`).join(', ')}.` : ''}`;
  const body = `<h1>${esc(name)}</h1><p class="sr-sub">${esc(code)} · U.S. House district</p><p class="sr-lead">${esc(lead)}</p>
${sec('Representative', `<p>${a(P('member', rep.id, rep.name), rep.name)} (${esc(PN[rep.party] || rep.party)})</p>`)}
${sec('2026 election', races.length ? cols(races.map(x => a(P('race', x.id, '2026 ' + raceName(x.data)), '2026 ' + raceName(x.data)))) : '')}
${sec('More', cols([a(P('state', st, ST[st]), `All of ${ST[st]}'s members of Congress`), a('/states', 'All states')]))}`;
  return { title: title(`${name} (${code}): Representative & 2026 Race`), desc: clamp(lead, 158), path: P('district', `${st}-${dn}`, name), route: 'dist:' + `${st}-${dn}`,
    crumbs: [['States', L.abs('/states')], [ST[st], L.abs(P('state', st, ST[st]))], [code, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'AdministrativeArea', name: `${name} (${code})`, containedInPlace: { '@type': 'State', name: ST[st] } }], body };
}

module.exports = { bill, vote, pac, lobbying, lobbyingFirm, company, committee, caucus, race, outsideGroup, ethics, state, district, raceName, billStatus };
