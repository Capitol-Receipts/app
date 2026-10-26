/* ================= Capitol Receipts Pro =================
Records stay free for everyone. Pro is the early-warning system on top:
daily alerts, a stock watchlist, the conflict radar across all of Congress, unlimited follows and CSV downloads.
Who has Pro lives in the database (subscriptions); the 14-day free trial runs through Stripe Checkout and needs a card. */
const PRO={price:{m:5.99,y:39.99},cycle:'y',feed:null,feedErr:null,rmode:'all',FREE_FOLLOWS:5,BIG:250001};
const isPro=()=>!!(ACCT.plan&&ACCT.plan.pro);
const PRO_FEATS=[
 ['bell','Daily alerts','An email the morning a trade report is filed. Free accounts get a weekly summary.'],
 ['eye','Stock watchlist','Pick any stocks. We tell you when anyone in Congress trades them.'],
 ['radar','Conflict radar','Every trade tied to a member’s own committees, plus every trade over $250K, across all of Congress.'],
 ['users','Unlimited follows',`Free accounts follow up to ${PRO.FREE_FOLLOWS} people.`],
 ['down','Download the data','CSV files of any trade list, ready for a spreadsheet.']];
const PI={
 bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
 eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
 radar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 18.5 5.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
 users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 19.5c.9-3 3.4-4.6 6.5-4.6s5.6 1.6 6.5 4.6"/><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.6c1.6.7 2.6 2.2 3 4.9"/></svg>',
 down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/></svg>',
 lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>',
 star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/></svg>'};
const proBadge='<span class="probadge">PRO</span>';
const daysLeft=iso=>Math.max(0,Math.ceil((new Date(iso)-Date.now())/864e5));

/* ---------- plan: load, trial, checkout ---------- */
async function loadPlan(){
  if(!ACCT.user||!ACCT.client){ACCT.plan=null;return}
  try{const {data,error}=await ACCT.client.rpc('my_plan');if(error)throw error;ACCT.plan=data}catch(e){console.warn('plan',e);ACCT.plan=null}
}
async function startTrial(){
  if(!signedIn())return authSheet('up','Create a free account, then start your 14-day free trial of Pro.');
  return billing('checkout',true);
}
async function billing(action,trial){
  if(!signedIn())return authSheet('up','Create a free account first, then pick your plan.');
  if(PRO.busy)return;PRO.busy=true;
  const msg=$('#promsg'),what=action==='portal'?'Your billing page':'Checkout';if(msg)msg.textContent=action==='portal'?'Opening your billing page…':'Opening secure checkout…';
  try{
    const {data:{session}}=await ACCT.client.auth.getSession();
    if(!session){if(msg)msg.textContent='';return authSheet('in','Your sign-in expired. Sign in again to continue.')}
    let ga={cid:'',sid:''};
    if(action==='checkout'){const v=PRO.cycle==='m'?PRO.price.m:PRO.price.y;track('begin_checkout',{currency:'USD',value:v,trial:!!trial,items:[{item_id:'pro_'+(PRO.cycle==='m'?'monthly':'yearly'),item_name:'Capitol Receipts Pro',price:v,quantity:1}]});try{ga=await gaIds()}catch(e){}}
    else track('manage_billing');
    const r=await fetch(SB.url+'/functions/v1/billing',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB.key,Authorization:'Bearer '+session.access_token},body:JSON.stringify({action,trial:!!trial,cycle:PRO.cycle,back:location.origin+'/?go=pro',ga_cid:ga.cid,ga_sid:ga.sid})});
    const j=await r.json().catch(()=>({}));
    if(j.url){PRO.leaving=true;location.href=j.url;return}
    if(r.status===401||j.error==='sign_in'){if(msg)msg.textContent='';return authSheet('in','Your sign-in expired. Sign in again to continue.')}
    if(msg)msg.textContent=j.error==='not_configured'?'Card payments are being switched on. Try again shortly.':j.error==='no_billing'?'There’s no card billing on this account yet.':what+' didn’t open. Try again in a moment.';
  }catch(e){console.warn(e);if(msg)msg.textContent=what+' didn’t open. Try again in a moment.'}
  finally{if(!PRO.leaving)PRO.busy=false;else setTimeout(()=>{PRO.busy=false;PRO.leaving=false},8000)}
}
function toast(t){let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.className='toast';document.body.appendChild(el)}el.textContent=t;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),3600)}

