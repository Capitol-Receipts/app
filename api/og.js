/* Share images (1200x630 PNG) for search pages: the picture that shows when a page is posted on social media
or sent in a message. Served at /og/<type>/<id>.png on app.capitolreceipts.com. */
const fs = require('fs'), path = require('path');
const L = require('./_seo_lib');
const { Resvg } = require('@resvg/resvg-js');
const { q, one, ST, PN, money, num, pct, date, clamp, ord, congYears } = L;

const F = n => fs.readFileSync(path.join(process.cwd(), 'api', '_fonts', n));
let FONTS = null;
const fonts = () => FONTS || (FONTS = [
  { name: 'Barlow Condensed', data: F('BarlowCondensed-ExtraBold.ttf'), weight: 800, style: 'normal' },
  { name: 'Barlow Condensed', data: F('BarlowCondensed-SemiBold.ttf'), weight: 600, style: 'normal' },
  { name: 'Barlow', data: F('Barlow-Medium.ttf'), weight: 500, style: 'normal' },
]);

const NAVY = '#14274e', RED = '#c8323a', BLUE = '#2557a8', INK = '#0e1116';
const PCOL = { D: BLUE, R: RED, I: '#6b4fa3' };
const h = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.flat().filter(c => c !== null && c !== undefined && c !== false && c !== '') } });

