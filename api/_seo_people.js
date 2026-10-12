/* Pages for people: current members, past members, appointees, nominees and federal judges. */
const L = require('./_seo_lib');
const { q, one, inList, MEMBERS, COMMITTEES, CAUCUSES, names, esc, P, a, personLink, ST, PN, PADJ, ord, num, money, pct, date, congYears,
  clamp, title, firstSentences, facts, rows, sec, cols, note, SITE } = L;

const billKeyFromCode = b => { const m = String(b || '').match(/^(HR|S|HJRES|SJRES)(\d+)$/i); return m ? `119-${m[1].toLowerCase()}-${m[2]}` : null; };
const BTY = { hr: 'H.R.', s: 'S.', hjres: 'H.J.Res.', sjres: 'S.J.Res.' };
const billLabel = k => { const [c, ty, n] = String(k).split('-'); return `${BTY[ty] || ty.toUpperCase()} ${n}`; };
const roleOf = m => m.chamber === 'Senate' ? 'Senator' : (m.delegate ? 'Delegate' : 'Representative');
const abbr = m => m.chamber === 'Senate' ? 'Sen.' : (m.delegate ? 'Del.' : 'Rep.');
const seat = m => m.chamber === 'Senate' ? `${m.party}-${m.state}` : `${m.party}-${m.state}${m.district ? '-' + m.district : '-AL'}`;
const distName = (st, d) => +d ? `${ST[st] || st}'s ${ord(+d)} District` : `${ST[st] || st}${['DC', 'PR', 'GU', 'VI', 'AS', 'MP'].includes(st) ? '' : ' (at large)'}`;
const raceIdFor = m => m.chamber === 'Senate' ? `S-${m.state}` : `H-${m.state}-${String(+m.district || 0).padStart(2, '0')}`;

