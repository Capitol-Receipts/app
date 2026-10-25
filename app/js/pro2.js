/* ================= More Pro tools =================
- Bill watchlist: follow a bill; Pro alert emails say when it moves, gets a vote or draws new lobbying.
- Stock picks vs the S&P 500: how members' purchases did against the index over the same days (app_meta 'perf',
  built daily by pipeline/build_perf.py).
- Your stocks in Congress: for each stock you watch, who in Congress trades it.
- Downloads: spreadsheets of members, PACs, lobbying clients, companies, bills, and a member's money and votes.
- Alert settings: same-day or once-a-day emails, bill updates, and the weekly briefing. */
const PRO2={perf:null,perfErr:null,perfLoading:false,psort:'ex',pch:'all',all:null,allLoading:false};
/* every trade since 2025 (profiles carry only each member's latest 80), loaded when a Pro tool needs it */
async function loadAllTrades(){
  if(PRO2.all||PRO2.allLoading)return PRO2.all;PRO2.allLoading=true;
  try{const r=await SB.meta(['trades_all']);const out=[];Object.entries(r.trades_all||{}).forEach(([id,ts])=>{const m=byId[id];if(m)ts.forEach(t=>out.push([m,t]))});PRO2.all=out.length?out:null}catch(e){console.warn(e)}
  PRO2.allLoading=false;return PRO2.all;
}
const tradesSince2025=()=>(PRO2.all||allTrades()).filter(([m,t])=>t[0]>='2025-01-01'&&t[2]);
S.bills=S.bills||[];
PI.chart='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><path d="M5 16l5-5 4 3 6-7"/><path d="M15 7h5v5"/></svg>';
PI.doc='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>';
PI.mail='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg>';
PI.bag='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8.5 7V5.5A2 2 0 0 1 10.5 3.5h3a2 2 0 0 1 2 2V7M3 12.5h18"/></svg>';
PRO_FEATS.splice(0,PRO_FEATS.length,
 ['bell','Same-day alerts','An email within hours of a new trade report, instead of a weekly summary. Prefer one email a day? You can switch.'],
 ['doc','Bill watchlist','Follow any bill. We email you when it moves, gets a vote, or more groups lobby on it.'],
 ['chart','Stock picks vs the S&P 500','How every member’s stock purchases have done against the market since January 2025.'],
 ['eye','Stock watchlist','Pick any stocks. We tell you when anyone in Congress trades them, and show who already does.'],
 ['radar','Conflict radar','Every trade tied to a member’s own committees, plus every trade over $250K, across all of Congress.'],
 ['mail','Weekly briefing','Each Friday: the week’s biggest trades, closest votes, new laws and lobbying fights.'],
 ['down','Download the data','Spreadsheets of members, trades, PACs, lobbying, companies, bills, donors and votes.'],
 ['users','Unlimited follows',`Free accounts follow up to ${PRO.FREE_FOLLOWS} people.`]);
const pctS=(x,d=0)=>x==null||isNaN(x)?'—':(x>0?'+':'')+(x*100).toFixed(d)+'%';

/* ---------- bill watchlist ---------- */
function saveBills(){if(ACCT.user&&ACCT.client)ACCT.client.from('user_prefs').upsert({user_id:ACCT.user.id,bills:S.bills}).then(({error})=>{if(error)console.warn(error)})}
function watchBill(k){
  if(!signedIn())return authSheet('up','Create a free account, then try Pro free for 14 days to watch bills.');
  if(!isPro())return needPro('The bill watchlist is part of Pro. We’ll email you when the bill moves, gets a vote, or more groups lobby on it.');
  if(!S.bills.includes(k)){S.bills=[k,...S.bills].slice(0,200);saveBills();track('watch_bill',{bill:k});toast('Watching this bill. We’ll email you when something changes.')}render();
}
function unwatchBill(k){S.bills=S.bills.filter(x=>x!==k);saveBills();render()}
function billsSection(){
  const ks=S.bills||[];
  const row=k=>{const b=typeof H!=='undefined'&&H&&H.bills[k];const p=bkParse(k);
    return `<span class="wchip"><button class="wgo" data-bk="${esc(k)}">${esc(p.label)}${b?` · ${esc((b[1]||b[0]||'').slice(0,40))}`:''}</button><button class="wx" data-unwatchbill="${esc(k)}" aria-label="Stop watching ${esc(p.label)}">×</button></span>`};
  return `<section class="sec"><div class="sh"><h2>Bills you watch</h2>${isPro()?'':proBadge}</div><div class="group pad">
   ${ks.length?`<div class="wchips" style="margin-top:0">${ks.map(row).join('')}</div>`:`<p class="s" style="margin:0;color:var(--soft)">Open any bill and tap <b>Watch this bill</b>. We’ll email you when it moves, gets a vote, or more groups lobby on it.</p>`}
   <div class="wsugg"><button data-bills-go>Find a bill</button><button data-bills-lobbied>Most-lobbied bills</button></div></div></section>`;
}

