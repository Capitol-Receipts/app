/* ================= PAC pages: who each PAC gives money to (FEC, 1980–2026) ================= */
let PACBY=null;
const pnorm=s=>(s||'').toLowerCase().replace(/\b(pac|political action committee|inc|llc|corp|corporation|the|federal|fund|committee)\b/g,'').replace(/[^a-z0-9]/g,'');
function pacIndex(){
  if(PACBY||!H||!H.pacs)return PACBY;
  PACBY=new Map();
  const put=(k,id)=>{if(!k)return;const o=PACBY.get(k);if(!o||H.pacs[o].tot<H.pacs[id].tot)PACBY.set(k,id)};
  for(const [id,p] of Object.entries(H.pacs)){put(p.n.toLowerCase(),id);put(p.fn&&p.fn.toLowerCase(),id);put('~'+pnorm(p.n),id);p.fn&&put('~'+pnorm(p.fn),id)}
  return PACBY;
}
function pacFor(name){const ix=pacIndex();if(!ix||!name)return null;const n=name.trim();return ix.get(n.toLowerCase())||ix.get('~'+pnorm(n))||null}
const PARTYC={D:'var(--D, #2557a8)',R:'var(--R, #c8323a)',I:'#6b6f78'};
function personRowPac(bg,right,sub){
  const m=byId[bg];
  if(m)return `<button class="row" data-p="${bg}" style="grid-template-columns:auto 1fr auto auto">${face(m,40)}<span style="min-width:0"><span class="t">${esc(m.name)}</span><br><span class="s">${esc(partyLine(m))}${sub?' · '+sub:''}</span></span><span class="val">${right}</span>${chev}</button>`;
  const p=H&&(HP[bg]||HC[bg]);
  if(p)return `<button class="row" data-hp="${bg}" style="grid-template-columns:auto 1fr auto auto">${hFace(p,40)}<span style="min-width:0"><span class="t">${esc(p.n)}</span><br><span class="s">${esc([PN[p.pc]||p.lp||'',p.firstY&&p.lastY?`${p.firstY}–${Math.min(p.lastY,2026)}`:''].filter(Boolean).join(' · '))}${sub?' · '+sub:''}</span></span><span class="val">${right}</span>${chev}</button>`;
  return '';
}
function pacPage(id){
  if(!H)return loading('PAC records');const p=H.pacs&&H.pacs[id];if(!p)return `<div class="wrap"><div class="empty">Not found.</div></div>`;
  const sp=p.sp||{},spT=Object.values(sp).reduce((a,b)=>a+b,0)||1;
  const parts=[['D','Democrats'],['R','Republicans'],['I','Independents']].filter(([k])=>sp[k]>0);
  const lob=typeof clientFor==='function'?clientFor(p.n):null;
  const lean=(sp.D||0)/spT>=.75?'Gives mostly to Democrats.':(sp.R||0)/spT>=.75?'Gives mostly to Republicans.':'Gives to both parties.';
  return `${pageHead(p.n)}
  <section class="phero p-N bg-capitol"><div class="in" style="padding-top:calc(var(--navh) + 18px)"><span class="billno">PAC · ${esc(p.cat)}</span><h1 style="font-size:${p.n.length>40?24:30}px">${esc(p.n)}</h1>${p.fn?`<div class="psub">${esc(p.fn)}</div>`:''}${p.loc?`<div class="pchips"><span>${esc(p.loc)}</span></div>`:''}</div></section>
  <div class="wrap">
   <div class="glance">${glance('Given to Congress',M(p.tot),p.yrs[0]?`since ${p.yrs[0]}`:'',false)}${glance('Members funded',ord(p.nr),'current & former',false)}${glance('This cycle',p.curT?M(p.curT):'$0',p.curN?`to ${p.curN} members`:'2025–26',false)}</div>
   ${S.lang==='es'?`<section class="pe-card"><div class="pe-h">En resumen</div><p>${esc(p.n)} es un PAC (${esc(trx(p.cat).toLowerCase())}) que ha dado ${M(p.tot)} a ${ord(p.nr)} personas que sirvieron en el Congreso${p.yrs[0]?` desde ${p.yrs[0]}`:''}. ${(sp.D||0)/spT>=.75?'Le da sobre todo a demócratas.':(sp.R||0)/spT>=.75?'Le da sobre todo a republicanos.':'Le da a ambos partidos.'}${p.curT?` En el ciclo electoral 2025\u201326 ha dado ${M(p.curT)} hasta ahora.`:''}</p></section>`:`<section class="pe-card"><div class="pe-h">In plain English</div><p>${esc(p.n)} is a ${esc(p.cat.toLowerCase().replace(/s$/,'').replace('company pac','company PAC').replace('trade group','trade group PAC').replace('labor union','labor union PAC'))} that has given ${M(p.tot)} to ${ord(p.nr)} people who served in Congress${p.yrs[0]?` since ${p.yrs[0]}`:''}. ${lean}${p.curT?` In the 2025–26 election cycle it has given ${M(p.curT)} so far.`:''}</p></section>`}
   ${parts.length?`<div class="sec"><div class="sh"><h2>Which party gets the money</h2></div><div class="group pad"><div class="stack" style="height:14px">${parts.map(([k])=>`<span style="width:${(sp[k]/spT*100).toFixed(1)}%;background:${PARTYC[k]}"></span>`).join('')}</div><div class="mini-legend" style="margin-top:10px">${parts.map(([k,l])=>`<span><i style="background:${PARTYC[k]}"></i>${l} ${pct(sp[k]/spT)} · ${M(sp[k])}</span>`).join('')}</div></div><div class="cap">Money given to people who served in Congress, by the party they were in. ${p.oth?`Another ${M(p.oth[0])} went to ${ord(p.oth[1])} candidates who never won a seat.`:''}</div></div>`:''}
   ${p.cur?.length?`<div class="sec"><div class="sh"><h2>2025–26 election cycle</h2><span class="cap" style="padding:0">${ord(p.curN)}</span></div><div class="group">${p.cur.slice(0,15).map(([bg,v])=>personRowPac(bg,M(v))).join('')}</div></div>`:''}
   ${p.top?.length?`<div class="sec"><div class="sh"><h2>Biggest recipients since ${p.yrs[0]||1980}</h2></div><div class="group">${p.top.slice(0,25).map(([bg,v,a,b])=>personRowPac(bg,M(v),a===b?`${a}`:`${a}–${b}`)).join('')}</div><div class="cap">Totals across every election cycle on record. Years show when the money was given.</div></div>`:''}
   <div class="sec"><div class="group">${lob?`<button class="row plain" data-lob="${lob}" style="grid-template-columns:1fr auto"><span>Their lobbying spending</span>${chev}</button>`:''}<a class="row plain" style="grid-template-columns:1fr auto" href="https://www.fec.gov/data/committee/${esc(id)}/" target="_blank" rel="noopener"><span>Every filing on FEC.gov</span>${chev}</a></div></div>
   <div class="note">From Federal Election Commission records of PAC contributions to candidates, 1980–2026. Giving to a campaign is legal and has to be reported.</div>
  </div>`;
}
/* list of the biggest PACs */
function pacsScreen(){
  if(!H)return loading('PAC records');
  const mode=S.pmode||'cur',q=(S.pq||'').trim().toLowerCase();
  let list=Object.entries(H.pacs);
  if(q)list=list.filter(([,p])=>fz(p.n+' '+(p.fn||''),q));
  const types=[...new Set(Object.values(H.pacs).map(p=>p.cat).filter(Boolean))].sort();
  if(S.ptype&&S.ptype!=='All')list=list.filter(([,p])=>p.cat===S.ptype);
  list.sort((a,b)=>mode==='cur'?(b[1].curT||0)-(a[1].curT||0):b[1].tot-a[1].tot);
  const total=list.length,amt=p=>mode==='cur'?(p.curT||0):p.tot,mx=list.length?Math.max(1,amt(list[0][1])):1;
  list=list.slice(0,S.limit||60);
  return `${pageHead('PACs')}<div class="wrap" style="padding-top:calc(var(--navh) + 12px)"><div class="lbanner bg-capitol pghero"><h1>PACs</h1><span>Political action committees pool money from companies, unions and interest groups and give it to candidates.</span></div>
   <div class="sfield" style="margin-bottom:12px"><input id="pq" placeholder="Search PACs" value="${esc(S.pq||'')}" aria-label="Search PACs"></div>
   <div class="seg" style="margin-bottom:12px"><button data-pmode="cur" aria-pressed="${mode==='cur'}">This cycle</button><button data-pmode="all" aria-pressed="${mode==='all'}">All time</button></div>
   <div class="chipsrow" style="margin-bottom:12px">${['All',...types].map(t=>`<button data-ptype="${esc(t)}" aria-pressed="${(S.ptype||'All')===t}">${t==='All'?'All types':esc(t)}</button>`).join('')}</div>
   <div class="sh"><h2>${S.ptype&&S.ptype!=='All'?esc(S.ptype):'Biggest givers'}</h2><span class="cap" style="padding:0">${ord(total)}</span></div>
   <div class="lt-head lt-rows"><span>#</span><span>PAC</span><span>Type</span><span></span><span class="r">${mode==='cur'?'Given this cycle':'Given since 1980'}</span></div>
   <div class="group tbl">${list.map(([id,p],i)=>`<button class="row" data-pac="${id}" style="grid-template-columns:auto 1fr auto auto"><span class="rank">${i+1}</span><span style="min-width:0"><span class="t">${esc(p.n)}</span><br><span class="s">${esc(p.cat)}</span></span><span class="tx ttype"><em>${esc(p.cat)}</em></span><span class="tx tbar"><i style="width:${(amt(p)/mx*100).toFixed(1)}%"></i></span><span class="val">${M(amt(p))}</span>${chev}</button>`).join('')||'<div class="empty">No PACs match.</div>'}</div>
   ${list.length>=(S.limit||60)?`<button class="more" data-pmore>Show more</button>`:''}</div>`;
}
const _render7=render;
render=function(){
  const cur=S.stack.at(-1)||'';
  if(!cur.startsWith('pac:')&&cur!=='pacs')return _render7();
  if($('#sheet').hidden)$('#panel').className='panel';
  $('#app').innerHTML=cur==='pacs'?pacsScreen():pacPage(cur.slice(4));
  $('#tabbar').innerHTML=TABS2.map(([k,l,svg])=>`<button data-tab="${k}" aria-current="${k===S.tab?'page':'false'}">${svg}${l}</button>`).join('');
  const pn=document.querySelector('#app .pnav .in');
  if(pn&&!pn.querySelector('[data-menu]')){const b=document.createElement('span');b.className='pright';b.innerHTML=`<button data-menu aria-label="Menu">${MENU_ICON}</button>`;pn.appendChild(b)}
  const pq=$('#pq');if(pq)pq.addEventListener('input',e=>{S.pq=e.target.value;S.limit=60;const p=pq.selectionStart;render();const n=$('#pq');n.focus();n.setSelectionRange(p,p)});
  try{linkify($('#app'))}catch(e){}
};
/* make PAC donor rows open the PAC page */
function linkPacs(root){
  if(!root||!pacIndex())return;
  root.querySelectorAll('.sec').forEach(sec=>{
    const h=sec.querySelector('h2')?.textContent||'';
    if(!/PAC donors|PAC/.test(h)||/by type/.test(h))return;
    sec.querySelectorAll('.row.plain').forEach(r=>{
      if(r.dataset.pac||r.closest('button,a'))return;
      const t=r.querySelector('.t');if(!t)return;
      const id=pacFor(t.textContent);if(!id)return;
      r.dataset.pac=id;r.setAttribute('role','button');r.tabIndex=0;r.style.cursor='pointer';
      t.classList.add('pacname');
    });
  });
}
const _render8=render;
render=function(){_render8();try{linkPacs($('#app'))}catch(e){console.warn(e)}};
const _openSheet4=openSheet;
openSheet=function(t,h){_openSheet4(t,h);try{linkPacs($('#panel'))}catch(e){console.warn(e)}};
window.addEventListener('click',e=>{
  const g=s=>e.target.closest(s);let el;
  if(el=g('[data-pac]')){e.preventDefault();e.stopPropagation();$('#sheet').hidden=true;go('pac:'+el.dataset.pac);return}
  if(el=g('[data-pmode]')){e.preventDefault();e.stopPropagation();S.pmode=el.dataset.pmode;S.limit=60;render();return}
  if(el=g('[data-ptype]')){e.preventDefault();e.stopPropagation();S.ptype=el.dataset.ptype;S.limit=60;render();return}
  if(el=g('[data-pmore]')){e.preventDefault();e.stopPropagation();S.limit=(S.limit||60)+60;render();return}
},true);
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset?.pac){go('pac:'+e.target.dataset.pac)}});
const _navGoP=navGo;
navGo=function(g){if(g==='pacs'){closeDrawer();$('#sheet').hidden=true;S.stack=[];S.tab='search';S.pq='';S.limit=60;go('pacs');return}_navGoP(g)};
const _drawerHtmlP=drawerHtml;
drawerHtml=function(){return _drawerHtmlP().replace(`data-go="lobbying:firms"`,`data-go="pacs"><span>PACs</span></button><button class="ditem" data-go="lobbying:firms"`)};
