/* Plain-English guides (/guides/<slug>) that answer common questions with live numbers from the data.
Hub: /guides. Rules and limits are stated as published by the House, Senate and FEC. */
const L = require('./_seo_lib');
const { q, cached, MEMBERS, esc, P, a, num, money, date, clamp, title, facts, rows, sec, cols, note } = L;
const STK = require('./_seo_stocks');

const who = m => `${m.chamber === 'Senate' ? 'Sen.' : (m.delegate ? 'Del.' : 'Rep.')} ${m.name}`;
const seat = m => m.chamber === 'Senate' ? `${m.party}-${m.state}` : `${m.party}-${m.state}-${+m.district || 'AL'}`;

const stockNums = () => cached('guide-stocks', async () => {
  const [{ S, asOf }, { rows: ms }] = await Promise.all([STK.DATA(), MEMBERS()]);
  const list = Object.values(S).sort((x, y) => y.trades.length - x.trades.length || y.nm - x.nm);
  const traders = ms.filter(m => +m.tradeN > 0).sort((x, y) => +y.tradeN - +x.tradeN);
  const trades = traders.reduce((v, m) => v + +m.tradeN, 0);
  return { list, trades, traders, members: ms.length, asOf };
});
const pacNums = () => cached('guide-pacs', async () => {
  const ms = await q('members?select=id,name,party,state,chamber,district,data->delegate,rec:data->money->rec,pac:data->money->pac');
  const top = ms.filter(m => +m.pac > 0).sort((x, y) => +y.pac - +x.pac);
  const pacTot = top.reduce((v, m) => v + +m.pac, 0), recTot = ms.reduce((v, m) => v + (+m.rec || 0), 0);
  return { top, pacTot, recTot };
});

const faq = qa => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa.map(([qq, aa]) => ({ '@type': 'Question', name: qq, acceptedAnswer: { '@type': 'Answer', text: aa } })) });
const faqHtml = qa => sec('Common questions', qa.map(([qq, aa]) => `<h3>${esc(qq)}</h3><p>${esc(aa)}</p>`).join(''));