/* ---------- stock picks vs the S&P 500 ---------- */
async function loadPerf(){
  if(PRO2.perf||PRO2.perfLoading)return;PRO2.perfLoading=true;
  try{const r=await SB.meta(['perf']);PRO2.perf=r.perf||{m:{}};PRO2.perfErr=null}catch(e){PRO2.perfErr=String(e.message||e)}
  PRO2.perfLoading=false;render();
}
const PERF_MIN=5;
function perfRows(){
  const m=(PRO2.perf&&PRO2.perf.m)||{};
  return Object.entries(m).filter(([id,r])=>byId[id]&&r.n>=PERF_MIN&&(PRO2.pch==='all'||byId[id].chamber===PRO2.pch)).map(([id,r])=>[byId[id],r]);
}
function perfPage(){
  if(!PRO2.perf&&!PRO2.perfErr){loadPerf();return `${pageHead('Stock picks')}<div class="wrap" style="padding-top:calc(var(--navh) + 10px)"><div class="calm">Loading…</div></div>`}
  const pro=isPro(),p=PRO2.perf||{m:{}};
  const rows=perfRows().sort((a,b)=>PRO2.psort==='ret'?b[1].ret-a[1].ret:PRO2.psort==='n'?b[1].n-a[1].n:b[1].ex-a[1].ex);
  const beat=rows.filter(([,r])=>r.ex>0).length;
  const shown=pro?rows.slice(0,S.limit||60):rows.slice(0,3);
  const right=r=>`<span class="pperf ${r.ex>=0?'up':'dn'}"><b>${pctS(r.ret)}</b><small>vs ${pctS(r.spx)} S&amp;P · ${r.n} buys</small></span>`;
  const head=`${pageHead('Stock picks')}<div class="wrap" style="padding-top:calc(var(--navh) + 10px)">
   <div class="phead lbanner bg-capitol"><span class="pkick">${PI.chart} Pro</span><h1>Who beats the market?</h1><p>How each member’s stock purchases since January 2025 have done, compared with the S&amp;P 500 over the same days.</p></div>`;
  if(!rows.length)return head+`<div class="calm">${PRO2.perfErr?'Couldn’t load this. Try reloading.':'Results appear after the next data update. Check back tomorrow.'}</div></div>`;
  return head+`<div class="glance">${glance('Members scored',ord(rows.length),`${PERF_MIN}+ priced purchases`,false)}${glance('Beat the S&P 500',ord(beat),pct(beat/rows.length)+' of them',false)}${glance('Prices as of',fmtISO(p.asOf),'daily closes',false)}</div>
   <div class="seg" role="group" style="margin-top:14px">${[['all','All'],['House','House'],['Senate','Senate']].map(([k,l])=>`<button data-pch="${k}" aria-pressed="${PRO2.pch===k}">${l}</button>`).join('')}</div>
   <div class="chipsrow" style="margin-top:10px">${[['ex','Most above the S&P'],['ret','Highest return'],['n','Most purchases']].map(([k,l])=>`<button data-psort="${k}" aria-pressed="${PRO2.psort===k}">${l}</button>`).join('')}</div>
   <section class="sec"><div class="group">${shown.map(([m,r])=>memRow(m,right(r))).join('')}</div>
   ${pro?(rows.length>(S.limit||60)?`<button class="more" data-more>Show ${Math.min(rows.length-(S.limit||60),100)} more</button>`:''):`<div class="plock"><div class="pblur" aria-hidden="true">${rows.slice(3,6).map(([m,r])=>memRow(m,right(r))).join('')}</div><div class="plockin"><span class="pfi">${PI.lock}</span><b>See all ${ord(rows.length)} members with Pro</b><span>The full ranking, each member’s best and worst picks, and how their sales timed the market.</span><button class="pcta sm" data-gopro>Try Pro free for 14 days</button></div></div>`}</section>
   <div class="cap">Each purchase counts from its trade-date closing price to the latest close, weighted by the middle of the reported dollar range, and is compared with SPY (an S&amp;P 500 fund) over exactly the same days. Trades without a stock ticker (funds, bonds, private companies) aren’t included. Past results say nothing about future ones, and none of this is investment advice.</div></div>`;
}
function perfCard(m){
  const r=PRO2.perf&&PRO2.perf.m&&PRO2.perf.m[m.id];
  if(!r||!(r.n||r.sn))return '';
  const pro=isPro();
  const pick=x=>`<span class="pkrow"><b>${esc(x[0])}</b><span>${fmtISO(x[1])}</span><em class="${x[2]>=0?'up':'dn'}">${pctS(x[2])}</em></span>`;
  const body=r.n?`<div class="bigline"><b class="${r.ex>=0?'up':'dn'}">${pctS(r.ret)}</b><span>average return on ${r.n} purchase${r.n===1?'':'s'}, vs ${pctS(r.spx)} for the S&amp;P 500 over the same days. ${r.beat!=null?`${pct(r.beat)} of the picks beat the index.`:''}</span></div>`:'';
  const detail=pro?`${(r.best||[]).length?`<div class="pkcols"><div><h4>Best picks</h4>${r.best.map(pick).join('')}</div><div><h4>Worst picks</h4>${(r.worst||[]).length?r.worst.map(pick).join(''):'<span class="s">—</span>'}</div></div>`:''}
    ${r.sn?`<p class="s" style="margin:12px 0 0;color:var(--soft)">After their ${r.sn} sale${r.sn===1?'':'s'}, those stocks moved ${pctS(r.sret)} on average (the S&amp;P 500 moved ${pctS(r.sspx)}). ${r.sret<r.sspx?'They mostly sold before the stocks lagged the market.':'The stocks they sold mostly kept up with or beat the market.'}</p>`:''}`
    :`<button class="row plain" data-gopro style="grid-template-columns:1fr auto;margin-top:6px"><span><span class="t">See their best and worst picks</span><br><span class="s">And how their sales timed the market</span></span>${proBadge}</button>`;
  return `<section class="sec" data-perfcard><div class="sh"><h2>Stock picks vs the S&amp;P 500</h2><button data-goperf>All members</button></div><div class="group pad">${body}${detail}</div>
   <div class="cap">Purchases since January 2025, from the trade-date close to the latest close (${fmtISO(PRO2.perf.asOf)}), weighted by the reported dollar range. Not investment advice.</div></section>`;
}