/* ---------- plan picker (used on the Pro page and in the upgrade sheet) ---------- */
function planPicker(){
  const p=ACCT.plan||{},used=!!p.trial_used,y=PRO.cycle==='y';
  const mo=(PRO.price.y/12).toFixed(2),save=Math.round((1-PRO.price.y/(PRO.price.m*12))*100);
  return `<div class="ppick"><div class="pplans" role="radiogroup" aria-label="Billing">
    <button role="radio" data-cycle="y" aria-checked="${y}"><span class="pn">Yearly <em>Save ${save}%</em></span><b>$${PRO.price.y}<small>/year</small></b><span class="ps">$${mo} a month</span></button>
    <button role="radio" data-cycle="m" aria-checked="${!y}"><span class="pn">Monthly</span><b>$${PRO.price.m}<small>/month</small></b><span class="ps">Cancel anytime</span></button></div>
   ${used?`<button class="pcta" data-billing="checkout">Subscribe · $${y?PRO.price.y+'/year':PRO.price.m+'/month'}</button>`:`<button class="pcta" data-protrial>Start your free trial</button>`}
   <div class="pfine" id="promsg" role="status">${used?'Secure checkout. Cancel anytime.':`14 days free, then $${y?PRO.price.y+' a year':PRO.price.m+' a month'}. Card required; you won’t be charged if you cancel during your free trial.`}</div></div>`;
}
function featList(){return `<div class="pfeats">${PRO_FEATS.map(([i,t,d])=>`<div class="pfeat"><span class="pfi">${PI[i]}</span><span><b>${t}</b><span>${d}</span></span></div>`).join('')}</div>`}
function needPro(why){
  track('view_promotion',{promotion_id:'pro',promotion_name:String(why||'').slice(0,90)});
  if(!signedIn())return authSheet('up',why+' Create a free account, then try Pro free for 14 days.');
  openSheet('Capitol Receipts Pro',`<div class="psheet"><p class="pwhy">${esc(why)}</p>${planPicker()}${featList()}<p class="pfine">Every record stays free. Pro adds the alerts and tools on top.</p></div>`);
}

/* ---------- Pro page ---------- */
function proStatus(){
  const p=ACCT.plan;if(!p||!p.pro)return '';
  const trial=p.status==='trialing';
  return `<div class="pstat"><span class="pstat-ic">${PI.star}</span><span><b>${trial?`Pro free trial · ${daysLeft(p.trial_ends)} day${daysLeft(p.trial_ends)===1?'':'s'} left`:'You have Pro'}</b><span>${trial?'Pick a plan any time to keep it after your trial.':p.period_end?`Renews ${fmtISO(String(p.period_end).slice(0,10))}`:'Thanks for supporting nonpartisan records.'}</span></span>${p.billing?'<button class="link" data-billing="portal">Manage</button>':''}</div>`;
}
function topTickers(n){const c={};(typeof allTrades==='function'?allTrades():[]).forEach(([m,t])=>{if(t[2])c[t[2]]=(c[t[2]]||0)+1});return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,n).map(x=>x[0])}
function watchSection(){
  const mine=S.stocks||[];
  const sugg=topTickers(10).filter(t=>!mine.includes(t)).slice(0,6);
  return `<section class="sec"><div class="sh"><h2>Stocks you watch</h2>${isPro()?'':proBadge}</div><div class="group pad">
    <form class="wadd" id="wadd"><input id="wtick" placeholder="Add a ticker, like NVDA" autocomplete="off" autocapitalize="characters" maxlength="8" aria-label="Stock ticker"><button type="submit">Add</button></form>
    ${mine.length?`<div class="wchips">${mine.map(t=>`<span class="wchip"><button class="wgo" data-stock="${esc(t)}">${esc(t)}</button><button class="wx" data-unwatch="${esc(t)}" aria-label="Stop watching ${esc(t)}">×</button></span>`).join('')}</div>`:'<p class="s" style="margin:10px 0 0;color:var(--soft);font-size:14px">You’ll get an alert when any member of Congress trades a stock on this list.</p>'}
    ${sugg.length?`<div class="wsugg"><span>Most traded in Congress:</span>${sugg.map(t=>`<button data-watch="${esc(t)}">+ ${esc(t)}</button>`).join('')}</div>`:''}</div></section>`;
}
function proPage(){
  const pro=isPro(),p=ACCT.plan||{};
  return `${pageHead('Pro')}<div class="wrap" style="padding-top:calc(var(--navh) + 10px)">
   <div class="phead lbanner bg-dusk"><span class="pkick">${PI.star} Capitol Receipts Pro</span><h1>Know the day it’s filed.</h1><p>Every record stays free. Pro watches Congress for you and tells you what changed.</p></div>
   ${pro?proStatus():''}
   ${!pro||p.status==='trialing'?`<section class="sec"><div class="pcard">${planPicker()}</div></section>`:''}
   <section class="sec"><div class="sh"><h2>What you get</h2></div>${featList()}</section>
   <section class="sec"><div class="group"><button class="row plain" data-radar style="grid-template-columns:auto 1fr auto"><span class="pfi sm">${PI.radar}</span><span><span class="t">Open the conflict radar</span><br><span class="s">Newly reported trades worth a second look</span></span>${chev}</button>
    <button class="row plain" data-alertset style="grid-template-columns:auto 1fr auto"><span class="pfi sm">${PI.bell}</span><span><span class="t">Alert settings</span><br><span class="s">${ACCT.alerts?.email?(pro?'Daily emails are on':'Weekly emails are on'):'Emails are off'}</span></span>${chev}</button></div></section>
   ${signedIn()?watchSection():''}
   <div class="cap">Prices in US dollars. Cancel anytime from this page. Members report trades in ranges, up to 45 days after the trade; a committee link means the company’s industry falls under a committee the member sits on, which isn’t proof of wrongdoing.</div>
  </div>`;
}

