/* Live numbers for the marketing site (www): /pulse.json. Returns {asOf, nums: {key: text}, blocks: {key: html}}.
site/js/live.js swaps them into [data-live] and [data-live-block] elements, and scripts/site_live.py bakes the same
values into the static HTML so the first paint and crawlers see current numbers. Markup uses the site's own classes. */
const L = require('./_seo_lib');
const { cached, MEMBERS, esc, P, num, money, pct, date } = L;
const RK = require('./_seo_rank');
const RP = require('./_seo_reports');
const EX = require('./_seo_exec');

const short = (m, mem) => { const x = mem[m.id] || {}; return x.first && x.last ? `${x.first} ${x.last}` : m.name; };
const seat = m => m.chamber === 'Senate' ? `${m.party}-${m.state}` : `${m.party}-${m.state}${+m.district ? '-' + (+m.district) : ''}`;
const pill = m => m.party === 'D' ? `<span class="pill pd">${esc(seat(m))}</span>` : m.party === 'R' ? `<span class="pill pr">${esc(seat(m))}</span>` : `<span class="pill" style="background:#6b5aa6;color:#fff">${esc(seat(m))}</span>`;
const link = (m, mem) => `${m.chamber === 'Senate' ? 'Sen. ' : ''}<a class="rlink" href="${P('member', m.id, m.name)}">${esc(short(m, mem))}</a>`;
const PC = { D: '#2557a8', R: '#c8323a', I: '#6b5aa6' };
const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const verb = k => /^Sell/.test(k) ? 'sold' : k === 'Buy' ? 'bought' : String(k || 'traded').toLowerCase();