/* ---------- your stocks in Congress ---------- */
function myStocksPage(){
  const pro=isPro(),mine=S.stocks||[];
  if(!PRO2.all&&!PRO2.allLoading&&pro)loadAllTrades().then(()=>{if(S.stack.at(-1)==='mystocks')render()});
  const all=tradesSince2025();
  const by={};all.forEach(([m,t])=>{(by[t[2]]=by[t[2]]||[]).push([m,t])});
  const card=tk=>{
    const ts=(by[tk]||[]).sort((a,b)=>b[1][0].localeCompare(a[1][0]));
    if(!ts.length)return `<div class="group pad mst"><div class="msh"><b>${esc(tk)}</b><span>No trades by members of Congress since January 2025</span></div></div>`;
    const who=new Set(ts.map(x=>x[0].id)),buys=ts.filter(x=>x[1][1]==='Buy').length,sells=ts.filter(x=>/^Sell/.test(x[1][1])).length;
    return `<div class="group mst"><button class="row plain msh" data-stock="${esc(tk)}" style="grid-template-columns:1fr auto"><span><b>${esc(tk)}</b><br><span class="s">${who.size} member${who.size===1?'':'s'} · ${buys} buy${buys===1?'':'s'}, ${sells} sale${sells===1?'':'s'} since Jan 2025</span></span>${chev}</button>
     ${ts.slice(0,4).map(([m,t])=>`<button class="row" data-p="${m.id}">${face(m,36)}<span style="min-width:0"><span class="t">${esc(m.name)} ${/^Sell/.test(t[1])?'sold':t[1]==='Buy'?'bought':'traded'}</span><br><span class="s">${fmtISO(t[0])}${t[6]&&t[6]!=='Self'?' · '+esc(t[6]):''}</span></span><span class="val">${M(t[4])}–${M(t[5]||t[4])}</span></button>`).join('')}</div>`;
  };
  const traded=mine.filter(t=>by[t]).length;
  return `${pageHead('Your stocks')}<div class="wrap" style="padding-top:calc(var(--navh) + 10px)">
   <div class="phead lbanner bg-dusk"><span class="pkick">${PI.bag} Pro</span><h1>Does Congress own what you own?</h1><p>Add the stocks you hold. See who in Congress trades them, and get an email when someone does.</p></div>
   <section class="sec"><div class="group pad"><form class="wadd" id="wadd"><input id="wtick" placeholder="Add a ticker, like AAPL" autocomplete="off" autocapitalize="characters" maxlength="8" aria-label="Stock ticker"><button type="submit">Add</button></form>
    ${mine.length?`<p class="s" style="margin:10px 0 0;color:var(--soft)">${traded} of your ${mine.length} stock${mine.length===1?'':'s'} ${traded===1?'was':'were'} traded by members of Congress since January 2025.</p>`:''}</div></section>
   ${pro?mine.map(card).join(''):`<section class="sec"><div class="group pad" style="text-align:center"><span class="pfi" style="margin:0 auto 8px">${PI.lock}</span><p style="margin:0 0 12px"><b>Part of Pro.</b> Add your stocks, see who in Congress trades them, and get an email when someone does.</p><button class="pcta sm" data-gopro>Try Pro free for 14 days</button></div></section>`}
   <div class="cap">From House and Senate trade reports. Members report trades in ranges, up to 45 days after the trade. We only keep the tickers you add; nothing about your actual holdings or amounts.</div></div>`;
}

