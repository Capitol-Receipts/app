/* ================= Simpler navigation and shorter pages =================
- The menu: five groups of a few links each, plus "Browse everything" for the rest (screen 'browse').
- The bottom bar: Home, Search, Rankings (screen 'rankhub'), Stocks, Menu.
- Home: "Who represents you?" right under the search box.
- Member profiles: the summary, key numbers and topic cards up top; the two strongest "What stands out" cards; quick
  links to each topic; everything else folded into "More about ..." sections that open on tap.
Loaded after the screens it rearranges, before desktop.js (which reuses the menu) and routes.js. */

/* ---------- menu ---------- */
const SM_GROUPS=[
 ['congress',NAVI.cap,'Congress',[['f:Congress','Everyone in Congress'],['f:Senate','Senators'],['f:House','House members'],['compare','Compare the parties'],['committees:house','Committees'],['elections','2026 elections']]],
 ['stocks',NAVI.chart,'Stock trades',[['rank:trades','Who trades the most'],['stocks','Stocks Congress trades'],['rank:comm','Trades tied to their committees'],['perf','Stock picks vs the market'],['radar','Conflict radar'],['xtr','The President and cabinet']]],
 ['money',NAVI.doc,'Money & lobbying',[['rank:raised','Biggest fundraisers'],['pacs','PACs'],['lobbying:groups','Who spends most on lobbying'],['companies','Companies'],['rank:rev','Former staff now lobbying'],['industries','Industries']]],
 ['bills',NAVI.flag,'Bills & votes',[['bills:lobbied','Most-lobbied bills'],['bills:new','New laws this Congress'],['bills:search','Find a bill'],['rank:missed','Most votes missed'],['rank:breaks','Breaks with their party most']]],
 ['leaders',NAVI.badge,'Leaders & appointees',[['leaders:wh','President & Vice President'],['leaders:cabinet','The Cabinet'],['leaders:court','Supreme Court'],['ncat:All','Everyone confirmed since 2025'],['judges','Federal judges']]],
];
const SM_ALL=[
 ['Congress',[['f:Congress','Everyone in Congress'],['f:Senate','Senators'],['f:House','House members'],['party:D','Democrats'],['party:R','Republicans'],['party:I','Independents'],['compare','Compare the parties'],['caucuses','Caucuses'],['committees:house','House committees'],['committees:senate','Senate committees'],['committees:joint','Joint committees'],['ethics','House Ethics reviews'],['elections','2026 elections']]],
 ['Stock trades',[['rank:trades','Who trades the most'],['stocks','Stocks Congress trades'],['industries','Industries'],['rank:comm','Trades tied to their committees'],['perf','Stock picks vs the market'],['radar','Conflict radar'],['xtr','The President and cabinet']]],
 ['Money & lobbying',[['rank:raised','Biggest fundraisers'],['rank:small','Most small-donor money'],['rank:pac','Most PAC money'],['pacs','PACs'],['lobbying:groups','Who spends most on lobbying'],['lobbying:firms','Lobbying firms'],['companies','Companies'],['rank:rev','Former staff now lobbying']]],
 ['Bills & votes',[['bills:lobbied','Most-lobbied bills'],['bills:new','New laws this Congress'],['bills:laws','Every law since 1947'],['bills:veto','Vetoed bills'],['bills:search','Find a bill'],['rank:missed','Most votes missed'],['rank:breaks','Breaks with their party most']]],
 ['Leaders & appointees',[['leaders:wh','President & Vice President'],['leaders:cabinet','The Cabinet'],['leaders:court','Supreme Court'],['ncat:All','Everyone confirmed since 2025'],['ncat:Cabinet','Cabinet'],['ncat:Agency leaders','Agency leaders'],['ncat:Judges','Judges'],['ncat:Ambassadors','Ambassadors'],['ncat:Prosecutors & marshals','Prosecutors & marshals']]],
 ['History',[['hist:members','Past members of Congress'],['hist:apps','Past appointees'],['hist:exec','Presidents & vice presidents'],['judges','Federal judges'],['hist:archive','From the archives']]],
 ['About',[['how','How we measure'],['sources','Where the data comes from'],['corrections','Corrections'],['pro','Capitol Receipts Pro'],['more','Account & settings']]],
];
const smTr=h=>{if(S.lang!=='es'||typeof translateRoot!=='function')return h;const t=document.createElement('div');t.innerHTML=h;try{translateRoot(t)}catch(e){}return t.innerHTML};
drawerHtml=function(){
  const authed=typeof signedIn==='function'&&signedIn();
  const me=authed?`<button class="ditem big" data-go="following">${NAVI.star}<span>My reps & following</span></button>`
    :`<button class="ditem big" data-auth="in">${NAVI.badge}<span>Sign in</span><em>Free</em></button>`;
  return smTr(`<div class="dtop"><div class="logo"><span>Capitol</span>Receipts</div><button class="dclose" data-dclose aria-label="Close menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
   <button class="dsearch" data-go="search">${NAVI.search}<span>Search people, bills, votes</span></button>
   <div class="dsec">${me}</div>
   ${SM_GROUPS.map(([id,ic,l,items])=>navGroup(id,ic,l,items)).join('')}
   <div class="dsec"><button class="ditem big" data-go="browse">${NAVI.pin}<span>Browse everything</span></button></div>
   <div class="dsmall"><button data-go="how">How we measure</button><button data-go="sources">Sources</button><button data-go="corrections">Corrections</button><button data-go="pro">Pro</button>${authed?'<button data-go="more">Account</button>':''}</div>
   <div class="langseg" role="group" aria-label="Language"><button data-lang="en" aria-pressed="${S.lang!=='es'}">English</button><button data-lang="es" aria-pressed="${S.lang==='es'}">Español</button></div>
   <div class="dfoot">Nonpartisan. Built on public records.</div>`);
};
if(!['congress','stocks','money','bills','leaders'].some(k=>S.dopen[k]))S.dopen={congress:true};

