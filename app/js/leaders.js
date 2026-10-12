/* ================= Leaders tab: White House, Cabinet, Supreme Court ================= */
const LEAD_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path class="f" d="M12 3l9 4H3z"/><path d="M5 9v8M9.5 9v8M14.5 9v8M19 9v8M3 20h18"/></svg>';
const ageOf=b=>{if(!b)return null;const y=+String(b).slice(0,4);return 2026-y-((b.length>4&&b.slice(5)>'10-11')?1:0)};
const yrsSince=d=>d?Math.max(0,Math.floor((new Date('2026-10-11')-new Date(d))/31557600000)):0;
function leaderCard(o){
  return `<button class="lcard ${o.cls||''}" ${o.attr||''}>${o.face}<span class="lcb"><span class="lck">${esc(o.kick)}</span><b>${esc(o.name)}</b><span class="lcs">${o.sub}</span></span>${chev}</button>`;
}
function whiteHouse(L){
  const P=L.pres,V=L.vp,cos=L.cab.find(c=>c[0]==='White House Chief of Staff');
  const pf=H?(HP[P.id]||HC[P.id]):null,vf=H?(HP[V.id]||HC[V.id]):null;
  const ini=n=>`<span class="face fb ring-R" style="width:76px;height:76px;font-size:27px">${esc(initialsOf(n))}</span>`;
  const nth=t=>t;
  return `<div class="lhero bg-white"><span class="billno">The executive branch</span><h1>Who runs the White House</h1><span>${esc(P.party)} administration since ${fmtISO(P.since)}</span></div>
   <section class="sec"><div class="lbig p-R">
     <button class="lmain" ${pf?`data-hp="${P.id}"`:''}>${pf?hFace(pf,76):ini(P.n)}<span><span class="lck">President</span><b>${esc(P.n)}</b><span class="lcs">${esc(P.party)} · in office ${P.terms.map(t=>`${t[0]}–${t[1]>2026?'now':t[1]}`).join(' and ')}${P.b?` · age ${ageOf(P.b)}`:''}</span></span></button>
     <button class="lmain" ${vf?`data-hp="${V.id}"`:''}>${vf?hFace(vf,76):ini(V.n)}<span><span class="lck">Vice President</span><b>${esc(V.n)}</b><span class="lcs">${esc(V.party)} · since ${fmtISO(V.since)}${V.b?` · age ${ageOf(V.b)}`:''}${vf?.chambers?.includes('S')?' · former senator':''}</span></span></button>
   </div></section>
   ${cos?`<section class="sec"><div class="sh"><h2>Inner circle</h2></div><div class="group">${leaderCard({face:`<span class="face fb nomf" style="width:44px;height:44px;font-size:15px">${esc(initialsOf(cos[3].n))}</span>`,kick:'White House Chief of Staff',name:cos[3].n,sub:`Since ${fmtISO(cos[3].since)} · appointed, no Senate vote`})}</div></section>`:''}
   <section class="sec"><div class="sh"><h2>The Cabinet at a glance</h2><button data-lmode2="cabinet">See all</button></div>
    <div class="tiles" style="border-radius:16px;overflow:hidden"><div><b>${L.cab.filter(c=>c[2]==='dept').length}</b><span>department heads</span></div><div><b>${L.cab.filter(c=>c[2]==='level').length}</b><span>cabinet-level officials</span></div>
    <div><b>${L.cab.filter(c=>c[3].since>='2026-01-01').length}</b><span>replaced in 2026</span></div><div><b>${(()=>{const v=L.cab.filter(c=>c[3].y!=null);return v.length?Math.round(v.reduce((a,c)=>a+c[3].y,0)/v.length):'—'})()}</b><span>average yes votes to confirm</span></div></div></section>
   ${H?`<section class="sec"><div class="sh"><h2>Past presidents</h2><button data-go="hist:exec">All</button></div><div class="group">${EXEC.filter(p=>p.t.some(t=>t[0]==='P')&&p.id!==P.id).slice(0,5).map(p=>{const pt=p.t.filter(t=>t[0]==='P');return `<button class="row" ${HC[p.id]?`data-p="${p.id}"`:`data-hp="${p.id}"`}>${hFace(p,44)}<span style="min-width:0"><span class="t">${esc(p.n)}</span><br><span class="s">President ${pt[0][1]}–${pt.at(-1)[2]>2026?'now':pt.at(-1)[2]} · ${esc(pt.at(-1)[5])}</span></span><span class="rr">${chev}</span></button>`}).join('')}</div></section>`:''}`;
}
function cabinetView(L){
  const row=c=>{const [pos,dept,kind,h]=c;const n=h.nid&&nomById[h.nid];
    return leaderCard({attr:n?`data-n="${n.id}"`:'',face:n?nomFace(n,48):`<span class="face fb nomf" style="width:48px;height:48px;font-size:16px">${esc(initialsOf(h.n))}</span>`,kick:dept,name:h.n,
      sub:`${esc(pos.replace(/^Representative of the United States of America to the United Nations.*/,'Ambassador to the United Nations'))}<br>${h.y!=null?`Confirmed ${h.y}–${h.nn} · `:''}since ${fmtISO(h.since)}${h.since>='2026-01-01'?' <em class="newtag">New</em>':''}`})};
  return `<div class="lhero bg-capitol"><span class="billno">Cabinet</span><h1>The President's Cabinet</h1><span>Heads of the 15 executive departments plus cabinet-level officials</span></div>
   <section class="sec"><div class="sh"><h2>Department heads</h2><span class="cap" style="padding:0">In line of succession</span></div><div class="group">${L.cab.filter(c=>c[2]==='dept').map(row).join('')}</div></section>
   <section class="sec"><div class="sh"><h2>Cabinet-level officials</h2></div><div class="group">${L.cab.filter(c=>c[2]==='level').map(row).join('')}</div>
   <div class="cap">Current holders based on the latest Senate confirmation vote for each office. Acting officials who were never confirmed aren't listed.</div></section>`;
}
function courtView(L){
  const C=L.court,rep=C.filter(c=>c.bp==='Republican').length,dem=C.filter(c=>c.bp==='Democratic').length;
  const ages=C.map(c=>ageOf(c.b)).filter(Boolean);
  const longest=[...C].sort((a,b)=>a.since.localeCompare(b.since))[0];
  return `<div class="lhero bg-court"><span class="billno">Judicial branch</span><h1>The Supreme Court</h1><span>Nine justices, appointed for life</span></div>
   <section class="sec"><div class="sh"><h2>Who appointed them</h2></div><div class="group pad">
     <div class="bench">${C.map(c=>`<button data-ha="${c.jid}" class="seat ${c.bp==='Republican'?'sr':'sd'}" title="${esc(c.n)}"><b>${esc(c.last)}</b><span>${esc((c.by||'').split(' ').pop())}</span></button>`).join('')}</div>
     <div class="mini-legend" style="margin-top:12px"><span><i style="background:var(--R)"></i>${rep} by Republican presidents</span><span><i style="background:var(--D)"></i>${dem} by Democratic presidents</span></div></div></section>
   <div class="tiles" style="border-radius:16px;overflow:hidden;margin-top:12px"><div><b>${Math.round(ages.reduce((a,b)=>a+b,0)/ages.length)}</b><span>average age</span></div><div><b>${yrsSince(longest.since)} yrs</b><span>longest serving: ${esc(longest.last)}</span></div></div>
   <section class="sec"><div class="sh"><h2>The justices</h2></div><div class="group">${C.map(c=>{const v=/\d+\/\d+/.test(c.v)?c.v.replace('/','–'):c.v||'—';
     return leaderCard({attr:`data-ha="${c.jid}"`,face:`<span class="face fb ring-${c.bp==='Republican'?'R':'D'}" style="width:48px;height:48px;font-size:16px">${esc(initialsOf(c.n))}</span>`,kick:c.t==='Chief Justice'?'Chief Justice':'Associate Justice',name:c.n,
      sub:`Appointed by ${esc(c.by)} · confirmed ${esc(v)}<br>On the Court since ${c.since.slice(0,4)} (${yrsSince(c.since)} yrs)${c.b?` · age ${ageOf(c.b)}`:''}${c.edu?.length?` · ${esc(c.edu[c.edu.length-1][0].replace(/ School of Law| Law School/,' Law'))}`:''}`})}).join('')}</div>
   <div class="cap">From the Federal Judicial Center. Tap a justice for education, career before the bench and the Senate vote.</div></section>
   ${H?`<section class="sec"><div class="sh"><h2>Past justices</h2><button data-hkgo="apps">All judges</button></div><div class="group">${APPS.filter(a=>a.k==='Judge'&&a.pos?.some(p=>/Supreme Court/.test(p[PK_I.o]))&&!C.some(c=>c.jid===a.id)).sort((a,b)=>(b.ly||0)-(a.ly||0)).slice(0,6).map(a=>appRow(a,'')).join('')}</div></section>`:''}`;
}
function leadersScreen(){
  if(!G)return `<div class="wrap"><div class="calm" style="margin-top:20px">${LOADERR.pages?`Couldn't load this section (${esc(LOADERR.pages)}). Try reloading.`:'Loading…'}</div></div>`;
  const L=G.leaders;S.lmode2=S.lmode2||'wh';
  const seg=`<div class="scopes" style="margin:0 -16px;padding:calc(env(safe-area-inset-top,0px) + 14px) 16px 4px">${[['wh','White House'],['cabinet','Cabinet'],['court','Supreme Court']].map(([k,l])=>`<button data-lmode2="${k}" aria-pressed="${k===S.lmode2}">${l}</button>`).join('')}<button data-menu aria-label="Open menu" style="margin-left:auto">${MENU_ICON}</button></div>`;
  return `<div class="wrap">${seg}${S.lmode2==='wh'?whiteHouse(L):S.lmode2==='cabinet'?cabinetView(L):courtView(L)}</div>`;
}
/* wiring */
TABS2.splice(2,0,['leaders','Leaders',LEAD_ICON]);
const _render3=render;
render=function(){
  if(!S.stack.length&&S.tab==='leaders'){
    if($('#sheet').hidden)$('#panel').className='panel';
    $('#app').innerHTML=leadersScreen();
    $('#tabbar').innerHTML=TABS2.map(([k,l,svg])=>`<button data-tab="${k}" aria-current="${k===S.tab?'page':'false'}">${svg}${l}</button>`).join('');
    return;
  }
  _render3();
};
document.addEventListener('click',e=>{
  const g=s=>e.target.closest(s);let el;
  if(el=g('[data-lmode2]')){e.stopImmediatePropagation();S.stack=[];S.tab='leaders';S.lmode2=el.dataset.lmode2;render();scrollTo(0,0);return}
  if(el=g('[data-go^="leaders:"]')){e.stopImmediatePropagation();closeDrawer();$('#sheet').hidden=true;S.stack=[];S.tab='leaders';S.lmode2=el.dataset.go.split(':')[1];render();scrollTo(0,0);return}
},true);
const _drawerHtml2=drawerHtml;
drawerHtml=function(){return _drawerHtml2().replace(`<div class="dgroup ${S.dopen.congress?'open':''}"><button class="dhead" data-dtoggle="congress"`,navGroup('leaders',LEAD_ICON,'Leaders',[['leaders:wh','President & Vice President'],['leaders:cabinet','The Cabinet'],['leaders:court','Supreme Court']])+`<div class="dgroup ${S.dopen.congress?'open':''}"><button class="dhead" data-dtoggle="congress"`)};
render();