const GUIDES = {
  'congress-stock-trades': {
    short: 'How to look up a member of Congress’s stock trades',
    async build() {
      const n = await stockNums();
      const t = n.traders[0];
      const lead = `Every member of Congress has to report stock trades by themselves, their spouse and their dependent children. Those reports are public. Since January 2025, ${num(n.traders.length)} current members reported ${num(n.trades)} trades. Here is how to find them.`;
      const qa = [
        ['Are members of Congress allowed to trade stocks?', 'Yes. Members of Congress can buy and sell individual stocks. The STOCK Act requires them to report each trade over $1,000 within 45 days.'],
        ['Where do the trade reports come from?', 'House members file periodic transaction reports with the Clerk of the House. Senators file them with the Secretary of the Senate. Both are posted publicly online.'],
        ['Why are the amounts shown as ranges?', 'The forms only ask for a dollar range, such as $1,001 to $15,000 or $50,001 to $100,000, not the exact amount.'],
        ['Do the reports include family members?', 'Yes. Trades by a spouse or dependent child are reported too, and each trade is marked with whose account it was in.'],
      ];
      return { h1: 'How to look up a member of Congress’s stock trades', lead, qa, body: `
${facts([['Trades reported since 2025', num(n.trades)], ['Members who traded', num(n.traders.length)], ['Stocks traded', num(n.list.length)]])}
${sec('1. Find the member', `<p>Search by name, or ${a('/states', 'pick your state')} to see your senators and representative. Every member has a page, and the stock trades section lists each trade with the date, the stock, whether it was a purchase or sale, the dollar range and whose account it was in.</p>`)}
${sec('2. Read a trade', `<p>A trade line looks like this: <i>bought Apple Inc. (AAPL), Mar 3, 2026, $1,001–$15,000, spouse</i>. The date is when the trade happened. The report itself can come up to 45 days later. “Spouse” or “dependent child” means the trade was in a family member’s account.</p>`)}
${sec('3. Check the original filing', `<p>Each member’s page links to the original reports on the House Clerk or Senate site, so you can see the form exactly as it was filed. When a member files an amended report, the corrected trade replaces the original here.</p>`)}
${sec('4. Look across Congress', `<p>To see who trades the most, use the ${a('/rankings/most-stock-trades', 'most stock trades ranking')}. ${t ? `${a(P('member', t.id, t.name), who(t))} <small>${esc(seat(t))}</small> leads with ${num(t.tradeN)} trades since January 2025.` : ''} To see who traded a specific company, open its ${a('/stocks', 'stock page')}. The ${a('/reports', 'monthly reports')} sum up each month.</p>`)}
${sec('Members with the most trades', rows(n.traders.slice(0, 10).map(m => [`${a(P('member', m.id, m.name), who(m))} <small>${esc(seat(m))}</small>`, `${num(m.tradeN)} trades`])))}` };
    },
  },
  'stock-act': {
    short: 'What the STOCK Act requires',
    async build() {
      const n = await stockNums();
      const lead = `The STOCK Act of 2012 says members of Congress have to publicly report their stock trades. Each trade over $1,000 must be reported within 30 days of the member learning about it, and no later than 45 days after the trade. Since January 2025, members reported ${num(n.trades)} trades under this law.`;
      const qa = [
        ['What is the STOCK Act?', 'The Stop Trading on Congressional Knowledge Act of 2012. It says members of Congress may not use information they learn on the job to trade, and requires them to report their trades publicly.'],
        ['How long do members have to report a trade?', 'Within 30 days of being notified of the trade, and no later than 45 days after the trade date.'],
        ['What happens if a member reports late?', 'The usual penalty is a $200 late fee. Ethics committees can take further action, but large penalties are rare.'],
        ['Does the STOCK Act ban members from owning stocks?', 'No. Members can own and trade individual stocks. Several bills to ban stock trading by members have been introduced in Congress.'],
        ['Does it cover executive branch officials?', 'Yes. The President, Vice President and Senate-confirmed officials report their trades on OGE Form 278-T.'],
      ];
      return { h1: 'What the STOCK Act requires', lead, qa, body: `
${facts([['Reporting threshold', 'Over $1,000'], ['Deadline', '45 days after the trade'], ['Usual late fee', '$200'], ['Trades reported since 2025', num(n.trades)]])}
${sec('Who has to report', `<p>All 535 members of Congress, plus the delegates. They report trades in their own accounts and in their spouse’s and dependent children’s accounts. Senior congressional staff report too. In the executive branch, the President and Senate-confirmed officials file the same kind of report with the Office of Government Ethics. See ${a('/official-trades', 'their trades here')}.</p>`)}
${sec('What they have to report', `<p>Each purchase, sale or exchange of a stock, bond or similar investment worth more than $1,000. The report gives the date, the asset, the type of trade and a dollar range. It does not give the exact amount or the price.</p>`)}
${sec('When they have to report it', `<p>Within 30 days of learning about the trade, and never more than 45 days after it. The 30-day clock matters for trades made by a broker or a spouse that the member did not know about right away.</p>`)}
${sec('What happens when they miss the deadline', `<p>The House and Senate ethics rules set a $200 late fee for a late report. Late reports are common. Fines beyond that are rare.</p>`)}
${sec('What the law does not do', `<p>It does not ban members from owning or trading stocks, does not require blind trusts, and does not require exact dollar amounts. Trading a stock in an industry a member’s committee oversees is also legal. See ${a('/rankings/committee-tied-trades', 'trades tied to their committees')}.</p>`)}` };
    },
  },
  'pac-contribution-limits': {
    short: 'What a PAC is and how much it can give',
    async build() {
      const n = await pacNums();
      const t = n.top[0];
      const lead = `A PAC, or political action committee, collects money and gives it to candidates. A typical PAC can give a candidate up to $5,000 per election. Current members of Congress have received ${money(n.pacTot)} from PACs for the 2026 elections${n.recTot ? `, out of ${money(n.recTot)} raised in total` : ''}.`;
      const qa = [
        ['What is a PAC?', 'A political action committee is a group that raises money and spends it on elections. Companies, unions, trade groups and members of Congress themselves run PACs.'],
        ['How much can a PAC give a candidate?', 'A multicandidate PAC, which covers most PACs, can give up to $5,000 per election to a candidate. The primary and general election count separately, so that is up to $10,000 per cycle.'],
        ['How much can a person give a candidate?', 'For the 2025–2026 elections, an individual can give up to $3,500 per election to a candidate.'],
        ['What is a super PAC?', 'A super PAC can raise and spend unlimited amounts, but it cannot give money directly to candidates or coordinate with them. It spends on its own ads and outreach.'],
        ['Can a company give directly to a candidate?', 'No. Corporations and unions cannot give directly from their treasuries. They set up a PAC, and the PAC raises money from employees or members.'],
      ];
      return { h1: 'What a PAC is and how much it can give', lead, qa, body: `
${facts([['PAC to candidate', '$5,000 per election'], ['Person to candidate', '$3,500 per election'], ['Super PAC spending', 'No limit'], ['PAC money to current members', money(n.pacTot)]])}
${sec('Types of PACs', rows([['Company or union PAC', 'Raises money from employees or members and gives it to candidates.'], ['Leadership PAC', 'Run by a member of Congress to give to other candidates.'], ['Super PAC', 'Spends unlimited amounts on ads, but cannot give to candidates.'], ['Party committee', 'The national and state parties, with their own limits.']]))}
${sec('How to see who funds a member', `<p>Every member’s page lists their top PACs and the industries their donors work in. You can also open a ${a('/pacs', 'PAC’s page')} to see which members it gives to, and the ${a('/outside-groups', 'outside spending list')} for super PACs. ${t ? `Of current members, ${a(P('member', t.id, t.name), who(t))} <small>${esc(seat(t))}</small> has taken the most PAC money for 2026, ${money(+t.pac)}.` : ''}</p>`)}
${sec('Members with the most PAC money', rows(n.top.slice(0, 10).map(m => [`${a(P('member', m.id, m.name), who(m))} <small>${esc(seat(m))}</small>`, money(+m.pac)])))}` };
    },
  },
  'who-owns-a-stock': {
    short: 'Which members of Congress own a given stock',
    async build() {
      const n = await stockNums();
      const lead = `To see which members of Congress traded a stock, open that stock’s page. It lists every member who bought or sold it since January 2025, with dates and amounts. ${n.list[0] ? `The most-traded stock is ${n.list[0].name} (${n.list[0].tk}), with ${num(n.list[0].trades.length)} trades by ${num(n.list[0].nm)} members.` : ''}`;
      const qa = [
        ['Can I see which members of Congress own a stock?', 'You can see who traded it. Members report each trade within 45 days. Their full holdings appear once a year on their annual financial disclosure, which can lag by more than a year.'],
        ['Is it legal for members of Congress to own stocks?', 'Yes. They have to report their trades, but they are not required to sell their stocks or use a blind trust.'],
        ['Does a trade by a spouse count?', 'Yes. Trades by a spouse or dependent child are reported and shown, marked with whose account they were in.'],
      ];
      return { h1: 'Which members of Congress own a given stock', lead, qa, body: `
${sec('How to look it up', `<p>Open the ${a('/stocks', 'stocks list')} or search for the company. Each stock page shows how many members traded it, how many trades were purchases or sales, the total reported value, a split by party and the latest trades.</p>`)}
${sec('Trades show what they bought and sold', `<p>Trade reports show buying and selling. They do not show what a member held before 2025 and never traded. For full holdings, each member files an annual financial disclosure, linked from their page.</p>`)}
${sec('Most-traded stocks in Congress', rows(n.list.slice(0, 25).map((s, i) => [`<b>${i + 1}.</b> ${a(P('stock', s.tk, s.name), `${s.name} (${s.tk})`)}`, `${num(s.trades.length)} trades · ${num(s.nm)} member${s.nm === 1 ? '' : 's'}`])))}` };
    },
  },
};