const pulse = () => cached('pulse', async () => {
  const [ms, { by: mem }, rp, ex] = await Promise.all([RK.DATA(), MEMBERS(), RP.DATA(), EX.DATA().catch(() => ({ filers: [] }))]);
  const nums = {}, blocks = {};
  const cur = ms.filter(m => m.party in PC);
  const traders = cur.filter(m => +m.tradeN > 0).sort((x, y) => +y.tradeN - +x.tradeN);
  const allTrades = rp.keys.reduce((v, k) => v + rp.months[k].stats.trades, 0);
  const raised = cur.reduce((v, m) => v + (+m.rec || 0), 0);
  const execN = ex.filers.reduce((v, f) => v + (f.n || 0), 0);
  const missed = cur.filter(m => RK.METRICS['most-missed-votes'].value(m) != null).map(m => [m, RK.METRICS['most-missed-votes'].value(m)]).sort((x, y) => y[1] - x[1]);
  const funds = cur.filter(m => +m.rec > 0).sort((x, y) => +y.rec - +x.rec);
  const asOf = new Date().toISOString().slice(0, 10);

  nums.trades = num(allTrades);
  nums.traders = num(traders.length);
  nums.members = num(cur.length);
  nums['top-trades'] = traders[0] ? num(+traders[0].tradeN) : '—';
  nums['top-missed'] = missed[0] ? pct(missed[0][1], 1) : '—';
  nums['top-raised'] = funds[0] ? money(+funds[0].rec) : '—';
  nums.updated = date(asOf);
  nums.raised = money(raised);
  nums.comm = num(cur.reduce((v, m) => v + (+m.comm || 0), 0));
  nums.period = `JAN 2025 – ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'America/New_York' }).toUpperCase()}`;
  // quiz receipts: refreshed only while the answer itself still holds
  const nm = m => `${short(m, mem)} (${m.party}-${m.state})`;
  if (traders[0] && traders[0].id === 'C001123' && traders[1]) nums.q1 = `${num(+traders[0].tradeN)} disclosed trades since January 2025. ${nm(traders[1])} is second at ${num(+traders[1].tradeN)}.${traders.slice(0, 10).some(m => m.id === 'P000197') ? '' : ' Nancy Pelosi isn’t in the top 10.'}`;
  if (funds[0] && funds[0].id === 'O000174' && funds[2]) nums.q3 = `${money(+funds[0].rec)} for 2026. ${short(funds[1], mem)} is second at ${money(+funds[1].rec)}, ${short(funds[2], mem)} third at ${money(+funds[2].rec)}.`;
  if (missed[0] && missed[0][0].id === 'W000808' && missed[2]) nums.q7 = `${pct(missed[0][1], 1)} of votes. ${nm(missed[1][0])} and ${nm(missed[2][0])} follow. Most members miss about ${pct(missed[Math.floor(missed.length / 2)][1], 0)}.`;

  // homepage: four big numbers
  const stat = (n, l, href) => `<a href="${href}" style="text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:6px;padding:22px 24px;background:#ffffff;border-radius:22px;border:2px solid #e3e7ef"><span class="disp" style="font-size:56px;line-height:1;color:#14274e">${n}</span><span style="font-size:16px;color:#3d4452">${l}</span></a>`;
  blocks['home-stats'] = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:16px">
${stat(num(allTrades), 'stock trades by members of Congress since January 2025', '/reports')}
${stat(`${num(traders.length)} of ${num(cur.length)}`, 'current members who reported a trade', '/rankings/most-stock-trades')}
${stat(money(raised), 'raised by current members for the 2026 elections', '/rankings/top-fundraisers')}
${stat(num(execN), 'trades reported by the President and Senate-confirmed officials', '/official-trades')}
</div><p class="mono" style="margin:14px 0 0;font-size:13px;color:#5b6374">Updated ${esc(date(asOf))} from House, Senate, FEC and OGE filings.</p>`;

  // homepage: the biggest trades made in the last 30 days, and the latest finished month
  const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const recent = [];
  rp.keys.slice(-3).forEach(k => rp.months[k].list.forEach(x => { if (x[1][0] >= since) recent.push(x); }));
  recent.sort((x, y) => (+y[1][5] || +y[1][4] || 0) - (+x[1][5] || +x[1][4] || 0) || y[1][0].localeCompare(x[1][0]));
  const thisMonth = new Date().toISOString().slice(0, 7);
  const lastFull = [...rp.keys].reverse().find(k => k < thisMonth);
  const lf = lastFull && rp.months[lastFull];
  const tag = m => `<span style="display:inline-block;font-size:13px;font-weight:700;padding:2px 8px;border-radius:999px;color:#fff;background:${PC[m.party] || '#14274e'}">${esc(seat(m))}</span>`;
  blocks['home-week'] = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:16px">
${recent.slice(0, 3).map(([m, t]) => `<div style="background:#ffffff;border:2px solid #e3e7ef;border-radius:22px;padding:22px 24px;display:flex;flex-direction:column;gap:8px"><span class="mono" style="font-size:13px;color:#5b6374">${esc(date(t[0]))} · ${/^Sell/.test(t[1]) ? 'SALE' : t[1] === 'Buy' ? 'PURCHASE' : esc(String(t[1] || '').toUpperCase())}</span><span class="disp" style="font-size:40px;line-height:1;color:#14274e">${money(+t[4] || 0)}–${money(+t[5] || +t[4] || 0)}</span><div style="font-weight:700;font-size:18px">${link(m, mem)} ${tag(m)}</div><div style="color:#3d4452">${esc(verb(t[1]))} ${esc(String(t[3] || '').slice(0, 80))}${t[2] ? ` <a class="rlink" href="${P('stock', t[2], '')}">(${esc(t[2])})</a>` : ''}</div></div>`).join('\n')}
</div>
<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:22px">
<a href="/this-week" style="background:#14274e;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:999px">This week in Congress ›</a>
${lf ? `<a href="/reports/${lastFull}" style="background:#ffffff;color:#14274e;border:2px solid #14274e;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:999px">${esc(RP.label(lastFull))} report ›</a>` : ''}
<a href="/guides" style="color:#14274e;font-weight:700;padding:12px 6px">Guides ›</a>
</div>`;

  // receipts page boards
  const top = traders[0] ? +traders[0].tradeN : 1;
  blocks['board-trades'] = traders.slice(0, 7).map((m, i) => `<div class="row"><span class="disp" style="font-size: 34px; color: #c8323a">${i + 1}</span><div><b>${link(m, mem)}</b> ${pill(m)}<div class="bar" style="width: ${Math.max(4, Math.round(+m.tradeN / top * 100))}%; background: ${PC[m.party]}; margin-top: 8px"></div></div><b class="mono">${num(+m.tradeN)}</b></div>`).join('\n') +
    `\n<p style="margin: 14px 0 0; color: #5b6374; font-size: 15px">Trades reported since January 2025. ${num(traders.length)} of ${num(cur.length)} current members traded at all. The typical member made zero. <a class="rlink" href="/rankings/most-stock-trades">Full ranking</a></p>`;
  blocks['board-missed'] = missed.slice(0, 3).map(([m, v], i) => `<div class="row"><span class="disp" style="font-size: 30px; color: #2557a8">${i + 1}</span><div><b>${link(m, mem)}</b> ${pill(m)}</div><b class="mono">${pct(v, 1)}</b></div>`).join('\n') +
    `\n<p style="margin: 10px 0 0; color: #5b6374; font-size: 15px">The typical member misses about ${pct(missed.length ? missed[Math.floor(missed.length / 2)][1] : null, 0)} of votes. <a class="rlink" href="/rankings/most-missed-votes">Full ranking</a></p>`;
  if (funds[0]) blocks['fund-top'] = `<div class="disp" style="font-size: 72px">${money(+funds[0].rec)}</div><b>${link(funds[0], mem)}</b> <span class="pill" style="background: #ffffff; color: ${PC[funds[0].party]}">${esc(seat(funds[0]))}</span><p style="margin: 8px 0 0; color: #ffe1e1">Biggest fundraiser in Congress for 2026.${funds[1] ? ` Next: ${link(funds[1], mem)} at ${money(+funds[1].rec)}.` : ''}</p>`;

  // parties page: averages per member
  const P_ = p => cur.filter(m => m.party === p);
  const row = (label, d, r, fmt, hi) => {
    const mx = Math.max(d || 0, r || 0) || 1, w = v => Math.max(4, Math.round((v || 0) / mx * 100));
    return `<div class="card" style="display: grid; grid-template-columns: 1fr 200px 1fr; gap: 18px; align-items: center; padding: 22px 28px">
   <div style="display: flex; align-items: center; gap: 12px; justify-content: flex-end"><b class="mono" style="color: #2557a8; font-size: 22px">${fmt(d)}</b><div class="bar" style="width: ${w(d)}%; max-width: ${Math.round(240 * w(d) / 100)}px; background: #2557a8"></div></div>
   <div style="text-align: center; font-weight: 700; color: #14274e">${label}</div>
   <div style="display: flex; align-items: center; gap: 12px"><div class="bar" style="width: ${w(r)}%; max-width: ${Math.round(240 * w(r) / 100)}px; background: #c8323a"></div><b class="mono" style="color: #c8323a; font-size: 22px">${fmt(r)}</b></div>
  </div>`;
  };
  const by = f => ['D', 'R'].map(p => f(P_(p)));
  const lines = [
    ['Average raised', ...by(g => avg(g.filter(m => m.rec != null).map(m => +m.rec))), money],
    ['From small donors', ...by(g => avg(g.filter(m => (+m.rec || 0) >= 50000 && m.small != null).map(m => +m.small))), x => pct(x)],
    ['Stock trades per member', ...by(g => avg(g.map(m => +m.tradeN || 0))), x => x == null ? '—' : x.toFixed(1)],
    ['Members who trade', ...by(g => avg(g.map(m => +m.tradeN > 0 ? 1 : 0))), x => pct(x)],
    ['Votes missed', ...by(g => avg(g.map(m => RK.METRICS['most-missed-votes'].value(m)).filter(v => v != null))), x => pct(x, 1)],
    ['Vote with their party', ...by(g => avg(g.filter(m => (+m.unityN || 0) >= 50 && m.unity != null).map(m => +m.unity))), x => pct(x, 1)],
  ];
  blocks['party-avg'] = lines.map(([l, d, r, f]) => row(l, d, r, f)).join('\n  ');
  return { asOf, nums, blocks };
}, 3600e3);

module.exports = { pulse };