/* ---------- bottom bar ---------- */
const SM_RANK_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path class="f" d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>';
const SM_STOCK_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>';
TABS2.splice(0,TABS2.length,TABS2.find(t=>t[0]==='home'),TABS2.find(t=>t[0]==='search'),['rankhub','Rankings',SM_RANK_ICON],['stockstab','Stocks',SM_STOCK_ICON],['menu','Menu',MENU_ICON]);
function smActiveTab(){
  const cur=S.stack.at(-1)||'';
  if(cur==='rankhub'||(!cur&&S.tab==='search'&&S.msort&&S.msort!=='name'))return 'rankhub';
  if(cur==='stocks'||cur==='industries'||cur.startsWith('stock:')||cur.startsWith('ind:'))return 'stockstab';
  if(cur)return '';
  return S.tab==='home'||S.tab==='search'?S.tab:'';
}
function smTabbar(){const tb=$('#tabbar');if(!tb)return;const a=smActiveTab();
  tb.innerHTML=TABS2.map(([k,l,svg])=>`<button data-tab="${k}" aria-current="${k===a?'page':'false'}">${svg}${l}</button>`).join('');
  if(S.lang==='es'&&typeof translateRoot==='function')try{translateRoot(tb)}catch(e){}}

/* delegates from D.C. and the territories vote only in limited cases: leave them off the missed-votes and party-break lists */
if(MSORT.missed){const f=MSORT.missed[1];MSORT.missed[1]=m=>m.delegate?null:f(m)}
if(MSORT.breaks){const f=MSORT.breaks[1];MSORT.breaks[1]=m=>m.delegate?null:f(m)}
/* ---------- Rankings hub ---------- */
const SM_RANKS=[['trades','Most stock trades','stocks'],['comm','Trades tied to their committees','stocks'],['raised','Biggest fundraisers','money'],['small','Most small-donor money','money'],['pac','Most PAC money','money'],['missed','Most votes missed','votes'],['breaks','Breaks with their party most','votes'],['rev','Former staff now lobbying','influence']];
function rankHub(){
  const card=([k,l,c])=>{const sp=MSORT[k];if(!sp)return '';
    const top=sortList(MEM.filter(m=>{const v=sp[1](m);return v!=null&&v!==0}),sp).slice(0,3);
    return `<section class="sec"><div class="sh"><h2>${l}</h2><button data-rank="${k}">See all</button></div><div class="group">${top.map((m,i)=>`<button class="row plain" data-p="${m.id}" style="grid-template-columns:auto auto 1fr auto auto;gap:10px"><span class="rkn">${i+1}</span>${face(m,34)}<span style="min-width:0"><span class="t">${esc(m.name)}</span><br><span class="s">${esc(partyLine(m))}</span></span><span class="val">${sp[2](m)}</span>${chev}</button>`).join('')}</div></section>`};
  return `${pageHead('Rankings')}<div class="wrap" style="padding-top:calc(var(--navh) + 12px)">
   <p class="s" style="margin:4px 16px 8px">The top three on each list. Tap “See all” for everyone, or filter by party or chamber there.</p>
   ${SM_RANKS.map(card).join('')}</div>`;
}