/* ---------------- current member ---------------- */
async function member(id) {
  const row = await one(`members?id=eq.${encodeURIComponent(id)}&select=id,name,party,state,chamber,district,data`);
  if (!row) return null;
  const d = row.data, m = { ...d, chamber: row.chamber, state: row.state, district: row.district, party: row.party };
  const raceIds = [raceIdFor(m), `${raceIdFor(m)}-SP`, m.chamber === 'Senate' ? `S-${m.state}-SP` : null].filter(Boolean);
  const pacNames = (d.pacs || []).slice(0, 10).map(p => p[0]);
  const ticks = ((d.tradeStats || {}).ticks || []).map(t => t[0]).slice(0, 12);
  const recentIds = (d.recent || []).map(r => r[0]);
  const [ex, car, photo, comms, cauc, races, pacs, cos, rcs] = await Promise.all([
    one(`member_extras?id=eq.${encodeURIComponent(id)}&select=data`),
    one(`careers?id=eq.${encodeURIComponent(id)}&select=light,detail`),
    one(`photos?id=eq.${encodeURIComponent(id)}&select=img`),
    COMMITTEES(), CAUCUSES(),
    q(`races?select=id,data->status,data->sp&id=${inList(raceIds)}`),
    pacNames.length ? q(`pacs?select=id,name,light->>fn&name=${inList(pacNames)}`) : [],
    ticks.length ? q(`companies?select=id,name,tickers&tickers=ov.${encodeURIComponent('{' + ticks.join(',') + '}')}`) : [],
    recentIds.length ? q(`roll_calls?select=id,voted_on,question,result,bill,data->>s&id=${inList(recentIds)}`) : [],
  ]);
  const x = (ex && ex.data) || {}, f = d.money || {};
  const pacId = Object.fromEntries(pacs.map(p => [p.name, p.id])), pacFn = Object.fromEntries(pacs.map(p => [p.name, p.fn || p.name]));
  const coByTick = {}; cos.forEach(c => (c.tickers || []).forEach(t => coByTick[t] = c));
  const rcBy = Object.fromEntries(rcs.map(r => [r.id, r]));
  const myComms = comms.rows.filter(c => (c.data.mem || []).some(r => r[0] === id)).map(c => [c, (c.data.mem.find(r => r[0] === id) || [])[1]]);
  const myCauc = cauc.filter(c => (c.data.members || []).includes(id));
  const where = m.chamber === 'Senate' ? ST[m.state] : distName(m.state, m.district);
  const missed = d.elig ? 1 - d.present : null;
  const sh = (d.tradeN || 0);
  const lead = [
    `${d.name} is a ${PADJ[m.party] || PN[m.party] || ''} ${roleOf(m).toLowerCase()} for ${where}, in Congress since ${d.since}.`,
    f.rec ? `${d.last || d.name} has raised ${money(f.rec)} for the 2026 election${d.smallShare != null ? `, ${pct(d.smallShare)} of it from small donors giving under $200` : ''}.` : `No 2025–26 campaign reports are on file with the FEC.`,
    sh ? `${d.last || d.name} reported ${num(sh)} stock trade${sh === 1 ? '' : 's'} since January 2025.` : (m.chamber === 'House' ? 'No stock trades reported since January 2025.' : ''),
    missed != null ? `Missed ${pct(missed, 1)} of votes and voted with ${PN[d.caucus] || 'their party'}s ${pct(d.unity, 0)} of the time when the parties split.` : '',
  ].filter(Boolean).join(' ');
  const t = `${d.name} (${seat(m)}): Donors, Stock Trades & Votes`;
  const desc = clamp(`${abbr(m)} ${d.name} (${seat(m)}) ${f.rec ? `raised ${money(f.rec)} for 2026` : 'has no 2026 FEC reports yet'}${sh ? `, made ${num(sh)} stock trades since 2025` : ''}${missed != null ? ` and missed ${pct(missed, 1)} of votes` : ''}. See top donors, PACs, trades, votes and bills.`, 158);

  const bl = (car && car.detail && car.detail.bl) || (car && car.light && car.light.bl) || {};
  const sponsored = (bl.new || []).slice(0, 12);
  const body = `<div class="sr-hero">${photo ? `<img src="data:image/webp;base64,${photo.img}" alt="${esc(d.name)}" width="84" height="84">` : ''}<div><h1>${esc(d.name)}</h1>
<p class="sr-sub">${esc(PADJ[m.party] || PN[m.party] || '')} ${roleOf(m)} · ${esc(where)} · In Congress since ${d.since}</p></div></div>
<p class="sr-lead">${esc(lead)}</p>
${facts([['Raised for 2026', f.rec ? money(f.rec) : '—'], ['Cash on hand', f.coh != null ? money(f.coh) : '—'], ['From small donors', pct(d.smallShare)], ['From PACs', f.rec ? pct(f.pac / f.rec) : '—'],
  ['Stock trades since 2025', num(d.tradeN || 0)], ['Votes missed', pct(missed, 1)], ['Voted with party', pct(d.unity)], ['Age', d.age], ['Next election', d.next]])}
${sec('Who funds the campaign', (d.industries || []).length || (d.pacs || []).length ? `
${(d.industries || []).filter(i => !/^(Retired|Other or not listed|Not employed)/.test(i[0])).slice(0, 6).length ? `<h3>Top industries</h3>${rows((d.industries || []).filter(i => !/^(Retired|Other or not listed|Not employed)/.test(i[0])).slice(0, 6).map(i => [esc(i[0]), money(i[1] + (i[2] || 0))]))}` : ''}
${(d.pacs || []).length ? `<h3>Top PACs</h3>${rows((d.pacs || []).slice(0, 10).map(p => [pacId[p[0]] ? a(P('pac', pacId[p[0]], pacFn[p[0]]), p[0]) : esc(p[0]), money(p[1])]))}` : ''}
${(d.employers || []).length ? `<h3>Top employers of donors</h3>${rows((d.employers || []).slice(0, 8).map(e => [esc(e[0]), money(e[1])]))}` : ''}
<p>${f.thru ? `FEC reports through ${date(f.thru)}.` : ''} ${a('https://www.fec.gov/data/candidate/' + (d.fecId || '') + '/', 'FEC filings')}</p>` : '')}
${sec('Stock trades', sh ? `<p>${esc(d.last || d.name)} reported ${num(sh)} trades since January 2025${(d.tradeStats || {}).buys != null ? ` (${num(d.tradeStats.buys)} buys, ${num(d.tradeStats.sells)} sells)` : ''}${d.commTrades ? `, including ${num(d.commTrades)} in industries their committees oversee` : ''}.</p>
${ticks.length ? `<h3>Most-traded stocks</h3>${cols(((d.tradeStats || {}).ticks || []).slice(0, 12).map(([tk, n]) => (coByTick[tk] ? a(P('company', coByTick[tk].id, coByTick[tk].name), `${coByTick[tk].name} (${tk})`) : esc(tk)) + ` · ${n}`))}` : ''}
<h3>Latest trades</h3>${rows((d.trades || []).slice(0, 10).map(tr => [`${esc(date(tr[0]))} · ${esc(tr[1])} · ${tr[2] && coByTick[tr[2]] ? a(P('company', coByTick[tr[2]].id, coByTick[tr[2]].name), tr[3]) : esc(tr[3])}`, `${money(tr[4])}–${money(tr[5])}`]))}` : (m.chamber === 'House' ? '<p>No stock trades reported since January 2025.</p>' : ''))}
${sec('Recent votes', recentIds.length ? rows((d.recent || []).filter(r => rcBy[r[0]]).map(r => { const v = rcBy[r[0]]; return [`${a(P('vote', `119-${v.id[0]}-${v.id.slice(1)}`, v.s || v.question), clamp(v.s || v.question, 110))}<br><small>${esc(v.question)} · ${esc(date(v.voted_on))} · ${esc(v.result)}</small>`, `${esc(r[1])}${r[2] === false ? ' (broke with party)' : ''}`]; })) : '')}
${sec('Committees', myComms.length ? cols(myComms.map(([c, role]) => a(P('committee', c.id, c.name), c.name) + (role ? ` · ${esc(role)}` : ''))) : '')}
${sec('Caucuses', myCauc.length ? cols(myCauc.map(c => a(P('caucus', c.id, c.name), c.name))) : '')}
${sec('Bills sponsored', bl.n ? `<p>${esc(d.last || d.name)} has sponsored ${num(bl.n)} bills${bl.law ? `, and ${num(bl.law)} became law` : ''}.</p>${rows(sponsored.map(b => [a(P('bill', b[5], b[2]), `${b[1]}: ${clamp(b[2], 100)}`), esc(date(b[3]))]))}` : '')}
${sec('2026 election', races.length ? cols(races.map(r => a(P('race', r.id, ''), `${r.id.startsWith('S') ? `${ST[m.state]} Senate race` : `${distName(m.state, m.district)} House race`}${r.sp ? ' (special election)' : ''}`))) : '')}
${sec('Former staff now lobbying', (d.revolving || []).length ? `<p>${num(d.revolving.length)} people who worked for ${esc(d.name)} are now registered lobbyists.</p>${rows(d.revolving.slice(0, 8).map(r => [esc(r[0]), esc(r[2] || '')]))}` : '')}
${sec('Office spending', x.office && x.office.total ? `<p>${money(x.office.total)} spent on the office in ${esc(x.office.period)}, including ${money(x.office.staff)} on staff.</p>` : '')}
${sec('Earmarks', x.earmarks && x.earmarks.n ? `<p>Requested ${num(x.earmarks.n)} earmarks worth ${money(x.earmarks.t)}.</p>${rows((x.earmarks.items || []).slice(0, 6).map(e => [esc(e[1]), money(e[0])]))}` : '')}
${sec('Contact', rows([d.office && ['Office', esc(d.office)], d.phone && ['Phone', esc(d.phone)], d.url && ['Website', a(d.url, d.url.replace(/^https?:\/\//, ''))]].filter(Boolean)))}
${sec('More from ' + (ST[m.state] || m.state), cols([a(P('state', m.state, ST[m.state]), `All of ${ST[m.state] || m.state}'s members of Congress`), m.chamber === 'House' ? a(P('district', `${m.state}-${+m.district || 0}`, distName(m.state, m.district)), distName(m.state, m.district)) : '', a(`${SITE}/parties`, 'Democrats vs Republicans')].filter(Boolean)))}
${note('From FEC campaign reports, House and Senate stock trade disclosures, Voteview roll calls, Senate lobbying records and House expense reports. Updated daily.')}`;
  return {
    title: title(t), desc, path: P('member', id, d.name), route: id, ogType: 'profile',
    crumbs: [['Members of Congress', L.abs('/members')], [ST[m.state] || m.state, L.abs(P('state', m.state, ST[m.state]))], [d.name, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Person', name: d.name, givenName: d.first, familyName: d.last, url: L.abs(P('member', id, d.name)),
      jobTitle: `U.S. ${roleOf(m)}`, affiliation: { '@type': 'PoliticalParty', name: `${PADJ[m.party] || PN[m.party]} Party` },
      memberOf: { '@type': 'GovernmentOrganization', name: m.chamber === 'Senate' ? 'United States Senate' : 'United States House of Representatives' },
      workLocation: { '@type': 'Place', name: where }, sameAs: [d.url].filter(Boolean), telephone: d.phone || undefined }],
    body,
  };
}

/* ---------------- past member ---------------- */
async function pastMember(id) {
  const { by } = await MEMBERS();
  if (by[id]) return member(id);
  const r = await one(`people?id=eq.${encodeURIComponent(id)}&select=id,name,party,first_year,last_year,light,detail`);
  if (!r) return null;
  const p = { ...(r.light || {}), ...(r.detail || {}) };
  const terms = (p.t || []).filter(t => t[0] === 'H' || t[0] === 'S');
  const chambers = [...new Set(terms.map(t => t[0]))].map(c => c === 'S' ? 'Senate' : 'House');
  const states = [...new Set(terms.map(t => t[3]).filter(Boolean))];
  const el = (p.v || []).reduce((s, v) => s + (v[2] || 0), 0), mi = (p.v || []).reduce((s, v) => s + (v[3] || 0), 0);
  const party = p.lp || r.party || '';
  const padj = ({ Democrat: 'Democratic', Republican: 'Republican', Independent: 'independent' })[party] || party;
  const span = `${p.fy || r.first_year || ''}–${(p.ly || r.last_year) && (p.ly || r.last_year) < 2027 ? (p.ly || r.last_year) : 'present'}`;
  const bio = firstSentences(p.desc && p.desc.length > 60 ? p.desc : (p.wx || p.desc || ''), 420);
  const bl = p.bl || {};
  const raised = (p.fec || []).reduce((s, f) => s + (f[1] || 0), 0);
  const roleWord = chambers.length === 2 ? 'U.S. representative and senator' : chambers[0] === 'Senate' ? 'U.S. senator' : 'U.S. representative';
  const lead = `${r.name} was a ${padj ? padj + ' ' : ''}${roleWord} from ${states.map(s => ST[s] || s).join(' and ')}, serving ${span}.${bl.n ? ` Sponsored ${num(bl.n)} bills${bl.law ? `, ${num(bl.law)} of which became law` : ''}.` : ''}${el ? ` Cast ${num(el - mi)} votes and missed ${pct(mi / el, 1)}.` : ''}`;
  const t = `${r.name} (${(party || '?')[0]}-${states[0] || ''}), ${chambers.join(' & ')} ${span}`;
  const body = `<h1>${esc(r.name)}</h1><p class="sr-sub">${esc(party)} · ${esc(chambers.join(' and '))} · ${esc(states.map(s => ST[s] || s).join(', '))} · ${esc(span)}</p>
<p class="sr-lead">${esc(lead)}</p>
${facts([['Years in Congress', p.cd ? Math.floor(p.cd / 365.25) : null], ['Bills sponsored', bl.n != null ? num(bl.n) : null], ['Became law', bl.law != null ? num(bl.law) : null], ['Votes missed', el ? pct(mi / el, 1) : null], ['Raised (all campaigns)', raised ? money(raised) : null], ['Born', (p.b || '').slice(0, 4) || null], ['Died', p.dd || null]])}
${sec('Biography', bio ? `<p>${esc(bio)}</p>${p.w ? `<p><small>From ${a('https://en.wikipedia.org/wiki/' + encodeURIComponent(String(p.w).replace(/ /g, '_')), 'Wikipedia')} (CC BY-SA).</small></p>` : ''}` : '')}
${sec('Terms in office', rows(terms.map(t => [`${t[0] === 'S' ? 'Senate' : 'House'}, ${esc(ST[t[3]] || t[3])}${t[0] === 'H' && t[4] ? `, ${ord(+t[4])} District` : ''}`, `${t[1]}–${t[2] || ''} · ${esc(t[5] || '')}`])))}
${sec('Bills sponsored', (bl.new || []).length ? rows(bl.new.slice(0, 15).map(b => [a(P('bill', b[5], b[2]), `${b[1]}: ${clamp(b[2], 100)}`), `${esc(date(b[3]))}${b[4] ? ' · Became law' : ''}`])) : '')}
${sec('More', cols([...states.map(s => a(P('state', s, ST[s]), `${ST[s] || s} in Congress today`)), a('/past-members', 'All past members of Congress')]))}
${note('From the congress-legislators project, Voteview, the Congressional Bills Project, GovInfo, FEC records and Wikipedia.')}`;
  return {
    title: title(t), desc: clamp(lead + ' See terms, bills and voting record.', 158), path: P('past-member', id, r.name), route: 'hp:' + id, ogType: 'profile',
    crumbs: [['Past members', L.abs('/past-members')], [r.name, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Person', name: r.name, url: L.abs(P('past-member', id, r.name)), birthDate: p.b || undefined,
      jobTitle: `Former ${roleWord}`, description: bio || undefined, affiliation: party ? { '@type': 'PoliticalParty', name: party + ' Party' } : undefined,
      sameAs: p.w ? ['https://en.wikipedia.org/wiki/' + encodeURIComponent(String(p.w).replace(/ /g, '_'))] : undefined }],
    body,
  };
}

/* ---------------- appointee ---------------- */
async function appointee(id) {
  const r = await one(`appointees?id=eq.${encodeURIComponent(id)}&select=id,name,indexable,light,detail`);
  if (!r) return null;
  const p = { ...(r.light || {}), ...(r.detail || {}) };
  const offices = (p.off || []).filter(o => o && o[0]);
  // some ethics records list the document (not the job) in the title field
  const DOCT = /^(Certificate of Divestiture|Conflict of Interest Waiver|Waiver)$/i;
  const docTitle = DOCT.test(String(p.ttl || '').trim()) ? String(p.ttl).trim() : null;
  const agency0 = (((offices[0] || [])[3]) || '').trim();
  const ttl = docTitle ? (agency0 && !/candidate/i.test(agency0) ? `Official, ${agency0}` : 'Federal official') : L.tcase(p.ttl || (offices[0] || [])[0] || 'Federal appointee');
  const votes = p.sv || [];
  const bio = firstSentences(p.desc && p.desc.length > 60 ? p.desc : (p.wx || p.desc || ''), 420);
  const v0 = votes[0];
  const agencyRaw = ((offices[0] || [])[3] || '').trim(), candidate = /candidate/i.test(agencyRaw);
  const agency = candidate ? '' : agencyRaw;
  const docs = (Array.isArray(p.oge) ? p.oge : []).map(x => { const label = String(x[1] || '').replace(/<[^>]+>/g, '').trim(); const href = x[3] || (String(x[1] || '').match(/href='([^']+)'/) || [])[1] || ''; return { d: x[0], label, href }; }).filter(x => x.label);
  const [peers, samePost] = await Promise.all([
    agencyRaw ? q(`appointees?select=id,name,light->>ttl,light->>ly&light->off->0->>3=eq.${encodeURIComponent(agencyRaw)}&id=neq.${encodeURIComponent(id)}&order=ord.desc&limit=16`) : [],
    agencyRaw && p.ttl && !docTitle ? q(`appointees?select=id,name,light->>fy,light->>ly&light->>ttl=eq.${encodeURIComponent(p.ttl)}&light->off->0->>3=eq.${encodeURIComponent(agencyRaw)}&id=neq.${encodeURIComponent(id)}&order=ord.desc&limit=12`) : []]);
  const latest = docs.map(x => x.d).filter(Boolean).sort().pop();
  const docNote = docTitle ? (/divestiture/i.test(docTitle) ? ' received a certificate of divestiture from the Office of Government Ethics, which lets an official sell holdings that would create a conflict of interest and defer the capital gains tax' : ' received a conflict-of-interest waiver, which lets an official work on matters where they have a financial interest') : '';
  const lead = docTitle ? `${r.name}, an official at the ${(agency || 'federal government').replace(/^the /i, '')},${docNote}.${docs.length ? ` ${num(docs.length)} filing${docs.length === 1 ? '' : 's'} with the Office of Government Ethics${latest ? `, most recently ${date(latest)}` : ''}.` : ''}` : `${r.name}${ttl ? `, ${ttl}` : ''}${agency ? ` at the ${agency.replace(/^the /i, '')}` : ''}${candidate ? ' (financial disclosures filed as a presidential candidate)' : ''}.${docs.length ? ` ${num(docs.length)} financial disclosure and ethics filing${docs.length === 1 ? '' : 's'} with the Office of Government Ethics${latest ? `, most recently ${date(latest)}` : ''}.` : ''}`;
  const leadMore = `${v0 ? ` The Senate voted ${v0.y}–${v0.n != null ? v0.n : (v0.nn || 0)} on the nomination on ${date(v0.d)} (${v0.res || ''}).` : ''} ${bio && !bio.startsWith(r.name) ? bio : ''}`.trim();
  const fullLead = (lead + ' ' + leadMore).replace(/\s+/g, ' ').trim();
  const t = docTitle ? `${r.name}, ${agency || 'Federal Official'}: Ethics Filings` : `${r.name}: ${ttl}${agency && (ttl + agency).length < 52 ? ', ' + agency : ''}`;
  const body = `<h1>${esc(r.name)}</h1><p class="sr-sub">${esc(ttl)}${p.fy ? ` · ${p.fy}${p.ly && p.ly !== p.fy ? '–' + p.ly : ''}` : ''}</p>
<p class="sr-lead">${esc(clamp(fullLead, 600))}</p>
${facts([['Agency', agency || null], ['Ethics filings', docs.length ? num(docs.length) : null], ['Latest filing', latest ? date(latest) : null], ['Senate votes', votes.length ? num(votes.length) : null]])}
${sec('Positions', offices.filter(o => !DOCT.test(String(o[0]).trim())).length ? rows(offices.filter(o => !DOCT.test(String(o[0]).trim())).map(o => [esc(L.tcase(o[0])) + (o[3] && !/candidate/i.test(o[3]) ? ` <small>${esc(o[3])}</small>` : ''), esc([o[1], o[2]].filter(Boolean).join('–'))])) : '')}
${sec('Financial disclosure and ethics filings', docs.length ? rows(docs.map(x => [x.href ? a(x.href, x.label) : esc(x.label), esc(date(x.d))])) + '<p><small>Filed with the U.S. Office of Government Ethics. Form 278 reports list assets, income and debts; ethics agreements list what the official promised to sell or step away from.</small></p>' : '')}
${sec(candidate ? 'Other presidential candidates' : `Others who held this post${agency ? ' at the ' + agency.replace(/^the /i, '') : ''}`, samePost.length ? cols(samePost.map(x => `${a(P('appointee', x.id, x.name), x.name)}${x.fy ? ` <small>${x.fy}${x.ly && x.ly !== x.fy ? '–' + x.ly : ''}</small>` : ''}`)) : '')}
${sec(agency ? `More officials at the ${agency.replace(/^the /i, '')}` : '', peers.filter(x => !samePost.some(y => y.id === x.id)).length ? cols(peers.filter(x => !samePost.some(y => y.id === x.id)).map(x => `${a(P('appointee', x.id, x.name), x.name)}${x.ttl ? ` <small>${esc(clamp(L.tcase(x.ttl), 50))}</small>` : ''}`)) : '')}
${sec('Senate confirmation votes', votes.length ? rows(votes.map(v => [`${esc(v.pos || ttl)}<br><small>${esc(ord(v.c))} Congress · ${esc(v.res || '')}</small>`, `${v.y}–${v.n != null ? v.n : (v.nn || 0)} · ${esc(date(v.d))}`])) : '')}
${sec('Education', (p.edu || []).length ? rows(p.edu.map(e => Array.isArray(e) ? [esc(e[0]), esc([e[1], e[2]].filter(Boolean).join(', '))] : [esc(e), ''])) : '')}
${sec('Career', p.car ? (Array.isArray(p.car) ? rows(p.car.map(c => Array.isArray(c) ? [esc(c[0]), esc(c.slice(1).filter(Boolean).join(', '))] : [esc(c), ''])) : `<p>${esc(p.car)}</p>`) : '')}
${sec('Biography', bio && p.wt ? `<p>${esc(bio)}</p><p><small>From ${a('https://en.wikipedia.org/wiki/' + encodeURIComponent(String(p.wt).replace(/ /g, '_')), 'Wikipedia')} (CC BY-SA).</small></p>` : '')}
${sec('More', cols([a('/appointees', 'All appointees and nominees'), a(`${SITE}/appointees`, 'About appointee tracking')]))}
${note('From Senate roll call votes, Wikidata, Wikipedia and Office of Government Ethics records.')}`;
  return {
    noindex: !r.indexable, title: title(t), desc: clamp(fullLead, 158), path: P('appointee', id, r.name), route: 'ha:' + id, ogType: 'profile',
    crumbs: [['Appointees', L.abs('/appointees')], [r.name, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Person', name: r.name, jobTitle: ttl, url: L.abs(P('appointee', id, r.name)), description: bio || undefined }],
    body,
  };
}

/* ---------------- current nominee (with financial disclosures) ---------------- */
async function nominee(id) {
  const r = await one(`nominations?id=eq.${encodeURIComponent(id)}&select=id,name,position,confirmed_on,data`);
  if (!r) return null;
  const d = r.data || {}, oge = d.oge || {};
  const br = d.br || {};
  const conf = r.confirmed_on;
  const voteLine = d.y != null ? `The Senate voted ${d.y}–${d.n} on ${date(d.d || conf)}${conf ? ' to confirm' : ''}.` : (conf ? `Confirmed ${date(conf)}.` : 'Nomination pending in the Senate.');
  const split = Object.entries(br).map(([p, v]) => `${PN[p] || p}s ${v[0]}–${v[1]}`).join(', ');
  const lead = `${r.name} was nominated as ${r.position}. ${voteLine}${split ? ` By party: ${split}.` : ''}${(oge.pay || []).length ? ` Financial disclosures list ${num(oge.pay.length)} sources of income.` : ''}`;
  const t = `${r.name}, ${r.position}: Senate Vote & Finances`;
  const body = `<h1>${esc(r.name)}</h1><p class="sr-sub">${esc(r.position)}${conf ? ` · Confirmed ${esc(date(conf))}` : ' · Nominee'}</p>
<p class="sr-lead">${esc(lead)}</p>
${facts([['Senate vote', d.y != null ? `${d.y}–${d.n}` : null], ['Democrats', br.D ? `${br.D[0]}–${br.D[1]}` : null], ['Republicans', br.R ? `${br.R[0]}–${br.R[1]}` : null], ['Nomination', d.pn || null]])}
${sec('Income listed on financial disclosures', (oge.pay || []).length ? rows(oge.pay.slice(0, 20).map(p => [esc(p[0]) + (p[1] ? ` <small>· ${esc(p[1])}</small>` : ''), typeof p[2] === 'number' ? money(p[2]) : esc(p[2] || '')])) : '')}
${sec('Ethics documents', (oge.docs || []).length ? rows(oge.docs.map(x => [a(x[2], x[1]), esc(date(x[0]))])) : '')}
${sec('More', cols([a('/appointees', 'All appointees and nominees'), d.pn ? a(`https://www.congress.gov/nomination/${String(d.pn).replace(/\D/g, '').length ? '119th-congress/' + String(d.pn).replace(/\D/g, '') : ''}`, 'Nomination on Congress.gov') : ''].filter(Boolean)))}
${note('From Senate roll call votes and Office of Government Ethics financial disclosures.')}`;
  return {
    title: title(t), desc: clamp(lead, 158), path: P('nominee', id, r.name), route: id, ogType: 'profile',
    crumbs: [['Appointees', L.abs('/appointees')], [r.name, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Person', name: r.name, jobTitle: r.position, url: L.abs(P('nominee', id, r.name)) }],
    body,
  };
}

/* ---------------- federal judge ---------------- */
async function judge(id) {
  const r = await one(`judges?id=eq.${encodeURIComponent(id)}&select=id,name,court,pres,party,conf,active,senior,data`);
  if (!r) return null;
  const d = r.data || {}, apps = d.apps || [];
  const cur = apps.find(x => x.court === r.court) || apps[apps.length - 1] || {};
  const status = r.active ? (r.senior ? 'Senior judge' : 'Active judge') : 'Former judge';
  const lead = `${r.name} ${r.active ? 'serves' : 'served'} on the ${r.court}. Appointed by ${r.pres}${r.conf ? ` and confirmed ${date(r.conf)}` : ''}${cur.vote ? ` by a ${cur.vote.replace('/', '–')} Senate vote` : ''}.${cur.aba ? ` ABA rating: ${cur.aba}.` : ''}`;
  const t = `Judge ${r.name}, ${r.court.replace('U.S. ', '')}`;
  const body = `<h1>${esc(r.name)}</h1><p class="sr-sub">${esc(status)} · ${esc(r.court)}</p>
<p class="sr-lead">${esc(lead)}</p>
${facts([['Appointed by', r.pres], ['Confirmed', r.conf ? date(r.conf) : null], ['Senate vote', cur.vote ? cur.vote.replace('/', '–') : null], ['ABA rating', cur.aba || null], ['Born', d.born || null]])}
${sec('Appointments', apps.length ? rows(apps.map(x => [`${esc(x.title || 'Judge')}, ${esc(x.court)}`, `${esc(x.pres)} · ${esc(date(x.conf))}${x.end ? ' – ' + esc(date(x.end)) : ''}`])) : '')}
${sec('Education', (d.edu || []).length ? rows(d.edu.map(e => [esc(e[0]), esc([e[1], e[2]].filter(Boolean).join(', '))])) : '')}
${sec('Career', d.career ? `<p>${esc(d.career)}</p>` : '')}
${sec('More', cols([a('/judges', 'All federal judges')]))}
${note('From the Federal Judicial Center’s biographical directory of federal judges.')}`;
  return {
    title: title(t), desc: clamp(lead, 158), path: P('judge', id, r.name), route: 'judge:' + id, ogType: 'profile',
    crumbs: [['Federal judges', L.abs('/judges')], [r.name, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Person', name: r.name, jobTitle: `Judge, ${r.court}`, url: L.abs(P('judge', id, r.name)),
      worksFor: { '@type': 'GovernmentOrganization', name: r.court }, birthDate: d.born || undefined }],
    body,
  };
}

module.exports = { member, pastMember, appointee, nominee, judge, billKeyFromCode, billLabel, distName, raceIdFor, roleOf, seat };
