/* Trades by the President and Senate-confirmed officials, from the OGE Form 278-T reports posted publicly
(app_meta 'exec_trades', built daily by pipeline/fetch_exec_trades.py). Hub: /official-trades. One page per official. */
const L = require('./_seo_lib');
const { cached, META, esc, P, a, num, money, date, clamp, title, facts, rows, sec, cols, note } = L;

const slug = n => String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const display = n => { const [l, f] = String(n || '').split(/,\s*/); return f ? `${f} ${l}` : String(n || ''); };
const DATA = () => cached('exec_trades', async () => {
  const m = await META(['exec_trades']);
  const v = m.exec_trades || { filers: [] };
  v.filers.forEach(f => {
    f.display = display(f.name); f.slug = slug(f.display);
    const t = f.tot || {}; f.n = t.n || f.trades.length; f.buys = t.buys || 0; f.sells = t.sells || 0; f.lo = t.lo || 0; f.hi = t.hi || 0; f.scan = !!f.scan;
  });
  return v;
});
const when = d => !d ? 'date unclear' : d.length === 7 ? new Date(d + '-15T12:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : date(d);
const verb = k => k === 'Buy' ? 'Bought' : k === 'Exchange' ? 'Exchanged' : 'Sold';

async function hub() {
  const v = await DATA();
  const tot = v.filers.reduce((s, f) => s + f.n, 0);
  const lead = `The President and ${num(Math.max(0, v.filers.length - 1))} Senate-confirmed officials reported ${num(tot)} stock and bond trades on public OGE Form 278-T reports posted since January 2025.`;
  return { title: title('Stock Trades by the President & Cabinet Officials (2025–2026)'), desc: clamp(lead, 158), path: '/official-trades', route: 'xtr', crumbs: [['Officials’ trades', null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Stock trades by executive branch officials', numberOfItems: v.filers.length,
      itemListElement: v.filers.slice(0, 100).map((f, i) => ({ '@type': 'ListItem', position: i + 1, name: f.display, url: L.abs(P('official-trades', f.slug, '')) })) }],
    body: `<h1>Stock trades by the President and cabinet officials</h1><p class="sr-sub">Updated ${esc(date(v.asOf) || '')}</p><p class="sr-lead">${esc(lead)}</p>
${rows(v.filers.map(f => [`${a(P('official-trades', f.slug, ''), f.display)} <small>${esc(f.title)}${f.agency ? ' · ' + esc(f.agency) : ''}</small>`, `${num(f.n)} trades`]))}
${sec('About these reports', '<p>Senior executive branch officials must report trades over $1,000 within 45 days on OGE Form 278-T. This page lists every report the Office of Government Ethics has posted publicly; other officials’ reports are available from OGE on request. Amounts are reported in ranges.</p>')}
${note('From U.S. Office of Government Ethics Form 278-T reports. Each official’s page links to the original filings.')}` };
}

async function page(id) {
  const v = await DATA();
  const f = v.filers.find(x => x.slug === String(id || '').toLowerCase());
  if (!f) return null;
  const h1 = `${f.display}’s stock trades`;
  const lead = `${f.display} (${f.title}${f.agency && f.agency !== 'White House Office' ? ', ' + f.agency : ''}) reported ${num(f.n)} trades since January 2025: ${num(f.buys)} purchases and ${num(f.sells)} sales, worth ${money(f.lo)} to ${money(f.hi)} in total.`;
  const body = `<p class="sr-sub">${esc(f.title)}${f.agency ? ' · ' + esc(f.agency) : ''}</p><h1>${esc(h1)}</h1><p class="sr-lead">${esc(lead)}</p>
${facts([['Trades since 2025', num(f.n)], ['Purchases', num(f.buys)], ['Sales', num(f.sells)], ['Reported value', `${money(f.lo)}–${money(f.hi)}`], ['Reports posted', num(f.reports.length)]])}
${f.scan ? `<p>These reports were filed on paper and scanned. Counts and amounts were read from the scans automatically and matched to the official ranges. The scans are too rough to list every trade by name, so each report links to the original.</p>
${sec('Reports', rows(f.reports.map(r => [`<a href="${esc(r[1])}" rel="nofollow noopener">Report posted ${esc(date(r[0]))}</a>${r[2] ? `<br><small>${num(r[4] || 0)} purchases · ${num(r[5] || 0)} sales</small>` : '<br><small>scanned image</small>'}`, r[2] ? `${num(r[2])} trades · ${money(r[6] || 0)}–${money(r[7] || 0)}` : '—'])))}` :
`${sec('Trades', rows(f.trades.slice(0, 300).map(t => [`${t[2] ? `<b>${esc(t[2])}</b> · ` : ''}${esc(clamp(t[3], 90))}<br><small>${esc(verb(t[1]))} · ${esc(when(t[0]))}</small>`, t[4] ? (t[5] ? `${money(t[4])}–${money(t[5])}` : `over ${money(t[4] - 1)}`) : 'amount unclear'])) + (f.trades.length > 300 ? `<p>Showing the latest 300 of ${num(f.trades.length)}. The app lists all of them.</p>` : ''))}
${sec('Original reports', rows(f.reports.map(r => [`<a href="${esc(r[1])}" rel="nofollow noopener">Report posted ${esc(date(r[0]))}</a>`, r[2] ? `${num(r[2])} trades` : '—'])))}`}
${sec('Related', cols([a('/official-trades', 'All officials’ trades'), a('/stocks', 'Stocks traded by members of Congress'), a('/appointees', 'Appointees')]))}
${note('From U.S. Office of Government Ethics Form 278-T reports.')}`;
  return { title: title(`${f.display} Stock Trades (${f.title})`), desc: clamp(lead, 158), path: P('official-trades', f.slug, ''), route: 'xtr:' + f.slug,
    ogType: 'article', crumbs: [['Officials’ trades', L.abs('/official-trades')], [f.display, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Dataset', name: h1, description: lead, url: L.abs(P('official-trades', f.slug, '')), isAccessibleForFree: true,
      creator: { '@type': 'Organization', name: 'Capitol Receipts', url: L.SITE + '/' }, about: { '@type': 'Person', name: f.display, jobTitle: f.title } }], body };
}
async function sitemap() { const v = await DATA(); return [['/official-trades'], ...v.filers.map(f => [P('official-trades', f.slug, '')])]; }
module.exports = { hub, page, sitemap, DATA };
