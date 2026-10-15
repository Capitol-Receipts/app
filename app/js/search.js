/* ================= Search: one box for everything, browse tiles, grouped results ================= */
const SI={
 people:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M17.5 14.6c2.2.4 3.6 2.1 4 4.9"/></svg>',
 senate:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l9 4H3z"/><path d="M5 9v8M9.5 9v8M14.5 9v8M19 9v8M3 20h18"/></svg>',
 house:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 20V10l8-5 8 5v10"/><path d="M9 20v-5h6v5M2 20h20"/><circle cx="12" cy="10" r="1.6"/></svg>',
 ...NAVI
};
let RECENT=store.get('recent',[]);
const saveRecent=q=>{q=q.trim();if(q.length<2)return;RECENT=[q,...RECENT.filter(x=>x.toLowerCase()!==q.toLowerCase())].slice(0,6);store.set('recent',RECENT)};
const hl=(t,q)=>{t=String(t??'');if(!q)return esc(t);const i=t.toLowerCase().indexOf(q);return i<0?esc(t):esc(t.slice(0,i))+'<mark>'+esc(t.slice(i,i+q.length))+'</mark>'+esc(t.slice(i+q.length))};
const SCOPES=[['All','Everything',null],['Congress','Congress','people'],['Senate','Senate','senate'],['House','House','house'],['Appointees','Appointees','badge'],['History','History','clock']];
function searchHeader(ph){
  const scope=SCOPES.find(s=>s[0]===S.filter)||SCOPES[0];
  return `<div class="shead">
    <div class="sbar"><label class="sfield">${SI.search}<input id="q" type="search" placeholder="${S.filter==='All'?'Search people, bills, groups, committees':esc(ph)}" value="${esc(S.q)}" aria-label="Search" autocomplete="off" enterkeyhint="search">${S.q?'<button class="sclear" data-sclear aria-label="Clear search">×</button>':''}</label><button class="hamb" data-menu aria-label="Open menu">${MENU_ICON}</button></div>
    <div class="scopes">${SCOPES.map(([k,l,ic])=>`<button data-f="${k}" aria-pressed="${k===scope[0]}">${ic?SI[ic]:''}${l}</button>`).join('')}</div>
  </div>`;
}
function tile(go,ic,label,sub,cls){return `<button class="btile ${cls}" ${go}><span class="bti">${SI[ic]||NAVI[ic]}</span><b>${label}</b><span>${sub}</span></button>`}
function discover(){
  const sen=MEM.filter(m=>m.chamber==='Senate').length,hou=MEM.filter(m=>m.chamber==='House').length;
  const st=S.home?MEM.filter(m=>m.state===S.home).slice(0,8):[];
  const tries=['Pelosi','Texas','H.R. 1','Pfizer','Agriculture','Cuellar','Lincoln','Realtors'];
  return `${S.tab==='home'?'<div style="display:none">':''}<div class="lbanner bg-old" style="margin-top:14px"><h1>236 years of public records</h1><span>Every member since 1789, every bill since 1947, and who pays to lobby them.</span></div>${S.tab==='home'?'</div>':''}
   ${zipSection()}
   ${RECENT.length?`<section class="sec"><div class="sh"><h2>Recent</h2><button data-rclear>Clear</button></div><div class="tries">${RECENT.map(r=>`<button data-try="${esc(r)}">${SI.clock}${esc(r)}</button>`).join('')}</div></section>`:''}
   <section class="sec"><div class="sh"><h2>Browse</h2></div><div class="bgrid">
    ${tile('data-f="Senate"','senate','Senators',`${sen} in office`,'t-blue')}
    ${tile('data-f="House"','house','House',`${hou} members`,'t-red')}
    ${tile('data-go="bills:lobbied"','doc','Bills & laws',H?`${ord(Object.keys(H.bills).length)} bills`:'Since 2003','t-violet')}
    ${tile('data-go="lobbying:groups"','flag','Lobbying',G?`${ord(Object.keys(G.clients).length)} groups`:'Who pays','t-amber')}
    ${tile('data-go="committees:house"','cap','Committees',G?`${Object.keys(G.comm).length} panels`:'Who oversees what','t-teal')}
    ${tile('data-f="Appointees"','badge','Appointees',`${NOM.length} confirmed`,'t-slate')}
    ${tile('data-go="ethics"','info','Ethics reviews',G?`${G.ethics.length} statements`:'House Ethics','t-rose')}
    ${tile('data-f="History"','clock','History',H?`${ord(PASTS.length+APPS.length)} people`:'Since 1789','t-ink')}
   </div></section>
   <section class="sec"><div class="sh"><h2>By party</h2><button data-compare>Compare</button></div><div class="ptiles">${['D','R','I'].map(p=>{const s=partyStats(p);return `<button class="ptile p-${p}" data-party-page="${p}"><span class="pbadge sm">${p}</span><b>${s.n}</b><span>${PARTYNAME[p]}</span></button>`}).join('')}</div></section>
   <section class="sec"><div class="sh"><h2>Leaderboards</h2></div><div class="rgrid">${[['trades','stocks','Stock traders'],['comm','stocks','Trades tied to committees'],['missed','votes','Missed votes'],['breaks','votes','Party rebels'],['raised','money','Top fundraisers'],['small','money','Small-donor backed'],['pac','money','PAC-funded'],['rev','influence','Ex-staff lobbying']].map(([k,c,l])=>`<button class="rk c-${c}" data-rank="${k}">${CAT[c].icon}<span>${l}</span></button>`).join('')}</div></section>
   <section class="sec"><div class="sh"><h2>Try searching</h2></div><div class="tries">${tries.map(t=>`<button data-try="${t}">${SI.search}${t}</button>`).join('')}</div></section>`;
}
function scoreName(name,q){const n=name.toLowerCase();if(n===q)return 100;if(n.split(/\s+/).some(w=>w===q))return 80;if(n.startsWith(q))return 70;if(n.split(/\s+/).some(w=>w.startsWith(q)))return 60;if(n.includes(q))return 40;return 0}
function resultsFor(qRaw){
  const q=qRaw.trim().toLowerCase();
  const stateHit=Object.entries(ST).find(([k,v])=>v.toLowerCase()===q||k.toLowerCase()===q);
  const mem=MEM.map(m=>[m,stateHit&&m.state===stateHit[0]?65:Math.max(scoreName(m.name,q),scoreName(m.full,q),m.search.includes(q)?20:0)]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]||(a[0].chamber==='Senate'?-1:1));
  const noms=NOM.map(n=>[n,Math.max(scoreName(n.name,q),n.search.includes(q)?20:0)]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]);
  const past=H?PASTS.filter(p=>p.chambers.length||p.isExec).map(p=>[p,Math.max(scoreName(p.n,q),p.search.includes(q)?15:0)]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]||(b[0].lastY||0)-(a[0].lastY||0)):[];
  const apps=H?APPS.map(a=>[a,Math.max(scoreName(a.n,q),a.search.includes(q)?15:0)]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]||(b[0].ly||0)-(a[0].ly||0)):[];
  let bills=[];
  if(H){const m=q.replace(/[.\s]/g,'').match(/^(hr|s|hjres|sjres)(\d+)$/);
    if(m)bills=Object.keys(H.bills).filter(k=>{const p=bkParse(k);return p.ty===m[1]&&p.n===+m[2]}).sort((a,b)=>bkParse(b).c-bkParse(a).c);
    else if(q.length>=3)bills=Object.keys(H.bills).filter(k=>(H.bills[k][1]||H.bills[k][0]).toLowerCase().includes(q)).sort((a,b)=>(H.bills[b][10].L?1:0)-(H.bills[a][10].L?1:0)||bkParse(b).c-bkParse(a).c);}
  const lob=G&&q.length>=3?Object.values(G.clients).filter(c=>c.n.toLowerCase().includes(q)).sort((a,b)=>b.spend-a.spend):[];
  const firms=G&&q.length>=3?Object.values(G.firms).filter(f=>f.n.toLowerCase().includes(q)).sort((a,b)=>b.inc-a.inc):[];
  const coms=G&&q.length>=3?Object.values(G.comm).filter(c=>c.short.toLowerCase().includes(q)||(c.jur||'').toLowerCase().includes(q)):[];
  const eth=G&&q.length>=3?G.ethics.filter(e=>e.t.toLowerCase().includes(q)):[];
  return {q,mem,noms,past,apps,bills,lob,firms,coms,eth,stateHit};
}
function resultSection(title,items,render,n=4,more){
  if(!items.length)return '';
  return `<section class="sec rsec"><div class="sh"><h2>${title}<span class="rcount">${ord(items.length)}</span></h2>${more&&items.length>n?`<button ${more}>See all</button>`:''}</div><div class="group">${items.slice(0,n).map(render).join('')}</div></section>`;
}
function topCard(r){
  const q=r.q;let t=null;
  const best=[[r.mem[0]?.[1]||0,'m'],[r.noms[0]?.[1]||0,'n'],[(r.past[0]?.[1]||0)-5,'p'],[(r.apps[0]?.[1]||0)-8,'a']].sort((a,b)=>b[0]-a[0])[0];
  if(r.bills.length&&/^(hr|s|hjres|sjres)\s*\.?\s*\d+$/i.test(q.replace(/\./g,''))){const k=r.bills[0],b=H.bills[k],p=bkParse(k);
    t=`<button class="topcard t-violet" data-bk="${k}"><span class="tck">Bill · ${esc(p.label)} · ${congLabel(p.c)}</span><b>${esc(b[1]||b[0])}</b><span class="tcs">${billStatus(b,p.ty)[0]} · ${ord(b[5])} co-sponsors</span></button>`}
  else if(best[0]>=60&&!r.stateHit){
    if(best[1]==='m'){const m=r.mem[0][0];t=`<button class="topcard p-${m.party}" data-p="${m.id}">${face(m,64,false)}<span class="tcb"><span class="tck">${esc(m.partyName)} · ${m.chamber==='Senate'?'Senator':'Representative'}</span><b>${hl(m.name,q)}</b><span class="tcs">${esc(m.where)}${m.money?` · raised ${M(m.money.rec)}`:''}${m.tradeN?` · ${ord(m.tradeN)} trades`:''}</span></span></button>`}
    else if(best[1]==='n'){const n=r.noms[0][0];t=`<button class="topcard t-slate" data-n="${n.id}">${nomFace(n,64)}<span class="tcb"><span class="tck">Appointee · confirmed ${n.y}–${n.n}</span><b>${hl(n.name,q)}</b><span class="tcs">${esc(n.pos)}</span></span></button>`}
    else if(best[1]==='p'){const p=r.past[0][0];t=`<button class="topcard p-${p.pc}" data-hp="${p.id}">${hFace(p,64)}<span class="tcb"><span class="tck">Former ${ROLE[(p.t.at(-1)||[])[0]]||'official'} · ${p.firstY}–${p.lastY>2026?'now':p.lastY}</span><b>${hl(p.n,q)}</b><span class="tcs">${esc((p.t.at(-1)||[])[5]||'')}${p.years?` · ${p.years} years in Congress`:''}</span></span></button>`}
    else{const a=r.apps[0][0];t=`<button class="topcard t-slate" data-ha="${a.id}">${hFace(a,64)}<span class="tcb"><span class="tck">Past appointee</span><b>${hl(a.n,q)}</b><span class="tcs">${esc(a.ttl||'')}</span></span></button>`}
  }else if(r.coms[0]&&scoreName(r.coms[0].short,q)>=60){const c=r.coms[0];t=`<button class="topcard t-teal" data-com="${c.id}"><span class="tcb"><span class="tck">${c.ch==='senate'?'Senate':c.ch==='joint'?'Joint':'House'} committee</span><b>${hl(c.short,q)}</b><span class="tcs">${c.mem.length} members</span></span></button>`}
  else if(r.lob[0]&&scoreName(r.lob[0].n,q)>=70){const c=r.lob[0];t=`<button class="topcard t-amber" data-lob="${c.id}"><span class="tcb"><span class="tck">Lobbying group</span><b>${hl(c.n,q)}</b><span class="tcs">${M(c.spend)} on lobbying${c.nlob?` · ${c.nlob} lobbyists`:''}</span></span></button>`}
  return t?`<section class="sec">${t}</section>`:'';
}
/* Democrats vs Republicans across whatever the search returned: small side-by-side tiles */
function partyCompare(ms,title){
  const P={D:ms.filter(m=>m.party==='D'),R:ms.filter(m=>m.party==='R')};
  if(P.D.length+P.R.length<3||!P.D.length||!P.R.length)return '';
  const avg=(a,f)=>{const v=a.map(f).filter(x=>x!=null&&!isNaN(x));return v.length?v.reduce((x,y)=>x+y,0)/v.length:null};
  const tot=(a,f)=>a.reduce((x,m)=>x+(f(m)||0),0);
  const rows=[
    ['Members',a=>a.length,n=>ord(n)],
    ['Avg. raised for 2026',a=>avg(a,m=>m.money?.rec),M],
    ['Stock trades',a=>tot(a,m=>m.tradeN),n=>ord(n)],
    ['Trades tied to committees',a=>tot(a,m=>m.commTrades),n=>ord(n)],
    ['Avg. votes missed',a=>avg(a,m=>m.elig>=50?m.missed:null),n=>pct(n,1)],
    ['Votes with own party',a=>avg(a,m=>m.unityN>=50?m.unity:null),n=>pct(n,0)],
    ['Ex-staff now lobbyists',a=>tot(a,m=>m.revN),n=>ord(n)],
  ];
  const tiles=rows.map(([l,f,fmt])=>{const d=f(P.D),r=f(P.R);if(d==null&&r==null)return '';
    const t=(d||0)+(r||0)||1,dp=Math.round((d||0)/t*100);
    const lead=Math.abs((d||0)-(r||0))/Math.max(d||0,r||0,1)<.05?'':(d||0)>(r||0)?'D':'R';
    return `<div class="pct"><span class="pctl">${l}</span><div class="pctv"><b class="d ${lead==='D'?'hi':''}">${d==null?'—':fmt(d)}</b><b class="r ${lead==='R'?'hi':''}">${r==null?'—':fmt(r)}</b></div><div class="pcts"><i class="d" style="width:${dp}%"></i><i class="r" style="width:${100-dp}%"></i></div></div>`}).join('');
  const others=ms.length-P.D.length-P.R.length;
  return `<section class="sec pcmp wide"><div class="sh"><h2>${esc(title||'Democrats vs Republicans')}</h2><span class="pkey"><span class="d">Democrats</span><span class="r">Republicans</span>${others?`<em>+${others} independent${others>1?'s':''}</em>`:''}</span></div>
    <div class="pctiles">${tiles}</div></section>`;
}
function universal(){
  const r=resultsFor(S.q),q=r.q;
  const total=r.mem.length+r.noms.length+r.past.length+r.apps.length+r.bills.length+r.lob.length+r.firms.length+r.coms.length+r.eth.length;
  if(!total)return `<div class="calm" style="margin-top:18px"><b>No matches for “${esc(S.q)}”.</b> Try a last name, a state, a bill number like “H.R. 1”, or a company.</div>`;
  const chips=[['mem','People',r.mem.length],['bills','Bills',r.bills.length],['lob','Lobbying',r.lob.length+r.firms.length],['coms','Committees',r.coms.length],['noms','Appointees',r.noms.length+r.apps.length],['past','History',r.past.length],['eth','Ethics',r.eth.length]].filter(x=>x[2]);
  return `<div class="rjump">${chips.map(([k,l,n])=>`<button data-rjump="r-${k}">${l} <em>${n>99?'99+':n}</em></button>`).join('')}</div>
   ${(()=>{const t=topCard(r);r.topIsMem=t.includes('data-p="'+(r.mem[0]?.[0].id)+'"');return t})()}
   ${partyCompare(r.mem.map(x=>x[0]),r.stateHit?`${r.stateHit[1]}: Democrats vs Republicans`:'Democrats vs Republicans in these results')}
   <div id="r-mem"></div>${resultSection(r.stateHit?`Representing ${esc(r.stateHit[1])}`:'Members of Congress',r.mem.map(x=>x[0]).slice(r.topIsMem&&!r.stateHit?1:0),m=>memRow(m),r.stateHit?12:5,'data-sall="Congress"')}
   <div id="r-bills"></div>${resultSection('Bills & laws',r.bills,k=>billRow(k),5,'data-go="bills:laws"')}
   <div id="r-lob"></div>${resultSection('Lobbying groups',r.lob,c=>`<button class="row plain" data-lob="${c.id}" style="grid-template-columns:1fr auto auto"><span style="min-width:0"><span class="t">${hl(c.n,q)}</span><br><span class="s">${c.iss.slice(0,2).map(([k])=>issueName(k)).join(' · ')}</span></span><span class="val" style="font-size:15px">${M(c.spend)}</span>${chev}</button>`,4,'data-go="lobbying:groups"')}
   ${resultSection('Lobbying firms',r.firms,f=>`<button class="row plain" data-firm="${f.id}" style="grid-template-columns:1fr auto auto"><span class="t">${hl(f.n,q)}</span><span class="val" style="font-size:15px">${M(f.inc)}</span>${chev}</button>`,3,'data-go="lobbying:firms"')}
   <div id="r-coms"></div>${resultSection('Committees',r.coms,c=>`<button class="row plain" data-com="${c.id}" style="grid-template-columns:1fr auto"><span style="min-width:0"><span class="t">${hl(c.short,q)}</span><br><span class="s">${c.ch==='senate'?'Senate':c.ch==='joint'?'Joint':'House'} · ${c.mem.length} members</span></span>${chev}</button>`,4)}
   <div id="r-noms"></div>${resultSection('Appointees since 2025',r.noms.map(x=>x[0]),n=>nomRow(n),4,'data-sall="Appointees"')}
   ${resultSection('Past appointees',r.apps.map(x=>x[0]),a=>appRow(a),4,'data-hkgo="apps"')}
   <div id="r-past"></div>${resultSection('Former members & presidents',r.past.map(x=>x[0]),p=>pastRow(p),5,'data-sall="History"')}
   <div id="r-eth"></div>${resultSection('Ethics reviews',r.eth,ethRow,3,'data-go="ethics"')}`;
}
/* the main search screen */
searchScreen=function(){
  if(S.filter==='All'||!S.filter){
    S.filter='All';
    return `<div class="wrap">${searchHeader('')}${S.q.trim()?universal():discover()}</div>`;
  }
  return explore();
};
document.addEventListener('click',e=>{
  const g=s=>e.target.closest(s);let el;
  if((el=g('.scopes [data-f]'))&&el.dataset.f!==S.filter){S.q='';S.limit=60}
  if(g('[data-thmore]')){e.stopImmediatePropagation();S.thlimit=(S.thlimit||20)+60;if(!$('#sheet').hidden&&S.stack.at(-1)&&byId[S.stack.at(-1)])topicSheet('career');else render();return}
  if(el=g('[data-try]')){e.stopImmediatePropagation();S.q=el.dataset.try;S.filter='All';render();return}
  if(g('[data-rclear]')){e.stopImmediatePropagation();RECENT=[];store.set('recent',[]);render();return}
  if(g('[data-sclear]')){e.stopImmediatePropagation();S.q='';S.limit=60;render();setTimeout(()=>$('#q')?.focus(),0);return}
  if(el=g('[data-rjump]')){e.stopImmediatePropagation();const t=document.getElementById(el.dataset.rjump);if(t)scrollTo({top:t.getBoundingClientRect().top+scrollY-120,behavior:'smooth'});return}
  if(el=g('[data-sall]')){e.stopImmediatePropagation();S.filter=el.dataset.sall;S.limit=60;if(S.filter==='History')S.hk='members';render();scrollTo(0,0);return}
  // remember what people searched for when they open a result
  if(S.tab==='search'&&!S.stack.length&&S.q.trim().length>=2&&g('[data-p],[data-n],[data-hp],[data-ha],[data-bk],[data-lob],[data-firm],[data-com],[data-eth]'))saveRecent(S.q);
},true);

/* Home is the Everything page: search, browse, parties and leaderboards, with the election countdown on top */
home=function(){
  if(S.filter!=='All')S.filter='All';
  const el=typeof elHomeBlock==='function'?elHomeBlock():'';
  const hero=`<div class="homehero bg-capfull"><header class="brandbar"><div class="logo"><span>Capitol</span>Receipts</div><span class="asof">Updated ${fmtISO(lastUpdated())}</span></header><h1 class="hello">Who's in Congress, who pays them, and how they vote.</h1><button class="langbtn notr" data-lang="${S.lang==='es'?'en':'es'}">${S.lang==='es'?'English':'Español'}</button></div>`;
  return `<div class="wrap home">${S.q.trim()?'':hero}${searchHeader('')}${S.q.trim()?universal():el+discover()}</div>`;
};
