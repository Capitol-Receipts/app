/* ================= Trips, office spending, earmarks, lobbyist donations, past donors; caucuses; federal judges ================= */
const XT={m:{},caucus:null,judges:null,judge:{}};
function loadExtras(bg){
  if(XT.m[bg]!==undefined)return XT.m[bg];
  XT.m[bg]=null;
  SB.get('member_extras?select=data&id=eq.'+bg).then(r=>{XT.m[bg]=r[0]?.data||{};render()}).catch(()=>{XT.m[bg]={}});
  return null;
}
function loadCaucuses(){
  if(XT.caucus)return XT.caucus;XT.caucus='loading';
  SB.get('caucuses?select=data').then(r=>{XT.caucus=r.map(x=>x.data).sort((a,b)=>b.members.length-a.members.length);render()}).catch(()=>{XT.caucus=[]});
  return null;
}
const sumObj=o=>Object.entries(o||{}).filter(([k])=>!['total','period'].includes(k)).reduce((a,[,v])=>a+v,0);
const OFFCAT={staff:'Staff pay',rent:'Offices, phones & utilities',services:'Other services',travel:'Travel',mail:'Mass mail',printing:'Printing',supplies:'Supplies',equipment:'Equipment',shipping:'Shipping',other:'Other'};
function extrasSections(m){
  const x=XT.m[m.id];if(!x)return '';
  const out=[];
  const c=typeof loadCaucuses==='function'?loadCaucuses():null;
  const mine=Array.isArray(XT.caucus)?XT.caucus.filter(cc=>cc.members.includes(m.id)):[];
  if(mine.length)out.push(`<section class="sec" data-x="caucus"><div class="sh"><h2>Caucuses</h2></div><div class="group">${mine.map(cc=>`<button class="row plain" data-caucus="${cc.id}" style="grid-template-columns:1fr auto"><span><span class="t">${esc(cc.name)}</span><br><span class="s">${cc.members.length} members</span></span>${chev}</button>`).join('')}</div></section>`);
  if(x.office&&x.office.total){
    const o=x.office;const parts=Object.entries(o).filter(([k,v])=>OFFCAT[k]&&v>0).sort((a,b)=>b[1]-a[1]);
    out.push(`<section class="sec" data-x="office"><div class="sh"><h2>Office spending</h2><span class="cap" style="padding:0">${esc(o.period)}</span></div><div class="group pad"><div class="bigline"><b>${M(o.total)}</b><span>spent from their office budget</span></div>${hbars(parts.map(([k,v])=>[OFFCAT[k],v]),M)}</div><div class="cap">Taxpayer money every House office gets for staff, offices and mail. From the House Statement of Disbursements.</div></section>`);
  }
  if(x.trips&&x.trips.length){
    const t=x.trips;const own=t.filter(r=>norm2(r[4]).includes(norm2(m.last)));
    out.push(`<section class="sec" data-x="trips"><div class="sh"><h2>Trips paid for by private groups</h2><span class="cap" style="padding:0">${t.length}</span></div><div class="group">${t.slice(0,S.xtlimit||6).map(r=>`<a class="row plain" href="https://disclosures-clerk.house.gov/public_disc/gift-pdfs/${r[6]}/${r[5]}.pdf" target="_blank" rel="noopener" style="grid-template-columns:1fr auto"><span style="min-width:0"><span class="t">${esc(r[2]||'Trip')}</span><br><span class="s">${r[0]?fmtISO(r[0]):''} · paid by ${esc(r[3])}${r[4]?' · '+esc(r[4]):''}</span></span>${chev}</a>`).join('')}</div>${t.length>(S.xtlimit||6)?`<button class="more" data-xtmore>Show all ${t.length}</button>`:''}<div class="cap">${own.length} by the member, ${t.length-own.length} by staff. Private groups can pay for travel connected to official duties if the House Ethics Committee approves it in advance. Each links to the filing.</div></section>`);
  }
  if(x.earmarks&&x.earmarks.n){
    const e=x.earmarks;
    out.push(`<section class="sec" data-x="earmarks"><div class="sh"><h2>Earmarks requested</h2><span class="cap" style="padding:0">FY2026</span></div><div class="group pad"><div class="bigline"><b>${M(e.t)}</b><span>for ${e.n} project${e.n>1?'s':''} back home</span></div></div><div class="group" style="margin-top:8px">${e.items.slice(0,S.xelimit||6).map(i=>`<div class="row plain" style="grid-template-columns:1fr auto;cursor:default"><span style="min-width:0"><span class="t">${esc(i[1])}</span><br><span class="s">${esc(i[2])} · ${esc(i[3])}</span></span><span class="val">${M(i[0])}</span></div>`).join('')}</div>${e.items.length>(S.xelimit||6)?`<button class="more" data-xemore>Show more</button>`:''}<div class="cap">Funding members asked for in this year's spending bills for specific local projects. Projects requested jointly are counted for each member.</div></section>`);
  }
  if(x.ld203&&x.ld203.t){
    const l=x.ld203;
    out.push(`<section class="sec" data-x="ld203"><div class="sh"><h2>Donations from lobbyists</h2></div><div class="group pad"><div class="bigline"><b>${M(l.t)}</b><span>from ${l.n} gifts by registered lobbyists and the firms, companies and groups that employ them, 2025–26</span></div>${hbars(l.by.slice(0,6),M)}</div><div class="cap">From the semiannual contribution reports lobbyists and lobbying organizations must file (LD-203), including gifts from their PACs. Grouped by the lobbying organization.</div></section>`);
  }
  if(x.donors&&Object.keys(x.donors).length){
    const cy=Object.keys(x.donors).sort().reverse();
    out.push(`<section class="sec" data-x="donors"><div class="sh"><h2>Donors in past elections</h2></div>${cy.map(y=>{const d=x.donors[y];const ind=d.ind.filter(r=>!/^(Other|Retired|Not employed)/.test(r[0])).slice(0,4);return `<div class="yrvh">${+y-1}–${String(y).slice(2)} cycle · ${M(d.item)} from ${ord(d.n)} itemized gifts</div><div class="group pad">${ind.length?hbars(ind,M):'<span class="s">No industry data.</span>'}</div>`}).join('')}<div class="cap">Gifts over $200 from individuals, grouped by the donor's employer. From FEC filings.</div></section>`);
  }
  if(x.paper&&x.paper.length){
    out.push(`<section class="sec" data-x="paper"><div class="sh"><h2>Trades from handwritten reports</h2><span class="cap" style="padding:0">${ord(x.paperN||x.paper.length)}</span></div><div class="group">${x.paper.slice(0,10).map(r=>`<a class="row plain" href="${esc(r[3])}" target="_blank" rel="noopener" style="grid-template-columns:1fr auto"><span style="min-width:0"><span class="t">${esc(r[2])}</span><br><span class="s">${fmtISO(r[0])}${r[1]?' · '+r[1]:''}</span></span>${chev}</a>`).join('')}</div><div class="cap">Read automatically from scanned paper reports, so names may contain errors and amounts aren't shown. Check the original scan.</div></section>`);
  }
  return out.join('');
}
const norm2=s=>(s||'').toLowerCase().replace(/[^a-z]/g,'');
/* ---------- caucus pages ---------- */
function caucusesScreen(){
  const c=loadCaucuses();
  return `${pageHead('Caucuses')}<div class="wrap" style="padding-top:calc(var(--navh) + 10px)"><div class="lbanner bg-house pghero"><h1>Caucuses</h1><span>Groups of members who organize around shared views. Membership is self-reported by each caucus.</span></div>
  ${Array.isArray(XT.caucus)?`<div class="group">${XT.caucus.map(cc=>`<button class="row plain" data-caucus="${cc.id}" style="grid-template-columns:1fr auto auto"><span style="min-width:0"><span class="t">${esc(cc.name)}</span><br><span class="s">${cc.members.length} members${cc.cohesion?` · vote together ${Math.round(cc.cohesion*100)}% of the time`:''}</span></span><span></span>${chev}</button>`).join('')}</div>`:'<div class="calm">Loading…</div>'}</div>`;
}
function caucusPage(id){
  loadCaucuses();if(!Array.isArray(XT.caucus))return loading('the caucus');
  const cc=XT.caucus.find(x=>x.id===id);if(!cc)return `<div class="wrap"><div class="empty">Not found.</div></div>`;
  const mem=cc.members.map(b=>byId[b]).filter(Boolean).sort((a,b)=>a.last.localeCompare(b.last));
  const pc={};mem.forEach(m=>pc[m.party]=(pc[m.party]||0)+1);
  const avg=f=>{const v=mem.map(f).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
  return `${pageHead(cc.name)}
  <section class="phero p-N bg-capitol"><div class="in" style="padding-top:calc(var(--navh) + 18px)"><span class="billno">Caucus</span><h1 style="font-size:${cc.name.length>34?24:30}px">${esc(cc.name)}</h1><div class="psub">${mem.length} members · ${Object.entries(pc).map(([p,n])=>`${n} ${p}`).join(', ')}</div></div></section>
  <div class="wrap">
   <div class="glance">${glance('Vote together',cc.cohesion?pct(cc.cohesion,0):'—','on recorded votes',false)}${glance('Split votes',cc.splits??'—','where 20%+ broke away',false)}${glance('Avg raised',M(avg(m=>m.money?.rec)||0),'for 2026',false)}</div>
   <section class="sec"><div class="sh"><h2>Members</h2></div><div class="group">${mem.map(m=>`<button class="row" data-p="${m.id}" style="grid-template-columns:auto 1fr auto">${face(m,40)}<span style="min-width:0"><span class="t">${esc(m.name)}</span><br><span class="s">${esc(partyLine(m))}</span></span>${chev}</button>`).join('')}</div></section>
   <div class="note">Membership from the caucus's published member list (via Wikipedia); voting from Voteview, 119th Congress. "Vote together" is how often members voted with the caucus majority.</div>
  </div>`;
}
/* ---------- federal judges ---------- */
function loadJudges(){
  if(XT.judges)return XT.judges;XT.judges='loading';
  SB.all('judges?select=id,name,court,pres,party,conf,active,senior&order=conf.desc').then(r=>{XT.judges=r;render()}).catch(()=>{XT.judges=[]});
  return null;
}
function judgesScreen(){
  loadJudges();const list0=Array.isArray(XT.judges)?XT.judges:null;
  const f=S.jf||'serving',q=(S.jq||'').trim().toLowerCase();
  let list=list0?list0.filter(j=>f==='all'||(f==='serving'&&j.active&&!j.senior)||(f==='senior'&&j.senior)||(f==='former'&&!j.active)):[];
  if(q)list=list.filter(j=>(j.name+' '+j.court+' '+j.pres).toLowerCase().includes(q));
  const byPres={};list.forEach(j=>byPres[j.pres]=(byPres[j.pres]||0)+1);
  const topP=Object.entries(byPres).sort((a,b)=>b[1]-a[1]).slice(0,6);
  return `${pageHead('Federal judges')}<div class="wrap" style="padding-top:calc(var(--navh) + 10px)">
   <div class="lbanner bg-court pghero"><h1>Federal judges</h1><span>Every judge appointed to a federal court for life since 1789: who appointed them, how the Senate voted, and their careers.</span></div>
   <div class="sfield"><input id="jq" class="search" type="search" placeholder="Search a judge, court or president" value="${esc(S.jq||'')}" aria-label="Search judges"></div>
   <div class="seg" style="margin-top:10px">${[['serving','Serving'],['senior','Senior status'],['former','Former'],['all','All']].map(([k,l])=>`<button data-jf="${k}" aria-pressed="${f===k}">${l}</button>`).join('')}</div>
   ${list0?`${topP.length?`<section class="sec"><div class="sh"><h2>Appointed by</h2><span class="cap" style="padding:0">${ord(list.length)} judges</span></div><div class="group pad">${hbars(topP,v=>ord(v))}</div></section>`:''}
   <section class="sec"><div class="group">${list.slice(0,S.limit||60).map(j=>`<button class="row plain" data-judge="${j.id}" style="grid-template-columns:1fr auto auto"><span style="min-width:0"><span class="t">${esc(j.name)}</span><br><span class="s">${esc(j.court)}</span></span><span class="val"><small>${esc(j.pres.split(' ').slice(-1)[0])} · ${(j.conf||'').slice(0,4)}</small></span>${chev}</button>`).join('')||'<div class="empty">No judges match.</div>'}</div>${list.length>(S.limit||60)?`<button class="more" data-cmore>Show more</button>`:''}</section>`:'<div class="calm">Loading judges…</div>'}</div>`;
}
function judgePage(id){
  if(!XT.judge[id]){XT.judge[id]='loading';SB.get('judges?select=data&id=eq.'+id).then(r=>{XT.judge[id]=r[0]?.data||'missing';render()}).catch(()=>{XT.judge[id]='missing'})}
  const j=XT.judge[id];if(!j||j==='loading')return loading('the judge');if(typeof j!=='object')return `<div class="wrap"><div class="empty">Not found.</div></div>`;
  const last=j.apps.at(-1);
  return `${pageHead(j.n)}
  <section class="phero p-N bg-court"><div class="in" style="padding-top:calc(var(--navh) + 18px)"><span class="billno">${esc(last.title||'Judge')}</span><h1 style="font-size:${j.n.length>30?26:30}px">${esc(j.n)}</h1><div class="psub">${esc(last.court)}</div></div></section>
  <div class="wrap">
   <div class="glance">${glance('Appointed by',esc(last.pres.split(' ').slice(-1)[0]),esc(last.party),false)}${glance('Senate vote',last.vote&&last.vote.trim()?esc(last.vote.trim().replace('/','–')):'Voice vote',esc(last.vtype||''),false)}${glance('Confirmed',last.conf?last.conf.slice(0,4):'—',last.end?'served until '+last.end.slice(0,4):last.senior?'now senior status':'serving',false)}</div>
   <section class="sec"><div class="sh"><h2>Appointments</h2></div><div class="group">${j.apps.map(a=>`<div class="row plain" style="grid-template-columns:1fr;cursor:default"><span><span class="t">${esc(a.title)}, ${esc(a.court)}</span><br><span class="s">Nominated by ${esc(a.pres)} (${esc(a.party)})${a.conf?' · confirmed '+fmtISO(a.conf):''}${a.vote&&a.vote.trim()?' · '+esc(a.vote.trim().replace('/','–')):''}${a.aba?' · ABA rating: '+esc(a.aba):''}${a.end?' · '+esc(a.endwhy||'left')+' '+a.end.slice(0,4):''}</span></span></div>`).join('')}</div></section>
   ${j.edu.length?`<section class="sec"><div class="sh"><h2>Education</h2></div><div class="group">${j.edu.map(e=>`<div class="row kv"><span class="k">${esc(e[0])}</span><span class="v">${esc(e[1])} ${esc(e[2])}</span></div>`).join('')}</div></section>`:''}
   ${j.career?`<section class="sec"><div class="sh"><h2>Career before the bench</h2></div><div class="group pad"><p style="margin:0">${esc(j.career)}</p></div></section>`:''}
   <div class="note">From the Federal Judicial Center's biographical directory of Article III judges.</div>
  </div>`;
}
/* ---------- routing ---------- */
const XT_ROUTES=['caucus:','judge:'];
const _renderX=render;
render=function(){
  const cur=S.stack.at(-1)||'';
  if(!(XT_ROUTES.some(p=>cur.startsWith(p))||cur==='caucuses'||cur==='judges')){
    _renderX();
    try{const m=cur&&byId[cur];if(m){loadExtras(m.id);loadCaucuses();if(XT.m[m.id]&&!document.querySelector('#app [data-x]')){const html=extrasSections(m);const anchor=document.querySelector('#app [data-placelinks]')||document.querySelector('#app .note');if(html&&anchor)anchor.insertAdjacentHTML('beforebegin',html)}}}catch(e){console.warn(e)}
    return;
  }
  if($('#sheet').hidden)$('#panel').className='panel';
  $('#app').innerHTML=cur==='caucuses'?caucusesScreen():cur==='judges'?judgesScreen():cur.startsWith('caucus:')?caucusPage(cur.slice(7)):judgePage(cur.slice(6));
  $('#tabbar').innerHTML=TABS2.map(([k,l,svg])=>`<button data-tab="${k}" aria-current="${k===S.tab?'page':'false'}">${svg}${l}</button>`).join('');
  const pn=document.querySelector('#app .pnav .in');
  if(pn&&!pn.querySelector('[data-menu]')){const b=document.createElement('span');b.className='pright';b.innerHTML=`<button data-menu aria-label="Menu">${MENU_ICON}</button>`;pn.appendChild(b)}
  const jq=$('#jq');if(jq)jq.addEventListener('input',e=>{S.jq=e.target.value;S.limit=60;const p=jq.selectionStart;render();const n=$('#jq');n.focus();n.setSelectionRange(p,p)});
};
window.addEventListener('click',e=>{
  const g=s=>e.target.closest(s);let el;
  if(el=g('[data-caucus]')){e.preventDefault();e.stopPropagation();$('#sheet').hidden=true;go('caucus:'+el.dataset.caucus);return}
  if(el=g('[data-judge]')){e.preventDefault();e.stopPropagation();$('#sheet').hidden=true;go('judge:'+el.dataset.judge);return}
  if(el=g('[data-jf]')){e.preventDefault();e.stopPropagation();S.jf=el.dataset.jf;S.limit=60;render();return}
  if(g('[data-xtmore]')){e.preventDefault();e.stopPropagation();S.xtlimit=999;render();return}
  if(g('[data-xemore]')){e.preventDefault();e.stopPropagation();S.xelimit=999;render();return}
},true);
const _navGoX=navGo;
navGo=function(gk){if(gk==='caucuses'||gk==='judges'){closeDrawer();$('#sheet').hidden=true;S.stack=[];S.tab='search';S.limit=60;go(gk);return}_navGoX(gk)};
const _drawerHtmlX=drawerHtml;
drawerHtml=function(){return _drawerHtmlX()
  .replace(`data-go="compare"><span>Compare the parties</span></button>`,`data-go="compare"><span>Compare the parties</span></button><button class="ditem" data-go="caucuses"><span>Caucuses</span></button>`)
  .replace(`data-go="hist:exec"><span>Presidents & vice presidents</span></button>`,`data-go="hist:exec"><span>Presidents & vice presidents</span></button><button class="ditem" data-go="judges"><span>Federal judges</span></button>`)};
/* Supreme Court page links to all federal judges */
const _renderX2=render;
render=function(){_renderX2();try{if(S.tab==='leaders'&&S.lmode2==='court'&&!S.stack.length){const b=[...document.querySelectorAll('#app .sh button')].find(x=>/All judges/.test(x.textContent));if(b){b.dataset.go='judges'}}}catch(e){}};