async function page(id) {
  const g = GUIDES[String(id || '').toLowerCase()]; if (!g) return null;
  const o = await g.build(), path = `/guides/${id}`;
  return { title: title(o.h1), desc: clamp(o.lead, 158), path, route: null, ogType: 'article', crumbs: [['Guides', L.abs('/guides')], [o.h1, null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'Article', headline: o.h1, description: clamp(o.lead, 300), url: L.abs(path), dateModified: new Date().toISOString().slice(0, 10),
      author: { '@type': 'Organization', name: 'Capitol Receipts', url: L.SITE + '/' }, publisher: { '@type': 'Organization', name: 'Capitol Receipts', logo: { '@type': 'ImageObject', url: L.SITE + '/img/logo-512.png' } } }, faq(o.qa)],
    body: `<p class="sr-sub">Guide · Updated ${esc(date(new Date().toISOString()))}</p><h1>${esc(o.h1)}</h1><p class="sr-lead">${esc(o.lead)}</p>${o.body}
${faqHtml(o.qa)}
${sec('More guides', cols(Object.entries(GUIDES).filter(([s]) => s !== id).map(([s, x]) => a(`/guides/${s}`, x.short)).concat([a('/reports', 'Monthly reports on Congress stock trades')])))}
${note('Numbers on this page come from House and Senate trade reports and FEC filings and update daily.')}` };
}
async function hub() {
  const lead = 'Short, plain-English answers about money in Congress: stock trades, the STOCK Act, PACs and who owns what, with numbers that update daily.';
  return { title: title('Guides: Stock Trades, PACs and Money in Congress'), desc: lead, path: '/guides', route: null, crumbs: [['Guides', null]],
    ld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Guides', description: lead, url: L.abs('/guides') }],
    body: `<h1>Guides</h1><p class="sr-lead">${esc(lead)}</p>${rows(Object.entries(GUIDES).map(([s, g]) => [a(`/guides/${s}`, g.short), '']))}` };
}
const sitemap = async () => [['/guides'], ...Object.keys(GUIDES).map(s => [`/guides/${s}`])];
module.exports = { page, hub, sitemap, GUIDES };