/* ---------- downloads ---------- */
const DL_SETS=[['members','Members of Congress','Money raised, small-donor share, trades, missed votes, party loyalty'],['trades','Every stock trade','All trades reported since January 2025'],
 ['pacs','PACs','Every PAC, its type and what it has given'],['lobbying','Lobbying clients','Who lobbies, how much they spend, top issues'],['companies','Companies','Lobbying, PAC giving and Congress trades per company'],['bills','Bills this Congress','Status, sponsor, topic and lobbying count']];
function downloadsSection(){
  return `<section class="sec"><div class="sh"><h2>Download the data</h2>${isPro()?'':proBadge}</div><div class="group">${DL_SETS.map(([k,t,s])=>`<button class="row plain" data-csv="${k}" style="grid-template-columns:auto 1fr auto"><span class="pfi sm">${PI.down}</span><span><span class="t">${t}</span><br><span class="s">${s}</span></span>${chev}</button>`).join('')}</div><div class="cap">CSV files open in Excel, Google Sheets or Numbers. Member profiles also have their donors and votes.</div></section>`;
}
const day0=()=>new Date().toISOString().slice(0,10);
async function lightKind(k){return SB.rpc('get_light',{kind:k})}
async function doCsv2(kind){
  const d=day0(),name=s=>'capitol-receipts-'+s+'-'+d;
  if(kind==='members')return csvDownload(name('members'),['Name','Party','State','Chamber','District','In Congress since','Age','Raised 2025-26','Cash on hand','Small-donor share','PAC share','Top industry','Stock trades since 2025','Trades tied to committees','Votes missed','Voted with party','Ex-staff now lobbyists','Next election'],
    MEM.map(m=>[m.name,m.party,m.state,m.chamber,m.district||'',m.since,m.age,m.money?.rec||'',m.money?.coh??'',m.smallShare!=null?(m.smallShare*100).toFixed(1)+'%':'',m.pacShare!=null?(m.pacShare*100).toFixed(1)+'%':'',m.topInd||'',m.tradeN,m.commTrades,m.missed!=null?(m.missed*100).toFixed(1)+'%':'',m.unity!=null?(m.unity*100).toFixed(1)+'%':'',m.revN,m.next||'']));
  if(kind==='trades'){toast('Preparing your download…');await loadAllTrades();return csvDownload(name('all-trades'),TH,(PRO2.all||allTrades()).map(([m,t])=>trow(m,t)))}
  toast('Preparing your download…');
  if(kind==='pacs'){const p=await lightKind('pacs');return csvDownload(name('pacs'),['PAC','Full name','Type','Given (all years)','To Democrats','To Republicans','To others','Recipients','Years active'],Object.values(p).map(r=>[r.n,r.fn||r.n,r.cat||'',r.tot||0,r.sp?.D||0,r.sp?.R||0,Object.entries(r.sp||{}).filter(([k])=>k!=='D'&&k!=='R').reduce((a,[,v])=>a+v,0),r.nr||'',(r.yrs||[]).join('–')]))}
  if(kind==='lobbying'){const p=await lightKind('lobby_clients');return csvDownload(name('lobbying-clients'),['Client','Lobbying spending','Lobbyists','Top issues'],Object.values(p).sort((a,b)=>(b.spend||0)-(a.spend||0)).map(r=>[r.n,r.spend||0,r.nlob||'',(r.iss||[]).map(x=>x[0]).join(' ')]))}
  if(kind==='companies'){const rows=await SB.all('companies?select=name,tickers,data->>lobS,data->>pacT,data->>trN&order=score.desc');return csvDownload(name('companies'),['Company','Tickers','Lobbying spending','PAC giving to Congress','Congress trades since 2025'],rows.map(r=>[r.name,(r.tickers||[]).join(' '),r.lobS||'',r.pacT||'',r.trN||'']))}
  if(kind==='bills'){const b=await lightKind('bills');return csvDownload(name('bills-119'),['Bill','Title','Sponsor','Introduced','Topic','Status','Groups lobbying','Link'],Object.entries(b).filter(([k])=>k.startsWith('119-')).map(([k,x])=>{const p=bkParse(k),ms=x[10]||{};return [p.label,x[1]||x[0],x[3]||'',x[4]||'',x[7]||'',ms.L?'Law':ms.V?'Vetoed':ms.P?'Sent to President':ms.H&&ms.S?'Passed both chambers':ms.H?'Passed House':ms.S?'Passed Senate':'Introduced',DATA.bills[p.dk]?.n||'',`https://app.capitolreceipts.com/bill/${k}`]}))}
  if(kind.startsWith('money:')){const m=byId[kind.slice(6)];if(!m)return;const rows=[];
    (m.industries||[]).forEach(r=>rows.push(['Industry',r[0],r[1]+(r[2]||0)]));(m.pacs||[]).forEach(r=>rows.push(['PAC',r[0],r[1]]));(m.employers||[]).forEach(r=>rows.push(['Donor employer',r[0],r[1]]));(m.pacCats||[]).forEach(r=>rows.push(['PAC type',r[0],r[1]]));
    return csvDownload(name(m.last.toLowerCase().replace(/\W+/g,'-')+'-money'),['Kind','Name','Amount'],rows)}
  if(kind.startsWith('votes:')){const m=byId[kind.slice(6)];if(!m)return;
    return csvDownload(name(m.last.toLowerCase().replace(/\W+/g,'-')+'-votes'),['Date','Chamber','Question','Bill','Result','Their vote','With their party'],(m.recent||[]).map(([rid,cast,wp])=>{const r=DATA.rc[rid]||{};return [r.d||'',m.chamber,r.s||r.q||'',r.b||'',`${r.res||''} ${r.y??''}-${r.n??''}`.trim(),cast,wp===false?'No':wp?'Yes':'']}))}
}
const _doCsv1=doCsv;
doCsv=function(kind){
  if(!isPro())return needPro('Downloading data is part of Pro.');
  track('download_data',{kind:String(kind).split(':')[0]});
  if(/^(members|trades|pacs|lobbying|companies|bills|money:|votes:)/.test(kind))return doCsv2(kind).catch(e=>{console.warn(e);toast('That download didn’t work. Try again in a moment.')});
  return _doCsv1(kind);
};