/* ---------- conflict radar ---------- */
async function loadFeed(force){
  if(PRO.feed&&!force)return;
  try{PRO.feed=await SB.get('trade_feed?select=member_id,name,party,state,chamber,district,tdate,kind,ticker,asset,lo,hi,owner,comm,first_seen&or=(comm.not.is.null,hi.gte.'+PRO.BIG+')&order=first_seen.desc,tdate.desc&limit=400');PRO.feedErr=null}
  catch(e){PRO.feedErr=String(e.message||e);PRO.feed=null}
  render();
}
const verb=k=>/Sell/i.test(k)?'sold':/Exchange/i.test(k)?'exchanged':'bought';
const assetName=t=>{let a=(t.asset||t.ticker||'stock').split(' - ')[0].replace(/\s*\(The\)/i,'').replace(/\s*\([A-Z.\-]{1,8}\)\s*$/,'').replace(/\b(New\s+)?(Common|Ordinary|Class [A-Z]|Series [A-Z])\b.*$/i,'').replace(/[,\s]+(Inc|Corp|Corporation|Co|Ltd|plc|Incorporated|Holdings|Company)\.?\s*$/i,'').replace(/[,\s]+(Inc|Corp|Corporation|Co|Ltd|plc)\.?\s*$/i,'').trim();return (a||t.ticker||'stock').slice(0,48)};
function radarRow(t){
  const m=byId[t.member_id];
  const who=m?m.name:t.name;
  return `<button class="row rrow" data-p="${esc(t.member_id)}">${m?face(m,40):`<span class="av ${esc((t.party||'N')[0])}" style="width:40px;height:40px">${esc((t.name||'?')[0])}</span>`}
   <span style="min-width:0"><span class="t">${esc(who)} ${verb(t.kind)} ${esc(assetName(t))}${t.ticker?` <span class="tk">${esc(t.ticker)}</span>`:''}</span><br>
   <span class="s">Reported ${fmtISO(String(t.first_seen).slice(0,10))} · traded ${fmtISO(t.tdate)}${t.owner&&t.owner!=='Self'?' · '+esc(t.owner):''}</span>
   ${t.comm?`<span class="rflag">Their committee oversees ${esc(t.comm.toLowerCase())}</span>`:''}</span>
   <span class="val">${M(+t.lo)}–${M(+t.hi)}</span></button>`;
}
function radarPage(){
  if(!PRO.feed&&!PRO.feedErr){loadFeed();return `${pageHead('Conflict radar')}<div class="wrap" style="padding-top:calc(var(--navh) + 10px)"><div class="calm">Loading the radar…</div></div>`}
  const all=PRO.feed||[];
  const list=all.filter(t=>PRO.rmode==='comm'?t.comm:PRO.rmode==='big'?+t.hi>=PRO.BIG:true);
  const wk=all.filter(t=>Date.now()-new Date(t.first_seen)<30*864e5).length;
  const pro=isPro(),shown=pro?list.slice(0,S.limit||60):list.slice(0,3);
  const modes=[['all','Everything flagged'],['comm','Committee-linked'],['big','Over $250K']];
  return `${pageHead('Conflict radar')}<div class="wrap" style="padding-top:calc(var(--navh) + 10px)">
   <div class="phead lbanner bg-capitol"><span class="pkick">${PI.radar} Conflict radar ${pro?'':proBadge}</span><h1>Trades worth a second look</h1><p>Newly reported trades by members of Congress in industries their own committees oversee, and every trade over $250K.</p></div>
   <div class="glance rglance">${glance('Last 30 days',ord(wk),'newly flagged',false)}${glance('Committee-linked',ord(all.filter(t=>t.comm).length),'in the radar',false)}${glance('Over $250K',ord(all.filter(t=>+t.hi>=PRO.BIG).length),'in the radar',false)}</div>
   <div class="rbar"><div class="rseg" role="group">${modes.map(([k,l])=>`<button data-rmode="${k}" aria-pressed="${k===PRO.rmode}">${l}</button>`).join('')}</div><button class="rcsv" data-csv="radar">${PI.down}<span>CSV</span></button></div>
   ${PRO.feedErr?`<div class="calm">Couldn’t load the radar. Try reloading.</div>`:`<div class="group" style="margin-top:10px">${shown.map(radarRow).join('')||'<div class="empty">Nothing flagged yet.</div>'}</div>
   ${pro?(list.length>(S.limit||60)?`<button class="more" data-more>Show ${Math.min(list.length-(S.limit||60),100)} more</button>`:''):`<div class="plock"><div class="pblur" aria-hidden="true">${list.slice(3,6).map(radarRow).join('')}</div><div class="plockin"><span class="pfi">${PI.lock}</span><b>${ord(Math.max(0,list.length-3))} more on the radar</b><span>Pro shows the full radar and emails you new flags the morning they’re filed.</span><button class="pcta sm" data-gopro>Try Pro free for 14 days</button></div></div>`}`}
   <div class="cap">From House and Senate periodic transaction reports. "Reported" is the day the filing showed up in public records. A committee link means the company’s industry falls under a committee the member sits on; it isn’t proof of wrongdoing.</div>
  </div>`;
}