function card({ kicker, title, sub, stats = [], photo, initials, accent = NAVY }) {
  const size = title.length > 60 ? 54 : title.length > 36 ? 66 : 84;
  return h('div', { width: 1200, height: 630, background: NAVY, color: '#fff', flexDirection: 'column', fontFamily: 'Barlow', position: 'relative' },
    h('div', { height: 14, width: 1200, background: accent }),
    h('div', { flexDirection: 'column', padding: '44px 64px 0 64px', flex: 1 },
      h('div', { alignItems: 'center', fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 40 },
        h('div', { background: RED, padding: '0 10px', borderRadius: 8, marginRight: 10 }, 'Capitol'), 'Receipts',
        kicker ? h('div', { marginLeft: 'auto', fontFamily: 'Barlow', fontWeight: 500, fontSize: 26, color: '#c9d3e8', textTransform: 'uppercase', letterSpacing: 2 }, kicker) : null),
      h('div', { marginTop: 40, alignItems: 'center' },
        photo ? h('img', { width: 190, height: 190, borderRadius: 95, objectFit: 'cover', border: `6px solid ${accent}`, marginRight: 40 }) : null,
        !photo && initials ? h('div', { width: 190, height: 190, borderRadius: 95, background: accent, marginRight: 40, alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 80 }, initials) : null,
        h('div', { flexDirection: 'column', flex: 1 },
          h('div', { fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: size, lineHeight: 1.02 }, title),
          sub ? h('div', { fontSize: 30, color: '#dfe5f1', marginTop: 12 }, sub) : null))),
    stats.length ? h('div', { padding: '0 64px 48px 64px', gap: 18 },
      ...stats.slice(0, 3).map(([k, v]) => h('div', { flexDirection: 'column', background: '#fff', color: INK, borderRadius: 18, padding: '16px 24px', flex: 1 },
        h('div', { fontSize: 24, color: '#5b6069' }, k),
        h('div', { fontFamily: 'Barlow Condensed', fontWeight: 800, fontSize: 56, lineHeight: 1.05 }, v)))) : null);
}
// a photo element needs its src set on the img node
function withPhoto(el, src) {
  const walk = n => { if (!n || typeof n !== 'object') return; if (n.type === 'img') n.props.src = src; (n.props.children || []).forEach(walk); };
  walk(el); return el;
}
async function photoUrl(id) {
  const u = `https://unitedstates.github.io/images/congress/450x550/${id}.jpg`;
  try { const r = await fetch(u, { method: 'HEAD' }); return r.ok ? u : null; } catch (e) { return null; }
}
const initialsOf = n => String(n || '').split(/\s+/).filter(w => /^[A-Z]/.test(w)).map(w => w[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('');

const BUILD = {
  async member(id) {
    const r = await one(`members?id=eq.${encodeURIComponent(id)}&select=name,party,state,chamber,district,data->money->rec,data->tradeN,data->present,data->elig,data->delegate`);
    if (!r) return null;
    const seat = r.chamber === 'Senate' ? `U.S. Senator · ${ST[r.state]}` : `U.S. Representative · ${r.state}-${+r.district ? r.district : 'AL'}`;
    const photo = await photoUrl(id);
    const el = card({ kicker: PN[r.party] || '', title: r.name, sub: seat, accent: PCOL[r.party] || NAVY, initials: initialsOf(r.name), photo: !!photo,
      stats: [['Raised for 2026', r.rec ? money(+r.rec) : '—'], ['Stock trades since 2025', num(+r.tradeN || 0)], ['Votes missed', +r.elig >= 25 ? pct(1 - r.present, 1) : '—']] });
    return photo ? withPhoto(el, photo) : el;
  },
  async 'past-member'(id) {
    const r = await one(`people?id=eq.${encodeURIComponent(id)}&select=name,party,first_year,last_year,light->ls,light->bl`);
    if (!r) return null;
    return card({ kicker: 'Former member', title: r.name, sub: `${r.party || ''} · ${ST[r.ls] || r.ls || ''} · ${r.first_year || ''}–${r.last_year || ''}`, initials: initialsOf(r.name),
      stats: [['Bills sponsored', r.bl ? num(r.bl.n) : '—'], ['Became law', r.bl ? num(r.bl.law) : '—']] });
  },
  async bill(key) {
    const r = await one(`bills?key=eq.${encodeURIComponent(key)}&select=key,congress,title,became_law,sp:light->>3,cos:light->5`);
    if (!r) return null;
    const [c, ty, n] = key.split('-');
    const lab = { hr: 'H.R.', s: 'S.', hjres: 'H.J.Res.', sjres: 'S.J.Res.' }[ty] || ty.toUpperCase();
    return card({ kicker: `${lab} ${n} · ${ord(+c)} Congress`, title: clamp(r.title, 110), sub: r.sp ? `Sponsored by ${String(r.sp).replace(/^([^,]+), (.*)$/, '$2 $1')} · ${congYears(+c)}` : congYears(+c),
      stats: [['Status', r.became_law ? 'Became law' : 'Introduced'], ['Co-sponsors', r.cos != null ? num(+r.cos) : '—']] });
  },
  async vote(key) {
    const r = await one(`vote_index?key=eq.${encodeURIComponent(key)}&select=key,congress,chamber,voted_on,title`);
    if (!r) return null;
    const row = await one(`roll_calls?voted_on=eq.${r.voted_on}&chamber=eq.${r.chamber === 'S' ? 'Senate' : 'House'}&select=yeas,nays,result&limit=1`).catch(() => null);
    return card({ kicker: `${r.chamber === 'S' ? 'Senate' : 'House'} vote · ${date(r.voted_on)}`, title: clamp(r.title.toUpperCase() === r.title ? r.title.charAt(0) + r.title.slice(1).toLowerCase() : r.title, 120),
      sub: `${ord(r.congress)} Congress`, stats: row && r.congress === 119 ? [['Yes', num(row.yeas)], ['No', num(row.nays)], ['Result', /reject|fail|not (agreed|sustained|passed|confirmed)/i.test(row.result) ? 'Failed' : 'Passed']] : [] });
  },
  async pac(id) {
    const r = await one(`pacs?id=eq.${encodeURIComponent(id)}&select=name,total,light->>fn,light->curT,light->curN,category`);
    if (!r) return null;
    return card({ kicker: 'PAC', title: r.fn || r.name, sub: r.category || 'Political action committee', stats: [['Given in 2025–26', money(+r.curT || 0)], ['Members funded', num(+r.curN || 0)], ['Given since records began', money(+r.total || 0)]] });
  },
  async lobbying(id) {
    const r = await one(`lobby_clients?id=eq.${encodeURIComponent(id)}&select=name,spend,light->nlob`);
    if (!r) return null;
    return card({ kicker: 'Lobbying', title: r.name, sub: 'Who it pays to lobby Congress', stats: [['Spent on lobbying', money(+r.spend)], ['Lobbyists', r.nlob ? num(+r.nlob) : '—']] });
  },
  async company(id) {
    const r = await one(`companies?id=eq.${encodeURIComponent(id)}&select=name,tickers,data->tr,data->gov->amt`);
    if (!r) return null;
    const tr = r.tr || [];
    return card({ kicker: (r.tickers || []).join(' · ') || 'Company', title: r.name, sub: 'Stock trades by Congress, contracts and lobbying',
      stats: [['Members who traded it', num(tr.length)], ['Trades since 2025', num(tr.reduce((s, x) => s + (x[1] || 0), 0))], ['Federal contracts', r.amt ? money(+r.amt) : '—']] });
  },
  async race(id) {
    const r = await one(`races?id=eq.${encodeURIComponent(id)}&select=state,office,district,data`);
    if (!r) return null;
    const d = r.data, nm = d.o === 'S' ? `${ST[d.st]} Senate` : `${ST[d.st]} ${+d.d ? ord(+d.d) + ' District' : 'at large'}`;
    const cs = (d.c || []).filter(c => c.r).sort((a, b) => b.r - a.r).slice(0, 3);
    return card({ kicker: 'Election · Nov 3, 2026', title: `2026 ${nm} race${d.sp ? ' (special)' : ''}`, sub: d.pvi ? `Partisan lean ${d.pvi}` : '', stats: cs.map(c => [`${c.n} (${c.p})`, money(c.r)]) });
  },
  async state(code) {
    code = String(code).toUpperCase(); if (!ST[code]) return null;
    const ms = await q(`members?state=eq.${code}&select=chamber,data->money->rec,data->tradeN`);
    return card({ kicker: 'State delegation', title: `${ST[code]} in Congress`, sub: `${ms.filter(m => m.chamber === 'Senate').length} senators · ${ms.filter(m => m.chamber === 'House').length} House members`,
      stats: [['Raised for 2026', money(ms.reduce((s, m) => s + (+m.rec || 0), 0))], ['Stock trades since 2025', num(ms.reduce((s, m) => s + (+m.tradeN || 0), 0))]] });
  },
  async district(key) {
    const m = String(key).toUpperCase().match(/^([A-Z]{2})-(\d{1,2})$/); if (!m) return null;
    const r = await one(`members?state=eq.${m[1]}&chamber=eq.House&district=${+m[2] ? 'eq.' + +m[2] : 'in.(0)'}&select=id,name,party,data->money->rec,data->tradeN`)
      || await one(`members?state=eq.${m[1]}&chamber=eq.House&select=id,name,party,data->money->rec,data->tradeN&limit=1`);
    if (!r) return null;
    const photo = await photoUrl(r.id);
    const el = card({ kicker: `${m[1]}-${+m[2] ? m[2].padStart(2, '0') : 'AL'}`, title: `${ST[m[1]]}'s ${+m[2] ? ord(+m[2]) + ' District' : 'at-large seat'}`, sub: `Represented by ${r.name} (${r.party})`,
      accent: PCOL[r.party] || NAVY, photo: !!photo, initials: initialsOf(r.name), stats: [['Raised for 2026', r.rec ? money(+r.rec) : '—'], ['Stock trades', num(+r.tradeN || 0)]] });
    return photo ? withPhoto(el, photo) : el;
  },
  async nominee(id) {
    const r = await one(`nominations?id=eq.${encodeURIComponent(id)}&select=name,position,confirmed_on,data->y,data->n`);
    if (!r) return null;
    return card({ kicker: r.confirmed_on ? `Confirmed ${date(r.confirmed_on)}` : 'Nominee', title: r.name, sub: r.position, initials: initialsOf(r.name),
      stats: r.y != null ? [['Senate vote', `${r.y}–${r.n}`]] : [] });
  },
};
const TYPES = Object.keys(BUILD);

module.exports = async (req, res) => {
  const u = new URL(req.url, 'https://app.capitolreceipts.com');
  const t = u.searchParams.get('t') || '', id = decodeURIComponent((u.searchParams.get('id') || '').replace(/\.png$/, ''));
  try {
    const el = BUILD[t] ? await BUILD[t](id) : null;
    if (!el) { res.statusCode = 302; res.setHeader('Location', 'https://www.capitolreceipts.com/img/share.png'); res.setHeader('Cache-Control', 'public, max-age=3600'); return res.end(); }
    const satori = (await import('satori')).default;
    const svg = await satori(el, { width: 1200, height: 630, fonts: fonts() });
    const buf = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000');
    res.end(buf);
  } catch (e) {
    console.error('og', t, id, e);
    res.statusCode = 302; res.setHeader('Location', 'https://www.capitolreceipts.com/img/share.png'); res.setHeader('Cache-Control', 'no-store'); res.end();
  }
};
module.exports.TYPES = TYPES;