/* ---------- Browse everything ---------- */
function browseAll(){
  return `${pageHead('Browse everything')}<div class="wrap" style="padding-top:calc(var(--navh) + 12px)">
   ${SM_ALL.map(([h,items])=>`<section class="sec"><div class="sh"><h2>${h}</h2></div><div class="group">${items.map(([g,l])=>`<button class="row plain" data-go="${g}" style="grid-template-columns:1fr auto"><span class="t">${l}</span>${chev}</button>`).join('')}</div></section>`).join('')}</div>`;
}

/* ---------- Home: find your reps first ---------- */
function smHome(){
  if(!S.stack.length&&S.tab==='search'&&!S.q)$('#app')?.querySelectorAll('.rgrid').forEach(g=>g.closest('section')?.remove());
  if(S.stack.length||S.tab!=='home')return;
  const app=$('#app'),w=app.querySelector('.wrap.home')||app.querySelector('.wrap');if(!w)return;
  const zip=[...w.children].find(e=>e.querySelector&&e.querySelector('#zip, .pick, [data-zipgo]'))||[...w.children].find(e=>/Who represents you|Your representatives/i.test(e.textContent.slice(0,80)));
  const sh=w.querySelector('.shead');
  if(zip&&sh&&sh.nextElementSibling!==zip){sh.after(zip);zip.classList.add('smzip')}
  if(sh&&w.querySelector('.brandbar .hamb, .homehero .hamb'))sh.querySelector('.hamb')?.remove();
  w.querySelectorAll('.rgrid').forEach(g=>g.closest('section')?.remove()); // the Rankings tab has these now
}