/* ---------- alert settings (Pro options) ---------- */
alertSheet=function(){
  if(!signedIn())return authSheet('in','Sign in to set up alerts.');
  const al=Object.assign({trades:true,votes:true,money:true,radar:true,email:false,instant:true,bills:true,briefing:true},ACCT.alerts||{}),pro=isPro();
  const sw=[['email',pro?'Email me when there’s news':'Email me a weekly summary',1],['trades','New stock trades by people I follow',1],['votes','Missed votes by people I follow',1],
    ['instant','Send within hours of a filing (off: once a day)',0],['bills','Updates on bills I watch',0],['radar','Conflict radar: committee-linked trades and trades over $250K',0],['briefing','Weekly briefing on Fridays',0]];
  openSheet('Alerts',`<div class="group">${sw.map(([k,l,free])=>`<label class="row plain" style="grid-template-columns:1fr auto"><span>${l}${free||pro?'':' '+proBadge}</span><input class="sw" type="checkbox" ${free||pro?`data-alert="${k}"`:'data-needpro'} ${(free||pro)&&al[k]?'checked':''}></label>`).join('')}</div>
   <div class="cap">${pro?'Pro emails cover people you follow, stocks and bills you watch, and the conflict radar. We check for new reports several times each weekday.':'Free accounts get a weekly email about up to '+PRO.FREE_FOLLOWS+' people they follow. <button class="link inl" data-gopro>Pro</button> sends same-day alerts and adds watchlists, the conflict radar and the weekly briefing.'}</div>`);
};

