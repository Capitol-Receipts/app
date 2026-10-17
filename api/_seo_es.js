/* Spanish search pages (/es/...): members, states, districts, 2026 races and their directories.
Each links to its English twin with hreflang, and the English page links back. */
const L = require('./_seo_lib');
const R = require('./_seo_records');
const H = require('./_seo_people');
const dSlug = (st, d) => H.distName(st, d), rSlug = d => '2026 ' + R.raceName(d);
const { q, one, inList, MEMBERS, COMMITTEES, esc, P, a, ST, num, money, pct, clamp, facts, rows, sec, cols, note, HOST } = L;

const ST_ES = { ...ST, NY: 'Nueva York', NJ: 'Nueva Jersey', NM: 'Nuevo México', NC: 'Carolina del Norte', SC: 'Carolina del Sur', ND: 'Dakota del Norte', SD: 'Dakota del Sur',
  WV: 'Virginia Occidental', PA: 'Pensilvania', LA: 'Luisiana', HI: 'Hawái', MO: 'Misuri', MS: 'Misisipi', OR: 'Oregón', MI: 'Míchigan', DC: 'Distrito de Columbia',
  VI: 'Islas Vírgenes', AS: 'Samoa Americana', MP: 'Islas Marianas del Norte' };
const PART = { D: 'demócrata', R: 'republicano', I: 'independiente', L: 'libertario', G: 'verde' };
const PARTS = { D: 'demócratas', R: 'republicanos', I: 'independientes' };
const MES = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'];
function fecha(s) {
  let m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${+m[3]} de ${MES[+m[2] - 1]} de ${m[1]}`;
  m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) return `${+m[2]} de ${MES[+m[1] - 1]} de ${m[3]}`;
  return String(s || '');
}
const titulo = t => (t.length + 19 <= 70 ? t + ' | Capitol Receipts' : clamp(t, 70));
const distEs = (st, d) => +d ? `Distrito ${+d} de ${ST_ES[st] || st}` : `${ST_ES[st] || st} (distrito único)`;
const ES = p => '/es' + p;
const seatEs = m => m.chamber === 'Senate' ? `${m.party}-${m.state}` : `${m.party}-${m.state}${+m.district ? '-' + m.district : '-AL'}`;
const role = m => m.chamber === 'Senate' ? 'senador(a)' : (m.delegate ? 'delegado(a)' : 'representante');

async function member(id) {
  const row = await one(`members?id=eq.${encodeURIComponent(id)}&select=id,name,party,state,chamber,district,data`);
  if (!row) return null;
  const d = row.data, m = { ...d, chamber: row.chamber, state: row.state, district: row.district, party: row.party };
  const [photo, comms] = await Promise.all([one(`photos?id=eq.${encodeURIComponent(id)}&select=img`), COMMITTEES()]);
  const f = d.money || {}, missed = d.elig ? 1 - d.present : null, tn = d.tradeN || 0;
  const donde = m.chamber === 'Senate' ? ST_ES[m.state] : distEs(m.state, m.district);
  const myComms = comms.rows.filter(c => (c.data.mem || []).some(r => r[0] === id));
  const lead = [
    `${d.name} es ${role(m)} ${PART[m.party] || ''} por ${donde} y está en el Congreso desde ${d.since}.`,
    f.rec ? `Ha recaudado ${money(f.rec)} para las elecciones de 2026${d.smallShare != null ? `; el ${pct(d.smallShare)} vino de donantes pequeños (menos de $200)` : ''}.` : 'No hay informes de campaña 2025–26 en la FEC.',
    tn ? `Reportó ${num(tn)} operaciones bursátiles desde enero de 2025.` : '',
    missed != null ? `Faltó al ${pct(missed, 1)} de las votaciones y votó con su partido el ${pct(d.unity)} de las veces cuando los partidos se dividieron.` : '',
  ].filter(Boolean).join(' ');
  const body = `<div class="sr-hero">${photo ? `<img src="data:image/webp;base64,${photo.img}" alt="${esc(d.name)}" width="84" height="84">` : ''}<div><h1>${esc(d.name)}</h1>
<p class="sr-sub">${esc((PART[m.party] || '').replace(/^./, c => c.toUpperCase()))} · ${esc(donde)} · En el Congreso desde ${d.since}</p></div></div>
<p class="sr-lead">${esc(lead)}</p>
${facts([['Recaudado para 2026', f.rec ? money(f.rec) : '—'], ['Efectivo disponible', f.coh != null ? money(f.coh) : '—'], ['De donantes pequeños', pct(d.smallShare)], ['Operaciones bursátiles', num(tn)], ['Votaciones perdidas', pct(missed, 1)], ['Votó con su partido', pct(d.unity)], ['Próxima elección', d.next ? fecha(new Date(d.next).toISOString()) : null]])}
${sec('Quién financia su campaña', (d.industries || []).length ? rows((d.industries || []).filter(i => !/^(Retired|Other or not listed|Not employed)/.test(i[0])).slice(0, 6).map(i => [esc(i[0]), money(i[1] + (i[2] || 0))])) + `<p><small>Nombres de sectores según los informes de la FEC (en inglés).</small></p>` : '')}
${sec('Comités de acciones políticas (PAC) principales', (d.pacs || []).length ? rows(d.pacs.slice(0, 8).map(p => [esc(p[0]), money(p[1])])) : '')}
${sec('Operaciones bursátiles recientes', tn ? rows((d.trades || []).slice(0, 8).map(tr => [`${esc(fecha(tr[0]))} · ${tr[1] === 'Buy' ? 'Compra' : tr[1] === 'Sell' ? 'Venta' : esc(tr[1])} · ${esc(tr[3])}`, `${money(tr[4])}–${money(tr[5])}`])) : '')}
${sec('Comités', myComms.length ? cols(myComms.map(c => a(P('committee', c.id, c.name), c.name))) : '')}
${sec('Contacto', rows([d.office && ['Oficina', esc(d.office)], d.phone && ['Teléfono', esc(d.phone)], d.url && ['Sitio web', a(d.url, d.url.replace(/^https?:\/\//, ''))]].filter(Boolean)))}
${sec('Más de ' + (ST_ES[m.state] || m.state), cols([a(ES(P('state', m.state, ST[m.state])), `Todos los miembros del Congreso de ${ST_ES[m.state]}`), m.chamber === 'House' ? a(ES(P('district', `${m.state}-${+m.district || 0}`, dSlug(m.state, m.district))), distEs(m.state, m.district)) : '', a(P('member', id, d.name), 'Ver esta página en inglés')].filter(Boolean)))}
${note('Datos de la FEC, divulgaciones bursátiles de la Cámara y el Senado, votaciones de Voteview y registros de cabildeo. Se actualiza a diario.')}`;
  return { lang: 'es', title: titulo(`${d.name} (${seatEs(m)}): donantes, acciones y votos`), desc: clamp(lead, 158), path: ES(P('member', id, d.name)), route: id, ogType: 'profile',
    crumbs: [['Miembros del Congreso', L.abs('/es/members')], [ST_ES[m.state], L.abs(ES(P('state', m.state, ST[m.state])))], [d.name, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Person', name: d.name, url: L.abs(ES(P('member', id, d.name))), jobTitle: m.chamber === 'Senate' ? 'Senador(a) de EE. UU.' : 'Representante de EE. UU.', inLanguage: 'es' }],
    body };
}

async function state(code) {
  code = String(code || '').toUpperCase(); if (!ST[code]) return null;
  const { rows: mem } = await MEMBERS();
  const ms = mem.filter(m => m.state === code);
  if (!ms.length) return null;
  const races = await q(`races?select=id,data->o,data->d,data->sp&state=eq.${code}&order=id`);
  const sen = ms.filter(m => m.chamber === 'Senate'), hou = ms.filter(m => m.chamber === 'House').sort((x, y) => (x.district || 0) - (y.district || 0));
  const raised = ms.reduce((s, m) => s + (+m.rec || 0), 0), trades = ms.reduce((s, m) => s + (+m.tradeN || 0), 0);
  const nm = ST_ES[code];
  const lead = `${nm} tiene ${sen.length} senador(es) y ${hou.length} miembro(s) en la Cámara de Representantes. En conjunto han recaudado ${money(raised)} para 2026 y reportado ${num(trades)} operaciones bursátiles desde 2025.`;
  const ml = m => `${a(ES(P('member', m.id, m.name)), m.name)} (${m.party})`;
  const raceEs = r => r.o === 'S' ? `Senado${r.sp ? ' (especial)' : ''}` : `${distEs(code, r.d)}${r.sp ? ' (especial)' : ''}`;
  const body = `<h1>${esc(nm)} en el Congreso</h1><p class="sr-sub">Senadores, representantes y elecciones de 2026</p><p class="sr-lead">${esc(lead)}</p>
${facts([['Senadores', num(sen.length)], ['Representantes', num(hou.length)], ['Recaudado para 2026', money(raised)], ['Operaciones bursátiles', num(trades)]])}
${sec('Senadores', rows(sen.map(m => [ml(m), m.rec ? `Recaudó ${money(+m.rec)}` : ''])))}
${sec('Cámara de Representantes', rows(hou.map(m => [`${a(ES(P('district', `${code}-${+m.district || 0}`, dSlug(code, m.district))), +m.district ? `Distrito ${m.district}` : 'Distrito único')}: ${ml(m)}`, m.rec ? `Recaudó ${money(+m.rec)}` : ''])))}
${sec('Elecciones de 2026', races.length ? cols(races.map(r => a(ES(P('race', r.id, rSlug({ st: code, o: r.o, d: r.d, sp: r.sp }))), raceEs(r)))) : '')}
${sec('Más', cols([a('/es/states', 'Todos los estados'), a(P('state', code, ST[code]), 'Ver esta página en inglés')]))}`;
  return { lang: 'es', title: titulo(`Miembros del Congreso de ${nm}: dinero, acciones y votos`), desc: clamp(lead, 158), path: ES(P('state', code, ST[code])), route: 'state:' + code,
    crumbs: [['Estados', L.abs('/es/states')], [nm, null]], ld: [{ '@context': 'https://schema.org', '@type': 'AdministrativeArea', name: nm, inLanguage: 'es' }], body };
}

async function district(key) {
  const m0 = String(key || '').toUpperCase().match(/^([A-Z]{2})-(\d{1,2})$/); if (!m0 || !ST[m0[1]]) return null;
  const st = m0[1], dn = +m0[2];
  const { rows: mem } = await MEMBERS();
  const rep = mem.find(m => m.chamber === 'House' && m.state === st && (+m.district || 0) === dn);
  if (!rep) return null;
  const rid = `H-${st}-${String(dn).padStart(2, '0')}`;
  const races = await q(`races?select=id,data&id=in.(${rid},${rid}-SP)`);
  const r = races[0] && races[0].data, nm = distEs(st, dn), code = `${st}-${dn ? String(dn).padStart(2, '0') : 'AL'}`;
  const lead = `El ${nm} (${code}) está representado por ${rep.name} (${PART[rep.party] || rep.party})${rep.rec ? `, quien ha recaudado ${money(+rep.rec)} para 2026` : ''}.${r && (r.c || []).length ? ` Candidatos en 2026: ${r.c.slice(0, 4).map(c => `${c.n} (${c.p})`).join(', ')}.` : ''}`;
  const body = `<h1>${esc(nm)}</h1><p class="sr-sub">${esc(code)} · Distrito de la Cámara de Representantes</p><p class="sr-lead">${esc(lead)}</p>
${sec('Representante', `<p>${a(ES(P('member', rep.id, rep.name)), rep.name)}</p>`)}
${sec('Elección de 2026', races.length ? cols(races.map(x => a(ES(P('race', x.id, rSlug(x.data))), `Elección de 2026${x.data.sp ? ' (especial)' : ''}`))) : '')}
${sec('Más', cols([a(ES(P('state', st, ST[st])), `Todos los miembros del Congreso de ${ST_ES[st]}`), a(P('district', `${st}-${dn}`, dSlug(st, dn)), 'Ver esta página en inglés')]))}`;
  return { lang: 'es', title: titulo(`${nm} (${code}): representante y elección 2026`), desc: clamp(lead, 158), path: ES(P('district', `${st}-${dn}`, dSlug(st, dn))), route: 'dist:' + `${st}-${dn}`,
    crumbs: [['Estados', L.abs('/es/states')], [ST_ES[st], L.abs(ES(P('state', st, ST[st])))], [code, null]], ld: [], body };
}

async function race(id) {
  const r = await one(`races?id=eq.${encodeURIComponent(id)}&select=id,data`);
  if (!r) return null;
  const d = r.data || {}, cands = d.c || [];
  const { by } = await MEMBERS();
  const nm = d.o === 'S' ? `Senado por ${ST_ES[d.st]}` : distEs(d.st, d.d);
  const lead = `Elección de 2026 para ${d.o === 'S' ? 'el ' + nm : 'el ' + nm}${d.sp ? ' (especial)' : ''}${d.pvi ? `, con inclinación partidista ${d.pvi}` : ''}: ${cands.slice(0, 4).map(c => `${c.n} (${c.p})`).join(', ') || 'candidatos por definir'}.${d.ot ? ` Grupos externos han gastado ${money(d.ot)}.` : ''}`;
  const body = `<h1>Elección 2026: ${esc(nm)}${d.sp ? ' (especial)' : ''}</h1><p class="sr-sub">Elección el 3 de noviembre de 2026${d.pvi ? ' · Inclinación ' + esc(d.pvi) : ''}</p><p class="sr-lead">${esc(lead)}</p>
${facts([['Recaudado por candidatos', d.rt ? money(d.rt) : null], ['Gasto externo', d.ot ? money(d.ot) : null]])}
${sec('Candidatos', rows(cands.map(c => [`${c.bg && by[c.bg] ? a(ES(P('member', c.bg, c.n)), c.n) : esc(c.n)} · ${esc(PART[c.p] || c.pl || c.p || '')}${c.inc ? ' · Titular' : ''}`, c.r != null ? `Recaudó ${money(c.r)}` : ''])))}
${sec('Más', cols([a(ES(P('state', d.st, ST[d.st])), `${ST_ES[d.st]} en el Congreso`), a('/es/elections', 'Todas las elecciones de 2026'), a(P('race', id, rSlug(d)), 'Ver esta página en inglés')]))}
${note('Datos de los resúmenes de candidatos y gastos independientes de la FEC.')}`;
  return { lang: 'es', title: titulo(`Elección 2026: ${nm}${d.sp ? ' (especial)' : ''}`), desc: clamp(lead, 158), path: ES(P('race', id, rSlug(d))), route: 'race:' + id,
    crumbs: [['Elecciones 2026', L.abs('/es/elections')], [nm, null]], ld: [], body };
}

const STK = require('./_seo_stocks');
const EXD = require('./_seo_exec');
const quien = m => `${m.chamber === 'Senate' ? 'Sen.' : (m.delegate ? 'Del.' : 'Rep.')} ${m.name}`;
const tipoEs = k => k === 'Buy' ? 'Compra' : /^Sell/.test(k || '') ? 'Venta' : k === 'Exchange' ? 'Intercambio' : esc(k || '');
const dueno = o => o === 'SP' ? ' (cónyuge)' : o === 'JT' ? ' (conjunta)' : o === 'DC' ? ' (hijo/a dependiente)' : '';
const pl = (n, s, p) => `${num(n)} ${n === 1 ? s : p}`;

async function stock(id) {
  const tk = String(id || '').toUpperCase();
  const { S, asOf } = await STK.DATA();
  const s = S[tk]; if (!s) return null;
  const top = Object.entries(s.members).sort((x, y) => y[1] - x[1]);
  const { by: mem } = await MEMBERS();
  const par = { D: 0, R: 0, I: 0 }; top.forEach(([mid]) => { const p = mem[mid]?.party; if (p in par) par[p]++; });
  const h1 = `Miembros del Congreso que operan ${s.name} (${tk})`;
  const lead = `${pl(s.nm, 'miembro', 'miembros')} del Congreso ${s.nm === 1 ? 'reportó' : 'reportaron'} ${pl(s.trades.length, 'operación', 'operaciones')} con ${s.name} (${tk}) desde enero de 2025: ${pl(s.buys, 'compra', 'compras')} y ${pl(s.sells, 'venta', 'ventas')}, por un valor total de ${money(s.lo)} a ${money(s.hi)}.` +
    (top[0] ? ` ${quien(mem[top[0][0]])} fue quien más lo operó, ${pl(top[0][1], 'vez', 'veces')}.` : '');
  const path = ES(P('stock', tk, s.name));
  const body = `<p class="sr-sub">Acción · ${esc(tk)}</p><h1>${esc(h1)}</h1><p class="sr-lead">${esc(lead)}</p>
${facts([['Miembros que la operaron', num(s.nm)], ['Operaciones desde 2025', num(s.trades.length)], ['Compras', num(s.buys)], ['Ventas', num(s.sells)], ['Valor reportado', `${money(s.lo)}–${money(s.hi)}`], ['Demócratas / republicanos', `${par.D} / ${par.R}`]])}
${sec('Quién en el Congreso la opera', rows(top.slice(0, 60).map(([mid, n]) => { const m = mem[mid]; return [`${a(ES(P('member', mid, m.name)), quien(m))} <small>${esc(seatEs(m))}</small>`, pl(n, 'operación', 'operaciones')]; })))}
${sec('Operaciones recientes', rows(s.trades.slice(0, 40).map(([m, t]) => [`${a(ES(P('member', m.id, m.name)), quien(m))} · ${tipoEs(t[1])}${dueno(t[6])}`, `${esc(fecha(t[0]))} · ${money(+t[4] || 0)}–${money(+t[5] || +t[4] || 0)}`])))}
${sec('Sobre estas cifras', `<p>Los miembros del Congreso deben reportar las operaciones bursátiles propias, de su cónyuge y de sus hijos dependientes en un plazo de 45 días, en rangos de dólares y no en montos exactos. Operar acciones es legal. Datos al ${esc(fecha(asOf) || 'último informe')}.</p>`)}
${sec('Más', cols([a('/stocks', 'Acciones más operadas (en inglés)'), a('/es/members', 'Miembros del Congreso'), a(P('stock', tk, s.name), 'Ver esta página en inglés')]))}
${note('Datos de los informes de transacciones de la Cámara y el Senado.')}`;
  return { lang: 'es', title: titulo(`${s.name} (${tk}): operaciones de miembros del Congreso`), desc: clamp(lead, 158), path, route: 'stock:' + tk, noindex: s.trades.length < 3, ogType: 'article',
    crumbs: [['Miembros del Congreso', L.abs('/es/members')], [`${s.name} (${tk})`, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Dataset', name: h1, description: lead, url: L.abs(path), inLanguage: 'es', isAccessibleForFree: true, about: { '@type': 'Corporation', name: s.name, tickerSymbol: tk } }], body };
}

async function officialTrades(id) {
  const v = await EXD.DATA();
  const f = v.filers.find(x => x.slug === String(id || '').toLowerCase()); if (!f) return null;
  const path = ES(P('official-trades', f.slug, ''));
  const lead = `${f.display} (${f.title}${f.agency ? ', ' + f.agency : ''}) reportó ${pl(f.n, 'operación', 'operaciones')} con acciones y bonos desde enero de 2025: ${pl(f.buys, 'compra', 'compras')} y ${pl(f.sells, 'venta', 'ventas')}, por un valor total de ${money(f.lo)} a ${money(f.hi)}, según los formularios OGE 278-T publicados por la Oficina de Ética Gubernamental.`;
  const rep = f.reports.map(r => [`${a(r[1], `Informe publicado el ${fecha(r[0])}`)}`, r[2] ? `${pl(r[2], 'operación', 'operaciones')}${r[4] != null ? ` · ${money(r[6] || 0)}–${money(r[7] || 0)}` : ''}` : (r[3] ? 'Imagen escaneada' : 'Sin operaciones')]);
  const body = `<p class="sr-sub">Poder Ejecutivo · ${esc(f.title)}</p><h1>${esc(`Operaciones bursátiles de ${f.display}`)}</h1><p class="sr-lead">${esc(lead)}</p>
${facts([['Operaciones desde 2025', num(f.n)], ['Compras', num(f.buys)], ['Ventas', num(f.sells)], ['Valor reportado', `${money(f.lo)}–${money(f.hi)}`]])}
${f.scan ? `<p>Estos informes se presentaron en papel y se escanearon. Las cifras se leyeron de los escaneos y se ajustaron a los rangos oficiales. Cada informe enlaza al original.</p>` :
  sec('Operaciones', rows(f.trades.slice(0, 100).map(t => [`${t[2] ? `<b>${esc(t[2])}</b> · ` : ''}${esc(t[3])}`, `${tipoEs(t[1])} · ${esc(t[0] ? (t[0].length === 7 ? t[0] : fecha(t[0])) : 'fecha no clara')} · ${t[4] ? (t[5] ? `${money(t[4])}–${money(t[5])}` : `Más de ${money(t[4] - 1)}`) : 'monto no claro'}`])))}
${sec('Informes originales', rows(rep))}
${sec('Más', cols([a('/official-trades', 'Todos los funcionarios (en inglés)'), a(P('official-trades', f.slug, ''), 'Ver esta página en inglés')]))}
${note('Fuente: formularios OGE 278-T publicados por la Oficina de Ética Gubernamental de EE. UU.')}`;
  return { lang: 'es', title: titulo(`Operaciones bursátiles de ${f.display} (${f.title})`), desc: clamp(lead, 158), path, route: 'xtr:' + f.slug, ogType: 'article',
    crumbs: [['Funcionarios', L.abs('/official-trades')], [f.display, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Dataset', name: `Operaciones bursátiles de ${f.display}`, description: lead, url: L.abs(path), inLanguage: 'es', isAccessibleForFree: true }], body };
}

function hub(o) {
  return { lang: 'es', title: titulo(o.title), desc: clamp(o.desc, 158), path: o.path, route: null, crumbs: [[o.h1, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: o.h1, inLanguage: 'es', url: HOST + o.path }], body: `<h1>${esc(o.h1)}</h1><p class="sr-sub">${esc(o.sub)}</p>${o.body}` };
}
const HUBS = {
  async members() {
    const { rows: ms } = await MEMBERS();
    const by = {}; ms.forEach(m => (by[m.state] = by[m.state] || []).push(m));
    return hub({ path: '/es/members', h1: 'Miembros del Congreso', sub: `${ms.length} senadores y representantes actuales`, title: 'Miembros del Congreso: donantes, acciones y votos',
      desc: 'Todos los miembros actuales de la Cámara y el Senado de EE. UU., por estado: quién los financia, qué acciones compran y venden y cómo votan.',
      body: Object.keys(by).sort((x, y) => ST_ES[x].localeCompare(ST_ES[y], 'es')).map(s => `<section><h2>${a(ES(P('state', s, ST[s])), ST_ES[s])}</h2>${cols(by[s].map(m => `${a(ES(P('member', m.id, m.name)), m.name)} <small>${m.party} · ${m.chamber === 'Senate' ? 'Senado' : (+m.district ? 'Distrito ' + m.district : 'Distrito único')}</small>`))}</section>`).join('') });
  },
  async states() {
    const { rows: ms } = await MEMBERS(); const c = {}; ms.forEach(m => c[m.state] = (c[m.state] || 0) + 1);
    return hub({ path: '/es/states', h1: 'El Congreso por estado', sub: 'Encuentra a tus senadores y representante', title: 'El Congreso por estado: encuentra a tus representantes',
      desc: 'Elige tu estado para ver a sus senadores y representantes, cuánto recaudaron para 2026, sus operaciones bursátiles y las elecciones de 2026.',
      body: cols(Object.keys(ST).filter(s => c[s]).sort((x, y) => ST_ES[x].localeCompare(ST_ES[y], 'es')).map(s => `${a(ES(P('state', s, ST[s])), ST_ES[s])} <small>${c[s]} miembros</small>`)) });
  },
  async elections() {
    const rs = await q('races?select=id,state,data->o,data->d,data->sp,data->rt&order=state,id');
    const by = {}; rs.forEach(r => (by[r.state] = by[r.state] || []).push(r));
    return hub({ path: '/es/elections', h1: 'Elecciones al Congreso de 2026', sub: `${rs.length} contiendas de la Cámara y el Senado el 3 de noviembre de 2026`, title: 'Elecciones al Congreso de 2026: todas las contiendas',
      desc: 'Todas las contiendas de 2026 para la Cámara y el Senado: los candidatos, cuánto recaudaron y qué grupos externos están gastando.',
      body: Object.keys(by).sort((x, y) => ST_ES[x].localeCompare(ST_ES[y], 'es')).map(s => `<section><h2>${esc(ST_ES[s])}</h2>${cols(by[s].map(r => a(ES(P('race', r.id, rSlug({ st: s, o: r.o, d: r.d, sp: r.sp }))), r.o === 'S' ? `Senado${r.sp ? ' (especial)' : ''}` : distEs(s, r.d)) + (r.rt ? ` <small>${money(r.rt)} recaudados</small>` : '')))}</section>`).join('') });
  },
};

module.exports = { PAGES: { member, state, district, race, stock, 'official-trades': officialTrades }, HUBS, ST_ES };