/* ---------- Member profiles: shorter ---------- */
S.mdOpen=S.mdOpen||{};
function smProfile(){
  const cur=S.stack.at(-1);if(!cur||!byId[cur])return;
  const w=$('#app .wrap');if(!w||w.dataset.smBusy)return;w.dataset.smBusy='1';
  try{
    const m=byId[cur],first=(m.first||m.name.split(' ')[0]);
    smSummary(w);
    // everything after the topic cards folds into "More about ..."
    const kids=[...w.children];
    let last=-1;kids.forEach((e,i)=>{if(e.querySelector&&e.querySelector('.topic'))last=i});
    if(last<0)return;
    let more=w.querySelector('#moredet');
    if(!more){kids[last].insertAdjacentHTML('afterend',`<section class="sec" id="moredet"><div class="sh"><h2>More about ${esc(first)}</h2></div><div class="mgroup"></div></section>`);more=w.querySelector('#moredet')}
    const mg=more.querySelector('.mgroup');
    [...w.children].forEach(e=>{if(e!==more&&!e.contains(more)&&[...w.children].indexOf(e)>[...w.children].indexOf(more)&&e.querySelector&&e.querySelector('.topic'))more.before(e)});
    [...w.children].forEach(e=>{
      if(e===more||e.contains(more)||e.classList.contains('note')||e.hasAttribute('data-placelinks')||e.classList.contains('smjump'))return;
      if([...w.children].indexOf(e)<=[...w.children].indexOf(more))return;
      const h=e.querySelector(':scope > .sh h2');
      const title=h?h.textContent.trim():e.hasAttribute('data-csvrow')?'Download the data':'';
      if(!title)return;
      const key=e.dataset.x||title;
      const d=document.createElement('details');d.className='mdet';d.dataset.k=key;if(S.mdOpen[key])d.open=true;
      const sh=e.querySelector(':scope > .sh');const extra=sh?[...sh.children].filter(x=>x!==h).map(x=>x.outerHTML).join(''):'';
      if(sh)sh.remove();
      d.innerHTML=`<summary><span>${esc(title)}</span>${chev}</summary>`;
      const body=document.createElement('div');body.className='mbody';if(extra)body.insertAdjacentHTML('beforeend',`<div class="mextra">${extra}</div>`);
      body.appendChild(e);d.appendChild(body);mg.appendChild(d);
      d.addEventListener('toggle',()=>{S.mdOpen[key]=d.open});
    });
    // the delegation links and source note stay last
    w.querySelectorAll(':scope > [data-placelinks], :scope > .note').forEach(e=>w.appendChild(e));
    smTabs(w,m);
  }finally{delete w.dataset.smBusy}
}