/* ---------- CSV downloads ---------- */
function csvDownload(name,head,rows){
  const q=v=>{v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const blob=new Blob([[head,...rows].map(r=>r.map(q).join(',')).join('\n')],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name+'.csv';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
const TH=['Date traded','Member','Party','State','Chamber','Type','Ticker','Asset','Low','High','Owner','Committee-linked industry'];
const trow=(m,t)=>[t[0],m.name,m.party,m.state,m.chamber,t[1],t[2],t[3],t[4],t[5],t[6],t[7]||''];
function doCsv(kind){
  if(!isPro())return needPro('Downloading data is part of Pro.');
  track('download_data',{kind:String(kind).split(':')[0]});
  const day=new Date().toISOString().slice(0,10);
  if(kind==='radar')return csvDownload('capitol-receipts-radar-'+day,['Reported','Date traded','Member','Party','State','Chamber','Type','Ticker','Asset','Low','High','Owner','Committee-linked industry'],(PRO.feed||[]).map(t=>[String(t.first_seen).slice(0,10),t.tdate,t.name,t.party,t.state,t.chamber,t.kind,t.ticker,t.asset,t.lo,t.hi,t.owner,t.comm||'']));
  if(kind.startsWith('stock:')){const tk=kind.slice(6);return csvDownload('capitol-receipts-'+tk+'-trades-'+day,TH,allTrades().filter(([m,t])=>t[2]===tk).map(([m,t])=>trow(m,t)))}
  if(kind.startsWith('member:')){const m=byId[kind.slice(7)];if(m)return csvDownload('capitol-receipts-'+m.last.toLowerCase().replace(/\W+/g,'-')+'-trades-'+day,TH,(m.trades||[]).map(t=>trow(m,t)))}
}

/* ---------- watchlist ---------- */
function saveStocks(){if(ACCT.user&&ACCT.client)ACCT.client.from('user_prefs').upsert({user_id:ACCT.user.id,stocks:S.stocks,following:[...S.following]}).then(({error})=>{if(error){console.warn(error);saveFailed()}})}
function watch(t){
  t=(t||'').toUpperCase().replace(/[^A-Z.\-]/g,'').slice(0,8);if(!t)return;
  if(!isPro())return needPro('The stock watchlist is part of Pro. We’ll email you when anyone in Congress trades the stocks you pick.');
  S.stocks=S.stocks||[];if(!S.stocks.includes(t)){S.stocks.push(t);saveStocks();track('add_to_watchlist',{ticker:t});toast(`Watching ${t}. You’ll get an email when a member of Congress trades it.`)}render();
}
function unwatch(t){S.stocks=(S.stocks||[]).filter(x=>x!==t);saveStocks();render()}

/* ---------- wiring into the app ---------- */
async function loadProState(u){
  if(u&&ACCT.client){try{const r=await ACCT.client.from('user_prefs').select('stocks').eq('user_id',u.id).maybeSingle();S.stocks=r.data?.stocks||[]}catch(e){S.stocks=[]}}
  else S.stocks=[];
  await loadPlan();render();
}
if(typeof acctSet==='function'){
  const _acctSetP=acctSet;
  acctSet=async function(u){await _acctSetP(u);await loadProState(u)};
  if(ACCT.user)loadProState(ACCT.user);
}
const _renderPro=render;
render=function(){
  const cur=S.stack.at(-1)||'';
  if(cur==='pro'||cur==='radar'){
    if($('#sheet').hidden)$('#panel').className='panel';
    $('#app').innerHTML=cur==='pro'?proPage():radarPage();
    $('#tabbar').innerHTML=TABS2.map(([k,l,svg])=>`<button data-tab="${k}" aria-current="${k===S.tab?'page':'false'}">${svg}${l}</button>`).join('');
    const pn=document.querySelector('#app .pnav .in');
    if(pn&&!pn.querySelector('[data-menu]')&&typeof MENU_ICON!=='undefined'){const b=document.createElement('span');b.className='pright';b.innerHTML=`<button data-menu aria-label="Menu">${MENU_ICON}</button>`;pn.appendChild(b)}
    if(!signedIn()&&TABS2.some(t=>t[0]==='signin'))$('#tabbar').querySelectorAll('[data-tab="signin"]').forEach(b=>{b.removeAttribute('data-tab');b.setAttribute('data-auth','in')});
    return;
  }
  _renderPro();
  try{
    /* stock pages: watch + download */
    if(cur.startsWith('stock:')&&!document.querySelector('#app [data-watchbar]')){
      const tk=cur.slice(6),on=(S.stocks||[]).includes(tk),g=document.querySelector('#app .wrap .glance');
      if(g)g.insertAdjacentHTML('afterend',`<div class="wbar" data-watchbar><button class="wbtn${on?' on':''}" ${on?`data-unwatch="${esc(tk)}"`:`data-watch="${esc(tk)}"`}>${PI.eye}<span>${on?'Watching':'Watch this stock'}</span>${isPro()?'':proBadge}</button><button class="wbtn ghost" data-csv="stock:${esc(tk)}">${PI.down}<span>Download trades</span>${isPro()?'':proBadge}</button></div>`);
    }
    /* member profiles: download their trades */
    const m=cur&&byId[cur];
    if(m&&(m.trades||[]).length&&!document.querySelector('#app [data-csvrow]')){
      const n=document.querySelector('#app [data-placelinks]')||document.querySelector('#app .note');
      if(n)n.insertAdjacentHTML('beforebegin',`<section class="sec" data-csvrow><div class="group"><button class="row plain" data-csv="member:${m.id}" style="grid-template-columns:auto 1fr auto"><span class="pfi sm">${PI.down}</span><span><span class="t">Download their stock trades</span><br><span class="s">CSV for a spreadsheet</span></span>${isPro()?chev:proBadge}</button></div></section>`);
    }
    /* home: radar teaser */
    if(!S.stack.length&&S.tab==='home'&&!document.querySelector('#app [data-radarteaser]')){
      if(!PRO.feed&&!PRO.feedErr&&!PRO._loading){PRO._loading=1;loadFeed()}
      const wk=(PRO.feed||[]).filter(t=>Date.now()-new Date(t.first_seen)<30*864e5);
      const anchor=document.querySelector('#app .dash, #app .elhome, #app .wrap > .sec');
      if(anchor&&PRO.feed){const c=wk.filter(t=>t.comm).length;
        anchor.insertAdjacentHTML('beforebegin',`<button class="rteaser" data-radarteaser data-radar><span class="pfi">${PI.radar}</span><span><b>Conflict radar</b><span>${wk.length?`${ord(wk.length)} trades flagged in the last 30 days${c?`, ${c} tied to the member’s own committees`:''}`:'Trades tied to members’ own committees, and trades over $250K'}</span></span>${chev}</button>`)}
    }
  }catch(e){console.warn(e)}
};
/* menu and More page */
const _drawerPro=drawerHtml;
drawerHtml=function(){
  return _drawerPro().replace('<div class="dsec">',`<div class="dsec"><button class="ditem big" data-go="pro">${PI.star}<span>Capitol Receipts Pro</span><em>${isPro()?'On':'Try free'}</em></button><button class="ditem big" data-go="radar">${PI.radar}<span>Conflict radar</span></button>`);
};
const _navGoPro=navGo;
navGo=function(gk){if(gk==='pro'||gk==='radar'){closeDrawer();$('#sheet').hidden=true;S.stack=[];S.tab='more';S.limit=60;go(gk);return}_navGoPro(gk)};
const _morePro=more;
more=function(){
  const card=isPro()?`<div class="sec" style="margin-top:16px"><button class="procard on" data-gopro><span class="pfi">${PI.star}</span><span><b>Capitol Receipts Pro</b><span>${ACCT.plan.status==='trialing'?`Free week · ${daysLeft(ACCT.plan.trial_ends)} days left`:'Active'} · watchlist, radar and alerts</span></span>${chev}</button></div>`
   :`<div class="sec" style="margin-top:16px"><button class="procard" data-gopro><span class="pfi">${PI.star}</span><span><b>Try Pro free for 14 days</b><span>Daily alerts, a stock watchlist and the conflict radar. Then $${PRO.price.m}/month or $${PRO.price.y}/year.</span></span>${chev}</button></div>`;
  return _morePro().replace(/<div class="sec" style="margin-top:16px"><div class="plan">[\s\S]*?<\/div><\/div>/,card)
    .replace(/<div class="sec"><div class="sh"><h2>Notify me about<\/h2><\/div>[\s\S]*?<\/div><\/div>/,`<div class="sec"><div class="group"><button class="row plain" data-alertset style="grid-template-columns:1fr auto"><span>Alert settings</span>${chev}</button></div></div>`);
};
/* alerts sheet: Pro options */
alertSheet=function(){
  if(!signedIn())return authSheet('in','Sign in to set up alerts.');
  const al=Object.assign({trades:true,votes:true,money:true,radar:true,email:false},ACCT.alerts||{}),pro=isPro();
  const sw=[['trades','New stock trades by people I follow',1],['votes','Missed votes by people I follow',1],['radar','Conflict radar: committee-linked trades and trades over $250K',0],['email',pro?'Email me each morning there’s news':'Email me a weekly summary',1]];
  openSheet('Alerts',`<div class="group">${sw.map(([k,l,free])=>`<label class="row plain" style="grid-template-columns:1fr auto"><span>${l}${free||pro?'':' '+proBadge}</span><input class="sw" type="checkbox" ${free||pro?`data-alert="${k}"`:'data-needpro'} ${(free||pro)&&al[k]?'checked':''}></label>`).join('')}</div>
   <div class="cap">${pro?'Pro emails go out the morning new reports are filed, covering people you follow, stocks you watch and the conflict radar.':'Free accounts get a weekly email about up to '+PRO.FREE_FOLLOWS+' people they follow. <button class="link inl" data-gopro>Pro</button> sends alerts daily and adds your stock watchlist and the conflict radar.'}</div>`);
};
window.addEventListener('change',e=>{const el=e.target.closest('[data-needpro]');if(!el)return;e.stopImmediatePropagation();el.checked=false;needPro('The conflict radar is part of Pro.')},true);
window.addEventListener('submit',e=>{if(e.target.id==='wadd'){e.preventDefault();watch($('#wtick').value)}},true);
window.addEventListener('click',e=>{
  const g=s=>e.target.closest(s);let el;
  if(el=g('[data-cycle]')){e.preventDefault();e.stopImmediatePropagation();PRO.cycle=el.dataset.cycle;const pk=el.closest('.ppick');if(pk)pk.outerHTML=planPicker();return}
  if(g('[data-protrial]')){e.preventDefault();e.stopImmediatePropagation();startTrial();return}
  if(el=g('[data-billing]')){e.preventDefault();e.stopImmediatePropagation();billing(el.dataset.billing);return}
  if(g('[data-gopro]')){e.preventDefault();e.stopImmediatePropagation();$('#sheet').hidden=true;closeDrawer?.();S.stack=S.stack.filter(x=>x!=='pro');go('pro');return}
  if(g('[data-radar]')){e.preventDefault();e.stopImmediatePropagation();$('#sheet').hidden=true;S.limit=60;go('radar');return}
  if(el=g('[data-rmode]')){e.preventDefault();e.stopImmediatePropagation();PRO.rmode=el.dataset.rmode;S.limit=60;render();return}
  if(el=g('[data-csv]')){e.preventDefault();e.stopImmediatePropagation();doCsv(el.dataset.csv);return}
  if(el=g('[data-watch]')){e.preventDefault();e.stopImmediatePropagation();if(!signedIn())return authSheet('up','Create a free account, then try Pro free for 14 days to watch stocks.');watch(el.dataset.watch);return}
  if(el=g('[data-unwatch]')){e.preventDefault();e.stopImmediatePropagation();unwatch(el.dataset.unwatch);return}
  /* free accounts follow up to 5 people */
  if(signedIn()&&!isPro()&&(el=g('[data-follow]'))&&!S.following.has(el.dataset.follow)&&S.following.size>=PRO.FREE_FOLLOWS){e.preventDefault();e.stopImmediatePropagation();needPro(`Free accounts can follow ${PRO.FREE_FOLLOWS} people. Pro lets you follow as many as you like.`);return}
},true);
/* links from emails: ?go=pro or ?go=radar */
(function(){
  let q=null;try{q=new URLSearchParams(location.search).get('go')}catch(e){}
  if(q!=='pro'&&q!=='radar')return;
  try{const u=new URL(location.href);u.searchParams.delete('go');history.replaceState(null,'',u.pathname+u.search+u.hash)}catch(e){}
  const t0=Date.now(),iv=setInterval(()=>{if((typeof byId!=='undefined'&&byId&&Object.keys(byId).length&&!window.__HOLD)||Date.now()-t0>20000){clearInterval(iv);S.stack=[];S.tab='more';go(q)}},150);
})();
/* back from Stripe Checkout: wait for the subscription to land, then confirm */
(function(){
  let paid=null;try{paid=new URLSearchParams(location.search).get('paid')}catch(e){}
  if(paid!=='1')return;
  try{const u=new URL(location.href);u.searchParams.delete('paid');history.replaceState(null,'',u.pathname+u.search+u.hash)}catch(e){}
  let n=0;const iv=setInterval(async()=>{n++;
    if(typeof ACCT==='undefined'||!ACCT.user){if(n>40)clearInterval(iv);return}
    await loadPlan();
    if(isPro()||n>20){clearInterval(iv);if(isPro()){const p=ACCT.plan;toast(p.status==='trialing'&&p.trial_ends?'Pro is on. Your free trial runs until '+new Date(p.trial_ends).toLocaleDateString('en-US',{month:'long',day:'numeric'})+'.':'Pro is on. Thanks for subscribing.')}render()}
  },1500);
})();
