/* Shared helpers for the search-friendly pages: Supabase reads, cached lookups, formatting and URL rules. */
const HOST = 'https://app.capitolreceipts.com', SITE = 'https://www.capitolreceipts.com';
const SB = 'https://hxgckcriehvrolwnabpd.supabase.co/rest/v1/';
const KEY = 'sb_publishable_jiwF5q1sFMuaGXLKg6FKAQ_3rCjcZ1J'; // public, read-only

async function q(p, opt = {}) {
  const headers = { apikey: KEY, Accept: 'application/json' };
  if (opt.range) { headers.Range = opt.range; headers['Range-Unit'] = 'items'; }
  if (opt.count) headers.Prefer = 'count=exact';
  for (let i = 0; ; i++) {
    let r;
    try { r = await fetch(SB + p, { headers }); } catch (e) { if (i < 2) { await new Promise(f => setTimeout(f, 400 * (i + 1))); continue; } throw e; }
    if (r.ok || r.status === 206) {
      const rows = await r.json();
      if (opt.count) { const cr = r.headers.get('content-range') || ''; return { rows, total: +(cr.split('/')[1] || rows.length) }; }
      return rows;
    }
    if (r.status >= 500 && i < 2) { await new Promise(f => setTimeout(f, 400 * (i + 1))); continue; }
    if (r.status === 416) return opt.count ? { rows: [], total: +((r.headers.get('content-range') || '').split('/')[1] || 0) } : [];
    throw new Error(p.split('?')[0] + ' ' + r.status);
  }
}
const one = async p => (await q(p))[0] || null;
const inList = arr => encodeURIComponent('in.(' + arr.map(x => '"' + String(x).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + ')');
async function all(p, size = 1000) { // every row, in parallel pages
  const first = await q(p, { range: `0-${size - 1}`, count: true });
  const pages = [];
  for (let from = size; from < first.total; from += size) pages.push(q(p, { range: `${from}-${from + size - 1}` }));
  return first.rows.concat(...(await Promise.all(pages)));
}

// small tables and indexes that many pages need; kept for 30 minutes per server instance
const CACHE = {};
async function cached(key, fn, ttl = 1800e3) {
  const c = CACHE[key];
  if (c && Date.now() - c.at < ttl) return c.p;
  const p = fn().catch(e => { delete CACHE[key]; throw e; });
  CACHE[key] = { at: Date.now(), p };
  return p;
}
const MEMBERS = () => cached('members', async () => {
  const rows = await q('members?select=id,name,party,state,chamber,district,data->>first,data->>last,data->delegate,data->money->rec,data->tradeN,data->present&order=ord');
  const by = {}; rows.forEach(r => by[r.id] = r); return { rows, by };
});
const COMMITTEES = () => cached('committees', async () => {
  const rows = await q('committees?select=id,name,data&order=id'); const by = {}; rows.forEach(r => by[r.id] = r); return { rows, by };
});
const CAUCUSES = () => cached('caucuses', async () => q('caucuses?select=id,name,data&order=name'));
const META = keys => cached('meta:' + keys.join(','), async () => Object.fromEntries((await q('app_meta?select=key,value&key=in.(' + keys.join(',') + ')')).map(r => [r.key, r.value])));

// display names for a list of bioguide IDs: current members first, then past members
async function names(ids) {
  ids = [...new Set(ids.filter(Boolean))];
  const { by } = await MEMBERS(), out = {};
  const rest = [];
  ids.forEach(id => by[id] ? out[id] = { id, name: by[id].name, party: by[id].party, state: by[id].state, cur: true } : rest.push(id));
  for (let i = 0; i < rest.length; i += 120) {
    const rows = await q(`people?select=id,name,party,light->>ls&id=${inList(rest.slice(i, i + 120))}`);
    rows.forEach(r => out[r.id] = { id: r.id, name: r.name, party: (r.party || '')[0], state: r.ls, cur: false });
  }
  return out;
}

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').filter(Boolean).slice(0, 9).join('-').slice(0, 70).replace(/-+$/, '');
const P = (type, id, name) => { const s = slug(name); return `/${type}/${encodeURIComponent(id)}${s ? '/' + s : ''}`; };
const abs = p => HOST + p;
const a = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;
const personLink = (n, id, fallback) => { const x = n[id]; if (!x) return esc(fallback || id); return a(P(x.cur ? 'member' : 'past-member', id, x.name), x.name + (x.party && x.state ? ` (${x.party}-${x.state})` : '')); };

const ST = {AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'District of Columbia',PR:'Puerto Rico',GU:'Guam',VI:'Virgin Islands',AS:'American Samoa',MP:'Northern Mariana Islands'};
const PN = { D: 'Democrat', R: 'Republican', I: 'Independent', L: 'Libertarian', G: 'Green' };
const PADJ = { D: 'Democratic', R: 'Republican', I: 'Independent' };
const ord = n => n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10] || 'th');
const num = n => n == null ? '—' : Math.round(n).toLocaleString('en-US');
function money(n) {
  if (n == null || isNaN(n)) return '—';
  const s = n < 0 ? '-' : ''; n = Math.abs(n);
  if (n >= 1e9) return `${s}$${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace(/\.0$/, '')}B`;
  if (n >= 1e6) return `${s}$${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (n >= 1e4) return `${s}$${Math.round(n / 1e3)}K`;
  return `${s}$${Math.round(n).toLocaleString('en-US')}`;
}
const pct = (x, d = 0) => x == null || isNaN(x) ? '—' : (x * 100).toFixed(d) + '%';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function date(s) { // ISO or MM/DD/YYYY -> "Sep 29, 2026"
  if (!s) return '';
  let m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${MON[+m[2] - 1]} ${+m[3]}, ${m[1]}`;
  m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${MON[+m[1] - 1]} ${+m[2]}, ${m[3]}`;
  return String(s);
}
const isoOf = s => { const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : (String(s || '').match(/^\d{4}-\d{2}-\d{2}/) || [''])[0]; };
const congYears = c => { const y = 1789 + 2 * (c - 1); return `${y}–${y + 1}`; };
function clamp(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); if (s.length > n) s = s.replace(/…+$/, ''); if (s.length <= n) return s; const c = s.slice(0, n - 1); return c.slice(0, Math.max(c.lastIndexOf(' '), n - 20)).replace(/[,;:.\s-]+$/, '') + '…'; }
const tcase = s => /[a-z]/.test(String(s || '').split(' ').slice(1).filter(w => !/^(of|the|and|for|to|in|on|at|a|an|by)$/.test(w)).map(w => w[0]).join('')) ? String(s).replace(/\b([a-z])([a-z]*)/g, (m, f, r, i) => (i > 0 && /^(of|the|and|for|to|in|on|at|a|an|by)$/.test(m)) ? m : f.toUpperCase() + r) : s;
const title = t => (t.length + 19 <= 70 ? t + ' | Capitol Receipts' : clamp(t, 70));
const firstSentences = (s, n = 320) => { s = String(s || '').replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const cut = s.slice(0, n); const i = cut.lastIndexOf('. '); return i > 80 ? cut.slice(0, i + 1) : clamp(s, n); };

// small HTML builders
const facts = list => `<dl class="sr-facts">${list.filter(f => f && f[1] != null && f[1] !== '' && f[1] !== '—').map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
const rows = list => list.length ? `<ul class="sr-list">${list.map(([l, r]) => `<li><span>${l}</span><span>${r == null ? '' : r}</span></li>`).join('')}</ul>` : '';
const sec = (h, inner) => inner ? `<section><h2>${esc(h)}</h2>${inner}</section>` : '';
const cols = items => items.length ? `<ul class="sr-cols">${items.map(x => `<li>${x}</li>`).join('')}</ul>` : '';
function pager(base, page, pages) {
  if (pages <= 1) return '';
  const link = p => p === page ? `<b>${p}</b>` : `<a href="${base}${p > 1 ? (base.includes('?') ? '&' : '?') + 'page=' + p : ''}">${p}</a>`;
  const show = new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter(p => p >= 1 && p <= pages));
  for (let p = 10; p < pages; p += 10) show.add(p);
  let out = [], prev = 0;
  [...show].sort((x, y) => x - y).forEach(p => { if (p - prev > 1) out.push('<span>…</span>'); out.push(link(p)); prev = p; });
  return `<nav class="sr-pager" aria-label="Pages">${page > 1 ? `<a rel="prev" href="${base}${page > 2 ? '?page=' + (page - 1) : ''}">‹ Previous</a>` : ''}${out.join('')}${page < pages ? `<a rel="next" href="${base}?page=${page + 1}">Next ›</a>` : ''}</nav>`;
}
const note = s => `<p class="sr-note">${s}</p>`;

function notFound(p) {
  return { status: 404, noindex: true, title: 'Page not found | Capitol Receipts', desc: 'We couldn’t find that page on Capitol Receipts.', path: p, route: null,
    body: `<h1>We couldn’t find that page</h1><p class="sr-lead">It may have moved, or the record may not be in our data. Try one of these instead:</p>${cols([a('/members', 'Members of Congress'), a('/bills', 'Bills'), a('/pacs', 'PACs'), a('/lobbying', 'Lobbying groups'), a('/elections', '2026 elections'), a('/states', 'Your state')])}` };
}

module.exports = { HOST, SITE, q, one, inList, all, cached, MEMBERS, COMMITTEES, CAUCUSES, META, names, esc, slug, P, abs, a, personLink,
  ST, PN, PADJ, tcase, ord, num, money, pct, date, isoOf, congYears, clamp, title, firstSentences, facts, rows, sec, cols, pager, note, notFound };
