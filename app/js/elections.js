/* ================= 2026 elections: every race, every candidate, the money and outside spending ================= */
const ELECTION_DAY='2026-11-03';
const EL={races:null,byId:{},loading:null,groups:{},asOf:null};
const PCOL={D:'#2557a8',R:'#c8323a',L:'#c9a227',G:'#3c8d4f',I:'#6b6f78'};
const PWORD={D:'Democrat',R:'Republican',L:'Libertarian',G:'Green',I:'Independent'};
function loadRaces(){
  if(EL.races||EL.loading)return EL.loading;
  EL.loading=SB.all('races?select=data&order=id').then(rows=>{
    EL.races=rows.map(r=>r.data);EL.races.forEach(r=>EL.byId[r.id]=r);
    EL.asOf=(EL.races.flatMap(r=>r.c.map(c=>c.thru)).filter(Boolean).map(d=>d.slice(6)+'-'+d.slice(0,2)+'-'+d.slice(3,5)).sort().at(-1))||null;
    render();
  }).catch(e=>{console.warn(e);EL.loading=null;EL.err=true;render()});
  return EL.loading;
}
function loadGroup(id){
  if(EL.groups[id])return;
  EL.groups[id]='loading';
  SB.get('outside_groups?select=data&id=eq.'+encodeURIComponent(id)).then(r=>{EL.groups[id]=r[0]?.data||'missing';render()}).catch(()=>{EL.groups[id]='error';render()});
}
const daysToElection=()=>Math.ceil((new Date(ELECTION_DAY+'T12:00:00')-new Date())/864e5);
const raceName=r=>r.o==='S'?`${ST[r.st]} Senate${r.sp?' (special)':''}`:`${ST[r.st]} ${r.d===0?'at-large':'District '+r.d}`;
const raceShort=r=>r.o==='S'?`${r.st} Senate${r.sp?' special':''}`:`${r.st}-${r.d===0?'AL':r.d}`;
const pviText=p=>{if(!p)return '';const n=+(p.split('+')[1]||0);if(p[0]==='E'||!n)return 'Evenly split district';return `Leans ${p[0]==='R'?'Republican':'Democratic'} by ${n} pt${n===1?'':'s'}`};
const pviNum=p=>!p||p[0]==='E'?0:+(p.split('+')[1]||0);
function raceFor(m){
  if(!EL.races||!m)return null;
  if(m.chamber==='Senate')return EL.races.find(r=>r.o==='S'&&r.st===m.state&&r.c.some(c=>c.bg===m.id))||null;
  return EL.races.find(r=>r.o==='H'&&r.c.some(c=>c.bg===m.id))||EL.races.find(r=>r.o==='H'&&r.inc.some(i=>i.bg===m.id))||null;
}
function competitive(r){return pviNum(r.pvi)<=5||(r.ot||0)>=2e6}
function candDot(c){return `<span class="cdot" style="background:${PCOL[c.p]||PCOL.I}"></span>`}
function candFace(c,size=44){
  const m=c.bg&&byId[c.bg];
  if(m)return face(m,size);
  const ini=c.n.split(/\s+/).filter(Boolean).map(w=>w[0]).filter(ch=>/[A-Z]/i.test(ch)).slice(0,2).join('').toUpperCase();
  return `<span class="face ini" style="width:${size}px;height:${size}px;background:${PCOL[c.p]||PCOL.I};color:#fff;display:inline-grid;place-items:center;border-radius:50%;font-weight:800;font-size:${Math.round(size*.36)}px;flex:0 0 auto">${esc(ini)}</span>`;
}
function moneyBar(r){
  const mx=Math.max(1,...r.c.map(c=>c.r||0));
  return r.c.filter(c=>c.p==='D'||c.p==='R'||(c.r||0)>0).slice(0,4).map(c=>`<div class="mbar"><span class="mn">${candDot(c)}${esc(c.n)}${c.inc?' <em>incumbent</em>':''}</span><span class="mt"><span style="width:${((c.r||0)/mx*100).toFixed(1)}%;background:${PCOL[c.p]||PCOL.I}"></span></span><b>${c.r!=null?M(c.r):'—'}</b></div>`).join('');
}
function raceRow(r,sub){
  const lead=r.c.filter(c=>c.p==='D'||c.p==='R').slice(0,2);
  const names=(lead.length?lead:r.c.slice(0,2)).map(c=>`<span class="rn1">${candDot(c)}${esc(c.n.split(' ').filter(w=>!/^(Jr\.?|Sr\.?|II|III|IV)$/.test(w)).slice(-1)[0])}</span>`).join('<span class="vs">vs</span>');
  return `<button class="row plain racerow" data-race="${r.id}" style="grid-template-columns:auto 1fr auto auto"><span class="rtag ${r.o==='S'?'sen':''}">${esc(raceShort(r))}</span><span style="min-width:0"><span class="t rnames">${names||'Candidates not set'}</span><br><span class="s">${esc(sub||[pviText(r.pvi),r.ot?M(r.ot)+' outside spending':''].filter(Boolean).join(' · '))}</span></span><span class="val">${M(r.rt||0)}</span>${chev}</button>`;
}
function myRaces(){
  if(!EL.races||!S.home)return [];
  const d=S.dist&&S.dist.length?S.dist:null;
  return EL.races.filter(r=>r.st===S.home&&(r.o==='S'||(d?d.includes(r.d)||(r.d===0&&d[0]===0):false)));
}
/* ---------- list screen ---------- */
function electionsScreen(){
  loadRaces();
  const days=daysToElection();
  const head=`${pageHead('2026 elections')}<div class="wrap" style="padding-top:calc(var(--navh) + 10px)">
   <div class="lbanner bg-capitol elhero"><span class="billno">Election Day · Tuesday, Nov 3, 2026</span><h1>${days>0?`${days} day${days===1?'':'s'} until the 2026 election`:days===0?'Election Day is today':'The 2026 election'}</h1><span>All 435 House seats and ${EL.races?EL.races.filter(r=>r.o==='S').length:35} Senate seats are on the ballot. See who's running, who's paying for it, and the incumbent's record.</span></div>`;
  if(EL.err)return head+`<div class="calm">Couldn’t load the races. Check your connection and try again.</div></div>`;
  if(!EL.races)return head+`<div class="calm">Loading races…</div></div>`;
  const R=EL.races,sen=R.filter(r=>r.o==='S'),hou=R.filter(r=>r.o==='H');
  const mode=S.emode||'top';
  const q=(S.eq||'').trim().toLowerCase();
  const stOpts=Object.entries(ST).filter(([k])=>R.some(r=>r.st===k)).sort((a,b)=>a[1].localeCompare(b[1]));
  const tot=R.reduce((a,r)=>a+(r.rt||0),0),out=R.reduce((a,r)=>a+(r.ot||0),0);
  const mine=signedIn()?myRaces():[];
  let list;
  if(q)list=R.filter(r=>raceName(r).toLowerCase().includes(q)||raceShort(r).toLowerCase().includes(q)||r.c.some(c=>c.n.toLowerCase().includes(q)));
  else if(mode==='senate')list=sen;
  else if(mode==='close')list=R.filter(competitive).sort((a,b)=>(b.ot||0)-(a.ot||0));
  else if(mode==='money')list=[...R].sort((a,b)=>(b.rt+(b.ot||0))-(a.rt+(a.ot||0)));
  else if(mode==='state')list=R.filter(r=>r.st===(S.est||S.home||'AL'));
  else list=[...R].sort((a,b)=>(b.ot||0)-(a.ot||0));
  const shown=list.slice(0,S.limit||60);
  return head+`
   <section class="sec dash"><div class="dstats">
    <div class="dstat"><span class="dk">Races on the ballot</span><b class="dv">${R.length}</b><span class="ds">${sen.length} Senate · ${hou.length} House</span></div>
    <div class="dstat"><span class="dk">Candidates</span><b class="dv">${ord(R.reduce((a,r)=>a+r.c.length,0))}</b><span class="ds">on general-election ballots</span></div>
    <div class="dstat"><span class="dk">Raised by candidates</span><b class="dv">${M(tot)}</b><span class="ds">through ${EL.asOf?fmtISO(EL.asOf):'latest filings'}</span></div>
    <div class="dstat"><span class="dk">Outside spending</span><b class="dv">${M(out)}</b><span class="ds">by super PACs and other groups</span></div>
   </div></section>
   ${mine.length?`<section class="sec"><div class="sh"><h2>Your races</h2><span class="cap" style="padding:0">${esc(repWhere())}</span></div><div class="group">${mine.map(r=>raceRow(r)).join('')}</div></section>`:signedIn()?`<section class="sec"><div class="calm">Add your ZIP code on the Search page to see your races here.</div></section>`:`<section class="sec"><div class="signin-card"><b>See your races</b><span>Sign in and add your ZIP code to keep your Senate and House races at the top.</span><div><button class="abtn sm" data-auth="up">Create free account</button><button class="link" data-auth="in">Sign in</button></div></div></section>`}
   <section class="sec"><div class="sfield"><input id="eq" class="search" type="search" placeholder="Search a state, district or candidate" value="${esc(S.eq||'')}" aria-label="Search races"></div>
    <div class="seg" style="margin-top:10px">${[['top','Most outside money'],['close','Competitive'],['senate','Senate'],['money','Most expensive'],['state','By state']].map(([k,l])=>`<button data-emode="${k}" aria-pressed="${mode===k}">${l}</button>`).join('')}</div>
    ${mode==='state'&&!q?`<select class="select" id="est" aria-label="State" style="margin-top:10px">${stOpts.map(([k,v])=>`<option value="${k}" ${k===(S.est||S.home||'AL')?'selected':''}>${v}</option>`).join('')}</select>`:''}
   </section>
   <section class="sec"><div class="sh"><h2>${q?'Matching races':mode==='close'?'Competitive races':mode==='senate'?'Senate races':mode==='money'?'Most expensive races':mode==='state'?esc(ST[S.est||S.home||'AL']):'Where outside groups are spending most'}</h2><span class="cap" style="padding:0">${list.length}</span></div>
    <div class="group">${shown.map(r=>raceRow(r)).join('')||'<div class="empty">No races match.</div>'}</div>
    ${list.length>shown.length?`<button class="more" data-emore>Show more</button>`:''}
    <div class="cap">"Competitive" means the district leans 5 points or less toward one party, or outside groups have spent $2M+. Money figures are what each campaign reported to the Federal Election Commission; outside spending is reported by the groups themselves.</div></section>
   <section class="sec"><div class="sh"><h2>Biggest outside spenders</h2><button data-go="ogroups">See all</button></div><div id="ogtop" class="group"><div class="empty">Loading…</div></div></section>
  </div>`;
}
/* ---------- race page ---------- */
function racePage(id){
  loadRaces();
  if(!EL.races)return loading('the race');
  const r=EL.byId[id];if(!r)return `<div class="wrap"><div class="empty">Race not found.</div></div>`;
  const inc=r.inc.map(i=>i.bg&&byId[i.bg]).filter(Boolean);
  const after=daysToElection()<0;
  const major=r.c.filter(c=>c.p==='D'||c.p==='R');
  const others=r.c.filter(c=>!(c.p==='D'||c.p==='R'));
  const card=c=>{
    const m=c.bg&&byId[c.bg];
    const smallPct=c.r?Math.round((c.small||0)/c.r*100):null;
    return `<div class="ccard" style="--pc:${PCOL[c.p]||PCOL.I}">
      <div class="cch">${candFace(c,52)}<div style="min-width:0"><div class="ccn">${esc(c.n)}</div><div class="ccp">${esc(c.pl||PWORD[c.p]||'')}${c.inc?' · Incumbent':''}</div></div>${m?`<button class="link" data-p="${m.id}">Profile ›</button>`:''}</div>
      ${c.fec&&(c.r||c.thru)?`<div class="ccm"><div><span>Raised</span><b>${M(c.r)}</b></div><div><span>Spent</span><b>${M(c.s)}</b></div><div><span>Cash left</span><b>${M(c.cash)}</b></div></div>
      <div class="ccs">${smallPct!=null&&c.r?`${smallPct}% from small donors (under $200)`:''}${c.pac?` · ${M(c.pac)} from PACs`:''}${c.self>1000?` · ${M(c.self)} of their own money`:''}${c.debt>1000?` · ${M(c.debt)} in debt`:''}</div>
      ${(c.for||c.vs)?`<div class="ccx"><span class="up">${M(c.for||0)} spent to help</span><span class="dn">${M(c.vs||0)} spent to attack</span></div>`:''}
      <div class="ccf">Through ${c.thru?fmtISO(c.thru.slice(6)+'-'+c.thru.slice(0,2)+'-'+c.thru.slice(3,5)):'latest filing'} · <a href="https://www.fec.gov/data/candidate/${c.fec}/?cycle=2026" target="_blank" rel="noopener">FEC filings</a></div>`
      :`<div class="ccs">No campaign finance reports filed with the FEC yet.</div>`}</div>`;
  };
  const recordRow=m=>{
    const P=POOL[m.chamber];
    return `<div class="group">
      <div class="row kv"><span class="k">Votes missed</span><span class="v">${m.missed==null?'—':pct(m.missed,1)} <small>(typical ${pct(1-median(P.present),1)})</small></span></div>
      <div class="row kv"><span class="k">Votes with own party</span><span class="v">${m.unity==null?'—':pct(m.unity,0)}</span></div>
      <div class="row kv"><span class="k">Stock trades since Jan 2025</span><span class="v">${ord(m.tradeN||0)}${m.commTrades?` <small>(${m.commTrades} tied to committees)</small>`:''}</span></div>
      <div class="row kv"><span class="k">Biggest donor industry</span><span class="v">${esc(m.topInd||'—')}</span></div>
      <div class="row kv"><span class="k">In Congress since</span><span class="v">${m.since||'—'}</span></div>
      <button class="row plain" data-p="${m.id}" style="grid-template-columns:1fr auto"><span>Full record for ${esc(m.name)}</span>${chev}</button></div>`;
  };
  const outRows=(r.out||[]).map(([n,sid,so,cn,a])=>`<button class="row plain" data-og="${sid}" style="grid-template-columns:1fr auto auto"><span style="min-width:0"><span class="t">${esc(n)}</span><br><span class="s">${so==='S'?'To help':'To attack'} ${esc(cn)}</span></span><span class="val ${so==='S'?'up':'dn'}">${M(a)}</span>${chev}</button>`).join('');
  return `${pageHead(raceShort(r))}
  <section class="phero p-N bg-capitol"><div class="in" style="padding-top:calc(var(--navh) + 18px)"><span class="billno">${r.o==='S'?'U.S. Senate':'U.S. House'} · Nov 3, 2026</span><h1>${esc(raceName(r))}</h1><div class="psub">${esc([pviText(r.pvi),r.status].filter(Boolean).join(' · '))}</div></div></section>
  <div class="wrap">
   <div class="glance">${glance('Candidates',r.c.length,`${major.length} major-party`,false)}${glance('Raised',M(r.rt||0),'by all candidates',false)}${glance('Outside spending',M(r.ot||0),'for and against',(r.ot||0)>=5e6)}</div>
   <section class="sec wide"><div class="calm" style="text-align:left">${after?'Results will appear here once states report them.':`Polls close on Nov 3. Results will appear here once states report them.`}</div></section>
   <section class="sec wide"><div class="sh"><h2>Who's running</h2></div><div class="ccards">${major.map(card).join('')}</div>
    ${others.length?`<div class="group" style="margin-top:10px">${others.map(c=>`<div class="row kv"><span class="k">${candDot(c)} ${esc(c.n)}</span><span class="v">${esc(c.pl||PWORD[c.p])}${c.r?' · raised '+M(c.r):''}</span></div>`).join('')}</div>`:''}</section>
   ${r.rt?`<section class="sec"><div class="sh"><h2>Money raised</h2></div><div class="group pad">${moneyBar(r)}</div></section>`:''}
   ${inc.length?`<section class="sec"><div class="sh"><h2>The incumbent's record</h2></div>${inc.map(recordRow).join('')}</section>`:''}
   <section class="sec"><div class="sh"><h2>Outside spending</h2><span class="cap" style="padding:0">${M(r.ot||0)}</span></div>${outRows?`<div class="group">${outRows}</div><div class="cap">Super PACs and other groups must report money they spend on ads and mail to help or attack a candidate. They can't coordinate with campaigns.</div>`:'<div class="empty">No outside spending reported in this race yet.</div>'}</section>
   <div class="note">From Federal Election Commission filings and state election offices' candidate lists. ${r.o==='H'?'Some states redrew their districts for 2026, so a district may cover different areas than before.':''}</div>
  </div>`;
}
/* ---------- outside spending groups ---------- */
let OGLIST=null;
function loadGroupList(){
  if(OGLIST)return;OGLIST='loading';
  SB.get('outside_groups?select=id,name,total&order=total.desc&limit=300').then(r=>{OGLIST=r;render()}).catch(()=>{OGLIST=null});
}
function ogroupsScreen(){
  loadGroupList();
  const list=Array.isArray(OGLIST)?OGLIST:null;
  return `${pageHead('Outside spending')}<div class="wrap" style="padding-top:calc(var(--navh) + 10px)">
   <div class="lt"><h1>Outside spending</h1></div><p class="cap">Super PACs, party committees and advocacy groups that spent money to help or attack 2026 candidates, ranked by how much they reported.</p>
   ${list?`<div class="group">${list.map((g,i)=>`<button class="row" data-og="${g.id}" style="grid-template-columns:auto 1fr auto auto"><span class="rank">${i+1}</span><span class="t" style="min-width:0">${esc(ogName(g.name))}</span><span class="val">${M(g.total)}</span>${chev}</button>`).join('')}</div>`:'<div class="calm">Loading…</div>'}</div>`;
}
const ogName=n=>n&&n===n.toUpperCase()?n.toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase()).replace(/\b(Pac|Inc|Llc|Usa|Us|Afl|Cio|Gop)\b/g,s=>s.toUpperCase()):n;
function ogroupPage(id){
  loadGroup(id);loadRaces();
  const g=EL.groups[id];
  if(!g||g==='loading')return loading('this group');
  if(typeof g!=='object')return `<div class="wrap"><div class="empty">Group not found.</div></div>`;
  const pacId=H&&H.pacs&&H.pacs[id]?id:null;
  const sd=g.side||{},sdT=(sd.D||0)+(sd.R||0)+(sd.O||0)||1;
  const lean=(sd.D||0)/sdT>=.8?'Almost all of it helped Democrats or attacked Republicans.':(sd.R||0)/sdT>=.8?'Almost all of it helped Republicans or attacked Democrats.':'Its spending went to both sides.';
  return `${pageHead(ogName(g.n))}
  <section class="phero p-N bg-capitol"><div class="in" style="padding-top:calc(var(--navh) + 18px)"><span class="billno">Outside spending · 2026</span><h1 style="font-size:${g.n.length>40?24:30}px">${esc(ogName(g.n))}</h1></div></section>
  <div class="wrap">
   <div class="glance">${glance('Spent on 2026 races',M(g.tot),'reported to the FEC',false)}${glance('To help',M(g.for),'candidates it backs',false)}${glance('To attack',M(g.vs),'candidates it opposes',false)}</div>
   <section class="pe-card"><div class="pe-h">The short version</div><p>${esc(ogName(g.n))} reported spending ${M(g.tot)} on ads, mail and other outreach about 2026 congressional candidates. ${lean}</p></section>
   <section class="sec"><div class="sh"><h2>Who benefited</h2></div><div class="group pad">${[['D','Democrats'],['R','Republicans'],['O','Others']].filter(([k])=>sd[k]>0).map(([k,l])=>`<div class="mbar"><span class="mn">${l}</span><span class="mt"><span style="width:${(sd[k]/sdT*100).toFixed(1)}%;background:${PCOL[k==='O'?'I':k]}"></span></span><b>${Math.round(sd[k]/sdT*100)}%</b></div>`).join('')}</div><div class="cap">Money spent to help a party's candidate or attack the other party's candidate counts toward that party.</div></section>
   <section class="sec"><div class="sh"><h2>Where the money went</h2></div><div class="group">${g.rows.map(([cid,nm,rid,so,a])=>`<button class="row plain" ${rid?`data-race="${rid}"`:''} style="grid-template-columns:1fr auto auto"><span style="min-width:0"><span class="t">${so==='S'?'Helping':'Attacking'} ${esc(nm)}</span><br><span class="s">${rid&&EL.byId[rid]?esc(raceName(EL.byId[rid])):'Primary or other race'}</span></span><span class="val ${so==='S'?'up':'dn'}">${M(a)}</span>${rid?chev:'<span></span>'}</button>`).join('')}</div></section>
   ${pacId?`<section class="sec"><div class="group"><button class="row plain" data-pac="${pacId}" style="grid-template-columns:1fr auto"><span>Its direct contributions to members of Congress</span>${chev}</button></div></section>`:''}
   <div class="note">From independent expenditure reports filed with the Federal Election Commission. <a href="https://www.fec.gov/data/committee/${id}/" target="_blank" rel="noopener">See its FEC filings</a>.</div>
  </div>`;
}
/* ---------- routing ---------- */
const _renderEl=render;
render=function(){
  const cur=S.stack.at(-1)||'';
  if(!(cur==='elections'||cur.startsWith('race:')||cur==='ogroups'||cur.startsWith('og:')))return _renderEl();
  if($('#sheet').hidden)$('#panel').className='panel';
  $('#app').innerHTML=cur==='elections'?electionsScreen():cur==='ogroups'?ogroupsScreen():cur.startsWith('og:')?ogroupPage(cur.slice(3)):racePage(cur.slice(5));
  $('#tabbar').innerHTML=TABS2.map(([k,l,svg])=>`<button data-tab="${k}" aria-current="${k===S.tab?'page':'false'}">${svg}${l}</button>`).join('');
  const pn=document.querySelector('#app .pnav .in');
  if(pn&&!pn.querySelector('[data-menu]')){const b=document.createElement('span');b.className='pright';b.innerHTML=`<button data-menu aria-label="Menu">${MENU_ICON}</button>`;pn.appendChild(b)}
  const eq=$('#eq');if(eq)eq.addEventListener('input',e=>{S.eq=e.target.value;S.limit=60;const p=eq.selectionStart;render();const n=$('#eq');n.focus();n.setSelectionRange(p,p)});
  const es=$('#est');if(es)es.addEventListener('change',e=>{S.est=e.target.value;render()});
  const og=$('#ogtop');if(og){loadGroupList();if(Array.isArray(OGLIST))og.innerHTML=OGLIST.slice(0,6).map(g=>`<button class="row plain" data-og="${g.id}" style="grid-template-columns:1fr auto auto"><span class="t" style="min-width:0">${esc(ogName(g.name))}</span><span class="val">${M(g.total)}</span>${chev}</button>`).join('')}
  try{linkify($('#app'))}catch(e){}
};
window.addEventListener('click',e=>{
  const g=s=>e.target.closest(s);let el;
  if(el=g('[data-race]')){e.preventDefault();e.stopPropagation();$('#sheet').hidden=true;go('race:'+el.dataset.race);return}
  if(el=g('[data-og]')){e.preventDefault();e.stopPropagation();$('#sheet').hidden=true;go('og:'+el.dataset.og);return}
  if(el=g('[data-emode]')){e.preventDefault();e.stopPropagation();S.emode=el.dataset.emode;S.limit=60;render();return}
  if(g('[data-emore]')){e.preventDefault();e.stopPropagation();S.limit=(S.limit||60)+60;render();return}
},true);
const _navGoE=navGo;
navGo=function(gk){
  if(gk==='elections'||gk==='ogroups'){closeDrawer();$('#sheet').hidden=true;S.stack=[];S.tab='search';S.limit=60;go(gk);return}
  _navGoE(gk);
};
const _drawerHtmlE=drawerHtml;
drawerHtml=function(){
  const days=daysToElection();
  const item=`<div class="dsec"><button class="ditem big" data-go="elections">${NAVI.flag}<span>2026 elections</span>${days>0?`<em>${days} days</em>`:''}</button></div>`;
  return _drawerHtmlE().replace(/(<div class="dsec">\s*<button class="ditem big" data-go="home">)/,item+'$1');
};
/* home: election banner, plus "your races" for signed-in users */
const _homeEl=home;
home=function(){
  loadRaces();
  const days=daysToElection();
  const mine=signedIn()?myRaces():[];
  const block=`<section class="sec elhome"><div class="sh"><h2>2026 elections</h2><button data-go="elections">All races</button></div>
    <button class="elcard" data-go="elections"><b>${days>0?`${days} days to go`:'Election Day'}</b><span>All 435 House seats and 35 Senate seats are on the ballot Nov 3. See who's running and who's paying for it.</span></button>
    ${mine.length?`<div class="group" style="margin-top:10px">${mine.map(r=>raceRow(r,'Your race')).join('')}</div>`:''}</section>`;
  return _homeEl().replace(/(<section class="sec dash">)/,block+'$1');
};
/* member profiles link to their race */
const _renderEl2=render;
render=function(){
  _renderEl2();
  try{
    const cur=S.stack.at(-1);const m=cur&&byId[cur];
    if(m&&EL.races){const r=raceFor(m);const chip=document.querySelector('#app .pchips span');if(r&&chip&&!chip.dataset.race){chip.dataset.race=r.id;chip.setAttribute('role','button');chip.classList.add('chiplink');chip.textContent+=' ›'}}
    else if(m)loadRaces();
  }catch(e){console.warn(e)}
};