/* ---------- Pro page additions ---------- */
const _proPage1=proPage;
proPage=function(){
  const tools=`<section class="sec"><div class="sh"><h2>Pro tools</h2></div><div class="group">
    <button class="row plain" data-goperf style="grid-template-columns:auto 1fr auto"><span class="pfi sm">${PI.chart}</span><span><span class="t">Who beats the market?</span><br><span class="s">Every member’s stock picks vs the S&amp;P 500</span></span>${chev}</button>
    <button class="row plain" data-gomystocks style="grid-template-columns:auto 1fr auto"><span class="pfi sm">${PI.bag}</span><span><span class="t">Your stocks in Congress</span><br><span class="s">Who trades the stocks you own</span></span>${chev}</button></div></section>`;
  return _proPage1().replace('<div class="cap">Prices in US dollars.',tools+(signedIn()?billsSection():'')+downloadsSection()+'<div class="cap">Prices in US dollars.');
};

/* ---------- wiring ---------- */
async function loadBillsPref(u){
  if(u&&ACCT.client){try{const r=await ACCT.client.from('user_prefs').select('bills').eq('user_id',u.id).maybeSingle();S.bills=r.data?.bills||[]}catch(e){S.bills=[]}}else S.bills=[];
  render();
}
if(typeof acctSet==='function'){const _acctSet2=acctSet;acctSet=async function(u){await _acctSet2(u);await loadBillsPref(u)};if(ACCT.user)loadBillsPref(ACCT.user)}
const _renderPro2=render;
render=function(){
  const cur=S.stack.at(-1)||'';
  if(cur==='perf'||cur==='mystocks'){
    if($('#sheet').hidden)$('#panel').className='panel';
    $('#app').innerHTML=cur==='perf'?perfPage():myStocksPage();
    $('#tabbar').innerHTML=TABS2.map(([k,l,svg])=>`<button data-tab="${k}" aria-current="${k===S.tab?'page':'false'}">${svg}${l}</button>`).join('');
    const pn=document.querySelector('#app .pnav .in');
    if(pn&&!pn.querySelector('[data-menu]')&&typeof MENU_ICON!=='undefined'){const b=document.createElement('span');b.className='pright';b.innerHTML=`<button data-menu aria-label="Menu">${MENU_ICON}</button>`;pn.appendChild(b)}
    if(!signedIn()&&TABS2.some(t=>t[0]==='signin'))$('#tabbar').querySelectorAll('[data-tab="signin"]').forEach(b=>{b.removeAttribute('data-tab');b.setAttribute('data-auth','in')});
    return;
  }
  _renderPro2();
  try{
    /* bill pages: watch button */
    if(cur.startsWith('bill:')&&!document.querySelector('#app [data-billbar]')){
      const k=cur.slice(5),on=(S.bills||[]).includes(k),g=document.querySelector('#app .wrap .glance');
      if(g)g.insertAdjacentHTML('afterend',`<div class="wbar" data-billbar><button class="wbtn${on?' on':''}" ${on?`data-unwatchbill="${esc(k)}"`:`data-watchbill="${esc(k)}"`}>${PI.doc}<span>${on?'Watching this bill':'Watch this bill'}</span>${isPro()?'':proBadge}</button></div>`);
    }
    /* member profiles: stock picks card, money and votes downloads */
    const m=cur&&byId[cur];
    if(m){
      if(!PRO2.perf&&!PRO2.perfErr)loadPerf();
      const anchor=document.querySelector('#app [data-csvrow]')||document.querySelector('#app [data-placelinks]')||document.querySelector('#app .note');
      if(anchor&&PRO2.perf&&!document.querySelector('#app [data-perfcard]')){const c=perfCard(m);if(c)anchor.insertAdjacentHTML('beforebegin',c)}
      const row=document.querySelector('#app [data-csvrow] .group');
      if(row&&!row.querySelector('[data-csv^="money:"]'))row.insertAdjacentHTML('beforeend',`<button class="row plain" data-csv="money:${m.id}" style="grid-template-columns:auto 1fr auto"><span class="pfi sm">${PI.down}</span><span><span class="t">Download their donors</span><br><span class="s">Industries, PACs and donor employers</span></span>${isPro()?chev:proBadge}</button><button class="row plain" data-csv="votes:${m.id}" style="grid-template-columns:auto 1fr auto"><span class="pfi sm">${PI.down}</span><span><span class="t">Download their recent votes</span><br><span class="s">How they voted, and whether it was with their party</span></span>${isPro()?chev:proBadge}</button>`);
    }
  }catch(e){console.warn(e)}
};
const _drawer2=drawerHtml;
drawerHtml=function(){return _drawer2().replace(/(<button class="ditem big" data-go="radar">[\s\S]*?<\/button>)/,`$1<button class="ditem big" data-go="perf">${PI.chart}<span>Stock picks vs the market</span></button>`)};
const _navGo2=navGo;
navGo=function(gk){if(gk==='perf'||gk==='mystocks'){closeDrawer();$('#sheet').hidden=true;S.stack=[];S.tab='more';S.limit=60;go(gk);return}_navGo2(gk)};
window.addEventListener('click',e=>{
  const g=s=>e.target.closest(s);let el;
  if(el=g('[data-watchbill]')){e.preventDefault();e.stopImmediatePropagation();watchBill(el.dataset.watchbill);return}
  if(el=g('[data-unwatchbill]')){e.preventDefault();e.stopImmediatePropagation();unwatchBill(el.dataset.unwatchbill);return}
  if(g('[data-goperf]')){e.preventDefault();e.stopImmediatePropagation();$('#sheet').hidden=true;S.limit=60;go('perf');return}
  if(g('[data-gomystocks]')){e.preventDefault();e.stopImmediatePropagation();$('#sheet').hidden=true;go('mystocks');return}
  if(el=g('[data-psort]')){e.preventDefault();e.stopImmediatePropagation();PRO2.psort=el.dataset.psort;S.limit=60;render();return}
  if(el=g('[data-pch]')){e.preventDefault();e.stopImmediatePropagation();PRO2.pch=el.dataset.pch;S.limit=60;render();return}
  if(g('[data-bills-go]')){e.preventDefault();e.stopImmediatePropagation();navGo('bills:search');return}
  if(g('[data-bills-lobbied]')){e.preventDefault();e.stopImmediatePropagation();navGo('bills:lobbied');return}
},true);
/* links that reopen a screen: ?go=perf, ?go=mystocks, ?go=industries ... */
(function(){
  let q=null;try{q=new URLSearchParams(location.search).get('go');const pm=/^\/go\/([^/]+)/.exec(location.pathname);if(pm)q=decodeURIComponent(pm[1])}catch(e){}
  if(!q||!/^[a-z]+(:[\w.:%-]*)?$/i.test(q))return; /* any app screen (shared links use ?go=<screen>) */
  try{const u=new URL(location.href);u.searchParams.delete('go');if(!/^\/go\//.test(u.pathname))history.replaceState(null,'',u.pathname+u.search+u.hash)}catch(e){}
  const t0=Date.now(),iv=setInterval(()=>{if((typeof byId!=='undefined'&&byId&&Object.keys(byId).length&&!window.__HOLD)||Date.now()-t0>20000){clearInterval(iv);if(/^(rank|f|hist|lobbying|committees|bills|party):/.test(q)&&typeof navGo==='function'){navGo(q);return}S.stack=[];S.tab='more';go(q)}},150);
})();