/* ---------- people pages: one summary, then tabs ---------- */
// "What stands out" repeated the three top numbers. Its other points move into the summary card as short lines.
function smSummary(w){
  const st=w.querySelector('.stories'),sec=st&&st.closest('section'),pe=w.querySelector('.pe-card');
  if(!st||!sec||sec.classList.contains('smhide'))return;
  const gv=[...w.querySelectorAll('.glance b')].map(b=>b.textContent.trim());
  const keep=[...st.querySelectorAll('.story')].filter(c=>{const big=((c.querySelector('.sbig')||{}).textContent||'').trim();return big&&!gv.includes(big)});
  const lines=keep.map(c=>`<li><b>${esc(((c.querySelector('.sbig')||{}).textContent||'').trim())}</b> ${(c.querySelector('p')||{}).innerHTML||''}</li>`).join('');
  const cmp=sec.querySelector('[data-topic="compare"]')?'<button class="link pcmp" data-topic="compare">How they compare with everyone else ›</button>':'';
  if(pe){if(!pe.querySelector('.pstand')&&(lines||cmp))pe.insertAdjacentHTML('beforeend',`${lines?`<ul class="pstand">${lines}</ul>`:''}${cmp}`)}
  else if(lines)sec.insertAdjacentHTML('beforebegin',`<section class="sec"><div class="group pad"><ul class="pstand">${lines}</ul>${cmp}</div></section>`);
  sec.classList.add('smhide');
}
const SM_TABL={money:'Money',stocks:'Stocks',votes:'Votes',influence:'Lobbying',career:'Career'};
S.mtab=S.mtab||{};
let _smInl=false;
function smInline(topic,box){
  _smInl=true;const wasHidden=$('#sheet').hidden;
  try{_topicSheetSM(topic)}catch(e){console.warn(e)}finally{_smInl=false}
  const pn=$('#panel');box.innerHTML='';
  [...pn.children].filter(c=>!c.classList.contains('grab')&&!c.classList.contains('ptop')).forEach(n=>box.appendChild(n));
  pn.innerHTML='';if(wasHidden)$('#sheet').hidden=true;
}
function smTabs(w,m){
  const id=m.id;
  // empty topics shrink to one line
  const emptyLine=(topic,text)=>{const c=w.querySelector(`.topic[data-topic="${topic}"]`);if(c&&!c.dataset.empty){c.dataset.empty='1';c.outerHTML=`<div class="smempty">${text}</div>`}};
  if(!m.tradeN&&!m.ptr)emptyLine('stocks','No stock trades reported since January 2025.');
  if(!m.money)emptyLine('money','No 2025–26 campaign reports on file with the FEC.');
  const topics=[...w.querySelectorAll('.topic[data-topic]')].map(t=>t.dataset.topic).filter(t=>SM_TABL[t]);
  const tabs=[['overview','Overview'],...topics.map(t=>[t,SM_TABL[t]]),['more','More']];
  let cur=S.mtab[id]||'overview';if(!tabs.some(t=>t[0]===cur))cur='overview';
  let bar=w.querySelector('.mtabs');
  const at=w.querySelector('.gl-asof')||w.querySelector('.glance');
  if(!bar&&at){at.insertAdjacentHTML('afterend',`<nav class="mtabs" role="tablist" aria-label="Sections"></nav><div id="ptbody"></div>`);bar=w.querySelector('.mtabs')}
  if(!bar)return;
  bar.innerHTML=tabs.map(([k,l])=>`<button role="tab" data-mtab="${k}" aria-selected="${k===cur}">${l}</button>`).join('');
  if(S.lang==='es'&&typeof translateRoot==='function')try{translateRoot(bar)}catch(e){}
  w.dataset.mtab=cur;
  const body=w.querySelector('#ptbody');
  if(SM_TABL[cur]){if(body.dataset.t!==cur||!body.children.length){smInline(cur,body);body.dataset.t=cur}
    if(cur==='career'&&/Loading their full career/.test(body.textContent)){clearTimeout(smTabs._t);smTabs._t=setTimeout(()=>{if(S.stack.at(-1)===id&&(S.mtab[id]||'')==='career'){body.dataset.t='';smTabs(w,m)}},800)}}
  else{body.innerHTML='';body.dataset.t=''}
  // show only what belongs to this tab
  const keepTop=e=>e.matches('.glance,.gl-asof,.mtabs,#ptbody,.note');
  w.querySelectorAll(':scope > *, :scope > .dcols > .dcol > *').forEach(e=>{
    if(e.classList.contains('dcols')||keepTop(e))return;
    const isMore=e.id==='moredet',isEnd=e.hasAttribute('data-placelinks');
    const show=cur==='overview'?!isMore:cur==='more'?(isMore||isEnd):false;
    e.classList.toggle('ptoff',!show);
  });
}
// tab taps, and topic cards on a profile open their tab instead of a pop-up
document.addEventListener('click',e=>{
  const g=s=>e.target.closest&&e.target.closest(s);let el;
  const cur=S.stack.at(-1);if(!cur||!byId[cur])return;
  if(el=g('#app .mtabs button[data-mtab]')){e.preventDefault();e.stopImmediatePropagation();S.mtab[cur]=el.dataset.mtab;render();
    const bar=document.querySelector('#app .mtabs');if(bar){const y=bar.getBoundingClientRect().top+scrollY-(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navh'))||56)-4;if(scrollY>y)scrollTo(0,y)}return}
  if((el=g('#app .topic[data-topic]'))&&SM_TABL[el.dataset.topic]&&!g('#ptbody')){e.preventDefault();e.stopImmediatePropagation();S.mtab[cur]=el.dataset.topic;render();
    const bar=document.querySelector('#app .mtabs');if(bar)scrollTo(0,bar.getBoundingClientRect().top+scrollY-70);return}
},true);
const _topicSheetSM=topicSheet;
topicSheet=function(t){
  const cur=S.stack.at(-1);
  // inside a profile, "show more" and links between topics stay on the page
  if(!_smInl&&cur&&byId[cur]&&SM_TABL[t]&&document.querySelector('#app #ptbody')&&$('#sheet').hidden){
    S.mtab[cur]=t;const b=document.querySelector('#app #ptbody');if(b)b.dataset.t='';render();return}
  _topicSheetSM(t);
};

/* ---------- appointee pages: one summary, money and jobs on the page, their own stock trades ---------- */
function smAppointee(){
  const cur=S.stack.at(-1);if(!cur||typeof nomById==='undefined'||!nomById[cur])return;
  const n=nomById[cur],w=$('#app .wrap');if(!w||w.dataset.smApp===cur)return;w.dataset.smApp=cur;
  smSummary(w);
  // financial disclosures shown right on the page
  const mc=w.querySelector('.topic[data-topic="oge"]');
  if(mc&&n.oge&&typeof ogeSections==='function'){let h='';try{h=ogeSections(n)}catch(e){}
    if(h){const box=document.createElement('div');box.className='smoge';box.innerHTML=`<section class="sec"><div class="sh"><h2>Money & past jobs</h2></div></section>${h}`;
      const sec=mc.closest('section');if(sec){sec.after(box);mc.remove()}}}
  // their stock trades, from the OGE 278-T reports
  if(typeof xtLoad==='function'){xtLoad();
    if(XTR.data){const nm=String(n.name||'').toLowerCase().replace(/[^a-z ]/g,' ').split(/\s+/).filter(Boolean);
      const f=XTR.data.find(x=>{const d=x.display.toLowerCase();return nm.length>1&&d.includes(nm[nm.length-1])&&d.startsWith(nm[0])});
      if(f&&!w.querySelector('[data-smxt]')){const anchor=w.querySelector('.smoge')||w.querySelector('.topics')?.closest('section');
        anchor?.insertAdjacentHTML('afterend',`<section class="sec" data-smxt><div class="sh"><h2>Their stock trades</h2><button data-go="xtr:${esc(f.slug)}">See all</button></div><div class="group pad"><div class="bigline"><b>${ord(f.n)}</b><span>trades reported since January 2025: ${ord(f.buys)} purchases, ${ord(f.sells)} sales, worth ${M(f.lo)}–${M(f.hi)} in total</span></div>
          ${(f.trades||[]).slice(0,5).map(t=>`<div class="row plain" style="grid-template-columns:1fr auto;cursor:default;padding-left:0;padding-right:0"><span style="min-width:0"><span class="t">${t[2]?`<b>${esc(t[2])}</b> · `:''}${esc(t[3])}</span><br><span class="s">${xtKind(t[1])} · ${esc(xtDate(t[0]))}</span></span><span class="val" style="font-size:14px">${t[4]?(t[5]?`${M(t[4])}–${M(t[5])}`:`Over ${M(t[4]-1)}`):''}</span></div>`).join('')}
          <p class="s" style="margin:10px 0 0">From OGE Form 278-T reports. Amounts are reported in ranges.</p></div></section>`)}}
    else setTimeout(()=>{if(S.stack.at(-1)===cur){w.dataset.smApp='';smAppointee()}},900);}
}
let _smObs=null;
function smWatch(){
  if(_smObs){_smObs.disconnect();_smObs=null}
  const cur=S.stack.at(-1);if(!cur||!byId[cur])return;
  const w=$('#app .wrap');if(!w)return;
  let t=null;_smObs=new MutationObserver(()=>{clearTimeout(t);t=setTimeout(smProfile,60)});
  _smObs.observe(w,{childList:true});
}

/* ---------- render ---------- */
const _renderSM=render;
render=function(){
  const cur=S.stack.at(-1)||'';
  if(cur==='rankhub'||cur==='browse'){
    if($('#sheet').hidden)$('#panel').className='panel';
    $('#app').innerHTML=smTr(cur==='rankhub'?rankHub():browseAll());
    const pn=document.querySelector('#app .pnav .in');
    if(pn&&!pn.querySelector('[data-menu]')){const b=document.createElement('span');b.className='pright';b.innerHTML=`<button data-menu aria-label="Menu">${MENU_ICON}</button>`;pn.appendChild(b)}
  }else _renderSM();
  smTabbar();smHome();smProfile();smAppointee();smWatch();
};
const _navGoSM=navGo;
navGo=function(g){
  if(g==='browse'||g==='rankhub'){closeDrawer();$('#sheet').hidden=true;S.stack=[];S.tab='search';go(g);return}
  _navGoSM(g);
};
document.addEventListener('click',e=>{
  const g=s=>e.target.closest&&e.target.closest(s);let el;
  if(el=g('[data-tab="rankhub"]')){e.preventDefault();e.stopImmediatePropagation();navGo('rankhub');return}
  if(el=g('[data-tab="stockstab"]')){e.preventDefault();e.stopImmediatePropagation();navGo('stocks');return}
},true);
document.head.insertAdjacentHTML('beforeend',`<style>
.smhide{display:none!important}
.mtabs{position:sticky;top:var(--navh,56px);z-index:5;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:12px -16px 4px;padding:8px 16px;background:var(--bg,#f2f3f7)}
.mtabs::-webkit-scrollbar{display:none}
.mtabs button{flex:0 0 auto;border:1px solid var(--line,#dfe3ec);background:var(--surface,#fff);color:inherit;font:inherit;font-weight:650;font-size:14px;padding:8px 14px;border-radius:999px;cursor:pointer}
.mtabs button[aria-selected="true"]{background:var(--ink,#0e1116);color:var(--bg,#fff);border-color:transparent}
.ptoff{display:none!important}
.wrap[data-mtab="overview"] #ptbody,.wrap[data-mtab="more"] #ptbody{display:none}
#ptbody>.sec:first-child{margin-top:8px}
.pstand{margin:12px 0 0;padding:0 0 0 18px;display:grid;gap:6px;font-size:16px;line-height:1.45}
.pcmp{display:inline-block;margin-top:10px;font-weight:650;text-decoration:underline;background:none;border:0;padding:4px 0;color:inherit;cursor:pointer;font-size:15px}
.smempty{margin:10px 0;padding:14px 16px;border-radius:16px;background:var(--surface,#fff);color:var(--muted,#5b6374);font-size:15px}
@media (max-width:760px){.phero .face{width:76px!important;height:76px!important}.phero h1{font-size:28px;margin:10px 0 2px}.phero .in{padding-bottom:18px}.phero .pchips{margin-top:6px}}
.smmore{display:block;margin:10px auto 0;background:none;border:0;color:var(--accent,#2557a8);font:inherit;font-weight:700;padding:10px 14px;cursor:pointer}
.smjump{display:flex;gap:8px;overflow-x:auto;padding:12px 16px 4px;margin:0 -16px;scrollbar-width:none}
.smjump::-webkit-scrollbar{display:none}
.smjump button{flex:0 0 auto;border:1px solid var(--line,#dfe3ec);background:var(--surface,#fff);color:inherit;font:inherit;font-weight:600;font-size:14px;padding:8px 14px;border-radius:999px;cursor:pointer}
.mgroup{background:var(--surface,#fff);border-radius:16px;overflow:hidden}
.mdet{border-bottom:1px solid var(--line,#e6e9f0)}.mdet:last-child{border-bottom:0}
.mdet>summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:15px 16px;font-weight:650;cursor:pointer}
.mdet>summary::-webkit-details-marker{display:none}
.mdet>summary .chev{transition:transform .15s}.mdet[open]>summary .chev{transform:rotate(90deg)}
.mdet .mbody{padding:0 4px 12px}.mdet .mbody>.sec{margin-top:0}
.mdet .mextra{display:flex;justify-content:flex-end;gap:10px;padding:0 12px 6px}
.rkn{font-weight:800;min-width:16px;color:var(--muted,#5b6374)}
.dsmall{display:flex;flex-wrap:wrap;gap:4px 14px;padding:8px 20px 4px}
.dsmall button{background:none;border:0;padding:6px 0;font:inherit;font-size:14px;color:var(--muted,#5b6374);cursor:pointer}
.drawer .langseg{margin:10px 16px 0}
</style>`);
render();
